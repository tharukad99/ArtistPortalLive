from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app, jsonify
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash
from artistportal.models import User, OneTimePassword
from artistportal.extensions import db
from datetime import datetime, timedelta
import random
import requests

auth_bp = Blueprint("auth", __name__)

@auth_bp.get("/login")
def login():
    if current_user.is_authenticated:
        return redirect(url_for("auth.manage_artists_page"))
    return render_template("login_otp.html")


@auth_bp.post("/login")
def login_post():
    username = (request.form.get("username") or "").strip()
    password = request.form.get("password") or ""

    user = User.query.filter_by(Username=username).first()

    if not user or not user.check_password(password):
        flash("Invalid username or password.", "error")
        return redirect(url_for("auth.login"))
    
    login_user(user)

    if user.IsAdmin:
        return redirect(url_for("auth.manage_artists_page"))
    # Send all users to manage artists page (dashboard) to pick which artist to manage
    return redirect(url_for("auth.manage_artists_page"))


@auth_bp.get("/logout")
def logout():
    logout_user()
    next_page = request.args.get('next')
    if next_page:
        return redirect(next_page)
    return redirect(url_for("auth.login"))


@auth_bp.get("/admin/manage-artists")
@login_required
def manage_artists_page():
    # Both Admin and Normal users can view the dashboard now
    # The AllArtistsList API handles role-based data filtering
    return render_template("manage_artists.html")


@auth_bp.get("/admin/manage-users")
@login_required
def manage_users_page():
    if not getattr(current_user, "IsAdmin", False):
        return redirect(url_for("auth.login"))
    return render_template("manage_users.html")


# --- OTP LOGIN FLOW ---

@auth_bp.get("/login-otp")
def login_otp():
    if current_user.is_authenticated:
        return redirect(url_for("auth.manage_artists_page"))
    return render_template("login_otp.html")


@auth_bp.post("/api/auth/otp/request")
def request_otp():
    email = (request.json.get("email") or "").strip()
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    user = User.query.filter_by(Email=email).first()
    if not user:
        # For security, we might not want to reveal if email exists, 
        # but for this internal portal, we can be more direct.
        return jsonify({"success": False, "message": "No account found with this email."}), 404

    # 1. Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))
    expiry = datetime.utcnow() + timedelta(minutes=10)

    # 2. Save OTP to DB
    new_otp = OneTimePassword(
        UserId=user.UserId,
        OTPCode=otp_code,
        ExpiryTime=expiry
    )
    db.session.add(new_otp)
    db.session.commit()

    # 3. Send via EmailJS (Python backend call)
    try:
        url = "https://api.emailjs.com/api/v1.0/email/send"
        payload = {
            "service_id": current_app.config["EMAILJS_SERVICE_ID"],
            "template_id": current_app.config["EMAILJS_TEMPLATE_ID"],
            "user_id": current_app.config["EMAILJS_PUBLIC_KEY"],
            "accessToken": current_app.config.get("EMAILJS_PRIVATE_KEY"),
            "template_params": {
                "to_email": user.Email,
                "name": "Artist Portal Admin",
                "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "to_name": user.DisplayName,
                "otp": otp_code
            }
        }
        res = requests.post(url, json=payload, timeout=10)
        if res.status_code != 200:
            current_app.logger.error(f"EmailJS failed: {res.text}")
            return jsonify({"success": False, "message": "Failed to send email. Please try again later."}), 500
            
    except Exception as e:
        current_app.logger.exception("Error calling EmailJS")
        return jsonify({"success": False, "message": "Server error while sending email."}), 500

    return jsonify({"success": True, "message": "OTP sent to your email."})


@auth_bp.post("/api/auth/otp/verify")
def verify_otp():
    email = (request.json.get("email") or "").strip()
    otp_code = (request.json.get("otp") or "").strip()

    if not email or not otp_code:
        return jsonify({"success": False, "message": "Email and OTP are required"}), 400

    user = User.query.filter_by(Email=email).first()
    if not user:
        return jsonify({"success": False, "message": "Invalid request."}), 400

    # Find the most recent, unused, non-expired OTP
    otp_record = OneTimePassword.query.filter_by(
        UserId=user.UserId, 
        OTPCode=otp_code, 
        IsUsed=False
    ).filter(OneTimePassword.ExpiryTime > datetime.utcnow()).order_by(OneTimePassword.DateCreated.desc()).first()

    if not otp_record:
        return jsonify({"success": False, "message": "Invalid or expired OTP."}), 400

    # Mark as used
    otp_record.IsUsed = True
    db.session.commit()

    # Log user in
    login_user(user)

    # Return redirect URL
    redirect_url = url_for("auth.manage_artists_page")
    
    return jsonify({"success": True, "redirect": redirect_url})

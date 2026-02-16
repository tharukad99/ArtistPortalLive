from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash
from artistportal.models import User


auth_bp = Blueprint("auth", __name__)

@auth_bp.get("/login")
def login():
    if current_user.is_authenticated:
        if current_user.IsAdmin:
            return redirect(url_for("auth.manage_artists_page"))
        return redirect(url_for("manage_home_page", artist_id=current_user.ArtistId))
    return render_template("login.html")


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
    return redirect(url_for("manage_home_page", artist_id=user.ArtistId))


@auth_bp.get("/logout")
def logout():
    logout_user()
    return redirect(url_for("auth.login"))


@auth_bp.get("/admin/manage-artists")
@login_required
def manage_artists_page():
    if not getattr(current_user, "IsAdmin", False):
        return redirect(url_for("auth.login"))
    return render_template("manage_artists.html")

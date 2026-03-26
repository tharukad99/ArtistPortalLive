from flask import Blueprint, jsonify, request
from sqlalchemy import text
from ..extensions import db
from ..models import User
from werkzeug.security import generate_password_hash
from flask_login import login_required, current_user

users_bp = Blueprint("users", __name__)

@users_bp.get("/")
@login_required
def list_users():
    # Only allow admins to view
    if not current_user.IsAdmin:
        return jsonify({"error": "Unauthorized"}), 403

    sql = text("""
        SELECT u.*, ua.ArtistId AS AssignedArtistId
        FROM PortalUsers u
        LEFT JOIN UserArtists ua ON ua.UserId = u.UserId
    """)
    rows = db.session.execute(sql).mappings().all()
    
    users_dict = {}
    for r in rows:
        uid = r["UserId"]
        if uid not in users_dict:
            users_dict[uid] = {
                "id": uid,
                "username": r["Username"],
                "displayName": r["DisplayName"],
                "email": r["Email"],
                "role": r["Role"],
                "isActive": r["IsActive"],
                "dateCreated": r["DateCreated"].strftime("%Y-%m-%d %H:%M:%S") if r["DateCreated"] else None,
                "assignedArtists": []
            }
        if r["AssignedArtistId"]:
             users_dict[uid]["assignedArtists"].append(r["AssignedArtistId"])
             
    return jsonify(list(users_dict.values()))

@users_bp.post("/")
@login_required
def create_user():
    if not getattr(current_user, "IsAdmin", False):
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    display_name = data.get("displayName", "").strip()
    password = data.get("password")
    role = int(data.get("role", 2))
    
    if not username or not password or not display_name:
         return jsonify({"error": "Username, password and display name are required"}), 400
         
    if User.query.filter_by(Username=username).first() or (email and User.query.filter_by(Email=email).first()):
        return jsonify({"error": "Username or Email already exists"}), 400

    new_user = User(
        Username=username,
        Email=email if email else None,
        DisplayName=display_name,
        Role=role,
        IsActive=True
    )
    new_user.set_password(password)
    
    db.session.add(new_user)
    db.session.commit()
    
    assigned_artists = data.get("assignedArtists", [])
    if isinstance(assigned_artists, list) and len(assigned_artists) > 0:
        from sqlalchemy import text
        for artist_id in assigned_artists:
            db.session.execute(text("INSERT INTO UserArtists (UserId, ArtistId) VALUES (:uid, :aid)"), {"uid": new_user.UserId, "aid": artist_id})
        db.session.commit()
    
    return jsonify({"success": True, "id": new_user.UserId})

@users_bp.post("/<int:user_id>/set-password")
@login_required
def set_password(user_id):
    if not current_user.IsAdmin:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json(silent=True) or {}
    password = data.get("password")
    
    if not password:
         return jsonify({"error": "Password is required"}), 400
         
    user = User.query.get(user_id)
    if not user:
         return jsonify({"error": "User not found"}), 404
         
    user.set_password(password)
    db.session.commit()
    
    return jsonify({"success": True})

@users_bp.put("/<int:user_id>")
@login_required
def update_user(user_id):
    if not getattr(current_user, "IsAdmin", False):
        return jsonify({"error": "Unauthorized"}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    
    # Check email/username duplicates if changed
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    
    if username != user.Username:
        if User.query.filter_by(Username=username).first():
            return jsonify({"error": "Username already exists"}), 400
        user.Username = username
        
    if email and email != user.Email:
        if User.query.filter_by(Email=email).first():
            return jsonify({"error": "Email already exists"}), 400
        user.Email = email

    if "displayName" in data:
        user.DisplayName = data.get("displayName", "").strip()
    
    if "role" in data:
        user.Role = int(data.get("role"))
        
    if "isActive" in data:
        user.IsActive = bool(data.get("isActive"))
        
    if data.get("password"):
        user.set_password(data.get("password"))
        
    db.session.commit()
    
    # Handle artist assignments
    if "assignedArtists" in data:
        assigned_artists = data.get("assignedArtists")
        if isinstance(assigned_artists, list):
            from sqlalchemy import text
            db.session.execute(text("DELETE FROM UserArtists WHERE UserId = :uid"), {"uid": user.UserId})
            for artist_id in assigned_artists:
                 db.session.execute(text("INSERT INTO UserArtists (UserId, ArtistId) VALUES (:uid, :aid)"), {"uid": user.UserId, "aid": artist_id})
            db.session.commit()

    return jsonify({"success": True})

@users_bp.delete("/<int:user_id>")
@login_required
def delete_user(user_id):
    if not getattr(current_user, "IsAdmin", False):
        return jsonify({"error": "Unauthorized"}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    # Remove mappings and OTP records first to avoid foreign key constraints
    from sqlalchemy import text
    db.session.execute(text("DELETE FROM UserArtists WHERE UserId = :uid"), {"uid": user_id})
    db.session.execute(text("DELETE FROM OneTimePasswords WHERE UserId = :uid"), {"uid": user_id})

    db.session.delete(user)
    db.session.commit()
    return jsonify({"success": True})

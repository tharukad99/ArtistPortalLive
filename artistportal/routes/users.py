from flask import Blueprint, jsonify, request
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

    # Return all users mapped to artists or just non-admins
    users = User.query.filter(User.ArtistId.isnot(None)).all()
    
    return jsonify([
        {
            "id": u.UserId,
            "username": u.Username,
            "displayName": u.DisplayName,
            "email": u.Email,
            "artistId": u.ArtistId,
            "isActive": u.IsActive,
            "dateCreated": u.DateCreated.strftime("%Y-%m-%d %H:%M:%S") if u.DateCreated else None
        } for u in users
    ])

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

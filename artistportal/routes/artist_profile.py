# artist_profile.py
from flask import Blueprint, request, jsonify
from flask_login import current_user, login_required
import pyodbc

artist_profile_bp = Blueprint("artist_profile_api", __name__)

def get_conn():
    # Update to your config usage (example)
    from flask import current_app
    return pyodbc.connect(current_app.config["MSSQL_CONN_STR"])

def can_edit_artist(artist_id: int) -> bool:
    if not current_user.is_authenticated:
        return False
    # Your system: admin OR same artist user
    try:
        return current_user.is_admin() or int(getattr(current_user, "ArtistId", 0)) == int(artist_id)
    except Exception:
        return False

def row_to_dict(cursor, row):
    cols = [c[0] for c in cursor.description]
    return dict(zip(cols, row))

def clean_opt(v):
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


# ---------------------------
# Update Profile
# ---------------------------
# @artist_profile_bp.put("/api/artists/<int:artist_id>/profile")
# @login_required
# def update_profile(artist_id: int):
#     if not can_edit_artist(artist_id):
#         return jsonify({"message": "Forbidden"}), 403

#     data = request.get_json(silent=True) or {}

#     # Accept both StageName and stageName
#     stage_name = clean_opt(data.get("StageName") or data.get("stageName"))
#     if not stage_name:
#         return jsonify({"message": "StageName is required"}), 400

#     full_name = clean_opt(data.get("FullName") or data.get("fullName"))
#     bio = clean_opt(data.get("Bio") or data.get("bio"))
#     website = clean_opt(data.get("WebsiteUrl") or data.get("websiteUrl"))
#     country = clean_opt(data.get("Country") or data.get("country"))
#     genre = clean_opt(data.get("PrimaryGenre") or data.get("primaryGenre"))
#     img = clean_opt(data.get("ProfileImageUrl") or data.get("profileImageUrl"))

#     with get_conn() as conn:
#         cur = conn.cursor()
#         cur.execute(
#             """
#             EXEC dbo.UpdateArtistProfile
#               @ArtistId=?,
#               @StageName=?,
#               @FullName=?,
#               @Bio=?,
#               @WebsiteUrl=?,
#               @Country=?,
#               @PrimaryGenre=?,
#               @ProfileImageUrl=?
#             """,
#             (artist_id, stage_name, full_name, bio, website, country, genre, img)
#         )
#         row = cur.fetchone()
#         conn.commit()

#         if not row:
#             return jsonify({"message": "Update failed"}), 500

#         updated = row_to_dict(cur, row)

#     # Return camelCase for your JS
#     return jsonify({
#         "id": updated.get("ArtistId"),
#         "stageName": updated.get("StageName"),
#         "fullName": updated.get("FullName"),
#         "bio": updated.get("Bio"),
#         "websiteUrl": updated.get("WebsiteUrl"),
#         "country": updated.get("Country"),
#         "primaryGenre": updated.get("PrimaryGenre"),
#         "profileImageUrl": updated.get("ProfileImageUrl"),
#     }), 200


# ---------------------------
# Activities: Add / Edit
# ---------------------------
@artist_profile_bp.post("/api/artists/<int:artist_id>/activities")
@login_required
def add_activity(artist_id: int):
    if not can_edit_artist(artist_id):
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    title = clean_opt(data.get("title") or data.get("Title"))
    if not title:
        return jsonify({"message": "title is required"}), 400

    act_type = clean_opt(data.get("type") or data.get("Type"))
    act_date = clean_opt(data.get("date") or data.get("Date"))  # YYYY-MM-DD string OK for SQL DATE param in many drivers
    desc = clean_opt(data.get("description") or data.get("Description"))

    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "EXEC dbo.UpsertArtistActivity @ActivityId=?, @ArtistId=?, @Title=?, @Type=?, @Date=?, @Description=?",
            (None, artist_id, title, act_type, act_date, desc)
        )
        row = cur.fetchone()
        conn.commit()

        if not row:
            return jsonify({"message": "Insert failed"}), 500

        out = row_to_dict(cur, row)

    return jsonify({
        "id": out.get("ActivityId"),
        "artistId": out.get("ArtistId"),
        "title": out.get("Title"),
        "type": out.get("Type"),
        "date": out.get("Date").isoformat() if out.get("Date") else None,
        "description": out.get("Description"),
    }), 201


@artist_profile_bp.put("/api/artists/<int:artist_id>/activities/<int:activity_id>")
@login_required
def edit_activity(artist_id: int, activity_id: int):
    if not can_edit_artist(artist_id):
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    title = clean_opt(data.get("title") or data.get("Title"))
    if not title:
        return jsonify({"message": "title is required"}), 400

    act_type = clean_opt(data.get("type") or data.get("Type"))
    act_date = clean_opt(data.get("date") or data.get("Date"))
    desc = clean_opt(data.get("description") or data.get("Description"))

    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "EXEC dbo.UpsertArtistActivity @ActivityId=?, @ArtistId=?, @Title=?, @Type=?, @Date=?, @Description=?",
            (activity_id, artist_id, title, act_type, act_date, desc)
        )
        row = cur.fetchone()
        conn.commit()

        if not row:
            return jsonify({"message": "Update failed"}), 500

        out = row_to_dict(cur, row)

    return jsonify({
        "id": out.get("ActivityId"),
        "artistId": out.get("ArtistId"),
        "title": out.get("Title"),
        "type": out.get("Type"),
        "date": out.get("Date").isoformat() if out.get("Date") else None,
        "description": out.get("Description"),
    }), 200


# ---------------------------
# Social links: Upsert + List
# ---------------------------
@artist_profile_bp.get("/api/artists/<int:artist_id>/social")
def list_social(artist_id: int):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT ArtistId, Platform, Handle, Url FROM dbo.ArtistSocialLinks WHERE ArtistId=?",
            (artist_id,)
        )
        rows = cur.fetchall()

    items = []
    for r in rows:
        items.append({
            "artistId": r[0],
            "platform": r[1],
            "handle": r[2],
            "url": r[3],
        })
    return jsonify(items), 200


@artist_profile_bp.put("/api/artists/<int:artist_id>/social")
@login_required
def upsert_social(artist_id: int):
    if not can_edit_artist(artist_id):
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    platform = clean_opt(data.get("platform") or data.get("Platform"))
    if not platform:
        return jsonify({"message": "platform is required"}), 400

    handle = clean_opt(data.get("handle") or data.get("Handle"))
    url = clean_opt(data.get("url") or data.get("Url"))

    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "EXEC dbo.UpsertArtistSocialLink @ArtistId=?, @Platform=?, @Handle=?, @Url=?",
            (artist_id, platform, handle, url)
        )
        row = cur.fetchone()
        conn.commit()

        if not row:
            return jsonify({"message": "Upsert failed"}), 500

        out = row_to_dict(cur, row)

    return jsonify({
        "artistId": out.get("ArtistId"),
        "platform": out.get("Platform"),
        "handle": out.get("Handle"),
        "url": out.get("Url"),
    }), 200

from flask import Blueprint, jsonify, request, current_app
from sqlalchemy import text
from ..extensions import db

sources_bp = Blueprint("sources", __name__)

# -----------------------------
# SourceTypes list (dropdown)
# GET /api/sources/types
# -----------------------------
@sources_bp.get("/types")
def list_source_types():
    try:
        rows = db.session.execute(text("EXEC dbo.usp_ListSourceTypes")).mappings().all()
        return jsonify([{
            "sourceTypeId": r["SourceTypeId"],
            "name": r["Name"],
            "code": r["Code"],
            "iconName": r["IconName"]
        } for r in rows])
    except Exception:
        current_app.logger.exception("Error listing source types")
        return jsonify({"error": "Internal Server Error"}), 500


# -----------------------------
# List artist sources
# GET /api/sources/<artist_id>/sources
# -----------------------------
@sources_bp.get("/<int:artist_id>/sources")
def list_sources(artist_id):
    try:
        rows = db.session.execute(
            text("EXEC dbo.usp_ListArtistSourcesByArtist :artist_id"),
            {"artist_id": artist_id}
        ).mappings().all()

        # Match your frontend needs
        return jsonify([{
            "artistSourceId": r["ArtistSourceId"],
            "artistId": r["ArtistId"],
            "sourceTypeId": r["SourceTypeId"],
            "sourceName": r["SourceName"],
            "sourceCode": r["SourceCode"],
            "iconName": r["IconName"],
            "displayName": r["DisplayName"],
            "url": r["Url"],
            "handle": r["Handle"],
            "isPrimary": bool(r["IsPrimary"]) if r["IsPrimary"] is not None else False,
            "dateAdded": r["DateAdded"].strftime("%Y-%m-%d") if r["DateAdded"] else None
        } for r in rows])

    except Exception:
        current_app.logger.exception("Error listing artist sources")
        return jsonify({"error": "Internal Server Error"}), 500


# -----------------------------
# Insert artist source
# POST /api/sources/<artist_id>/sources
# body: { sourceTypeId, displayName?, url, handle?, isPrimary? }
# -----------------------------
@sources_bp.post("/<int:artist_id>/sources")
def insert_source(artist_id):
    body = request.get_json(silent=True) or {}

    source_type_id = body.get("sourceTypeId")
    display_name = (body.get("displayName") or "").strip() or None
    url = (body.get("url") or "").strip()
    handle = (body.get("handle") or "").strip() or None
    is_primary = 1 if body.get("isPrimary") else 0

    if not source_type_id or not url:
        return jsonify({"error": "sourceTypeId and url are required"}), 400

    try:
        new_id = db.session.execute(
            text("""
                EXEC dbo.usp_InsertArtistSource
                    @ArtistId = :artist_id,
                    @SourceTypeId = :source_type_id,
                    @DisplayName = :display_name,
                    @Url = :url,
                    @Handle = :handle,
                    @IsPrimary = :is_primary
            """),
            {
                "artist_id": artist_id,
                "source_type_id": int(source_type_id),
                "display_name": display_name,
                "url": url,
                "handle": handle,
                "is_primary": is_primary
            }
        ).scalar()

        db.session.commit()
        return jsonify({"message": "Source inserted", "artistSourceId": int(new_id)}), 201

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Error inserting artist source")
        return jsonify({"error": "Internal Server Error"}), 500


# -----------------------------
# Update artist source
# PUT /api/sources/<artist_id>/sources/<artist_source_id>
# -----------------------------
@sources_bp.put("/<int:artist_id>/sources/<int:artist_source_id>")
def update_source(artist_id, artist_source_id):
    body = request.get_json(silent=True) or {}

    source_type_id = body.get("sourceTypeId")
    display_name = (body.get("displayName") or "").strip() or None
    url = (body.get("url") or "").strip()
    handle = (body.get("handle") or "").strip() or None
    is_primary = 1 if body.get("isPrimary") else 0

    if not source_type_id or not url:
        return jsonify({"error": "sourceTypeId and url are required"}), 400

    try:
        rows_affected = db.session.execute(
            text("""
                EXEC dbo.usp_UpdateArtistSource
                    @ArtistSourceId = :artist_source_id,
                    @ArtistId = :artist_id,
                    @SourceTypeId = :source_type_id,
                    @DisplayName = :display_name,
                    @Url = :url,
                    @Handle = :handle,
                    @IsPrimary = :is_primary
            """),
            {
                "artist_source_id": artist_source_id,
                "artist_id": artist_id,
                "source_type_id": int(source_type_id),
                "display_name": display_name,
                "url": url,
                "handle": handle,
                "is_primary": is_primary
            }
        ).scalar()

        if not rows_affected:
            db.session.rollback()
            return jsonify({"error": "Source not found"}), 404

        db.session.commit()
        return jsonify({"message": "Source updated", "artistSourceId": artist_source_id}), 200

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Error updating artist source")
        return jsonify({"error": "Internal Server Error"}), 500


# -----------------------------
# Delete artist source
# DELETE /api/sources/<artist_id>/sources/<artist_source_id>
# -----------------------------
@sources_bp.delete("/<int:artist_id>/sources/<int:artist_source_id>")
def delete_source(artist_id, artist_source_id):
    try:
        rows_affected = db.session.execute(
            text("""
                EXEC dbo.usp_DeleteArtistSource
                    @ArtistSourceId = :artist_source_id,
                    @ArtistId = :artist_id
            """),
            {"artist_source_id": artist_source_id, "artist_id": artist_id}
        ).scalar()

        if not rows_affected:
            db.session.rollback()
            return jsonify({"error": "Source not found"}), 404

        db.session.commit()
        return jsonify({"message": "Source deleted", "artistSourceId": artist_source_id}), 200

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Error deleting artist source")
        return jsonify({"error": "Internal Server Error"}), 500

from flask import Blueprint, jsonify, request
from ..models import Artist
from ..extensions import db
from sqlalchemy import text

artists_bp = Blueprint("artists", __name__)

# Get list of active artists
@artists_bp.get("")
def list_artists():
    sql = text("EXEC dbo.ListActiveArtists")
    rows = db.session.execute(sql).mappings().all()

    return jsonify([
        {
            "id": r["ArtistId"],
            "stageName": r["StageName"],
            "profileImageUrl": r["ProfileImageUrl"]
        }
        for r in rows
    ])



@artists_bp.get("/AllArtistsList")
def list_all_artists():
    sql = text("EXEC dbo.ListAllArtists")
    rows = db.session.execute(sql).mappings().all()

    return jsonify([
        {
            "id": r["ArtistId"],
            "stageName": r["StageName"],
            "fullName": r["FullName"],
            "bio": r["Bio"],
            "profileImageUrl": r["ProfileImageUrl"],
            "country": r["Country"],
            "primaryGenre": r["PrimaryGenre"],
            "websiteUrl": r["WebsiteUrl"],
            "isActive": r["IsActive"],
            "dateCreated": r["DateCreated"].isoformat() if r["DateCreated"] else None
        }
        for r in rows
    ])



# Get details of a specific artist
@artists_bp.get("/<int:artist_id>")
def get_artist(artist_id):
    sql = text("EXEC dbo.sp_GetArtistById @ArtistId=:artist_id")
    row = db.session.execute(sql, {"artist_id": artist_id}).mappings().first()

    if not row:
        return jsonify({"error": "Artist not found"}), 404

    return jsonify({
        "id": row["ArtistId"],
        "stageName": row["StageName"],
        "fullName": row["FullName"],
        "bio": row["Bio"],
        "profileImageUrl": row["ProfileImageUrl"],
        "country": row["Country"],
        "primaryGenre": row["PrimaryGenre"],
        "websiteUrl": row["WebsiteUrl"],
        "sourcesCount": int(row["SourcesCount"] or 0)
    })

# ------------------------------------------------------------
# CONSOLIDATED DASHBOARD ENDPOINT (FAST LOAD)
# ------------------------------------------------------------
@artists_bp.get("/<int:artist_id>/full_dashboard")
def get_dashboard_data(artist_id):
    try:
        # 1. Profile
        profile = db.session.execute(
            text("EXEC dbo.sp_GetArtistById @ArtistId=:artist_id"),
            {"artist_id": artist_id}
        ).mappings().first()

        if not profile:
             return jsonify({"error": "Artist not found"}), 404

        profile_data = {
            "id": profile["ArtistId"],
            "stageName": profile["StageName"],
            "fullName": profile["FullName"],
            "bio": profile["Bio"],
            "profileImageUrl": profile["ProfileImageUrl"],
            "country": profile["Country"],
            "primaryGenre": profile["PrimaryGenre"],
            "websiteUrl": profile["WebsiteUrl"],
            "sourcesCount": int(profile["SourcesCount"] or 0)
        }

        # 2. Photos (Limit 12)
        photos_rows = db.session.execute(
            text("SELECT TOP 12 PhotoId, PhotoUrl, Caption FROM ArtistPhotos WHERE ArtistId=:aid ORDER BY SortOrder ASC, DateCreated DESC"),
            {"aid": artist_id}
        ).mappings().all()

        photos_data = [{
            "photoId": r["PhotoId"],
            "url": r["PhotoUrl"],
            "caption": r["Caption"]
        } for r in photos_rows]

        # 3. Activities (Limit 20)
        # Using existing SP or raw query
        act_rows = db.session.execute(
            text("EXEC dbo.usp_ListActivitiesByArtist :artist_id"),
            {"artist_id": artist_id}
        ).fetchall() # fetchall returns objects because it maps to model logic usually, but here likely mappings or tuples depending on engine
        # Based on activities.py it returns objects with attributes (SQLAlchemy Row)
        
        # We need to slice in python if SP doesn't limit, or update SP. SP likely doesn't limit.
        # Let's slice here.
        activities_data = []
        for r in act_rows[:20]: # Limit 20
            activities_data.append({
                "id": r.ActivityId,
                "title": r.Title,
                "type": r.ActivityTypeName,
                "icon": r.IconName,
                "location": r.Location,
                "date": r.ActivityDate.strftime("%Y-%m-%d") if r.ActivityDate else None,
                "description": r.Description,
                "externalUrl": r.ExternalUrl
            })

        # 4. Sources
        sources_rows = db.session.execute(
            text("""
                SELECT s.ArtistSourceId, st.Name, st.Code, s.DisplayName, s.Url, s.Handle, s.IsPrimary 
                FROM ArtistSources s 
                JOIN SourceTypes st ON s.SourceTypeId = st.SourceTypeId 
                WHERE s.ArtistId = :aid 
                ORDER BY s.IsPrimary DESC, st.Name ASC
            """), 
            {"aid": artist_id}
        ).mappings().all()

        sources_data = [{
            "id": r["ArtistSourceId"],
            "sourceName": r["Name"], # st.Name
            "sourceCode": r["Code"],
            "displayName": r["DisplayName"],
            "url": r["Url"],
            "handle": r["Handle"],
            "isPrimary": bool(r["IsPrimary"])
        } for r in sources_rows]

        # 5. Metrics (Summary + Series)
        # Summary
        sum_rows = db.session.execute(
            text("EXEC dbo.GetArtistSummaryMetrics :aid"),
            {"aid": artist_id}
        ).fetchall()
        metrics_summary = {code: (float(val) if val is not None else 0) for code, val in sum_rows}

        # Series (We need 4 queries: followers, likes, comments, shares)
        # We can combine them or just run them. Running 4 fast queries is fine in one request.
        
        series_data = {}
        for m_code in ["followers", "likes", "comments", "shares"]:
             ts_rows = db.session.execute(
                text("EXEC dbo.GetArtistMetricTimeSeries @ArtistId=:aid, @MetricCode=:code"),
                {"aid": artist_id, "code": m_code}
            ).fetchall()
             series_data[m_code] = [{
                 "date": r[0].strftime("%Y-%m-%d"),
                 "value": float(r[1]) if r[1] is not None else None
             } for r in ts_rows]

        return jsonify({
            "profile": profile_data,
            "photos": photos_data,
            "activities": activities_data,
            "sources": sources_data,
            "metrics": {
                "summary": metrics_summary,
                "series": series_data
            }
        })

    except Exception as ex:
        current_app.logger.exception("Dashboard load error")
        return jsonify({"error": str(ex)}), 500



#####Artist Photos API Section ########


# Get photos of a specific artist
@artists_bp.get("/<int:artist_id>/photos")
def get_artist_photos(artist_id):
    sql = """
        SELECT
            PhotoId,
            PhotoUrl,
            Caption
        FROM ArtistPhotos
        WHERE ArtistId = :artist_id
        ORDER BY SortOrder ASC, DateCreated DESC;
    """
    rows = db.session.execute(
        text(sql),
        {"artist_id": artist_id}
    ).mappings().all()

    result = []
    for r in rows:
        result.append({
            "photoId": r["PhotoId"],
            "url": r["PhotoUrl"],
            "caption": r["Caption"]
        })

    return jsonify(result)




from flask import request, jsonify
from sqlalchemy import text

# ---------------------------------------------------------
# INSERT: Add a photo for an artist
# POST /artists/<artist_id>/photos
# Body JSON: { "url": "...", "caption": "...", "sortOrder": 1 }
# ---------------------------------------------------------
@artists_bp.post("/<int:artist_id>/photos")
def insert_artist_photo(artist_id):
    data = request.get_json(silent=True) or {}

    photo_url = (data.get("url") or "").strip()
    caption = (data.get("caption") or "").strip()
    sort_order = data.get("sortOrder")

    if not photo_url:
        return jsonify({"error": "url is required"}), 400

    # default sort order if not provided
    if sort_order is None:
        sort_order = 0

    sql = """
        INSERT INTO ArtistPhotos (ArtistId, PhotoUrl, Caption, SortOrder, DateCreated)
        OUTPUT INSERTED.PhotoId
        VALUES (:artist_id, :photo_url, :caption, COALESCE(
        (SELECT MAX(SortOrder) + 1 FROM ArtistPhotos WHERE ArtistId = :artist_id),
        1
    ), GETUTCDATE());
    """

    new_id = db.session.execute(
        text(sql),
        {
            "artist_id": artist_id,
            "photo_url": photo_url,
            "caption": caption,
            "sort_order": sort_order
        }
    ).scalar()

    db.session.commit()

    return jsonify({
        "photoId": new_id,
        "artistId": artist_id,
        "url": photo_url,
        "caption": caption,
        "sortOrder": sort_order
    }), 201


# ---------------------------------------------------------
# UPDATE: Update an existing photo row
# PUT /artists/<artist_id>/photos/<photo_id>
# Body JSON: { "url": "...", "caption": "...", "sortOrder": 2 }
# (send only fields you want to change)
# ---------------------------------------------------------
from flask import request, jsonify
from sqlalchemy import text

@artists_bp.put("/<int:artist_id>/photos/<int:photo_id>")
def update_artist_photo(artist_id, photo_id):
    data = request.get_json(silent=True) or {}

    photo_url = data.get("url")
    caption = data.get("caption")
    sort_order = data.get("sortOrder")

    sql = """
        UPDATE ArtistPhotos
        SET
            PhotoUrl  = COALESCE(:photo_url, PhotoUrl),
            Caption   = COALESCE(:caption, Caption),
            SortOrder = COALESCE(:sort_order, SortOrder)
        WHERE
            PhotoId = :photo_id
            AND ArtistId = :artist_id;
    """

    result = db.session.execute(
        text(sql),
        {
            "artist_id": artist_id,
            "photo_id": photo_id,
            "photo_url": (photo_url.strip() if isinstance(photo_url, str) else photo_url),
            "caption": (caption.strip() if isinstance(caption, str) else caption),
            "sort_order": sort_order
        }
    )

    if result.rowcount == 0:
        db.session.rollback()
        return jsonify({"error": "Photo not found for this artist"}), 404

    db.session.commit()
    return jsonify({"message": "Photo updated", "photoId": photo_id}), 200


# ---------------------------------------------------------
# DELETE: Remove a photo
# DELETE /artists/<artist_id>/photos/<photo_id>
# ---------------------------------------------------------
@artists_bp.delete("/<int:artist_id>/photos/<int:photo_id>")
def delete_artist_photo(artist_id, photo_id):
    sql = """
        DELETE FROM ArtistPhotos
        WHERE PhotoId = :photo_id
          AND ArtistId = :artist_id;
    """

    result = db.session.execute(
        text(sql),
        {"artist_id": artist_id, "photo_id": photo_id}
    )

    # If nothing deleted, it means wrong artist_id or photo_id
    if result.rowcount == 0:
        db.session.rollback()
        return jsonify({"error": "Photo not found for this artist"}), 404

    db.session.commit()
    return jsonify({"message": "Photo deleted", "photoId": photo_id}), 200



########################################################################################################

# ADMIN: create artist
@artists_bp.post("")
# @admin_required
def api_create_artist():
    try:
        data = request.get_json(silent=True) or {}

        stage_name = (data.get("stageName") or "").strip()
        if not stage_name:
            return jsonify({"success": False, "message": "stageName is required"}), 400

        params = {
            "ArtistId": 0,
            "StageName": stage_name,
            "FullName": (data.get("fullName") or "").strip() or None,
            "Bio": (data.get("bio") or "").strip() or None,
            "ProfileImageUrl": (data.get("profileImageUrl") or "").strip() or None,
            "Country": (data.get("country") or "").strip() or None,
            "PrimaryGenre": (data.get("primaryGenre") or "").strip() or None,
            "WebsiteUrl": (data.get("websiteUrl") or "").strip() or None,
            "IsActive": 1 if bool(data.get("isActive", True)) else 0,
        }

        row = db.session.execute(
            text("""
                SET NOCOUNT ON;
                EXEC dbo.UpsertArtist
                    @ArtistId=:ArtistId,
                    @StageName=:StageName,
                    @FullName=:FullName,
                    @Bio=:Bio,
                    @ProfileImageUrl=:ProfileImageUrl,
                    @Country=:Country,
                    @PrimaryGenre=:PrimaryGenre,
                    @WebsiteUrl=:WebsiteUrl,
                    @IsActive=:IsActive
            """),
            params
        ).mappings().first()

        db.session.commit()
        
        if not row:
            return jsonify({"success": False, "message": "Database did not return a new ArtistId."}), 500

        return jsonify({"success": True, "artistId": int(row["ArtistId"])}), 201

    except Exception as ex:
        db.session.rollback()
        return jsonify({"success": False, "message": str(ex)}), 500


# ADMIN: update artist
@artists_bp.put("/<int:artist_id>")
# @admin_required
def api_update_artist(artist_id: int):
    try:
        data = request.get_json(silent=True) or {}

        stage_name = (data.get("stageName") or "").strip()
        if not stage_name:
            return jsonify({"success": False, "message": "stageName is required"}), 400

        params = {
            "ArtistId": artist_id,
            "StageName": stage_name,
            "FullName": (data.get("fullName") or "").strip() or None,
            "Bio": (data.get("bio") or "").strip() or None,
            "ProfileImageUrl": (data.get("profileImageUrl") or "").strip() or None,
            "Country": (data.get("country") or "").strip() or None,
            "PrimaryGenre": (data.get("primaryGenre") or "").strip() or None,
            "WebsiteUrl": (data.get("websiteUrl") or "").strip() or None,
            "IsActive": 1 if bool(data.get("isActive", True)) else 0,
        }

        row = db.session.execute(
            text("""
                SET NOCOUNT ON;
                EXEC dbo.UpsertArtist
                    @ArtistId=:ArtistId,
                    @StageName=:StageName,
                    @FullName=:FullName,
                    @Bio=:Bio,
                    @ProfileImageUrl=:ProfileImageUrl,
                    @Country=:Country,
                    @PrimaryGenre=:PrimaryGenre,
                    @WebsiteUrl=:WebsiteUrl,
                    @IsActive=:IsActive
            """),
            params
        ).mappings().first()

        db.session.commit()
        
        if not row:
             return jsonify({"success": False, "message": "Database update failed (no ID returned)."}), 500

        return jsonify({"success": True, "artistId": int(row["ArtistId"])})

    except Exception as ex:
        db.session.rollback()
        return jsonify({"success": False, "message": str(ex)}), 500
# ---------------------------------------------------------
# ADMIN: HARD delete artist
# DELETE /api/artists/<artist_id>
# ---------------------------------------------------------
@artists_bp.delete("delete/<int:artist_id>")
def api_delete_artist_hard(artist_id: int):
    try:
        # If you don't have a stored procedure, do direct deletes like this:
        db.session.execute(text("DELETE FROM ArtistPhotos WHERE ArtistId = :id"), {"id": artist_id})
        db.session.execute(text("DELETE FROM ArtistSources WHERE ArtistId = :id"), {"id": artist_id})
        db.session.execute(text("DELETE FROM Activities WHERE ArtistId = :id"), {"id": artist_id})
        db.session.execute(text("DELETE FROM ArtistMetrics WHERE ArtistId = :id"), {"id": artist_id})


        # TODO: add other child tables here if you have them (activities, socials, etc.)

        result = db.session.execute(text("DELETE FROM Artists WHERE ArtistId = :id"), {"id": artist_id})

        if result.rowcount == 0:
            db.session.rollback()
            return jsonify({"success": False, "message": "Artist not found"}), 404

        db.session.commit()
        return jsonify({"success": True, "artistId": artist_id, "message": "Artist deleted"}), 200

    except Exception as ex:
        db.session.rollback()
        return jsonify({"success": False, "message": str(ex)}), 500

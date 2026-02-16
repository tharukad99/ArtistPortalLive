from flask import Blueprint, jsonify, request
from sqlalchemy import text
from ..extensions import db
from ..models import Activity

activities_bp = Blueprint("activities", __name__)

# Get activities for a specific artist
@activities_bp.get("/artist/<int:artist_id>")
def list_activities(artist_id):
    result = db.session.execute(
        text("EXEC dbo.usp_ListActivitiesByArtist :artist_id"),
        {"artist_id": artist_id}
    )

    rows = result.fetchall()

    return jsonify([
        {
            "id": row.ActivityId,
            "date": row.ActivityDate.strftime("%Y-%m-%d") if row.ActivityDate else None,
            "title": row.Title,
            "type": row.ActivityTypeName,
            "icon": row.IconName,
            "location": row.Location,
            "externalUrl": row.ExternalUrl,
            "description": row.Description
        }
        for row in rows
    ])


# ------------------------------------------------------------
# GET: Activity types (dropdown)
# GET /api/activitytypes
# ------------------------------------------------------------
@activities_bp.get("/activitytypes")
def list_activity_types():
    result = db.session.execute(text("EXEC dbo.usp_ListActivityTypes"))
    rows = result.fetchall()

    return jsonify([
        {
            "activityTypeId": r.ActivityTypeId,
            "name": r.Name,
            "iconName": r.IconName
        } for r in rows
    ])


# ------------------------------------------------------------
# GET: Activities by artist
# GET /api/activities/artist/<artist_id>
# ------------------------------------------------------------
@activities_bp.get("/artist/<int:artist_id>")
def list_activitiesbyId(artist_id):
    result = db.session.execute(
        text("EXEC dbo.usp_ListActivitiesByArtist :artist_id"),
        {"artist_id": artist_id}
    )
    rows = result.fetchall()

    return jsonify([
        {
            "id": r.ActivityId,
            "artistId": r.ArtistId,
            "activityTypeId": r.ActivityTypeId,  # ✅ important for update modal
            "date": r.ActivityDate.strftime("%Y-%m-%d") if r.ActivityDate else None,
            "title": r.Title,
            "type": r.ActivityTypeName,          # display
            "icon": r.IconName,                  # display
            "location": r.Location,
            "description": r.Description,
            "externalUrl": r.ExternalUrl
        }
        for r in rows
    ])


# ------------------------------------------------------------
# POST: Insert activity
# POST /api/activities/artist/<artist_id>
# ------------------------------------------------------------
@activities_bp.post("/artist/<int:artist_id>")
def insert_activity(artist_id):
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    activity_type_id = data.get("activityTypeId")

    if not title:
        return jsonify({"error": "title is required"}), 400
    if not activity_type_id:
        return jsonify({"error": "activityTypeId is required"}), 400

    new_id = db.session.execute(
        text("""
            EXEC dbo.usp_InsertActivity
              @ArtistId=:ArtistId,
              @ActivityTypeId=:ActivityTypeId,
              @Title=:Title,
              @Location=:Location,
              @ActivityDate=:ActivityDate,
              @Description=:Description,
              @ExternalUrl=:ExternalUrl
        """),
        {
            "ArtistId": artist_id,
            "ActivityTypeId": int(activity_type_id),
            "Title": title,
            "Location": (data.get("location") or "").strip() or None,
            "ActivityDate": data.get("date"),
            "Description": (data.get("description") or "").strip() or None,
            "ExternalUrl": (data.get("externalUrl") or "").strip() or None,
        }
    ).scalar()

    db.session.commit()
    return jsonify({"message": "Activity created", "activityId": int(new_id)}), 201


# ------------------------------------------------------------
# PUT: Update activity
# PUT /api/activities/artist/<artist_id>/<activity_id>
# ------------------------------------------------------------
@activities_bp.put("/artist/<int:artist_id>/<int:activity_id>")
def update_activity(artist_id, activity_id):
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    activity_type_id = data.get("activityTypeId")

    if not title:
        return jsonify({"error": "title is required"}), 400
    if not activity_type_id:
        return jsonify({"error": "activityTypeId is required"}), 400

    rows = db.session.execute(
        text("""
            EXEC dbo.usp_UpdateActivity
              @ActivityId=:ActivityId,
              @ArtistId=:ArtistId,
              @ActivityTypeId=:ActivityTypeId,
              @Title=:Title,
              @Location=:Location,
              @ActivityDate=:ActivityDate,
              @Description=:Description,
              @ExternalUrl=:ExternalUrl
        """),
        {
            "ActivityId": activity_id,
            "ArtistId": artist_id,
            "ActivityTypeId": int(activity_type_id),
            "Title": title,
            "Location": (data.get("location") or "").strip() or None,
            "ActivityDate": data.get("date"),
            "Description": (data.get("description") or "").strip() or None,
            "ExternalUrl": (data.get("externalUrl") or "").strip() or None,
        }
    ).scalar()

    if not rows:
        db.session.rollback()
        return jsonify({"error": "Activity not found"}), 404

    db.session.commit()
    return jsonify({"message": "Activity updated", "activityId": activity_id}), 200


# ------------------------------------------------------------
# DELETE: Delete activity
# DELETE /api/activities/artist/<artist_id>/<activity_id>
# ------------------------------------------------------------
@activities_bp.delete("/artist/<int:artist_id>/<int:activity_id>")
def delete_activity(artist_id, activity_id):
    rows = db.session.execute(
        text("EXEC dbo.usp_DeleteActivity @ActivityId=:ActivityId, @ArtistId=:ArtistId"),
        {"ActivityId": activity_id, "ArtistId": artist_id}
    ).scalar()

    if not rows:
        db.session.rollback()
        return jsonify({"error": "Activity not found"}), 404

    db.session.commit()
    return jsonify({"message": "Activity deleted", "activityId": activity_id}), 200
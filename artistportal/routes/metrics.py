# artistportal/routes/metrics.py
from flask import Blueprint, jsonify, request, current_app
from sqlalchemy import func, text
from ..extensions import db
from ..models import ArtistMetric, MetricType

metrics_bp = Blueprint("metrics", __name__)

# Summary Metrics Endpoint
@metrics_bp.get("/summary/<int:artist_id>")
def summary_metrics(artist_id):
    try:
        result = db.session.execute(
            text("EXEC dbo.GetArtistSummaryMetrics :artist_id"),
            {"artist_id": artist_id}
        )

        rows = result.fetchall()   # list of tuples: (Code, Value)

        data = {}
        for code, value in rows:
            # Guard against NULLs
            data[code] = float(value) if value is not None else None

        return jsonify(data)

    except Exception as e:
        # Log the real error so you can see what SQL / driver is complaining about
        current_app.logger.exception("Error in summary_metrics")
        return jsonify({"error": "Internal Server Error"}), 500

# Time Series Metrics Endpoint
@metrics_bp.get("/timeseries/<int:artist_id>")
def timeseries_metrics(artist_id):
    # default metric is still picked in backend; the *data logic* is in SQL
    metric_code = request.args.get("metric", "followers")
    try:
        result = db.session.execute(
            text("""
                EXEC dbo.GetArtistMetricTimeSeries 
                    @ArtistId = :artist_id,
                    @MetricCode = :metric_code
            """),
            {
                "artist_id": artist_id,
                "metric_code": metric_code
            }
        )
        rows = result.fetchall()   # list of tuples: (MetricDate, Value)

        data = []
        for metric_date, value in rows:
            # metric_date is a datetime/date object from SQLAlchemy
            data.append({
                "date": metric_date.strftime("%Y-%m-%d"),
                "value": float(value) if value is not None else None
            })
        return jsonify(data)
        
    except Exception as e:
        current_app.logger.exception("Error in timeseries_metrics")
        return jsonify({"error": "Internal Server Error"}), 500



####################################################



# -----------------------------
# NEW: Lists for dropdowns
# -----------------------------
@metrics_bp.get("/metrictypes")
def list_metric_types():
    rows = db.session.execute(text("EXEC dbo.usp_ListMetricTypes")).mappings().all()
    return jsonify([dict(r) for r in rows])


@metrics_bp.get("/platforms")
def list_platforms():
    rows = db.session.execute(text("EXEC dbo.usp_ListPlatforms")).mappings().all()
    return jsonify([dict(r) for r in rows])


# -----------------------------
# NEW: List metric rows for edit grid
# -----------------------------
@metrics_bp.get("/rows/<int:artist_id>")
def list_metric_rows(artist_id):
    rows = db.session.execute(
        text("EXEC dbo.usp_ListArtistMetricRowsByArtist :artist_id"),
        {"artist_id": artist_id}
    ).mappings().all()
    return jsonify([{
        "artistMetricId": r["ArtistMetricId"],
        "metricTypeId": r["MetricTypeId"],
        "metricTypeName": r["MetricTypeName"],
        "metricCode": r["MetricCode"],
        "groupName": r["GroupName"],
        "platformId": r["PlatformId"],
        "platformName": r["PlatformName"],
        "platformCode": r["PlatformCode"],
        "metricDate": r["MetricDate"].strftime("%Y-%m-%d") if r["MetricDate"] else None,
        "value": float(r["Value"]) if r["Value"] is not None else None
    } for r in rows])


# -----------------------------
# NEW: Insert metric row
# POST /api/metrics/rows/<artist_id>
# body: { metricTypeId, platformId?, metricDate, value }
# -----------------------------
@metrics_bp.post("/rows/<int:artist_id>")
def insert_metric_row(artist_id):
    body = request.get_json(silent=True) or {}
    metric_type_id = body.get("metricTypeId")
    platform_id = body.get("platformId")
    metric_date = body.get("metricDate")
    value = body.get("value")

    if not metric_type_id or not metric_date or value is None:
        return jsonify({"error": "metricTypeId, metricDate, value are required"}), 400

    try:
        new_id = db.session.execute(
            text("""
                EXEC dbo.usp_InsertArtistMetricRow
                    @ArtistId = :artist_id,
                    @MetricTypeId = :metric_type_id,
                    @PlatformId = :platform_id,
                    @MetricDate = :metric_date,
                    @Value = :value
            """),
            {
                "artist_id": artist_id,
                "metric_type_id": int(metric_type_id),
                "platform_id": int(platform_id) if platform_id not in (None, "", 0) else None,
                "metric_date": metric_date,
                "value": value
            }
        ).scalar()

        db.session.commit()
        return jsonify({"message": "Metric inserted", "artistMetricId": int(new_id)}), 201

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Error inserting metric row")
        return jsonify({"error": "Internal Server Error"}), 500


# -----------------------------
# NEW: Update metric row
# PUT /api/metrics/rows/<artist_id>/<metric_id>
# -----------------------------
@metrics_bp.put("/rows/<int:artist_id>/<int:metric_id>")
def update_metric_row(artist_id, metric_id):
    body = request.get_json(silent=True) or {}
    metric_type_id = body.get("metricTypeId")
    platform_id = body.get("platformId")
    metric_date = body.get("metricDate")
    value = body.get("value")

    if not metric_type_id or not metric_date or value is None:
        return jsonify({"error": "metricTypeId, metricDate, value are required"}), 400

    try:
        rows_affected = db.session.execute(
            text("""
                EXEC dbo.usp_UpdateArtistMetricRow
                    @ArtistMetricId = :metric_id,
                    @ArtistId = :artist_id,
                    @MetricTypeId = :metric_type_id,
                    @PlatformId = :platform_id,
                    @MetricDate = :metric_date,
                    @Value = :value
            """),
            {
                "metric_id": metric_id,
                "artist_id": artist_id,
                "metric_type_id": int(metric_type_id),
                "platform_id": int(platform_id) if platform_id not in (None, "", 0) else None,
                "metric_date": metric_date,
                "value": value
            }
        ).scalar()

        if not rows_affected:
            db.session.rollback()
            return jsonify({"error": "Metric row not found"}), 404

        db.session.commit()
        return jsonify({"message": "Metric updated", "artistMetricId": metric_id}), 200

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Error updating metric row")
        return jsonify({"error": "Internal Server Error"}), 500


# -----------------------------
# NEW: Delete metric row
# DELETE /api/metrics/rows/<artist_id>/<metric_id>
# -----------------------------
@metrics_bp.delete("/rows/<int:artist_id>/<int:metric_id>")
def delete_metric_row(artist_id, metric_id):
    try:
        rows_affected = db.session.execute(
            text("""
                EXEC dbo.usp_DeleteArtistMetricRow
                    @ArtistMetricId = :metric_id,
                    @ArtistId = :artist_id
            """),
            {"metric_id": metric_id, "artist_id": artist_id}
        ).scalar()

        if not rows_affected:
            db.session.rollback()
            return jsonify({"error": "Metric row not found"}), 404

        db.session.commit()
        return jsonify({"message": "Metric deleted", "artistMetricId": metric_id}), 200

    except Exception:
        db.session.rollback()
        current_app.logger.exception("Error deleting metric row")
        return jsonify({"error": "Internal Server Error"}), 500

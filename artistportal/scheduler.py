import atexit
import requests
from apscheduler.schedulers.background import BackgroundScheduler
import os

def trigger_my_api(app):
    """
    This function will be triggered by the background scheduler.
    It queries all artists and triggers the scrape API for each.
    """
    try:
        with app.app_context():
            from artistportal.models.models import Artist
            from artistportal.extensions import db
            
            # Query only the ArtistId to avoid DB schema mismatches (like missing 'SourcesCount') and improve performance
            artist_records = db.session.query(Artist.ArtistId).all()
            print(f"APScheduler: Found {len(artist_records)} artists. Running scheduled API triggers...")
            
            for record in artist_records:
                artist_id = record.ArtistId
                url = f"http://127.0.0.1:5000/api/metrics/scrape/{artist_id}"
                
                try:
                    response = requests.post(url)
                    print(f"API Trigger Response for Artist {artist_id}: {response.status_code}")
                except Exception as e:
                    print(f"API Trigger failed for Artist {artist_id}: {e}")
                
    except Exception as e:
        print(f"APScheduler Error triggering API: {e}")

# Keep a reference to the socket so it isn't garbage collected!
_scheduler_lock_socket = None

def init_scheduler(app):
    """
    Initializes and starts the APScheduler.
    """
    # Prevent scheduler from running twice in Flask debug mode using a socket lock
    if os.environ.get("WERKZEUG_RUN_MAIN") != "true" and app.debug:
        return

    # A robust check to ensure that only 1 scheduler can run across multiple processes
    import socket
    global _scheduler_lock_socket
    try:
        _scheduler_lock_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        _scheduler_lock_socket.bind(("127.0.0.1", 47200))
    except socket.error:
        print("APScheduler: Another instance is already running.")
        return

    scheduler = BackgroundScheduler()

    # Add job to the scheduler. 
    
    # scheduler.add_job(
    #     func=trigger_my_api,
    #     trigger="interval",
    #     weeks=1,  # <-- Runs 1 time per week
    #     id="api_trigger_job",
    #     replace_existing=True
    # )


    scheduler.add_job(
    func=trigger_my_api,
    args=[app],
    trigger="cron",
    day_of_week="thu", # <-- Runs every Thursday at 4.00 PM
    hour=16,
    minute=00,
    id="api_trigger_job",
    replace_existing=True
    )





    # Start the scheduler
    scheduler.start()
    print("APScheduler started successfully. Scheduled 'trigger_my_api'.")

    # Ensure scheduler stops properly when the app exits
    atexit.register(lambda: scheduler.shutdown(wait=False))

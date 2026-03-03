from app import app
from artistportal.extensions import db
from sqlalchemy import text

with app.app_context():
    try:
        res = db.session.execute(text("SELECT PlatformId, Code, Name FROM Platforms"))
        for row in res:
            print(row)
    except Exception as e:
        print("Error:", e)

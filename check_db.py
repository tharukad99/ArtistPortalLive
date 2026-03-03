from app import app
from artistportal.extensions import db
from sqlalchemy import text

with app.app_context():
    try:
        res = db.session.execute(text('SELECT TOP 1 * FROM MasterspotifyUerId'))
        print(res.keys())
    except Exception as e:
        print(e)

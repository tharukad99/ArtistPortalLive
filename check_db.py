from artistportal import create_app
from artistportal.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        sql1 = text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PortalUsers'")
        rows1 = db.session.execute(sql1).all()
        print('PortalUsers columns:', [r[0] for r in rows1])
        
        sql2 = text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'UserArtists'")
        rows2 = db.session.execute(sql2).all()
        print('UserArtists columns:', [r[0] for r in rows2])
        
        sql3 = text("SELECT COUNT(*) FROM UserArtists")
        rows3 = db.session.execute(sql3).scalar()
        print('UserArtists count:', rows3)
    except Exception as e:
        print('Error:', e)

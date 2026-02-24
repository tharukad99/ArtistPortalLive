# config.py
import urllib.parse
import os

class Config:
    DEBUG = os.environ.get("FLASK_DEBUG", "True") == "True"
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret")

    # Database configuration with environment variable overrides
    # Default values are currently set to your development environments
    DB_DRIVER = os.environ.get("DB_DRIVER", "{ODBC Driver 18 for SQL Server}")
    DB_SERVER = os.environ.get("DB_SERVER", "tharukatest.database.windows.net,1433")
    DB_DATABASE = os.environ.get("DB_DATABASE", "ARTISTSPORTALDB")
    DB_USER = os.environ.get("DB_USER", "tharuka")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "Dilshan6116")

    # Construct the connection string
    params = urllib.parse.quote_plus(
        f"DRIVER={DB_DRIVER};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_DATABASE};"
        f"UID={DB_USER};"
        f"PWD={DB_PASSWORD};"
        "Encrypt=yes;"
        "TrustServerCertificate=no;"
        "Connection Timeout=30;"
    )

    SQLALCHEMY_DATABASE_URI = f"mssql+pyodbc:///?odbc_connect={params}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

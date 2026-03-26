import urllib.parse
import os

class Config:
    DEBUG = os.environ.get("FLASK_DEBUG", "True") == "True"
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret")

    # Database configuration with environment variable overrides
    # Default values are currently set to your development environment
    DB_DRIVER = os.environ.get("DB_DRIVER", "{ODBC Driver 18 for SQL Server}")
    DB_SERVER = os.environ.get("DB_SERVER", "tharukatest.database.windows.net,1433")
    DB_DATABASE = os.environ.get("DB_DATABASE", "ARTISTSPORTALDBLIVE")
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


#=====================Local SQL Server======================================================

# config.py
# import urllib.parse
# import os

# class Config:
#     DEBUG = True
#     SECRET_KEY = "dev-secret"

#     # Local SQL Server settings
#     DB_DRIVER = "{ODBC Driver 17 for SQL Server}"
#     DB_SERVER = r"THARUKA\MSSQL"
#     DB_DATABASE = "ARTISTSPORTALDB"

#     params = urllib.parse.quote_plus(
#         f"DRIVER={DB_DRIVER};"
#         f"SERVER={DB_SERVER};"
#         f"DATABASE={DB_DATABASE};"
#         "Trusted_Connection=yes;"
#         "TrustServerCertificate=yes;"
#     )

#     SQLALCHEMY_DATABASE_URI = f"mssql+pyodbc:///?odbc_connect={params}"
#     SQLALCHEMY_TRACK_MODIFICATIONS = False




#email sending settings

    # EmailJS settings test email
    # EMAILJS_SERVICE_ID = "service_w2fccgp"
    # EMAILJS_TEMPLATE_ID = "template_ue0peal"
    # EMAILJS_PUBLIC_KEY = "vwcoJIUUH5bkSfzRS"
    # EMAILJS_PRIVATE_KEY = "G-KwZG22fVHhFx6-0EF2E"

    # EmailJS settings Artisights email
    EMAILJS_SERVICE_ID = "service_w6qp9kr"
    EMAILJS_TEMPLATE_ID = "template_1m1eve5"
    EMAILJS_PUBLIC_KEY = "vwcoJIUUH5bkSfzRS"
    EMAILJS_PRIVATE_KEY = "G-KwZG22fVHhFx6-0EF2E"
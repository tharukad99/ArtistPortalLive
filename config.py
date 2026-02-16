# # config.py
# import urllib.parse
# import os

# class Config:
#     DEBUG = True
#     SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret")

#     DB_USER = os.environ.get("THARUKA\tharu", "sa")
#     DB_PASSWORD = os.environ.get("6116", "yourStrong(!)Password")
#     DB_SERVER = os.environ.get("DB_SERVER", "localhost\\SQLEXPRESS")
#     DB_NAME = os.environ.get("ARTISTSPORTALDB", "ArtistPortal")

#     params = urllib.parse.quote_plus(
#         # f"DRIVER={{ODBC Driver 17 for SQL Server}};"
#         # f"SERVER={DB_SERVER};"
#         # f"DATABASE={DB_NAME};"
#         # f"UID={DB_USER};"
#         # f"PWD={DB_PASSWORD};"
#         # "TrustServerCertificate=yes;"
#         "DRIVER={ODBC Driver 17 for SQL Server};"
#         "SERVER=THARUKA\MSSQL;"
#         "DATABASE=ARTISTSPORTALDB;"
#         "Trusted_Connection=Yes;"
#         "TrustServerCertificate=Yes;"
#     )

#     SQLALCHEMY_DATABASE_URI = f"mssql+pyodbc:///?odbc_connect={params}"
#     SQLALCHEMY_TRACK_MODIFICATIONS = False

#     SECRET_KEY = "change-this-to-a-random-long-string"


# config.py
import urllib.parse
import os

class Config:
    DEBUG = True
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret")

    # DB_SERVER = os.environ.get("DB_SERVER", "tharukatest.database.windows.ne")
    # DB_NAME = os.environ.get("DB_NAME", "ARTISTSPORTALDB")
    # DB_USER = os.environ.get("DB_USER", "tharuka")
    # DB_PASSWORD = os.environ.get("DB_PASSWORD", "Dilshan6116")

    params = urllib.parse.quote_plus(
         "DRIVER={ODBC Driver 17 for SQL Server};"
        f"SERVER=tharukatest.database.windows.net,1433;"
        f"DATABASE=ARTISTSPORTALDB;"
        f"UID=tharuka;"
        f"PWD=Dilshan6116;"
        "Encrypt=yes;"
        "TrustServerCertificate=no;"
        "Connection Timeout=30;"
    )

    SQLALCHEMY_DATABASE_URI = f"mssql+pyodbc:///?odbc_connect={params}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

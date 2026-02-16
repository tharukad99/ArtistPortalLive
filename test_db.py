import pyodbc
print(pyodbc.drivers())

conn_str = (
    # "DRIVER={ODBC Driver 17 for SQL Server};"
    # "SERVER=THARUKA\MSSQL;"
    # "DATABASE=ARTISTSPORTALDB;"
    # "Trusted_Connection=Yes;"
    # "TrustServerCertificate=Yes;"
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=tcp:tharukatest.database.windows.net,1433;"
    "Database=ARTISTSPORTALDB;Uid=tharuka;"
    "Pwd=Dilshan6116;"
    "Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
)




conn = pyodbc.connect(conn_str)
print("Connected!")
#!/bin/bash
# startup.sh

# Update package lists
apt-get update

# Install prerequisites
apt-get install -y gnupg2 curl

# Register the Microsoft repository GPG keys
curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -

# Register the Microsoft SQL Server Ubuntu repository
# Note: Adjust the version (e.g., debian/11) based on the Azure Python image version if needed.
# Python 3.10+ images often use Debian 11 (bullseye).
curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list

# Update the package list again with the new repository
apt-get update

# Install the ODBC Driver 18 for SQL Server
# 'ACCEPT_EULA=Y' accepts the end-user licensing agreement
ACCEPT_EULA=Y apt-get install -y msodbcsql18
#ACCEPT_EULA=Y apt-get install -y msodbcsql17

# Install optional: unixODBC development headers (often needed for pyodbc)
apt-get install -y unixodbc-dev

# Start the application using Gunicorn
# Adjust the workers and timeout as necessary
gunicorn --bind=0.0.0.0:8000 --timeout 600 app:app

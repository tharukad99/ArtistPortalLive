from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from ..extensions import db

"""
Defines the User model mapped to the 'PortalUsers' table.
This model handles authentication and user roles.
"""

class User(db.Model, UserMixin):
    __tablename__ = "PortalUsers"

    UserId = db.Column(db.Integer, primary_key=True)
    Username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    PasswordHash = db.Column(db.String(255), nullable=False)
    DisplayName = db.Column(db.String(150), nullable=False)
    IsAdmin = db.Column(db.Boolean, default=False)
    Role = db.Column(db.String(20), nullable=False, default="admin")
    IsActive = db.Column(db.Boolean, default=True)
    DateCreated = db.Column(db.DateTime, default=datetime.utcnow)
    ArtistId = db.Column(db.Integer, nullable=True)

    """
    Returns the unique identifier for the user (required by Flask-Login).
    """
    def get_id(self):
        return str(self.UserId)

    """
    Sets the user's password using a secure hash.
    """
    def set_password(self, password: str) -> None:
        self.PasswordHash = generate_password_hash(password)

    """
    Checks if the provided password matches the stored hash.
    """
    def check_password(self, password: str) -> bool:
        return check_password_hash(self.PasswordHash, password)

    """
    Checks if the user has admin privileges based on their role.
    """
    def is_admin(self) -> bool:
        return self.Role.lower() == "admin"


"""
Defines the Artist model mapped to the 'Artists' table.
"""
class Artist(db.Model):
    __tablename__ = "Artists"

    ArtistId = db.Column(db.Integer, primary_key=True)
    StageName = db.Column(db.String(150), nullable=False)
    FullName = db.Column(db.String(200))
    Bio = db.Column(db.Text)
    ProfileImageUrl = db.Column(db.String(500))
    Country = db.Column(db.String(100))
    PrimaryGenre = db.Column(db.String(100))
    WebsiteUrl = db.Column(db.String(500))
    DateCreated = db.Column(db.DateTime, default=datetime.utcnow)
    IsActive = db.Column(db.Boolean, default=True)
    SourcesCount = db.Column(db.Integer)

    # Relationships
    sources = db.relationship("ArtistSource", backref="artist", lazy=True)
    activities = db.relationship("Activity", backref="artist", lazy=True)
    metrics = db.relationship("ArtistMetric", backref="artist", lazy=True)


"""
Defines the SourceType model for categorizing artist sources (e.g., Spotify, Instagram).
"""
class SourceType(db.Model):
    __tablename__ = "SourceTypes"

    SourceTypeId = db.Column(db.Integer, primary_key=True)
    Name = db.Column(db.String(100), nullable=False)
    Code = db.Column(db.String(50), nullable=False, unique=True)
    IconName = db.Column(db.String(100))

    artist_sources = db.relationship("ArtistSource", backref="source_type", lazy=True)


"""
Defines the ArtistSource model linking artists to specific sources/platforms.
"""
class ArtistSource(db.Model):
    __tablename__ = "ArtistSources"

    ArtistSourceId = db.Column(db.Integer, primary_key=True)
    ArtistId = db.Column(db.Integer, db.ForeignKey("Artists.ArtistId"), nullable=False)
    SourceTypeId = db.Column(db.Integer, db.ForeignKey("SourceTypes.SourceTypeId"), nullable=False)
    DisplayName = db.Column(db.String(150))
    Url = db.Column(db.String(500), nullable=False)
    Handle = db.Column(db.String(150))
    IsPrimary = db.Column(db.Boolean, default=False)
    DateAdded = db.Column(db.DateTime, default=datetime.utcnow)


"""
Defines the ActivityType model for categorizing activities (e.g., Release, Concert).
"""
class ActivityType(db.Model):
    __tablename__ = "ActivityTypes"

    ActivityTypeId = db.Column(db.Integer, primary_key=True)
    Name = db.Column(db.String(100), nullable=False)
    IconName = db.Column(db.String(100))


"""
Defines the Activity model representing events or releases associated with an artist.
"""
class Activity(db.Model):
    __tablename__ = "Activities"

    ActivityId = db.Column(db.Integer, primary_key=True)
    ArtistId = db.Column(db.Integer, db.ForeignKey("Artists.ArtistId"), nullable=False)
    ActivityTypeId = db.Column(db.Integer, db.ForeignKey("ActivityTypes.ActivityTypeId"), nullable=False)
    Title = db.Column(db.String(200), nullable=False)
    Location = db.Column(db.String(200))
    ActivityDate = db.Column(db.Date, nullable=False)
    Description = db.Column(db.Text)
    ExternalUrl = db.Column(db.String(500))
    DateCreated = db.Column(db.DateTime, default=datetime.utcnow)

    activity_type = db.relationship("ActivityType")


"""
Defines the MetricType model for different kinds of metrics (e.g., Followers, Streams).
"""
class MetricType(db.Model):
    __tablename__ = "MetricTypes"

    MetricTypeId = db.Column(db.Integer, primary_key=True)
    Name = db.Column(db.String(100), nullable=False)
    Code = db.Column(db.String(50), nullable=False, unique=True)
    GroupName = db.Column(db.String(50), nullable=False)
    Unit = db.Column(db.String(50))


"""
Defines the Platform model representing where metrics are gathered from.
"""
class Platform(db.Model):
    __tablename__ = "Platforms"

    PlatformId = db.Column(db.Integer, primary_key=True)
    Name = db.Column(db.String(100), nullable=False)
    Code = db.Column(db.String(50), nullable=False, unique=True)


"""
Defines the ArtistMetric model storing time-series data for artist metrics.
"""
class ArtistMetric(db.Model):
    __tablename__ = "ArtistMetrics"

    ArtistMetricId = db.Column(db.Integer, primary_key=True)
    ArtistId = db.Column(db.Integer, db.ForeignKey("Artists.ArtistId"), nullable=False)
    MetricTypeId = db.Column(db.Integer, db.ForeignKey("MetricTypes.MetricTypeId"), nullable=False)
    PlatformId = db.Column(db.Integer, db.ForeignKey("Platforms.PlatformId"))
    MetricDate = db.Column(db.Date, nullable=False)
    Value = db.Column(db.Numeric(18, 2), nullable=False)
    DateCreated = db.Column(db.DateTime, default=datetime.utcnow)

    metric_type = db.relationship("MetricType")
    platform = db.relationship("Platform")


class MasterUserName(db.Model):
    __tablename__ = "MasterUserName"

    id = db.Column(db.Integer, primary_key=True)
    artistid = db.Column(db.Integer, db.ForeignKey("Artists.ArtistId"), nullable=False, unique=True)
    fb_username = db.Column(db.String(255))
    insta_username = db.Column(db.String(255))
    createdate = db.Column(db.DateTime, default=datetime.utcnow)

    artist = db.relationship("Artist", backref=db.backref("master_username", uselist=False))


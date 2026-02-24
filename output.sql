--- usp_InsertArtistMetricRow SP CODE ---
CREATE   PROCEDURE [dbo].[usp_InsertArtistMetricRow]
    @ArtistId INT,
    @MetricTypeId INT,
    @PlatformId INT = NULL,
    @MetricDate DATE,
    @Value DECIMAL(18,2)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.ArtistMetrics (ArtistId, MetricTypeId, PlatformId, MetricDate, Value, DateCreated)
    VALUES (@ArtistId, @MetricTypeId, @PlatformId, @MetricDate, @Value, SYSUTCDATETIME());

    SELECT SCOPE_IDENTITY() AS ArtistMetricId;
END


--- MasterUserName Table CREATE SQL ---

CREATE TABLE MasterUserName (
    id INT IDENTITY(1,1) PRIMARY KEY,
    artistid INT NOT NULL,
    fb_username NVARCHAR(255) NULL,
    insta_username NVARCHAR(255) NULL,
    createdate DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_MasterUserName_Artists FOREIGN KEY (artistid) REFERENCES Artists(ArtistId)
);

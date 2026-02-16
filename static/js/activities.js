document.addEventListener("DOMContentLoaded", () => {
    const artistId = document.getElementById("artist-id").value;
    loadArtistSidebar(artistId);
    loadActivitiesTimeline(artistId);
});

// Re-use sidebar loader (same pattern as dashboard.js)
function loadArtistSidebar(artistId) {
    fetch(`/api/artists/${artistId}`)
        .then(r => r.json())
        .then(artist => {
            const nameEl = document.getElementById("sidebar-artist-name");
            const imgEl = document.getElementById("sidebar-artist-image");

            if (nameEl) nameEl.textContent = artist.stageName;
            if (imgEl) {
                imgEl.src = artist.profileImageUrl ||
                    "https://via.placeholder.com/80x80?text=A";
            }
        })
        .catch(err => console.error("Error loading artist:", err));
}

// Map activity type -> icon (you can change these to FontAwesome if you want)
const iconMap = {
    "Concert": "🎵",
    "Video Uploaded": "▶️",
    "Google Campaign": "🅶",
    "New Album": "💿",
    "Podcast Release": "🎙️",
    "Spotify Release": "🎧"
};


function loadActivitiesTimeline(artistId) {
    fetch(`/api/activities/artist/${artistId}`)
        .then(r => r.json())
        .then(items => {
            const container = document.getElementById("activities-timeline");
            container.innerHTML = "";

            if (!items || items.length === 0) {
                container.textContent = "No activities yet.";
                return;
            }

            // Sort by date ascending
            items.sort((a, b) => {
                return new Date(b.date) - new Date(a.date);
            });

            // Group by date (YYYY-MM-DD)
            const groups = {};
            items.forEach(act => {
                const key = act.date;
                if (!groups[key]) groups[key] = [];
                groups[key].push(act);
            });

            Object.keys(groups)
                .sort((a, b) => new Date(b) - new Date(a))
                .forEach(dateKey => {
                    const groupDiv = document.createElement("div");
                    groupDiv.className = "timeline-date-group";

                    // Date label
                    const dateLabel = document.createElement("div");
                    dateLabel.className = "timeline-date-label";
                    dateLabel.textContent = formatNiceDate(dateKey);
                    groupDiv.appendChild(dateLabel);

                    groups[dateKey].forEach(act => {
                        const row = document.createElement("div");
                        row.className = "timeline-row";

                        // Marker column
                        const marker = document.createElement("div");
                        marker.className = "timeline-marker";

                        const dot = document.createElement("div");
                        dot.className = "timeline-dot";
                        marker.appendChild(dot);

                        // Content row (icon + text + optional link)
                        const content = document.createElement("div");
                        content.className = "timeline-entry";

                        // Left icon
                        const iconSpan = document.createElement("span");
                        iconSpan.className = "timeline-icon";
                        iconSpan.textContent = iconMap[act.type] || "•";

                        // Title text
                        const textSpan = document.createElement("span");
                        textSpan.className = "timeline-text";
                        textSpan.textContent = act.title;

                        content.appendChild(iconSpan);
                        content.appendChild(textSpan);

                        // ✅ Optional reference link icon on the right
                        if (act.externalUrl && act.externalUrl.trim() !== "") {
                            const link = document.createElement("a");
                            link.className = "timeline-link";
                            link.href = act.externalUrl;
                            link.target = "_blank";
                            link.rel = "noopener noreferrer";
                            link.title = "Open link";

                            const icon = document.createElement("i");
                            icon.className = "fa-solid fa-arrow-up-right-from-square";

                            link.appendChild(icon);
                            content.appendChild(link);
                        }

                        row.appendChild(marker);
                        row.appendChild(content);
                        groupDiv.appendChild(row);
                    });

                    container.appendChild(groupDiv);
                });
        })
        .catch(err => console.error("Error loading activities:", err));
}

// Format date nicely based on whether it's the current year
function formatNiceDate(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const sameYear = d.getFullYear() === now.getFullYear();

    if (sameYear) {
        // "February 15"
        return d.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long"
        });
    } else {
        // "20 June 2024"
        return d.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }
}

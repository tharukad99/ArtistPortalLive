/* ---------- Initialization ---------- */
document.addEventListener("DOMContentLoaded", () => {
    const artistId = document.getElementById("artist-id").value;
    loadSocialLinks(artistId);
    loadArtistSidebar(artistId);
    loadSummaryCards(artistId);
    loadGrowthChart(artistId);
    loadEngagementChart(artistId);
    loadRecentActivities(artistId);
});

/* ---------- Social Links ---------- */
const iconMap = {
    facebook: "fa-brands fa-facebook-f",
    spotify: "fa-brands fa-spotify",
    instagram: "fa-brands fa-instagram",
    bandcamp: "fa-brands fa-bandcamp",
    website: "fa-solid fa-globe",
    apple_music: "fa-brands fa-apple",
    youtube: "fa-brands fa-youtube",
    emubands: "fa-solid fa-music",
    bbc_sounds: "fa-solid fa-radio",
    acast: "fa-solid fa-podcast",
    twitter_x: "fa-brands fa-x-twitter"
};

/* Load and render social links for the artist */
function loadSocialLinks(artistId) {
    fetch(`/api/sources/${artistId}/sources`)
        .then(r => r.json())
        .then(items => {
            const container = document.getElementById("social-links");
            container.innerHTML = "";

            if (!items || items.length === 0) {
                container.innerHTML = "<div>No social links found.</div>";
                return;
            }

            items.forEach(x => {
                const a = document.createElement("a");
                a.className = "social-link";
                a.href = x.url;
                a.target = "_blank";
                a.rel = "noopener noreferrer";

                const icon = document.createElement("i");
                icon.className = `social-icon ${iconMap[x.sourceCode] || "fa-solid fa-link"}`;

                const text = document.createElement("div");
                text.className = "social-text";

                const name = document.createElement("div");
                name.className = "social-name";
                name.textContent = x.displayName || x.sourceName;

                const url = document.createElement("div");
                url.className = "social-url";
                url.textContent = x.handle ? x.handle : x.url;

                text.appendChild(name);
                text.appendChild(url);

                a.appendChild(icon);
                a.appendChild(text);

                container.appendChild(a);
            });
        })
        .catch(err => console.error("Social links load error:", err));
}

/* ---------- Charts ---------- */
let growthChart = null;
let engagementChart = null;

function loadArtistSidebar(artistId) {
    fetch(`/api/artists/${artistId}`)
        .then(r => r.json())
        .then(artist => {
            document.getElementById("sidebar-artist-name").textContent = artist.stageName;
            if (artist.profileImageUrl) {
                document.getElementById("sidebar-artist-image").src = artist.profileImageUrl;
            } else {
                document.getElementById("sidebar-artist-image").src =
                    "https://via.placeholder.com/80x80?text=Artist";
            }
        })
        .catch(err => console.error("Error loading artist:", err));
}

/* Load summary cards data */
function loadSummaryCards(artistId) {
    fetch(`/api/metrics/summary/${artistId}`)
        .then(r => r.json())
        .then(data => {
            document.getElementById("followers-count").textContent = formatNumber(data.followers);
            document.getElementById("views-count").textContent     = formatNumber(data.views);
            document.getElementById("streams-count").textContent   = formatNumber(data.streams);
            document.getElementById("tickets-count").textContent   = formatNumber(data.tickets);
        })
        .catch(err => console.error("Error loading summary:", err));
}

/* Load growth chart data */
function loadGrowthChart(artistId) {
    fetch(`/api/metrics/timeseries/${artistId}?metric=followers`)
        .then(r => r.json())
        .then(points => {
            const labels = points.map(p => formatMonth(p.date));
            const values = points.map(p => p.value);

            const ctx = document.getElementById("growth-chart").getContext("2d");

            if (growthChart) growthChart.destroy();

            growthChart = new Chart(ctx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{
                        label: "Followers",
                        data: values,
                        fill: false,
                        borderColor: "#3b82f6",
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 3
                    }]
                },
                options: {
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        })
        .catch(err => console.error("Error loading growth chart:", err));
}

// For engagement chart we’ll call your timeseries endpoint three times
function loadEngagementChart(artistId) {
    const metrics = ["likes", "comments", "shares"];

    Promise.all(
        metrics.map(code =>
            fetch(`/api/metrics/timeseries/${artistId}?metric=${code}`).then(r => r.json())
        )
    ).then(results => {
        // Assume all have same dates; use first metric's dates as labels
        const labels = results[0].map(p => formatMonth(p.date));
        const datasets = [];

        const colors = ["#6366f1", "#10b981", "#f97316"];

        results.forEach((series, idx) => {
            datasets.push({
                label: metrics[idx].charAt(0).toUpperCase() + metrics[idx].slice(1),
                data: series.map(p => p.value),
                backgroundColor: colors[idx]
            });
        });

        const ctx = document.getElementById("engagement-chart").getContext("2d");
        if (engagementChart) engagementChart.destroy();

        engagementChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: "bottom" }
                },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true }
                }
            }
        });
    }).catch(err => console.error("Error loading engagement chart:", err));
}

/* Helpers */
function formatNumber(n) {
    if (n == null) return "-";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000)    return (n / 1000).toFixed(1) + "k";
    return n.toString();
}

function formatMonth(dateStr) {
    const d = new Date(dateStr);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return months[d.getUTCMonth()];
}

function formatPrettyDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

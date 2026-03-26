/* ---------- Initialization ---------- */
document.addEventListener("DOMContentLoaded", () => {
    const artistId = document.getElementById("artist-id").value;
    loadSocialLinks(artistId);
    loadArtistSidebar(artistId);
    loadSummaryCards(artistId);
    loadGrowthChart(artistId);
    loadEngagementChart(artistId);
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
    twitter_x: "fa-brands fa-x-twitter",
    soundcloud: "fa-brands fa-soundcloud"
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
    fetch(`/api/metrics/rows/${artistId}`)
        .then(r => r.json())
        .then(rows => {
            const followerRows = rows.filter(r => r.metricTypeId === 1);

            const latestByPlatform = {};
            followerRows.forEach(r => {
                const pName = (r.platformName || "Unknown").toLowerCase();
                if (!latestByPlatform[pName] || r.metricDate > latestByPlatform[pName].date) {
                    latestByPlatform[pName] = { date: r.metricDate, value: Number(r.value || 0) };
                }
            });

            let fb = latestByPlatform["facebook"] ? latestByPlatform["facebook"].value : 0;
            let ig = latestByPlatform["instagram"] ? latestByPlatform["instagram"].value : 0;
            let yt = latestByPlatform["youtube"] ? latestByPlatform["youtube"].value : 0;
            let sp = latestByPlatform["spotify"] ? latestByPlatform["spotify"].value : 0;
            let bc = latestByPlatform["bandcamp"] ? latestByPlatform["bandcamp"].value : 0;

            let totalFollowers = Object.values(latestByPlatform).reduce((sum, p) => sum + p.value, 0);

            const tfObj = document.getElementById("total-followers-count");
            if (tfObj) tfObj.textContent = totalFollowers.toLocaleString();

            const fbObj = document.getElementById("facebook-followers-count");
            if (fbObj) fbObj.textContent = fb.toLocaleString();

            const igObj = document.getElementById("instagram-followers-count");
            if (igObj) igObj.textContent = ig.toLocaleString();

            const ytObj = document.getElementById("youtube-followers-count");
            if (ytObj) ytObj.textContent = yt.toLocaleString();

            const spObj = document.getElementById("spotify-followers-count");
            if (spObj) spObj.textContent = sp.toLocaleString();

            const bcObj = document.getElementById("bandcamp-followers-count");
            if (bcObj) bcObj.textContent = bc.toLocaleString();
        })
        .catch(err => console.error("Error loading summary:", err));
}


/* Load growth chart data */
function loadGrowthChart(artistId) {
    Promise.all([
        fetch(`/api/metrics/rows/${artistId}`).then(r => r.json()),
        fetch(`/api/activities/artist/${artistId}`).then(r => r.json()).catch(() => [])
    ])
        .then(([rows, activities]) => {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const cutoffDate = oneYearAgo.toISOString().split('T')[0];

            // 1. Filter for Followers (MetricTypeId 1) and from the last 1 year
            const followerRows = rows.filter(r => r.metricTypeId === 1 && r.metricDate >= cutoffDate);
            activities = activities.filter(a => a.date && a.date >= cutoffDate);

            // 2. Group by Date and Sum values
            const dailyTotals = {};
            const platformTotals = {
                'facebook': {},
                'instagram': {},
                'youtube': {},
                'spotify': {}
            };

            followerRows.forEach(r => {
                const d = r.metricDate;
                const pName = (r.platformName || "Unknown").toLowerCase();

                if (!dailyTotals[d]) dailyTotals[d] = 0;
                dailyTotals[d] += Number(r.value || 0);

                if (platformTotals[pName]) {
                    if (!platformTotals[pName][d]) platformTotals[pName][d] = 0;
                    platformTotals[pName][d] += Number(r.value || 0);
                }
            });

            // 3. For each month, find the last available exact date for follower metrics.
            const lastDatePerMonth = {};
            Object.keys(dailyTotals).forEach(d => {
                const month = d.substring(0, 7); // 'YYYY-MM'
                if (!lastDatePerMonth[month] || d > lastDatePerMonth[month]) {
                    lastDatePerMonth[month] = d;
                }
            });

            // X-axis should have 1st of every month + exact dates of activities
            const allDatesSet = new Set();
            Object.keys(lastDatePerMonth).forEach(m => allDatesSet.add(`${m}-01`));
            activities.forEach(a => {
                if (a.date) allDatesSet.add(a.date);
            });
            const sortedDates = Array.from(allDatesSet).sort();

            const formatPretty = (dateStr) => {
                const d = new Date(dateStr);
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return months[d.getUTCMonth()];
            };

            const labels = sortedDates.map(d => formatPretty(d));

            const values = [];
            const fbValues = [];
            const igValues = [];
            const ytValues = [];
            const spValues = [];
            const eventValues = [];
            const eventTitles = [];

            let lastTotal = 0;
            let firstKnownTotal = 0;
            // Get initial lastTotal from the first month
            if (sortedDates.length > 0) {
                const firstMonth = sortedDates[0].substring(0, 7);
                const actualDate = lastDatePerMonth[firstMonth];
                if (actualDate && dailyTotals[actualDate] !== undefined) {
                    firstKnownTotal = dailyTotals[actualDate];
                }
            }
            if (lastTotal === 0) lastTotal = firstKnownTotal;

            sortedDates.forEach(d => {
                const isFirstOfMonth = d.endsWith("-01");
                const month = d.substring(0, 7);

                let currentTotal = null;
                let fb = null, ig = null, yt = null, sp = null;

                // Only plot follower data on the 1st of the month
                if (isFirstOfMonth) {
                    const actualDate = lastDatePerMonth[month];
                    if (actualDate) {
                        currentTotal = dailyTotals[actualDate] !== undefined ? dailyTotals[actualDate] : null;
                        fb = platformTotals['facebook'][actualDate] !== undefined ? platformTotals['facebook'][actualDate] : null;
                        ig = platformTotals['instagram'][actualDate] !== undefined ? platformTotals['instagram'][actualDate] : null;
                        yt = platformTotals['youtube'][actualDate] !== undefined ? platformTotals['youtube'][actualDate] : null;
                        sp = platformTotals['spotify'][actualDate] !== undefined ? platformTotals['spotify'][actualDate] : null;
                    }
                }

                if (currentTotal !== null) lastTotal = currentTotal;

                values.push(currentTotal);
                fbValues.push(fb);
                igValues.push(ig);
                ytValues.push(yt);
                spValues.push(sp);

                const acts = activities.filter(a => a.date === d);
                if (acts.length > 0) {
                    eventTitles.push(acts.map(a => a.title).join(", "));
                    // Use exact date metric if available, else use last known total
                    eventValues.push(dailyTotals[d] !== undefined ? dailyTotals[d] : lastTotal);
                } else {
                    eventTitles.push(null);
                    eventValues.push(null);
                }
            });

            const chartEl = document.getElementById("growth-chart");
            if (!chartEl) return;
            const ctx = chartEl.getContext("2d");

            if (growthChart) growthChart.destroy();

            growthChart = new Chart(ctx, {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: "Activities",
                            data: eventValues,
                            showLine: false,
                            pointStyle: 'circle',
                            pointRadius: 6,
                            pointHoverRadius: 8,
                            borderColor: "#FFD700",
                            backgroundColor: "#FFD700",
                            borderWidth: 2
                        },
                        {
                            label: "Total Followers",
                            data: values,
                            fill: false,
                            borderColor: "#111827",
                            backgroundColor: "#111827",
                            borderWidth: 3,
                            tension: 0.4,
                            pointRadius: 4,
                            spanGaps: true
                        },
                        {
                            label: "Facebook",
                            data: fbValues,
                            fill: false,
                            borderColor: "#1877f2",
                            backgroundColor: "#1877f2",
                            borderWidth: 2,
                            tension: 0.4,
                            pointRadius: 3,
                            spanGaps: true
                        },
                        {
                            label: "Instagram",
                            data: igValues,
                            fill: false,
                            borderColor: "#ea0ee3",
                            backgroundColor: "#ea0ee3",
                            borderWidth: 2,
                            tension: 0.4,
                            pointRadius: 3,
                            spanGaps: true
                        },
                        {
                            label: "YouTube",
                            data: ytValues,
                            fill: false,
                            borderColor: "#ff0000",
                            backgroundColor: "#ff0000",
                            borderWidth: 2,
                            tension: 0.4,
                            pointRadius: 3,
                            spanGaps: true
                        },
                        {
                            label: "Spotify",
                            data: spValues,
                            fill: false,
                            borderColor: "#1db954",
                            backgroundColor: "#1db954",
                            borderWidth: 2,
                            tension: 0.4,
                            pointRadius: 3,
                            spanGaps: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    if (context.dataset.label === "Activities") {
                                        const actTitle = eventTitles[context.dataIndex];
                                        return "⭐ Event: " + actTitle + " (" + context.parsed.y.toLocaleString() + " Follows)";
                                    }
                                    return context.dataset.label + ": " + context.parsed.y.toLocaleString();
                                }
                            }
                        }
                    },
                    scales: {
                        y: { beginAtZero: false, grid: { color: "rgba(0,0,0,0.05)" } },
                        x: {
                            grid: { display: false },
                            ticks: {
                                callback: function (value, index) {
                                    const dateStr = sortedDates[index];
                                    if (dateStr && dateStr.endsWith("-01")) {
                                        return labels[index];
                                    }
                                    return null;
                                }
                            }
                        }
                    }
                }
            });

        })
        .catch(err => console.error("Error loading total growth chart:", err));
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

        const chartEl = document.getElementById("engagement-chart");
        if (!chartEl) return;
        const ctx = chartEl.getContext("2d");

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
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return n.toString();
}

function formatMonth(dateStr) {
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[d.getUTCMonth()];
}

function formatPrettyDate(dateStr) {
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[d.getUTCMonth()];
}

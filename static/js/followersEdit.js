document.addEventListener('DOMContentLoaded', () => {
    const artistId = document.getElementById('artist-id').value;
    if (!artistId) return;

    loadArtistSidebar(artistId);
    loadFollowerStats(artistId);
    loadFollowerHistory(artistId);
});

function loadArtistSidebar(artistId) {
    fetch(`/api/artists/${artistId}`)
        .then(r => r.json())
        .then(artist => {
            const nameEl = document.getElementById("sidebar-artist-name");
            const imgEl = document.getElementById("sidebar-artist-image");
            if (nameEl) nameEl.textContent = artist.stageName || "Artist";
            if (imgEl) imgEl.src = artist.profileImageUrl || "https://via.placeholder.com/80x80?text=Artist";
        })
        .catch(err => console.error("Error loading artist sidebar:", err));
}


let growthChart = null;

async function loadFollowerStats(artistId) {
    try {
        const res = await fetch(`/api/metrics/rows/${artistId}`);
        const rows = await res.json();

        // 1. Filter for Followers (MetricTypeId 1)
        const followerRows = rows.filter(r => r.metricTypeId === 1);

        // Get unique dates sorted
        const dates = [...new Set(followerRows.map(r => r.metricDate))].sort();

        // Latest counts per platform
        const latestPerPlatform = {};
        followerRows.forEach(r => {
            if (!latestPerPlatform[r.platformId] || new Date(r.metricDate) > new Date(latestPerPlatform[r.platformId].metricDate)) {
                latestPerPlatform[r.platformId] = r;
            }
        });

        // 2. Update Individual Platform Cards
        // Instagram (4)
        const insta = latestPerPlatform[4];
        if (insta) {
            document.getElementById('insta-followers-count').textContent = Number(insta.value).toLocaleString();
            document.getElementById('insta-last-updated').textContent = `As of ${insta.metricDate}`;
        }

        // Facebook (2)
        const fb = latestPerPlatform[2];
        if (fb) {
            document.getElementById('fb-followers-count').textContent = Number(fb.value).toLocaleString();
            document.getElementById('fb-last-updated').textContent = `As of ${fb.metricDate}`;
        }

        // Others (Spotify, YouTube, etc.)
        const others = Object.values(latestPerPlatform).filter(r => r.platformId !== 2 && r.platformId !== 4);
        const otherTotal = others.reduce((sum, r) => sum + Number(r.value), 0);
        if (otherTotal > 0) {
            document.getElementById('other-followers-count').textContent = otherTotal.toLocaleString();
            document.getElementById('other-last-updated').textContent = `As of ${others[0].metricDate}`;
        }

        // 3. Update Total Card
        const grandTotal = Object.values(latestPerPlatform).reduce((sum, r) => sum + Number(r.value), 0);
        document.getElementById('total-followers-count').textContent = grandTotal.toLocaleString();

        // 4. Render Growth Chart
        renderGrowthChart(followerRows);

    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

function renderGrowthChart(rows) {
    const ctx = document.getElementById('growthChart').getContext('2d');

    // Group values by date and calculate total
    const dailyTotals = {};
    rows.forEach(r => {
        if (!dailyTotals[r.metricDate]) dailyTotals[r.metricDate] = 0;
        dailyTotals[r.metricDate] += Number(r.value);
    });

    const dates = Object.keys(dailyTotals).sort();
    const values = dates.map(d => dailyTotals[d]);

    if (growthChart) growthChart.destroy();

    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Total Followers',
                data: values,
                borderColor: '#2458d3',
                backgroundColor: 'rgba(36, 88, 211, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#2458d3'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

async function loadFollowerHistory(artistId) {
    const tbody = document.getElementById('follower-history-tbody');
    try {
        const res = await fetch(`/api/metrics/rows/${artistId}`);
        const rows = await res.json();

        const historyRows = rows
            .filter(r => r.metricTypeId === 1)
            .sort((a, b) => new Date(b.metricDate) - new Date(a.metricDate) || b.artistMetricId - a.artistMetricId);

        if (historyRows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty">No history.</td></tr>';
            return;
        }

        tbody.innerHTML = historyRows.map(r => {
            let iconClass = 'fa-chart-line';
            let iconColor = '#6b7280';
            if (r.platformCode === 'instagram') { iconClass = 'fa-instagram'; iconColor = '#e4405f'; }
            else if (r.platformCode === 'facebook') { iconClass = 'fa-facebook'; iconColor = '#1877f2'; }
            else if (r.platformCode === 'spotify') { iconClass = 'fa-spotify'; iconColor = '#1db954'; }
            else if (r.platformCode === 'youtube') { iconClass = 'fa-youtube'; iconColor = '#ff0000'; }

            return `
            <tr>
                <td>${r.metricDate}</td>
                <td>
                    <i class="fa-brands ${iconClass}" style="color: ${iconColor}; margin-right: 8px;"></i>
                    ${r.platformName || 'Other'}
                </td>
                <td style="text-align:right; font-weight:700;">${Number(r.value).toLocaleString()}</td>
            </tr>
            `;
        }).join('');

    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="3" class="error">Error loading data.</td></tr>';
    }
}

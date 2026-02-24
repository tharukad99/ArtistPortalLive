document.addEventListener("DOMContentLoaded", async () => {
  const artistId = document.getElementById("artist-id")?.value;
  if (!artistId) return;

  await Promise.all([loadMetricTypes(), loadPlatforms(), loadSourceTypes()]);

  loadArtistSidebar(artistId);

  await refreshDashboard(artistId);

  await loadMetricRows(artistId);
  await loadSocialLinksEditable(artistId);

  document.getElementById("btnAddMetric")?.addEventListener("click", () => openMetricModalForCreate());
  document.getElementById("btnAddLink")?.addEventListener("click", () => openLinkModalForCreate());
  document.getElementById("btnExecuteScrape")?.addEventListener("click", () => handleExecuteScrape(artistId));


  wireMetricModal(artistId);
  wireLinkModal(artistId);
});

/* ---------- Globals ---------- */
let METRIC_TYPES = [];
let PLATFORMS = [];
let SOURCE_TYPES = [];

let growthChart = null;
let engagementChart = null;

/* ---------- Helpers ---------- */
function $(id) { return document.getElementById(id); }

function setStatus(id, msg, isErr = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = isErr ? "crimson" : "inherit";
}

function openModal(modalId) { $(modalId)?.classList.remove("hidden"); }
function closeModal(modalId) { $(modalId)?.classList.add("hidden"); }

function showEl(id) { $(id)?.classList.remove("hidden"); }
function hideEl(id) { $(id)?.classList.add("hidden"); }

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

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

/* ---------- Sidebar ---------- */
function loadArtistSidebar(artistId) {
  fetch(`/api/artists/${artistId}`)
    .then(r => r.json())
    .then(artist => {
      $("sidebar-artist-name").textContent = artist.stageName || "Artist";
      $("sidebar-artist-image").src = artist.profileImageUrl || "https://via.placeholder.com/80x80?text=Artist";
    })
    .catch(err => console.error("Error loading artist:", err));
}

/* ---------- Dashboard refresh ---------- */
async function refreshDashboard(artistId) {
  await Promise.all([
    loadSummaryCards(artistId),
    loadGrowthChart(artistId),
    loadEngagementChart(artistId)
  ]);
}

function loadSummaryCards(artistId) {
  return fetch(`/api/metrics/summary/${artistId}`)
    .then(r => r.json())
    .then(data => {
      const followers = Number(data.followers || 0);
      const views = Number(data.views || 0);
      const streams = Number(data.streams || 0);
      const totalReach = followers + views + streams;

      if ($("total-reach-count")) $("total-reach-count").textContent = totalReach.toLocaleString();
      if ($("followers-count")) $("followers-count").textContent = followers.toLocaleString();
      if ($("views-count")) $("views-count").textContent = views.toLocaleString();
      if ($("streams-count")) $("streams-count").textContent = streams.toLocaleString();
    })
    .catch(err => console.error("Error loading summary:", err));
}

function loadGrowthChart(artistId) {
  return fetch(`/api/metrics/rows/${artistId}`)
    .then(r => r.json())
    .then(rows => {
      // 1. Filter for Followers (MetricTypeId 1)
      const followerRows = rows.filter(r => r.metricTypeId === 1);

      // 2. Group by Date and Sum values
      const dailyTotals = {};
      followerRows.forEach(r => {
        const d = r.metricDate;
        if (!dailyTotals[d]) dailyTotals[d] = 0;
        dailyTotals[d] += Number(r.value || 0);
      });

      // 3. Sort dates and get values
      const sortedDates = Object.keys(dailyTotals).sort();
      const labels = sortedDates.map(d => formatMonth(d));
      const values = sortedDates.map(d => dailyTotals[d]);

      const chartEl = $("growth-chart");
      if (!chartEl) return;
      const ctx = chartEl.getContext("2d");

      if (growthChart) growthChart.destroy();

      growthChart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: "Total Followers",
            data: values,
            fill: true,
            borderColor: "#2458d3",
            backgroundColor: "rgba(36, 88, 211, 0.1)",
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: "#2458d3"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return "Total: " + context.parsed.y.toLocaleString();
                }
              }
            }
          },
          scales: {
            y: { beginAtZero: false, grid: { color: "rgba(0,0,0,0.05)" } },
            x: { grid: { display: false } }
          }
        }
      });
    })
    .catch(err => console.error("Error loading total growth chart:", err));
}



function loadEngagementChart(artistId) {
  const metrics = ["likes", "comments", "shares"];
  return Promise.all(metrics.map(code => fetch(`/api/metrics/timeseries/${artistId}?metric=${code}`).then(r => r.json())))
    .then(results => {
      const labels = results[0].map(p => formatMonth(p.date));
      const datasets = results.map((series, idx) => ({
        label: metrics[idx].charAt(0).toUpperCase() + metrics[idx].slice(1),
        data: series.map(p => p.value)
      }));

      const chartEl = $("engagement-chart");
      if (!chartEl) return;
      const ctx = chartEl.getContext("2d");

      if (engagementChart) engagementChart.destroy();

      engagementChart = new Chart(ctx, {
        type: "bar",
        data: { labels, datasets },
        options: {
          responsive: true,
          plugins: { legend: { position: "bottom" } },
          scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
        }
      });
    })
    .catch(err => console.error("Error loading engagement chart:", err));
}

/* ---------- Reference Data ---------- */
async function loadMetricTypes() {
  const res = await fetch(`/api/metrics/metrictypes`);
  METRIC_TYPES = await res.json();

  const sel = $("metricTypeId");
  if (sel) {
    sel.innerHTML =
      `<option value="">-- Select metric --</option>` +
      METRIC_TYPES.map(m =>
        `<option value="${m.MetricTypeId}">${escapeHtml(m.GroupName)} • ${escapeHtml(m.Name)} (${escapeHtml(m.Code)})</option>`
      ).join("");
  }
}

async function loadPlatforms() {
  const res = await fetch(`/api/metrics/platforms`);
  PLATFORMS = await res.json();

  const sel = $("metricPlatformId");
  if (sel) {
    sel.innerHTML =
      `<option value="">(none)</option>` +
      PLATFORMS.map(p => `<option value="${p.PlatformId}">${escapeHtml(p.Name)} (${escapeHtml(p.Code)})</option>`).join("");
  }
}

async function loadSourceTypes() {
  const res = await fetch(`/api/sources/types`);
  SOURCE_TYPES = await res.json();

  const sel = $("linkSourceTypeId");
  if (sel) {
    sel.innerHTML =
      `<option value="">-- Select source --</option>` +
      SOURCE_TYPES.map(s =>
        `<option value="${s.sourceTypeId}">${escapeHtml(s.name)} (${escapeHtml(s.code)})</option>`
      ).join("");
  }
}

/* =========================================================
   METRICS EDIT GRID
========================================================= */

function openMetricModalForCreate() {
  $("metricModalTitle").textContent = "Add Metric Count";
  $("metricRowId").value = "";
  $("metricTypeId").value = "";
  $("metricPlatformId").value = "";
  $("metricDate").value = "";
  $("metricValue").value = "";
  setStatus("metricStatus", "");
  hideEl("btnDeleteMetric"); // ✅ hide delete
  openModal("metricModal");
}

function openMetricModalForEdit(row) {
  $("metricModalTitle").textContent = "Update Metric Count";
  $("metricRowId").value = row.artistMetricId;
  $("metricTypeId").value = row.metricTypeId;
  $("metricPlatformId").value = row.platformId ?? "";
  $("metricDate").value = row.metricDate ?? "";
  $("metricValue").value = row.value ?? "";
  setStatus("metricStatus", "");
  showEl("btnDeleteMetric"); // ✅ show delete
  openModal("metricModal");
}

function wireMetricModal(artistId) {
  $("btnCloseMetricModal")?.addEventListener("click", () => closeModal("metricModal"));
  $("btnCancelMetric")?.addEventListener("click", () => closeModal("metricModal"));

  $("metricModal")?.addEventListener("click", (e) => {
    if (e.target === $("metricModal")) closeModal("metricModal");
  });

  $("btnSaveMetric")?.addEventListener("click", async () => {
    const metricId = ($("metricRowId").value || "").trim();

    const payload = {
      metricTypeId: parseInt($("metricTypeId").value || "0", 10) || null,
      platformId: $("metricPlatformId").value ? parseInt($("metricPlatformId").value, 10) : null,
      metricDate: ($("metricDate").value || "").trim(),
      value: $("metricValue").value === "" ? null : Number($("metricValue").value)
    };

    if (!payload.metricTypeId || !payload.metricDate || payload.value == null || Number.isNaN(payload.value)) {
      setStatus("metricStatus", "Metric, Date and Value are required.", true);
      return;
    }

    setStatus("metricStatus", "Saving...");

    try {
      const url = metricId
        ? `/api/metrics/rows/${artistId}/${metricId}`
        : `/api/metrics/rows/${artistId}`;

      const method = metricId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("metricStatus", data.error || data.message || "Save failed.", true);
        return;
      }

      setStatus("metricStatus", "Saved ✅");
      await loadMetricRows(artistId);
      await refreshDashboard(artistId);
      setTimeout(() => closeModal("metricModal"), 200);

    } catch (err) {
      console.error(err);
      setStatus("metricStatus", "Save failed (network/server).", true);
    }
  });

  // ✅ Delete inside Metric modal
  $("btnDeleteMetric")?.addEventListener("click", async () => {
    const metricId = ($("metricRowId").value || "").trim();
    if (!metricId) return;

    if (!confirm("Delete this metric row?")) return;

    await deleteMetricRow(artistId, metricId);
    await loadMetricRows(artistId);
    await refreshDashboard(artistId);
    closeModal("metricModal");
  });
}

async function deleteMetricRow(artistId, metricId) {
  try {
    const res = await fetch(`/api/metrics/rows/${artistId}/${metricId}`, {
      method: "DELETE",
      credentials: "include"
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || data.message || "Delete failed");
      return;
    }
  } catch (e) {
    console.error(e);
    alert("Delete failed (network/server).");
  }
}

/* =======  METRICS EDIT GRID (with pagination + better alignment) =========== */
let METRIC_ROWS_CACHE = [];
let METRIC_PAGE = 1;
const METRIC_PAGE_SIZE = 5;

async function loadMetricRows(artistId) {
  const container = $("metrics-rows");
  if (!container) return;

  container.innerHTML = `<div class="muted">Loading...</div>`;

  const res = await fetch(`/api/metrics/rows/${artistId}`);
  const rows = await res.json();
  METRIC_ROWS_CACHE = Array.isArray(rows) ? rows : [];

  if (!METRIC_ROWS_CACHE.length) {
    container.innerHTML = `<div class="empty">No metric rows yet.</div>`;
    return;
  }

  // reset page if out of range
  const totalPages = Math.max(1, Math.ceil(METRIC_ROWS_CACHE.length / METRIC_PAGE_SIZE));
  if (METRIC_PAGE > totalPages) METRIC_PAGE = totalPages;

  renderMetricTable(container);
  wireMetricTableEvents(container);
}

function renderMetricTable(container) {
  const total = METRIC_ROWS_CACHE.length;
  const totalPages = Math.max(1, Math.ceil(total / METRIC_PAGE_SIZE));
  const start = (METRIC_PAGE - 1) * METRIC_PAGE_SIZE;
  const pageRows = METRIC_ROWS_CACHE.slice(start, start + METRIC_PAGE_SIZE);

  container.innerHTML = `
    <div class="metric-table-wrap">
      <table class="metric-table">
        <thead>
          <tr>
            <th class="col-date">Date</th>
            <th class="col-metric">Metric</th>
            <th class="col-platform">Platform</th>
            <th class="col-value1">Value</th>
            <th class="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${pageRows.map(r => `
            <tr data-metric-id="${r.artistMetricId}">
              <td class="col-date">${escapeHtml(r.metricDate || "")}</td>
              <td class="col-metric">
                <div class="metric-name">${escapeHtml(r.metricTypeName || "")}</div>
                <!--<div class="metric-code">${escapeHtml(r.metricCode ? `(${r.metricCode})` : "")}</div> -->
              </td>
              <td class="col-platform">${escapeHtml(r.platformName || "-")}</td>
              <td class="col-value1">${r.value ?? ""}</td>
              <td class="col-actions1">
                <button class="btn-secondary btn-edit-metric" type="button">Update</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="metric-pager">
        <div class="metric-pager-left muted">
          Showing <b>${start + 1}</b>–<b>${Math.min(start + METRIC_PAGE_SIZE, total)}</b> of <b>${total}</b>
        </div>

        <div class="metric-pager-right">
          <button type="button" class="pager-btn" data-page="first" ${METRIC_PAGE === 1 ? "disabled" : ""}>« First</button>
          <button type="button" class="pager-btn" data-page="prev"  ${METRIC_PAGE === 1 ? "disabled" : ""}>‹ Prev</button>

          <div class="pager-pill">
            Page <b>${METRIC_PAGE}</b> / <b>${totalPages}</b>
          </div>

          <button type="button" class="pager-btn" data-page="next"  ${METRIC_PAGE === totalPages ? "disabled" : ""}>Next ›</button>
          <button type="button" class="pager-btn" data-page="last"  ${METRIC_PAGE === totalPages ? "disabled" : ""}>Last »</button>
        </div>
      </div>
    </div>
  `;
}

function wireMetricTableEvents(container) {
  // update/edit
  container.querySelectorAll(".btn-edit-metric").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const tr = e.target.closest("tr");
      const metricId = tr.getAttribute("data-metric-id");
      const rowObj = METRIC_ROWS_CACHE.find(x => String(x.artistMetricId) === String(metricId));
      if (rowObj) openMetricModalForEdit(rowObj);
    });
  });

  // pager
  container.querySelectorAll(".pager-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-page");
      const totalPages = Math.max(1, Math.ceil(METRIC_ROWS_CACHE.length / METRIC_PAGE_SIZE));

      if (action === "first") METRIC_PAGE = 1;
      if (action === "prev") METRIC_PAGE = Math.max(1, METRIC_PAGE - 1);
      if (action === "next") METRIC_PAGE = Math.min(totalPages, METRIC_PAGE + 1);
      if (action === "last") METRIC_PAGE = totalPages;

      renderMetricTable(container);
      wireMetricTableEvents(container); // re-bind after re-render
    });
  });
}

/* =========================================================
   SOCIAL LINKS (EDITABLE)
========================================================= */
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

let SOCIAL_LINKS_CACHE = [];

const socialIconMap = {
  facebook: { icon: "fa-brands fa-facebook-f", bg: "icon-bg-fb" },
  spotify: { icon: "fa-brands fa-spotify", bg: "icon-bg-sp" },
  instagram: { icon: "fa-brands fa-instagram", bg: "icon-bg-ig" },
  bandcamp: { icon: "fa-brands fa-bandcamp", bg: "" },
  website: { icon: "fa-solid fa-globe", bg: "icon-bg-web" },
  apple_music: { icon: "fa-brands fa-apple", bg: "" },
  youtube: { icon: "fa-brands fa-youtube", bg: "icon-bg-yt" },
  emubands: { icon: "fa-solid fa-music", bg: "" },
  bbc_sounds: { icon: "fa-solid fa-radio", bg: "" },
  acast: { icon: "fa-solid fa-podcast", bg: "" },
  twitter_x: { icon: "fa-brands fa-x-twitter", bg: "" }
};

function platformClassFromCode(code) {
  switch (code) {
    case "youtube": return "platform-youtube";
    case "instagram": return "platform-instagram";
    case "facebook": return "platform-facebook";
    case "spotify": return "platform-spotify";
    case "apple_music": return "platform-apple";
    case "bandcamp": return "platform-bandcamp";
    case "twitter_x": return "platform-twitter";
    case "website": return "platform-web";
    case "acast": return "platform-podcast";
    case "bbc_sounds": return "platform-radio";
    case "emubands": return "platform-music";
    default: return "platform-web";
  }
}

async function loadSocialLinksEditable(artistId) {
  const tbody = document.getElementById("social-links-tbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="3" class="empty">Loading...</td></tr>`;

  const res = await fetch(`/api/sources/${artistId}/sources`);
  const items = await res.json();
  SOCIAL_LINKS_CACHE = items || [];

  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty">No social links found.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(x => socialRowHtml(x)).join("");

  // Link open button
  tbody.querySelectorAll("[data-open-link]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const url = e.currentTarget.getAttribute("data-open-link");
      if (!url) return;
      window.open(url, "_blank", "noopener,noreferrer");
    });
  });

  // Update button
  tbody.querySelectorAll("[data-edit-link]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-edit-link");
      const item = SOCIAL_LINKS_CACHE.find(s => String(s.artistSourceId) === String(id));
      if (item) openLinkModalForEdit(item);
    });
  });
}

function socialRowHtml(x) {
  const meta = socialIconMap[x.sourceCode] || { icon: "fa-solid fa-link", bg: "" };

  const title = escapeHtml(x.displayName || x.sourceName || "Link");
  const sub = escapeHtml(x.handle ? x.handle : (x.url || ""));
  const primary = x.isPrimary ? `<div class="row-primary">Primary</div>` : "";

  const safeUrl = escapeHtml(x.url || "");

  return `
    <tr>
      <td>
        <div class="icon-box ${meta.bg}">
          <i class="${meta.icon}"></i>
        </div>
      </td>

      <td>
        <div class="row-title">${title}</div>
        <div class="row-sub">${sub}</div>
      <td>
        <div class="actions-right" style="display:flex;justify-content:flex-end;gap:8px;">
          ${x.url ? `
          <button type="button" class="round-btn" data-open-link="${safeUrl}" title="Open link">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </button>` : ""}
          <button type="button" class="round-btn" data-edit-link="${x.artistSourceId}" title="Update">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function openLinkModalForCreate() {
  $("linkModalTitle").textContent = "Add Social Link";
  $("linkRowId").value = "";
  $("linkSourceTypeId").value = "";
  $("linkUrl").value = "";
  $("linkHandle").value = "";
  $("linkDisplayName").value = "";
  $("linkIsPrimary").checked = false;
  setStatus("linkStatus", "");
  hideEl("btnDeleteLink"); // ✅ hide delete
  openModal("linkModal");
}

function openLinkModalForEdit(item) {
  $("linkModalTitle").textContent = "Update Social Link";
  $("linkRowId").value = item.artistSourceId;
  $("linkSourceTypeId").value = item.sourceTypeId;
  $("linkUrl").value = item.url || "";
  $("linkHandle").value = item.handle || "";
  $("linkDisplayName").value = item.displayName || "";
  $("linkIsPrimary").checked = !!item.isPrimary;
  setStatus("linkStatus", "");
  showEl("btnDeleteLink"); // ✅ show delete
  openModal("linkModal");
}

function wireLinkModal(artistId) {
  $("btnCloseLinkModal")?.addEventListener("click", () => closeModal("linkModal"));
  $("btnCancelLink")?.addEventListener("click", () => closeModal("linkModal"));

  $("linkModal")?.addEventListener("click", (e) => {
    if (e.target === $("linkModal")) closeModal("linkModal");
  });

  $("btnSaveLink")?.addEventListener("click", async () => {
    const rowId = ($("linkRowId").value || "").trim();

    const sourceTypeId = $("linkSourceTypeId").value
      ? parseInt($("linkSourceTypeId").value, 10)
      : null;

    const url = ($("linkUrl").value || "").trim();
    const handle = ($("linkHandle").value || "").trim();
    const displayName = ($("linkDisplayName").value || "").trim();
    const isPrimary = $("linkIsPrimary").checked;

    if (!sourceTypeId || !url) {
      setStatus("linkStatus", "Source Type and URL are required.", true);
      return;
    }

    setStatus("linkStatus", "Saving...");

    const payload = {
      sourceTypeId,
      url,
      handle: handle || null,
      displayName: displayName || null,
      isPrimary
    };

    try {
      const endpoint = rowId
        ? `/api/sources/${artistId}/sources/${rowId}`
        : `/api/sources/${artistId}/sources`;

      const method = rowId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("linkStatus", data.error || data.message || "Save failed.", true);
        return;
      }

      setStatus("linkStatus", "Saved ✅");
      await loadSocialLinksEditable(artistId);
      setTimeout(() => closeModal("linkModal"), 200);

    } catch (err) {
      console.error(err);
      setStatus("linkStatus", "Save failed (network/server).", true);
    }
  });

  // ✅ Delete inside Link modal
  $("btnDeleteLink")?.addEventListener("click", async () => {
    const rowId = ($("linkRowId").value || "").trim();
    if (!rowId) return;

    if (!confirm("Delete this link?")) return;

    await deleteLink(artistId, rowId);
    await loadSocialLinksEditable(artistId);
    closeModal("linkModal");
  });
}

async function deleteLink(artistId, artistSourceId) {
  try {
    const res = await fetch(`/api/sources/${artistId}/sources/${artistSourceId}`, {
      method: "DELETE",
      credentials: "include"
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || data.message || "Delete failed");
      return;
    }
  } catch (e) {
    console.error(e);
    alert("Delete failed (network/server).");
  }
}

async function handleExecuteScrape(artistId) {
  const btn = $("btnExecuteScrape");
  if (!btn || btn.disabled) return;

  if (!confirm("This will attempt to fetch latest follower counts from Instagram and Facebook. Continue?")) return;

  const originalText = btn.textContent;
  btn.textContent = "Executing...";
  btn.disabled = true;

  try {
    const res = await fetch(`/api/metrics/scrape/${artistId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Execution failed.");
    } else {
      let msg = data.message;
      if (data.details && data.details.length > 0) {
        msg += "\n\nResults:";
        data.details.forEach(d => {
          msg += `\n- ${d.platform}: ${d.count.toLocaleString()} followers`;
        });
      }
      alert(msg);
      // Refresh the page data
      await refreshDashboard(artistId);
      await loadMetricRows(artistId);
    }
  } catch (err) {
    console.error(err);
    alert("Execution failed (network/server error).");
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

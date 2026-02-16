document.addEventListener("DOMContentLoaded", () => {
  const artistId = document.getElementById("artist-id")?.value;
  if (!artistId) return;
  initPage(artistId);
});

async function initPage(artistId) {
  await Promise.allSettled([
    loadProfile(artistId),
    loadLatestAlbum(artistId),
    loadPhotos(artistId),
    loadActivitiesGrid(artistId),      // ✅ grid activities
    loadSocialMediaMetrics(artistId),  // ✅ charts + summary
    loadSocialLinks(artistId),
    loadActivities(artistId)          // ✅ table + pagination
  ]);

  const visibleCards = [
    "card-profile",
    "card-album",
    "card-photos",
    "card-activities",
    "card-social-metrics",
    "card-social",
  ].some(id => isVisible(id));

  if (!visibleCards) show("empty-state");
}

/* =========================
   1) PROFILE
========================= */
async function loadProfile(artistId) {
  const cardId = "card-profile";

  try {
    const r = await fetch(`/api/artists/${artistId}`);
    if (!r.ok) throw new Error("Artist API failed");
    const a = await r.json();

    // header
    setText("mini-artist-name", a.stageName || "Artist");
    setImage("mini-artist-image", a.profileImageUrl);

    // profile card
    setImage("profile-artist-image", a.profileImageUrl);

    const stageName = (a.stageName || "").trim();
    const fullName  = (a.fullName || "").trim();
    const bio       = (a.bio || "").trim();
    const website   = (a.websiteUrl || "").trim();
    const sourcesCount = a.sourcesCount ?? 0;

    const hasAny = !!(stageName || fullName || bio || website || sourcesCount);
    if (!hasAny) {
      hide(cardId);
      return;
    }

    setText("profile-stage-name", stageName || "Artist");
    setText("profile-full-name", fullName);

    // bio
    const bioEl = document.getElementById("profile-bio");
    bioEl.textContent = bio || "";

    // website
    const websiteEl = document.getElementById("profile-website");
    if (website) {
      websiteEl.href = website;
      websiteEl.style.display = "inline-flex";
    } else {
      websiteEl.style.display = "none";
    }

    const sourcesEl = document.getElementById("profile-sources-count");
    if (sourcesEl) {
      sourcesEl.textContent = sourcesCount ? `Connected platforms: ${sourcesCount}` : "";
    }

    // if still visually empty
    const finalHas = !!(stageName || fullName || bio || website || sourcesCount);
    if (!finalHas) hide(cardId);

  } catch (e) {
    console.error("Profile load error:", e);
    hide(cardId);
  }
}

/* =========================
   2) LATEST ALBUM (from activities)
========================= */
async function loadLatestAlbum(artistId) {
  const cardId = "card-album";
  const box = document.getElementById("album-box");

  try {
    const r = await fetch(`/api/activities/artist/${artistId}`);
    if (!r.ok) throw new Error("Activities API failed");
    const items = await r.json();

    if (!Array.isArray(items) || items.length === 0) {
      hide(cardId);
      return;
    }

    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    const album = items.find(x =>
      (x.type && String(x.type).toLowerCase().includes("album")) ||
      (x.title && String(x.title).toLowerCase().includes("album"))
    );

    if (!album) {
      hide(cardId);
      return;
    }

    const title = escapeHtml(album.title || "Latest album");
    const date  = album.date ? formatPrettyDate(album.date) : "";

    box.innerHTML = `
      <div class="album-title">${title}</div>
      ${date ? `<div class="album-sub">Release Date: ${date}</div>` : ""}
    `;
  } catch (e) {
    console.error("Latest album error:", e);
    hide(cardId);
  }
}

/* =========================
   3) PHOTOS
========================= */
async function loadPhotos(artistId) {
  const cardId = "card-photos";
  const grid = document.getElementById("photo-grid");

  try {
    const r = await fetch(`/api/artists/${artistId}/photos`);
    if (!r.ok) throw new Error("Photos API failed");
    const images = await r.json();

    if (!Array.isArray(images) || images.length === 0) {
      hide(cardId);
      return;
    }

    grid.innerHTML = "";

    images.slice(0, 9).forEach(p => {
      const url = (p?.url || "").trim();
      if (!url) return;

      const a = document.createElement("a");
      a.className = "gallery-item";
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";

      const img = document.createElement("img");
      img.src = url;
      img.alt = p.caption || "Artist photo";
      img.loading = "lazy";

      a.appendChild(img);
      grid.appendChild(a);
    });

    if (!grid.children.length) hide(cardId);

  } catch (e) {
    console.error("Photos load error:", e);
    hide(cardId);
  }
}

/* =========================
   4) ACTIVITIES GRID
========================= */
const activityIconMap = {
  "Concert": "fa-solid fa-music",
  "Video Uploaded": "fa-brands fa-youtube",
  "Google Campaign": "fa-brands fa-google",
  "New Album": "fa-solid fa-compact-disc",
  "Podcast Release": "fa-solid fa-podcast",
  "Spotify Release": "fa-brands fa-spotify",
  "Tour": "fa-solid fa-ticket",
  "Press": "fa-regular fa-newspaper",
};

async function loadActivitiesGrid(artistId) {
  const cardId = "card-activities";
  const grid = document.getElementById("activities-grid");

  try {
    const r = await fetch(`/api/activities/artist/${artistId}`);
    if (!r.ok) throw new Error("Activities API failed");
    const items = await r.json();

    if (!Array.isArray(items) || items.length === 0) {
      hide(cardId);
      return;
    }

    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    grid.innerHTML = "";

    items.slice(0, 12).forEach(act => {
      const type = (act.type || "").trim();
      const title = (act.title || "").trim();
      const date = act.date ? formatPrettyDate(act.date) : "";
      const link = (act.externalUrl || "").trim();

      // If activity has literally nothing, skip it
      if (!type && !title && !date && !link) return;

      const card = document.createElement("div");
      card.className = "activity-card";

      // icon
      const iconWrap = document.createElement("div");
      iconWrap.className = "activity-icon";

      const icon = document.createElement("i");
      icon.className = activityIconMap[type] || "fa-solid fa-bolt";
      iconWrap.appendChild(icon);

      // text block
      const body = document.createElement("div");
      body.className = "activity-body";

      const titleEl = document.createElement("div");
      titleEl.className = "activity-title";
      titleEl.textContent = title || "—";

      const dateEl = document.createElement("div");
      dateEl.className = "activity-date";
      dateEl.textContent = date || "";

      body.appendChild(titleEl);
      body.appendChild(dateEl);

      // link button
      const action = document.createElement("div");
      action.className = "activity-action";

      if (link) {
        const a = document.createElement("a");
        a.className = "activity-link";
        a.href = link;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.title = "Open link";
        a.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i>`;
        action.appendChild(a);
      } else {
        const disabled = document.createElement("div");
        disabled.className = "activity-link disabled";
        disabled.title = "No link available";
        disabled.innerHTML = `<i class="fa-solid fa-link-slash"></i>`;
        action.appendChild(disabled);
      }

      card.appendChild(iconWrap);
      card.appendChild(body);
      card.appendChild(action);

      grid.appendChild(card);
    });

    if (!grid.children.length) hide(cardId);

  } catch (e) {
    console.error("Activities grid load error:", e);
    hide(cardId);
  }
}

/* =========================
   5) SOCIAL MEDIA METRICS (summary + charts)
========================= */
let growthChart = null;
let engagementChart = null;

async function loadSocialMediaMetrics(artistId) {
  const cardId = "card-social-metrics";

  try {
    const [summaryRes, followersSeriesRes, likesRes, commentsRes, sharesRes] = await Promise.all([
      fetch(`/api/metrics/summary/${artistId}`),
      fetch(`/api/metrics/timeseries/${artistId}?metric=followers`),
      fetch(`/api/metrics/timeseries/${artistId}?metric=likes`),
      fetch(`/api/metrics/timeseries/${artistId}?metric=comments`),
      fetch(`/api/metrics/timeseries/${artistId}?metric=shares`)
    ]);

    if (!summaryRes.ok) throw new Error("Summary API failed");
    if (!followersSeriesRes.ok) throw new Error("Followers series API failed");

    const summary = await summaryRes.json();
    const followersSeries = await followersSeriesRes.json();

    const likesSeries = likesRes.ok ? await likesRes.json() : [];
    const commentsSeries = commentsRes.ok ? await commentsRes.json() : [];
    const sharesSeries = sharesRes.ok ? await sharesRes.json() : [];

    const hasSummary =
      (summary?.followers ?? 0) > 0 ||
      (summary?.views ?? 0) > 0 ||
      (summary?.streams ?? 0) > 0 ||
      (summary?.tickets ?? 0) > 0;

    const hasGrowth = Array.isArray(followersSeries) && followersSeries.length > 0;

    const hasEngagement =
      (Array.isArray(likesSeries) && likesSeries.length > 0) ||
      (Array.isArray(commentsSeries) && commentsSeries.length > 0) ||
      (Array.isArray(sharesSeries) && sharesSeries.length > 0);

    if (!hasSummary && !hasGrowth && !hasEngagement) {
      hide(cardId);
      return;
    }

    setText("m-followers", formatNumber(summary?.followers));
    setText("m-views", formatNumber(summary?.views));
    setText("m-streams", formatNumber(summary?.streams));
    setText("m-tickets", formatNumber(summary?.tickets));

    if (hasGrowth) renderGrowthChart(followersSeries);
    else hideChartPanel("chart-growth");

    if (hasEngagement) renderEngagementChart(likesSeries, commentsSeries, sharesSeries);
    else hideChartPanel("chart-engagement");

    const growthVisible = !isCanvasHidden("chart-growth");
    const engVisible = !isCanvasHidden("chart-engagement");

    if (!hasSummary && !growthVisible && !engVisible) hide(cardId);

  } catch (e) {
    console.error("Social media metrics load error:", e);
    hide(cardId);
  }
}

function hideChartPanel(canvasId) {
  const canvas = document.getElementById(canvasId);
  const panel = canvas?.closest(".chart-card");
  if (panel) panel.style.display = "none";
}
function showChartPanel(canvasId) {
  const canvas = document.getElementById(canvasId);
  const panel = canvas?.closest(".chart-card");
  if (panel) panel.style.display = "block";
}
function isCanvasHidden(canvasId) {
  const canvas = document.getElementById(canvasId);
  const panel = canvas?.closest(".chart-card");
  if (!panel) return true;
  return panel.style.display === "none";
}

/* =========================
   6) SOCIAL LINKS
========================= */
const socialIconMap = {
  website: "fa-solid fa-globe",
  facebook: "fa-brands fa-facebook-f",
  instagram: "fa-brands fa-instagram",
  tiktok: "fa-brands fa-tiktok",
  twitter_x: "fa-brands fa-x-twitter",
  youtube: "fa-brands fa-youtube",
  spotify: "fa-brands fa-spotify",
  apple_music: "fa-brands fa-apple",
  acast: "fa-solid fa-podcast",
  bandcamp: "fa-brands fa-bandcamp",
  bbc_sounds: "fa-solid fa-radio",
  emubands: "fa-solid fa-music",
};

async function loadSocialLinks(artistId) {
  const cardId = "card-social";
  const container = document.getElementById("social-links");

  try {
    const r = await fetch(`/api/sources/${artistId}/sources`);
    if (!r.ok) throw new Error("Sources API failed");

    const items = await r.json();

    if (!Array.isArray(items) || items.length === 0) {
      document.getElementById(cardId).style.display = "none";
      return;
    }

    container.innerHTML = "";

    items.forEach(x => {
      const url = (x.url || "").trim();
      if (!url) return;

      const displayName = (x.displayName || x.sourceName || "Link").trim();
      const subtitle = (x.handle || url).trim();
      const iconClass = socialIconMap[x.sourceCode] || "fa-solid fa-link";

      // BIG tile
      const tile = document.createElement("a");
      tile.className = "social-tile";
      tile.href = url;
      tile.target = "_blank";
      tile.rel = "noopener noreferrer";
      tile.title = url;

      // Optional primary badge if your API has something like isPrimary
      const primaryBadge = x.isPrimary ? `<div class="social-primary">Primary</div>` : "";

      tile.innerHTML = `
        <div class="social-inner">
          <div class="social-iconwrap">
            <i class="${iconClass}"></i>
          </div>

          <div class="social-meta">
            <div class="social-name">${escapeHtml(displayName)}</div>
            <div class="social-sub">${escapeHtml(subtitle)}</div>
            
          </div>
        </div>
      `;

      container.appendChild(tile);
    });

    if (!container.children.length) {
      document.getElementById(cardId).style.display = "none";
    }

  } catch (e) {
    console.error("Social links load error:", e);
    document.getElementById(cardId).style.display = "none";
  }
}

/* helper (you already have this in your project) */
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
























/* =========================
   HELPERS
========================= */
function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}
function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "block";
}
function isVisible(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  return el.style.display !== "none";
}
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "";
}
function setImage(id, url) {
  const el = document.getElementById(id);
  if (!el) return;
  el.src = url && String(url).trim()
    ? url
    : "https://via.placeholder.com/80x80?text=Artist";
}
function formatPrettyDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function formatMonth(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[d.getUTCMonth()];
}
function formatNumber(n) {
  if (n == null || n === "" || Number.isNaN(Number(n))) return "-";
  const x = Number(n);
  if (x >= 1000000) return (x / 1000000).toFixed(1) + "M";
  if (x >= 1000)    return (x / 1000).toFixed(1) + "k";
  return String(x);
}
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

/* ===========================
   Activities Table + Pagination (4 rows per page)
=========================== */

const ACT_PAGE_SIZE = 4;

let actAll = [];
let actPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  const artistId = document.getElementById("artist-id")?.value;
  if (!artistId) return;

  initActivities(artistId);
});

function initActivities(artistId) {
  const prevBtn = document.getElementById("act-prev");
  const nextBtn = document.getElementById("act-next");

  // ✅ Bind button events ONCE
  if (prevBtn) prevBtn.addEventListener("click", () => goActPage(actPage - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => goActPage(actPage + 1));

  loadActivities(artistId);
}

async function loadActivities(artistId) {
  try {
    const r = await fetch(`/api/activities/artist/${artistId}`);
    if (!r.ok) throw new Error("Activities API failed");
    const items = await r.json();

    // No data -> show empty row and hide pager
    if (!Array.isArray(items) || items.length === 0) {
      renderActivitiesEmpty();
      return;
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Normalize fields
    actAll = items.map(x => ({
      type: (x.type || "").trim(),
      title: (x.title || "").trim(),
      date: (x.date || "").trim(),
      externalUrl: (x.externalUrl || x.url || "").trim()
    })).filter(x => x.title || x.date || x.externalUrl || x.type);

    if (!actAll.length) {
      renderActivitiesEmpty();
      return;
    }

    // reset to page 1
    actPage = 1;
    renderActivitiesPage();

    // show total count
    const countEl = document.getElementById("activities-count");
    if (countEl) {
      countEl.style.display = "block";
      countEl.textContent = `${actAll.length} items`;
    }

  } catch (e) {
    console.error("Activities load error:", e);
    renderActivitiesEmpty();
  }
}

function renderActivitiesEmpty() {
  const tbody = document.getElementById("activities-tbody");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-cell">No activities yet.</td>
      </tr>
    `;
  }

  const pager = document.getElementById("activities-pager");
  if (pager) pager.style.display = "none";

  const countEl = document.getElementById("activities-count");
  if (countEl) countEl.style.display = "none";
}

function goActPage(page) {
  const totalPages = Math.max(1, Math.ceil(actAll.length / ACT_PAGE_SIZE));
  actPage = Math.min(Math.max(1, page), totalPages);
  renderActivitiesPage();
}

function renderActivitiesPage() {
  const tbody = document.getElementById("activities-tbody");
  const pager = document.getElementById("activities-pager");
  const prevBtn = document.getElementById("act-prev");
  const nextBtn = document.getElementById("act-next");
  const pagesWrap = document.getElementById("act-pages");

  if (!tbody || !pager || !prevBtn || !nextBtn || !pagesWrap) {
    console.error("Activities DOM elements missing. Check your IDs in HTML.");
    return;
  }

  const totalPages = Math.max(1, Math.ceil(actAll.length / ACT_PAGE_SIZE));
  const start = (actPage - 1) * ACT_PAGE_SIZE;
  const slice = actAll.slice(start, start + ACT_PAGE_SIZE);

  // Render rows
  tbody.innerHTML = "";

  slice.forEach(act => {
    const iconClass = activityIconMap[act.type] || "fa-solid fa-bolt";
    const typeClass = "t-" + slugType(act.type || "other");
    const dateText = act.date ? formatPrettyDate(act.date) : "";

    const linkHtml = act.externalUrl
      ? `<a class="link-btn" href="${escapeAttr(act.externalUrl)}" target="_blank" rel="noopener noreferrer" title="Open link">
           <i class="fa-solid fa-arrow-up-right-from-square"></i>
         </a>`
      : `<span class="link-btn disabled" title="No link">
           <i class="fa-solid fa-link-slash"></i>
         </span>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="col-icon">
        <span class="act-ic ${typeClass}"><i class="${iconClass}"></i></span>
      </td>
      <td class="col-title">
        <div class="act-title">${escapeHtml(act.title || "—")}</div>
        ${act.type ? `<div class="act-type">${escapeHtml(act.type)}</div>` : ``}
      </td>
      <td class="col-link">${linkHtml}</td>
      <td class="col-date">${escapeHtml(dateText)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Pager show/hide
  pager.style.display = totalPages > 1 ? "flex" : "none";

  // Prev/Next enable
  prevBtn.disabled = actPage <= 1;
  nextBtn.disabled = actPage >= totalPages;

  // Page numbers
  pagesWrap.innerHTML = "";
  for (let p = 1; p <= totalPages; p++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `page-num ${p === actPage ? "active" : ""}`;
    btn.textContent = String(p);
    btn.addEventListener("click", () => goActPage(p));
    pagesWrap.appendChild(btn);
  }
}

function slugType(s){
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/(^-|-$)/g,"");
}


/* Helpers */
function formatPrettyDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

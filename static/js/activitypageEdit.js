document.addEventListener("DOMContentLoaded", async () => {
  const artistId = document.getElementById("artist-id")?.value;
  if (!artistId) return;

  loadArtistSidebar(artistId);

  await loadActivityTypes();
  await loadActivitiesTimeline(artistId);

  initActivityModal(artistId);
});

/* =========================
   Sidebar
========================= */
function loadArtistSidebar(artistId) {
  fetch(`/api/artists/${artistId}`)
    .then(r => r.json())
    .then(artist => {
      const nameEl = document.getElementById("sidebar-artist-name");
      const imgEl = document.getElementById("sidebar-artist-image");

      if (nameEl) nameEl.textContent = artist.stageName || "Artist";
      if (imgEl) imgEl.src = artist.profileImageUrl || "https://via.placeholder.com/80x80?text=A";
    })
    .catch(err => console.error("Error loading artist:", err));
}

/* =========================
   Activity types
========================= */
let ACTIVITY_TYPES = [];

async function loadActivityTypes() {
  const ddl = document.getElementById("ActivityTypeId");
  if (!ddl) return;

  try {
    const res = await fetch(`/api/activities/activitytypes`);
    const types = await res.json();
    ACTIVITY_TYPES = Array.isArray(types) ? types : [];

    ddl.innerHTML = `<option value="">Select type</option>`;
    ACTIVITY_TYPES.forEach(t => {
      const opt = document.createElement("option");
      opt.value = String(t.activityTypeId);
      opt.textContent = t.name;
      ddl.appendChild(opt);
    });
  } catch (err) {
    console.error("Failed to load activity types:", err);
    ddl.innerHTML = `<option value="">Failed to load types</option>`;
  }
}

/* =========================
   Icons
========================= */
const iconEmojiMap = {
  music: "🎵",
  youtube: "▶️",
  google: "🅶",
  album: "💿",
  podcast: "🎙️",
  spotify: "🎧"
};

function resolveIcon(act) {
  const key = (act.icon || "").toLowerCase();
  return iconEmojiMap[key] || "•";
}

/* =========================
   Timeline render
========================= */
async function loadActivitiesTimeline(artistId) {
  const container = document.getElementById("activities-timeline");
  if (!container) return;

  try {
    const res = await fetch(`/api/activities/artist/${artistId}`);
    const items = await res.json();

    container.innerHTML = "";

    if (!items || items.length === 0) {
      container.textContent = "No activities yet.";
      return;
    }

    items.sort((a, b) => {
      const da = a.date ? new Date(a.date) : new Date("1900-01-01");
      const db = b.date ? new Date(b.date) : new Date("1900-01-01");
      return db - da;
    });

    const groups = {};
    items.forEach(act => {
      const key = act.date || "No Date";
      if (!groups[key]) groups[key] = [];
      groups[key].push(act);
    });

    Object.keys(groups)
      .sort((a, b) => new Date(b) - new Date(a))
      .forEach(dateKey => {
        const groupDiv = document.createElement("div");
        groupDiv.className = "timeline-date-group";

        const dateLabel = document.createElement("div");
        dateLabel.className = "timeline-date-label";
        dateLabel.textContent = dateKey === "No Date" ? "No Date" : formatNiceDate(dateKey);
        groupDiv.appendChild(dateLabel);

        groups[dateKey].forEach(act => {
          const row = document.createElement("div");
          row.className = "timeline-row";

          const marker = document.createElement("div");
          marker.className = "timeline-marker";
          const dot = document.createElement("div");
          dot.className = "timeline-dot";
          marker.appendChild(dot);

          const content = document.createElement("div");
          content.className = "timeline-entry";
          content.style.display = "flex";
          content.style.alignItems = "center";
          content.style.justifyContent = "space-between";
          content.style.gap = "12px";

          const left = document.createElement("div");
          left.style.display = "flex";
          left.style.alignItems = "center";
          left.style.gap = "10px";

          const iconSpan = document.createElement("span");
          iconSpan.className = "timeline-icon";
          iconSpan.textContent = resolveIcon(act);

          const textSpan = document.createElement("span");
          textSpan.className = "timeline-text";
          textSpan.textContent = act.title || "";

          left.appendChild(iconSpan);
          left.appendChild(textSpan);

          const right = document.createElement("div");
          right.style.display = "flex";
          right.style.alignItems = "center";
          right.style.gap = "10px";

          if (act.externalUrl && act.externalUrl.trim() !== "") {
            const link = document.createElement("a");
            link.className = "timeline-link";
            link.href = act.externalUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.title = "Open link";
            link.textContent = "↗";
            right.appendChild(link);
          }

          const btnUpdate = document.createElement("button");
          btnUpdate.type = "button";
          btnUpdate.className = "btn-secondary";
          btnUpdate.textContent = "Update";
          btnUpdate.addEventListener("click", () => window.openModalForEdit(act));

          right.appendChild(btnUpdate);

          content.appendChild(left);
          content.appendChild(right);

          row.appendChild(marker);
          row.appendChild(content);

          groupDiv.appendChild(row);
        });

        container.appendChild(groupDiv);
      });

  } catch (err) {
    console.error("Error loading activities:", err);
    container.textContent = "Failed to load activities.";
  }
}

/* =========================
   Modal (Add/Update) with Delete button inside modal
========================= */
function initActivityModal(artistId) {
  const btnAdd = document.getElementById("btnAddActivity");
  const modal = document.getElementById("activityModal");
  const modalTitle = document.getElementById("activityModalTitle");

  const btnClose = document.getElementById("btnCloseActivityModal");
  const btnCancel = document.getElementById("btnCancelActivity");
  const btnSave = document.getElementById("btnSaveActivity");
  const btnDelete = document.getElementById("btnDeleteActivity");
  const statusEl = document.getElementById("activityStatus");

  const f = {
    id: document.getElementById("ActivityId"),
    date: document.getElementById("ActivityDate"),
    typeId: document.getElementById("ActivityTypeId"),
    title: document.getElementById("ActivityTitle"),
    location: document.getElementById("ActivityLocation"),
    description: document.getElementById("ActivityDescription"),
    externalUrl: document.getElementById("ActivityExternalUrl"),
  };

  const setStatus = (m, err=false) => {
    statusEl.textContent = m || "";
    statusEl.style.color = err ? "crimson" : "inherit";
  };

  const open = () => modal.classList.remove("hidden");
  const close = () => { modal.classList.add("hidden"); setStatus(""); };

  function showDelete(show) {
    if (!btnDelete) return;
    btnDelete.classList.toggle("hidden", !show);
  }

  function resetForAdd() {
    modalTitle.textContent = "Add Activity";
    f.id.value = "0";
    f.date.value = "";
    f.typeId.value = "";
    f.title.value = "";
    f.location.value = "";
    f.description.value = "";
    f.externalUrl.value = "";
    setStatus("");
    showDelete(false); // ✅ hide delete for add
  }

  btnAdd?.addEventListener("click", () => {
    resetForAdd();
    open();
  });

  btnClose?.addEventListener("click", close);
  btnCancel?.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  // ✅ Save (Add or Update)
  btnSave?.addEventListener("click", async () => {
    const payload = {
      activityTypeId: parseInt(f.typeId.value || "0", 10),
      title: (f.title.value || "").trim(),
      location: (f.location.value || "").trim(),
      date: f.date.value || null,
      description: (f.description.value || "").trim(),
      externalUrl: (f.externalUrl.value || "").trim(),
    };

    if (!payload.activityTypeId) { setStatus("Type is required.", true); return; }
    if (!payload.title) { setStatus("Title is required.", true); return; }

    const id = parseInt(f.id.value || "0", 10);

    try {
      setStatus("Saving...");

      const url = id > 0
        ? `/api/activities/artist/${artistId}/${id}`
        : `/api/activities/artist/${artistId}`;

      const method = id > 0 ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data.error || data.message || "Save failed.", true);
        return;
      }

      setStatus("Saved ✅");
      await loadActivitiesTimeline(artistId);
      setTimeout(close, 250);

    } catch (err) {
      console.error("Save activity error:", err);
      setStatus("Save failed due to network/server error.", true);
    }
  });

  // ✅ Delete (only works when editing)
  btnDelete?.addEventListener("click", async () => {
    const id = parseInt(f.id.value || "0", 10);
    if (!id) return;

    const ok = confirm("Delete this activity?");
    if (!ok) return;

    await deleteActivity(artistId, id);
    await loadActivitiesTimeline(artistId);
    close();
  });

  // expose edit opener
  window.openModalForEdit = function(act) {
    modalTitle.textContent = "Update Activity";

    f.id.value = String(act.id || 0);
    f.date.value = (act.date || "").slice(0, 10);
    f.typeId.value = String(act.activityTypeId || "");
    f.title.value = act.title || "";
    f.location.value = act.location || "";
    f.description.value = act.description || "";
    f.externalUrl.value = act.externalUrl || "";

    setStatus("");
    showDelete(true); // ✅ show delete for update
    open();
  };
}

/* =========================
   Delete Activity
========================= */
async function deleteActivity(artistId, activityId) {
  try {
    const res = await fetch(`/api/activities/artist/${artistId}/${activityId}`, {
      method: "DELETE",
      credentials: "include"
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || data.message || "Delete failed.");
      return;
    }
  } catch (err) {
    console.error("Delete activity error:", err);
    alert("Delete failed due to network/server error.");
  }
}

/* =========================
   Date formatting
========================= */
function formatNiceDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();

  if (sameYear) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

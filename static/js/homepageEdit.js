/* =========================
   homepageEdit.js 
========================= */

document.addEventListener("DOMContentLoaded", () => {
  const artistId = document.getElementById("artist-id")?.value;
  if (!artistId) return;

  // Cards start hidden in HTML; we will show only if data exists.
  loadArtistSidebar(artistId);
  loadArtistBio(artistId);
  loadLatestAlbumFromActivities(artistId);
  loadRecentActivities(artistId);
  loadPhotoGallery(artistId);

  initProfileEdit(artistId);

  initPhotoInsert(artistId);
  initPhotoDeleteToggle(artistId);
});

/* =========================
   Helpers
========================= */
function showCard(id) {
  document.getElementById(id)?.classList.remove("hidden");
}
function hideCard(id) {
  document.getElementById(id)?.classList.add("hidden");
}

function formatPrettyDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

/* =========================
   EDIT MODE (Profile)
========================= */
function initProfileEdit(artistId) {
  const btnEdit = document.getElementById("btnEditProfile");
  const modal = document.getElementById("profileModal");
  const btnClose = document.getElementById("btnCloseProfileModal");
  const btnCancel = document.getElementById("btnCancelProfile");
  const btnSave = document.getElementById("btnSaveProfile");
  const statusEl = document.getElementById("profileStatus");

  if (!btnEdit || !modal) return;

  const f = {
    StageName: document.getElementById("StageName"),
    FullName: document.getElementById("FullName"),
    Bio: document.getElementById("Bio"),
    WebsiteUrl: document.getElementById("WebsiteUrl"),
    Country: document.getElementById("Country"),
    PrimaryGenre: document.getElementById("PrimaryGenre"),
    ProfileImageUrl: document.getElementById("ProfileImageUrl"),
  };

  function setStatus(msg, isErr = false) {
    statusEl.textContent = msg || "";
    statusEl.style.color = isErr ? "crimson" : "inherit";
  }

  function openModal() { modal.classList.remove("hidden"); }
  function closeModal() { modal.classList.add("hidden"); setStatus(""); }

  async function loadProfileIntoForm() {
    setStatus("Loading...");
    const res = await fetch(`/api/artists/${artistId}`);
    if (!res.ok) { setStatus("Failed to load profile", true); return; }
    const artist = await res.json();

    // supports both camelCase and PascalCase
    f.StageName.value = artist.stageName ?? artist.StageName ?? "";
    f.FullName.value = artist.fullName ?? artist.FullName ?? "";
    f.Bio.value = artist.bio ?? artist.Bio ?? "";
    f.WebsiteUrl.value = artist.websiteUrl ?? artist.WebsiteUrl ?? "";
    f.Country.value = artist.country ?? artist.Country ?? "";
    f.PrimaryGenre.value = artist.primaryGenre ?? artist.PrimaryGenre ?? "";
    f.ProfileImageUrl.value = artist.profileImageUrl ?? artist.ProfileImageUrl ?? "";

    setStatus("");
  }

  async function saveProfile() {
    const payload = {
      stageName: (f.StageName.value || "").trim(),
      fullName: (f.FullName.value || "").trim(),
      bio: (f.Bio.value || "").trim(),
      websiteUrl: (f.WebsiteUrl.value || "").trim(),
      country: (f.Country.value || "").trim(),
      primaryGenre: (f.PrimaryGenre.value || "").trim(),
      profileImageUrl: (f.ProfileImageUrl.value || "").trim(),
    };

    if (!payload.stageName) { setStatus("Stage Name is required.", true); return; }

    setStatus("Saving...");

    const res = await fetch(`/api/artists/${artistId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include"
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.message || "Save failed.", true);
      return;
    }

    setStatus("Saved ✅");

    // Update visible UI instantly (FIXED: use payload.stageName not payload.StageName)
    document.getElementById("bio-stage-name").textContent = payload.stageName || "Artist";
    document.getElementById("bio-full-name").textContent = payload.fullName || "";
    document.getElementById("bio-text").textContent = payload.bio || "No biography available yet.";

    const websiteLink = document.getElementById("bio-website");
    if (payload.websiteUrl) {
      websiteLink.href = payload.websiteUrl;
      websiteLink.style.display = "inline-flex";
    } else {
      websiteLink.style.display = "none";
    }

    const img = document.getElementById("bio-profile-img");
    if (img) img.src = payload.profileImageUrl || "https://via.placeholder.com/120x120?text=Artist";

    const sidebarImg = document.getElementById("sidebar-artist-image");
    if (sidebarImg) sidebarImg.src = payload.profileImageUrl || "https://via.placeholder.com/80x80?text=Artist";

    // ensure profile card is visible after save
    showCard("card-profile");

    setTimeout(closeModal, 250);
  }

  btnEdit.addEventListener("click", async () => { openModal(); await loadProfileIntoForm(); });
  btnClose?.addEventListener("click", closeModal);
  btnCancel?.addEventListener("click", closeModal);
  btnSave?.addEventListener("click", saveProfile);

  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
}

/* =========================
   EXISTING FUNCTIONS
========================= */

function loadArtistSidebar(artistId) {
  fetch(`/api/artists/${artistId}`)
    .then(r => r.json())
    .then(artist => {
      document.getElementById("sidebar-artist-name").textContent = artist.stageName || "Artist";
      document.getElementById("sidebar-artist-image").src =
        artist.profileImageUrl || "https://via.placeholder.com/80x80?text=Artist";
    })
    .catch(err => console.error("Sidebar artist load error:", err));
}

function loadArtistBio(artistId) {
  fetch(`/api/artists/${artistId}`)
    .then(r => r.json())
    .then(artist => {
      // Decide whether to show profile card
      const hasProfileData =
        !!(artist?.stageName?.trim()) ||
        !!(artist?.fullName?.trim()) ||
        !!(artist?.bio?.trim()) ||
        !!(artist?.websiteUrl?.trim()) ||
        !!(artist?.country?.trim()) ||
        !!(artist?.primaryGenre?.trim()) ||
        !!(artist?.profileImageUrl?.trim());

      if (!hasProfileData) {
        hideCard("card-profile");
        return;
      }

      showCard("card-profile");

      document.getElementById("bio-stage-name").textContent = artist.stageName || "Artist";
      document.getElementById("bio-full-name").textContent = artist.fullName || "";

      const bioText = document.getElementById("bio-text");
      bioText.textContent = artist.bio && artist.bio.trim()
        ? artist.bio
        : "No biography available yet.";

      const websiteLink = document.getElementById("bio-website");
      if (artist.websiteUrl) {
        websiteLink.href = artist.websiteUrl;
        websiteLink.style.display = "inline-flex";
      } else {
        websiteLink.style.display = "none";
      }

      const sourcesCount = document.getElementById("bio-sources-count");
      if (sourcesCount) {
        sourcesCount.textContent = `Connected platforms: ${artist.sourcesCount || 0}`;
      }

      const img = document.getElementById("bio-profile-img");
      if (img) {
        img.src = artist.profileImageUrl || "https://via.placeholder.com/120x120?text=Artist";
      }
    })
    .catch(err => {
      console.error("Bio load error:", err);
      hideCard("card-profile");
    });
}

function loadLatestAlbumFromActivities(artistId) {
  fetch(`/api/activities/artist/${artistId}`)
    .then(r => r.json())
    .then(items => {
      const box = document.getElementById("latest-album");
      if (!box) return;

      if (!items || items.length === 0) {
        hideCard("card-album");
        return;
      }

      items.sort((a, b) => new Date(b.date) - new Date(a.date));

      const album = items.find(a =>
        (a.type && a.type.toLowerCase().includes("album")) ||
        (a.title && a.title.toLowerCase().includes("album"))
      );

      if (!album) {
        hideCard("card-album");
        return;
      }

      showCard("card-album");

      box.innerHTML = `
        <div style="font-weight:700; font-size:15px;">${escapeHtml(album.title)}</div>
        <div style="color:#6b7280; font-size:13px; margin-top:4px;">
          Release Date: ${formatPrettyDate(album.date)}
        </div>
      `;
    })
    .catch(err => {
      console.error("Latest album load error:", err);
      hideCard("card-album");
    });
}

function loadRecentActivities(artistId) {
  fetch(`/api/activities/artist/${artistId}`)
    .then(r => r.json())
    .then(items => {
      const container = document.getElementById("recent-activities");
      if (!container) return;

      container.innerHTML = "";

      if (!items || items.length === 0) {
        hideCard("card-activities");
        return;
      }

      showCard("card-activities");

      items.sort((a, b) => new Date(b.date) - new Date(a.date));

      items.slice(0, 8).forEach(act => {
        const row = document.createElement("div");
        row.className = "activity-item";

        const left = document.createElement("div");
        left.textContent = act.title;

        const right = document.createElement("div");
        right.textContent = formatPrettyDate(act.date);

        row.appendChild(left);
        row.appendChild(right);
        container.appendChild(row);
      });
    })
    .catch(err => {
      console.error("Activities load error:", err);
      hideCard("card-activities");
    });
}

/* =============================
   PHOTO Gallery Insert/Delete
=============================== */

let PHOTO_DELETE_MODE = false;

function loadPhotoGallery(artistId) {
  const container = document.getElementById("photo-gallery");
  if (!container) return;

  fetch(`/api/artists/${artistId}/photos`)
    .then(r => r.json())
    .then(images => {
      container.innerHTML = "";

      if (!images || images.length === 0) {
        // hideCard("card-photos");
         showCard("card-photos");
        return;
      }

      showCard("card-photos");

      images.slice(0, 12).forEach(img => {
        const wrap = document.createElement("div");
        wrap.className = "gallery-item-wrap";
        wrap.style.position = "relative";

        const a = document.createElement("a");
        a.href = img.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.className = "gallery-item";

        const image = document.createElement("img");
        image.src = img.url;
        image.alt = img.caption || "Artist photo";
        image.loading = "lazy";

        a.appendChild(image);

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "photo-del-btn";
        delBtn.textContent = "✕";
        delBtn.title = "Delete photo";
        delBtn.style.position = "absolute";
        delBtn.style.top = "8px";
        delBtn.style.right = "8px";
        delBtn.style.display = PHOTO_DELETE_MODE ? "inline-flex" : "none";

        delBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();

          const ok = confirm("Delete this photo?");
          if (!ok) return;
          await deletePhoto(artistId, img.photoId);
        });

        wrap.appendChild(a);
        wrap.appendChild(delBtn);
        container.appendChild(wrap);
      });
    })
    .catch(err => {
      console.error("Gallery load error:", err);
      hideCard("card-photos");
    });
}

// =================Insert Photo===============//
function initPhotoInsert(artistId) {
  const btn = document.getElementById("btnAddPhoto");
  const modal = document.getElementById("photoModal");
  if (!btn || !modal) return;

  const btnClose = document.getElementById("btnClosePhotoModal");
  const btnCancel = document.getElementById("btnCancelPhoto");
  const btnSave = document.getElementById("btnSavePhoto");
  const statusEl = document.getElementById("photoStatus");

  const PhotoUrl = document.getElementById("PhotoUrl");
  const PhotoCaption = document.getElementById("PhotoCaption");

  const setStatus = (m, err = false) => {
    statusEl.textContent = m || "";
    statusEl.style.color = err ? "crimson" : "inherit";
  };

  const open = () => {
    PhotoUrl.value = "";
    PhotoCaption.value = "";
    setStatus("");
    modal.classList.remove("hidden");
  };

  const close = () => {
    modal.classList.add("hidden");
    setStatus("");
  };

  async function savePhoto() {
    const payload = {
      url: (PhotoUrl.value || "").trim(),
      caption: (PhotoCaption.value || "").trim()
    };

    if (!payload.url) {
      setStatus("Image URL is required.", true);
      return;
    }

    setStatus("Saving...");

    const res = await fetch(`/api/artists/${artistId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include"
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(data.message || "Save failed.", true);
      return;
    }

    setStatus("Saved ✅");
    await loadPhotoGallery(artistId);
    setTimeout(close, 250);
  }

  btn.addEventListener("click", open);
  btnClose?.addEventListener("click", close);
  btnCancel?.addEventListener("click", close);
  btnSave?.addEventListener("click", savePhoto);

  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
}

// =================Delete Photo===============//
async function deletePhoto(artistId, photoId) {
  try {
    const res = await fetch(`/api/artists/${artistId}/photos/${photoId}`, {
      method: "DELETE",
      credentials: "include"
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || data.message || "Delete failed.");
      return;
    }

    await loadPhotoGallery(artistId);
  } catch (err) {
    console.error("Delete photo error:", err);
    alert("Delete failed due to network/server error.");
  }
}

function initPhotoDeleteToggle(artistId) {
  const btn = document.getElementById("btnDeletePhoto");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    PHOTO_DELETE_MODE = !PHOTO_DELETE_MODE;
    btn.textContent = PHOTO_DELETE_MODE ? "Done" : "🗑️ Delete Photo";
    await loadPhotoGallery(artistId);
  });
}

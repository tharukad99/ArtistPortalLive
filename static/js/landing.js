let allArtists = [];

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("artistSearch");
  const refreshBtn  = document.getElementById("btnRefresh");

  loadArtistList();

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderArtists(filterArtists(searchInput.value));
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", (e) => {
      e.preventDefault();

      refreshBtn.textContent = "Refreshing...";
      refreshBtn.disabled = true;

      if (searchInput) searchInput.value = "";

      loadArtistList().finally(() => {
        refreshBtn.textContent = "Refresh";
        refreshBtn.disabled = false;
      });
    });
  }
});

function filterArtists(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return allArtists;

  return allArtists.filter(a =>
    (a.stageName || "").toLowerCase().includes(q)
  );
}

function renderArtists(list) {
  const container = document.getElementById("artist-list");
  container.innerHTML = "";

  if (!list || list.length === 0) {
    container.innerHTML = `<div class="empty">No artists found.</div>`;
    return;
  }

  list.forEach(a => {
    const card = document.createElement("div");
    card.className = "artist-card";
    card.onclick = () => window.location.href = `/artist/${a.id}`;

    card.innerHTML = `
      <img class="artist-card-avatar"
           src="${a.profileImageUrl || 'https://via.placeholder.com/80'}">

      <div>
        <div class="artist-card-name">${a.stageName || "Unknown Artist"}</div>
        <div class="artist-card-sub">Open dashboard →</div>
      </div>
    `;

    container.appendChild(card);
  });
}

function loadArtistList() {
  return fetch("/api/artists/", { cache: "no-store" })
    .then(r => r.json())
    .then(data => {
      allArtists = Array.isArray(data) ? data : [];
      renderArtists(allArtists);
    })
    .catch(err => {
      console.error(err);
      document.getElementById("artist-list").innerHTML =
        `<div class="empty">Failed to load artists.</div>`;
    });
}

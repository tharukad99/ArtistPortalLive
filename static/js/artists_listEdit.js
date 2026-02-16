document.addEventListener("DOMContentLoaded", () => {
    loadArtistList();
});

// Load and display the list of artists
function loadArtistList() {
    fetch("/api/artists/")
        .then(r => r.json())
        .then(artists => {
            const container = document.getElementById("artist-list");
            container.innerHTML = "";

            artists.forEach(artist => {
                const card = document.createElement("div");
                card.className = "artist-card";

                // go to dashboard when clicked
                card.onclick = () => {
                    window.location.href = `/edit-home/${artist.id}`;
                };

                const img = document.createElement("img");
                img.className = "artist-card-avatar";
                img.src = artist.profileImageUrl ||
                    "https://via.placeholder.com/64x64?text=A";

                const info = document.createElement("div");
                info.className = "artist-card-info";

                const name = document.createElement("div");
                name.className = "artist-card-name";
                name.textContent = artist.stageName;

                info.appendChild(name);
                card.appendChild(img);
                card.appendChild(info);

                container.appendChild(card);
            });
        })
        .catch(err => console.error("Error loading artist list:", err));
}

document.addEventListener("DOMContentLoaded", function() {
    const sidebar = document.querySelector(".sidebar");
    const layout = document.querySelector(".layout");
    
    // Create and insert overlay if it doesn't exist
    let overlay = document.querySelector(".sidebar-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.className = "sidebar-overlay";
        layout.appendChild(overlay);
    }
    
    // Find or create toggle button
    const toggleBtn = document.getElementById("sidebarToggle");
    
    if (toggleBtn) {
        toggleBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            sidebar.classList.toggle("open");
            overlay.classList.toggle("active");
        });
    }
    
    // Close when clicking overlay
    overlay.addEventListener("click", function() {
        sidebar.classList.remove("open");
        overlay.classList.remove("active");
    });
    
    // Close on escape key
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape" && sidebar.classList.contains("open")) {
            sidebar.classList.remove("open");
            overlay.classList.remove("active");
        }
    });

    // Close when resizing to desktop
    window.addEventListener("resize", function() {
        if (window.innerWidth > 900) {
            sidebar.classList.remove("open");
            overlay.classList.remove("active");
        }
    });
});

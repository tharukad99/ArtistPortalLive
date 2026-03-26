document.addEventListener("DOMContentLoaded", () => {
  // ====== GET ELEMENTS ======
  const tbody = document.getElementById("usersTbody");
  const statusEl = document.getElementById("status");
  const searchBox = document.getElementById("searchBox");

  const modal = document.getElementById("otpModal");
  const backdrop = document.getElementById("modalBackdrop");
  const modalTitle = document.getElementById("modalTitle");

  const btnClose = document.getElementById("btnCloseModal");
  const btnCancel = document.getElementById("btnCancel");
  const btnSend = document.getElementById("btnSend");
  const btnGenerate = document.getElementById("btnGenerate");

  const userIdInput = document.getElementById("userId");
  const userEmailInput = document.getElementById("userEmail");
  const userDisplayNameInput = document.getElementById("userDisplayName");
  const otpValueInput = document.getElementById("otpValue");

  const formError = document.getElementById("formError");
  const formSuccess = document.getElementById("formSuccess");
  const usersTable = document.getElementById("usersTable");

  const btnAddUser = document.getElementById("btnAddUser");
  const createUserModal = document.getElementById("createUserModal");
  const btnCloseUserModal = document.getElementById("btnCloseUserModal");
  const btnCancelUser = document.getElementById("btnCancelUser");
  const btnSaveUser = document.getElementById("btnSaveUser");
  const createUserError = document.getElementById("createUserError");

  // ====== STATE ======
  let allUsers = [];

  // ====== UTILS ======
  function setStatus(msg) {
    statusEl.textContent = msg || "";
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function generateOTP(length = 8) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }

  // ====== MODAL CONTROL ======
  function openModal(user) {
    formError.textContent = "";
    formSuccess.textContent = "";

    userIdInput.value = user.id;
    userEmailInput.value = user.email || "";
    userDisplayNameInput.value = user.displayName || "";
    otpValueInput.value = ""; // Don't generate immediately

    backdrop.hidden = false;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    backdrop.hidden = true;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  // ====== TABLE RENDER ======
  function renderTable(items) {
    tbody.innerHTML = "";

    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty">No users found.</td></tr>`;
      return;
    }

    for (const u of items) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(u.username)}</td>
        <td>${escapeHtml(u.displayName)}</td>
        <td>${escapeHtml(u.email || "-")}</td>
        <td>
          <span class="pill ${u.isActive ? "pill-green" : "pill-gray"}">
            ${u.isActive ? "Active" : "Inactive"}
          </span>
        </td>
        <td>${escapeHtml((u.dateCreated || "").slice(0, 19))}</td>
        <td>
          <div style="display:flex; gap:8px;">
            <button class="btn-secondary" style="padding: 4px 8px; font-size: 13px;" data-action="edit" data-id="${u.id}">Edit</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    }
  }

  function filterAndRender() {
    const q = (searchBox.value || "").trim().toLowerCase();
    const filtered = !q
      ? allUsers
      : allUsers.filter(u =>
        (u.username || "").toLowerCase().includes(q) ||
        (u.displayName || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      );
    renderTable(filtered);
  }

  // ====== API LOAD ======
  async function loadUsers() {
    setStatus("Loading...");
    try {
      const res = await fetch("/api/users/", { credentials: "include" });
      if (!res.ok) {
        setStatus("Failed to load users");
        return;
      }
      allUsers = await res.json();
      setStatus("");
      filterAndRender();
    } catch (err) {
      setStatus("Error: " + err.message);
    }
  }

  // ====== SAVE & SEND EMAIL ======
  async function saveAndSend() {
    formError.textContent = "";
    formSuccess.textContent = "";

    const userId = userIdInput.value;
    const password = otpValueInput.value;
    const email = userEmailInput.value;
    const displayName = userDisplayNameInput.value;

    if (!password) {
      formError.textContent = "Please generate a password first.";
      return;
    }

    if (!email) {
      formError.textContent = "User has no email address. Cannot send OTP.";
      return;
    }

    btnSend.disabled = true;
    btnSend.textContent = "Processing...";

    try {
      // 1. Save password to backend
      const res = await fetch(`/api/users/${userId}/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include"
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        formError.textContent = data.error || "Failed to save password.";
        return;
      }

      // 2. Send email via EmailJS
      // TO USER: Replace with your actual IDs from EmailJS dashboard
      const SERVICE_ID = "service_w2fccgp";
      const TEMPLATE_ID = "template_ue0peal";
      const PUBLIC_KEY = "vwcoJIUUH5bkSfzRS";

      if (PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
        emailjs.init(PUBLIC_KEY);
        await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
          to_email: email,
          to_name: displayName,
          message: `Your one-time password is: ${password}`,
          otp: password
        });
        formSuccess.textContent = "Password saved and email sent successfully!";
      } else {
        formSuccess.textContent = "Password saved. (Email not sent: EmailJS keys not configured)";
      }

      setTimeout(closeModal, 2000);
    } catch (err) {
      formError.textContent = "Error: " + err.message;
    } finally {
      btnSend.disabled = false;
      btnSend.textContent = "Save & Send Email";
    }
  }

  // ====== EVENTS ======
  btnGenerate.addEventListener("click", () => {
    otpValueInput.value = generateOTP();
  });

  btnSend.addEventListener("click", saveAndSend);

  btnClose.addEventListener("click", closeModal);
  btnCancel.addEventListener("click", closeModal);
  backdrop.addEventListener("click", () => {
      closeModal();
      closeCreateUserModal();
  });

  searchBox.addEventListener("input", filterAndRender);

  usersTable.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id, 10);
    const user = allUsers.find(u => u.id === id);
    if (!user) return;
    
    if (action === "otp") {
      openModal(user);
    } else if (action === "edit") {
      openEditUserModal(user);
    }
  });

  // ====== ADD/EDIT USER LOGIC ======
  const btnDeleteUser = document.getElementById("btnDeleteUser");
  const editUserIdInput = document.getElementById("editUserId");

  function openCreateUserModal() {
    document.getElementById("createUserModalTitle").textContent = "Add New User";
    editUserIdInput.value = "0";
    document.getElementById("newUsername").value = "";
    document.getElementById("newEmail").value = "";
    document.getElementById("newIsActive").checked = true;
    
    document.querySelectorAll(".artist-checkbox").forEach(cb => {
      cb.checked = false;
      const label = cb.closest("label");
      if (label) {
        label.style.backgroundColor = "#ffffff";
        label.style.borderColor = "#E2E8F0";
      }
    });
    
    if (btnDeleteUser) btnDeleteUser.hidden = true;
    if (createUserError) createUserError.textContent = "";

    backdrop.hidden = false;
    createUserModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function openEditUserModal(user) {
    document.getElementById("createUserModalTitle").textContent = "Edit User";
    editUserIdInput.value = user.id;
    document.getElementById("newUsername").value = user.username || "";
    document.getElementById("newEmail").value = user.email || "";
    document.getElementById("newIsActive").checked = user.isActive;
    
    const assigned = Array.isArray(user.assignedArtists) ? user.assignedArtists : [];
    document.querySelectorAll(".artist-checkbox").forEach(cb => {
      cb.checked = assigned.includes(parseInt(cb.value, 10));
      // Manually trigger the styles for the parent label
      const label = cb.closest("label");
      if (label) {
        label.style.backgroundColor = cb.checked ? "#EFF6FF" : "#ffffff";
        label.style.borderColor = cb.checked ? "#BFDBFE" : "#E2E8F0";
      }
    });

    if (btnDeleteUser) btnDeleteUser.hidden = false;
    if (createUserError) createUserError.textContent = "";

    backdrop.hidden = false;
    createUserModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeCreateUserModal() {
    createUserModal.hidden = true;
    document.body.style.overflow = "";
    if (modal.hidden) backdrop.hidden = true; // don't close if OTP modal is open
  }

  if (btnAddUser) btnAddUser.addEventListener("click", openCreateUserModal);
  if (btnCloseUserModal) btnCloseUserModal.addEventListener("click", closeCreateUserModal);
  if (btnCancelUser) btnCancelUser.addEventListener("click", closeCreateUserModal);
  createUserModal.addEventListener("click", (e) => {
    if (e.target === createUserModal) closeCreateUserModal();
  });

  if (btnSaveUser) {
    btnSaveUser.addEventListener("click", async () => {
      const id = parseInt(editUserIdInput.value, 10);
      const isEdit = id > 0;
      
      const selectedArtists = Array.from(document.querySelectorAll(".artist-checkbox:checked"))
                                   .map(cb => parseInt(cb.value, 10));

      const data = {
        username: document.getElementById("newUsername").value,
        displayName: document.getElementById("newUsername").value,
        email: document.getElementById("newEmail").value,
        password: isEdit ? "" : generateOTP() + "!",
        role: 2,
        isActive: document.getElementById("newIsActive").checked,
        assignedArtists: selectedArtists
      };
      
      if (!data.username) {
        if (createUserError) createUserError.textContent = "Username is required.";
        return;
      }
      
      btnSaveUser.disabled = true;
      btnSaveUser.textContent = "Saving...";
      
      try {
        const url = isEdit ? `/api/users/${id}` : "/api/users/";
        const method = isEdit ? "PUT" : "POST";
          
        const res = await fetch(url, {
          method: method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include"
        });
        
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (createUserError) createUserError.textContent = body.error || "Failed to save user.";
          return;
        }
        
        closeCreateUserModal();
        loadUsers();
      } catch (err) {
        if (createUserError) createUserError.textContent = "Error: " + err.message;
      } finally {
        btnSaveUser.disabled = false;
        btnSaveUser.textContent = "Save User";
      }
    });

    if (btnDeleteUser) {
      btnDeleteUser.addEventListener("click", async () => {
        const id = editUserIdInput.value;
        if (!id || id === "0") return;

        if (!confirm("Are you sure you want to completely delete this user? This will unmap any artists they created.")) return;

        btnDeleteUser.disabled = true;
        btnDeleteUser.textContent = "Deleting...";

        try {
          const res = await fetch(`/api/users/${id}`, {
            method: "DELETE",
            credentials: "include"
          });

          const body = await res.json().catch(() => ({}));
          if (!res.ok) {
            if (createUserError) createUserError.textContent = body.error || "Failed to delete user.";
            return;
          }

          closeCreateUserModal();
          loadUsers();
        } catch (err) {
          if (createUserError) createUserError.textContent = "Error: " + err.message;
        } finally {
          btnDeleteUser.disabled = false;
          btnDeleteUser.textContent = "Delete User";
        }
      });
    }
  }

  let allAssignableArtists = [];
  async function loadAssignableArtists() {
      try {
        const res = await fetch("/api/artists/AllArtistsList?only_active=0", { credentials: "include" });
        if (!res.ok) return;
        allAssignableArtists = await res.json();
        
        const artistContainer = document.getElementById("assignedArtistsContainer");
        if (!artistContainer) return;
        
        artistContainer.innerHTML = "";
        allAssignableArtists.forEach(a => {
            const label = document.createElement("label");
            label.style.display = "flex";
            label.style.flexDirection = "row";
            label.style.alignItems = "center";
            label.style.justifyContent = "flex-start"; // Override text-align center
            label.style.gap = "12px";
            label.style.padding = "8px 12px";
            label.style.margin = "0";
            label.style.cursor = "pointer";
            label.style.background = "#ffffff";
            label.style.border = "1px solid #E2E8F0";
            label.style.borderRadius = "6px";
            label.style.boxShadow = "0 1px 2px rgba(0,0,0,0.02)";
            label.style.transition = "border-color 0.2s, background-color 0.2s";
            
            // Interaction effects
            label.addEventListener("mouseenter", () => label.style.borderColor = "#94A3B8");
            label.addEventListener("mouseleave", () => label.style.borderColor = "#E2E8F0");
            
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.value = a.id;
            cb.className = "artist-checkbox";
            cb.style.margin = "0"; // Override checkbox margin
            cb.style.width = "16px";
            cb.style.height = "16px";
            cb.style.cursor = "pointer";
            cb.style.accentColor = "#2563EB"; // Primary blue
            
            const text = document.createElement("div");
            text.style.display = "flex";
            text.style.flexDirection = "column";
            text.style.alignItems = "flex-start";
            
            const stageNameTxt = document.createElement("span");
            stageNameTxt.textContent = a.stageName;
            stageNameTxt.style.fontWeight = "600";
            stageNameTxt.style.fontSize = "14px";
            stageNameTxt.style.color = "#1E293B";
            
            const fullNameTxt = document.createElement("span");
            fullNameTxt.textContent = a.fullName ? `(${a.fullName})` : "(No full name)";
            fullNameTxt.style.fontSize = "12px";
            fullNameTxt.style.color = "#64748B";
            
            text.appendChild(stageNameTxt);
            text.appendChild(fullNameTxt);
            
            label.appendChild(cb);
            label.appendChild(text);
            
            // Add click row highlight behavior
            cb.addEventListener("change", () => {
              label.style.backgroundColor = cb.checked ? "#EFF6FF" : "#ffffff";
              label.style.borderColor = cb.checked ? "#BFDBFE" : "#E2E8F0";
            });

            artistContainer.appendChild(label);
        });
      } catch (e) {
        console.error("Failed to load artists for mapping", e);
      }
  }

  // ====== START ======
  loadUsers();
  loadAssignableArtists();
});

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
  backdrop.addEventListener("click", closeModal);

  searchBox.addEventListener("input", filterAndRender);

  usersTable.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action='otp']");
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    const user = allUsers.find(u => u.id === id);
    if (user) openModal(user);
  });

  // ====== START ======
  loadUsers();
});

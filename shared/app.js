(function () {
    const STORAGE_KEY = "pharmachain_session";
    const PROFILE_OVERRIDE_KEY = "pharmachain_profile_override";

    function getSession() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        } catch (error) {
            return null;
        }
    }

    function setSession(session) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }

    function clearSession() {
        localStorage.removeItem(STORAGE_KEY);
    }

    function getProfileOverride() {
        try {
            const parsed = JSON.parse(localStorage.getItem(PROFILE_OVERRIDE_KEY) || "null");
            if (!parsed || Array.isArray(parsed)) {
                return parsed;
            }

            // Ignore legacy single-profile payloads that were not keyed by email.
            if ("name" in parsed || "avatar" in parsed || "phone" in parsed || "company" in parsed) {
                return {};
            }

            return parsed;
        } catch (error) {
            return null;
        }
    }

    function setProfileOverride(profile, email) {
        const nextEmail = String(email || profile?.email || "").toLowerCase();
        if (!nextEmail) return;

        const existingOverrides = getProfileOverride() || {};
        existingOverrides[nextEmail] = {
            ...(existingOverrides[nextEmail] || {}),
            ...profile,
            email: nextEmail
        };
        localStorage.setItem(PROFILE_OVERRIDE_KEY, JSON.stringify(existingOverrides));
    }

    function clearProfileOverride(email) {
        if (!email) {
            localStorage.removeItem(PROFILE_OVERRIDE_KEY);
            return;
        }

        const existingOverrides = getProfileOverride() || {};
        const nextEmail = String(email).toLowerCase();
        if (existingOverrides[nextEmail]) {
            delete existingOverrides[nextEmail];
            localStorage.setItem(PROFILE_OVERRIDE_KEY, JSON.stringify(existingOverrides));
        }
    }

    function mergeProfileOverride(user) {
        const allOverrides = getProfileOverride();
        const email = String(user?.email || "").toLowerCase();
        const profileOverride = email ? allOverrides?.[email] : null;

        if (!user || !profileOverride) {
            return user;
        }

        return {
            ...user,
            ...profileOverride
        };
    }

    async function api(path, options = {}) {
        const session = getSession();
        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {})
        };

        if (session?.token) {
            headers.Authorization = `Bearer ${session.token}`;
        }

        const response = await fetch(path, {
            ...options,
            headers
        });

        if (response.status === 401) {
            clearSession();
            window.location.href = `${getRootPrefix()}login.html`;
            throw new Error("Session expired");
        }

        const contentType = response.headers.get("content-type") || "";
        const body = contentType.includes("application/json")
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            throw new Error(body?.message || "Request failed");
        }

        return body;
    }

    function getRootPrefix() {
        const depth = Math.max(0, window.location.pathname
            .split("/")
            .filter(Boolean)
            .length - 1);

        return depth > 0 ? "../".repeat(depth) : "";
    }

    async function requireAuth() {
        const session = getSession();
        if (!session?.token) {
            window.location.href = `${getRootPrefix()}login.html`;
            return null;
        }

        try {
            const user = mergeProfileOverride(await api("/api/auth/me"));
            const nextSession = { ...session, user };
            setSession(nextSession);
            return nextSession;
        } catch (error) {
            const fallbackUser = mergeProfileOverride(session?.user || null);
            if (fallbackUser) {
                const nextSession = { ...session, user: fallbackUser };
                setSession(nextSession);
                return nextSession;
            }
            clearSession();
            window.location.href = `${getRootPrefix()}login.html`;
            return null;
        }
    }

    function logout() {
        clearSession();
        window.location.href = `${getRootPrefix()}login.html`;
    }

    function getInitials(name) {
        return String(name || "User")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("") || "U";
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function updateProfileUi(user) {
        const nextUser = user || {};
        const nextName = nextUser.name || "User";
        const nextRole = nextUser.role || "member";
        const nextEmail = nextUser.email || "";
        const nextCompany = nextUser.company || "PharmaChain";
        const nextAvatar = nextUser.avatar || "";
        const initials = getInitials(nextName);

        const syncImagePair = (imageId, initialsId) => {
            const image = document.getElementById(imageId);
            const initialsNode = document.getElementById(initialsId);
            if (image) {
                image.src = nextAvatar;
                image.style.display = nextAvatar ? "block" : "none";
            }
            if (initialsNode) {
                initialsNode.textContent = initials;
                initialsNode.style.display = nextAvatar ? "none" : "flex";
            }
        };

        syncImagePair("profileMenuAvatarImage", "profileMenuAvatarInitials");
        syncImagePair("profileCardAvatarImage", "profileCardAvatarInitials");
        syncImagePair("profileAvatarPreviewImage", "profileAvatarPreviewInitials");

        const mappings = [
            ["profileMenuName", nextName],
            ["profileMenuRole", nextRole],
            ["profileCardName", nextName],
            ["profileCardMeta", nextEmail],
            ["pharmachainBrandSubtitle", nextRole === "admin" ? "Admin Panel" : "User Panel"]
        ];

        mappings.forEach(([id, value]) => {
            const node = document.getElementById(id);
            if (node) node.textContent = value;
        });

        const form = document.getElementById("profileEditForm");
        if (form) {
            if (form.elements.profileName) form.elements.profileName.value = nextName;
            if (form.elements.profileEmail) form.elements.profileEmail.value = nextEmail;
            if (form.elements.profilePhone) form.elements.profilePhone.value = nextUser.phone || "";
            if (form.elements.profileCompany) form.elements.profileCompany.value = nextCompany;
        }
    }

    function bindProfilePanel(rootPrefix) {
        const session = getSession();
        const profileTrigger = document.getElementById("profileMenuButton");
        const profilePanel = document.getElementById("profileDropdownPanel");
        const profileOverlay = document.getElementById("profilePanelOverlay");
        const profileClose = document.getElementById("profilePanelClose");
        const logoutButton = document.getElementById("globalLogoutBtn");
        const editButton = document.getElementById("openProfileEditorBtn");
        const editor = document.getElementById("profileEditorCard");
        const cancelButton = document.getElementById("cancelProfileEditBtn");
        const form = document.getElementById("profileEditForm");
        const passwordForm = document.getElementById("profilePasswordForm");
        const fileInput = document.getElementById("profileAvatarInput");
        const previewImage = document.getElementById("profileAvatarPreviewImage");
        const previewInitials = document.getElementById("profileAvatarPreviewInitials");
        const pictureHint = document.getElementById("profilePictureHint");
        const removeButton = document.getElementById("removeProfilePhotoBtn");
        const menuAvatarImage = document.getElementById("profileMenuAvatarImage");
        const menuAvatarInitials = document.getElementById("profileMenuAvatarInitials");
        const cardAvatarImage = document.getElementById("profileCardAvatarImage");
        const cardAvatarInitials = document.getElementById("profileCardAvatarInitials");

        if (!profileTrigger || !profilePanel) {
            return;
        }

        let pendingAvatar = session?.user?.avatar || "";

        const togglePanel = (forceOpen) => {
            const shouldOpen = typeof forceOpen === "boolean"
                ? forceOpen
                : !profilePanel.classList.contains("open");

            profilePanel.classList.toggle("open", shouldOpen);
            profileOverlay?.classList.toggle("open", shouldOpen);
            profileTrigger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");

            if (!shouldOpen) {
                editor?.classList.remove("open");
            }
        };

        const syncAvatar = (avatar, name) => {
            const initials = getInitials(name);
            [menuAvatarImage, cardAvatarImage, previewImage].forEach((image) => {
                if (!image) return;
                image.src = avatar || "";
                image.style.display = avatar ? "block" : "none";
            });
            [menuAvatarInitials, cardAvatarInitials, previewInitials].forEach((node) => {
                if (!node) return;
                node.textContent = initials;
                node.style.display = avatar ? "none" : "flex";
            });
        };

        syncAvatar(session?.user?.avatar || "", session?.user?.name || "User");

        profileTrigger.addEventListener("click", () => togglePanel());
        profileOverlay?.addEventListener("click", () => togglePanel(false));
        profileClose?.addEventListener("click", () => togglePanel(false));
        logoutButton?.addEventListener("click", logout);

        editButton?.addEventListener("click", () => {
            editor?.classList.add("open");
            pendingAvatar = getSession()?.user?.avatar || "";
            const activeSession = getSession();
            if (form) {
                form.elements.profileName.value = activeSession?.user?.name || "";
                form.elements.profileEmail.value = activeSession?.user?.email || "";
                form.elements.profilePhone.value = activeSession?.user?.phone || "";
                form.elements.profileCompany.value = activeSession?.user?.company || "";
            }
            pictureHint.textContent = activeSession?.user?.avatar
                ? "Current photo loaded. You can replace or remove it."
                : "Upload JPG or PNG profile photo.";
            syncAvatar(activeSession?.user?.avatar || "", activeSession?.user?.name || "User");
        });

        cancelButton?.addEventListener("click", () => {
            editor?.classList.remove("open");
            pendingAvatar = getSession()?.user?.avatar || "";
            syncAvatar(pendingAvatar, getSession()?.user?.name || "User");
        });

        removeButton?.addEventListener("click", () => {
            pendingAvatar = "";
            if (fileInput) fileInput.value = "";
            pictureHint.textContent = "Profile photo removed. Save profile to apply.";
            syncAvatar("", form?.elements.profileName?.value || getSession()?.user?.name || "User");
        });

        fileInput?.addEventListener("change", () => {
            const [file] = Array.from(fileInput.files || []);

            if (!file) return;
            if (!file.type.startsWith("image/")) {
                pictureHint.textContent = "Please choose an image file.";
                fileInput.value = "";
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                pictureHint.textContent = "Image size should be under 2MB.";
                fileInput.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                pendingAvatar = typeof reader.result === "string" ? reader.result : "";
                pictureHint.textContent = "Profile photo ready. Save profile to apply.";
                syncAvatar(pendingAvatar, form?.elements.profileName?.value || getSession()?.user?.name || "User");
            };
            reader.readAsDataURL(file);
        });

        form?.elements.profileName?.addEventListener("input", (event) => {
            syncAvatar(pendingAvatar, event.target.value);
        });

        form?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const submitButton = document.getElementById("saveProfileBtn");
            const feedback = document.getElementById("profileEditFeedback");
            const payload = {
                name: form.elements.profileName.value.trim(),
                phone: form.elements.profilePhone.value.trim(),
                company: form.elements.profileCompany.value.trim(),
                avatar: pendingAvatar
            };

            if (!payload.name) {
                feedback.textContent = "Name required hai.";
                feedback.className = "pharmachain-profile-feedback error";
                return;
            }

            try {
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = "Saving...";
                }

                const response = await api("/api/auth/profile", {
                    method: "PUT",
                    body: JSON.stringify(payload)
                });

                const nextSession = {
                    ...getSession(),
                    user: response.user
                };
                setSession(nextSession);
                clearProfileOverride(response.user?.email);
                pendingAvatar = response.user.avatar || "";
                updateProfileUi(response.user);

                feedback.textContent = response.message || "Profile updated";
                feedback.className = "pharmachain-profile-feedback success";
                editor?.classList.remove("open");
            } catch (error) {
                const activeSession = getSession() || {};
                const fallbackUser = {
                    ...(activeSession.user || {}),
                    name: payload.name,
                    phone: payload.phone,
                    company: payload.company || activeSession?.user?.company || "PharmaChain",
                    avatar: pendingAvatar
                };
                setProfileOverride({
                    name: fallbackUser.name,
                    phone: fallbackUser.phone,
                    company: fallbackUser.company,
                    avatar: fallbackUser.avatar
                }, fallbackUser.email);
                setSession({
                    ...activeSession,
                    user: fallbackUser
                });
                updateProfileUi(fallbackUser);
                editor?.classList.remove("open");
                feedback.textContent = "Profile saved on this device. Backend sync ke liye server restart karke dubara try kar sakte ho.";
                feedback.className = "pharmachain-profile-feedback success";
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Save Profile";
                }
            }
        });

        passwordForm?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const submitButton = document.getElementById("savePasswordBtn");
            const feedback = document.getElementById("profilePasswordFeedback");
            const currentPassword = passwordForm.elements.currentPassword.value.trim();
            const newPassword = passwordForm.elements.newPassword.value.trim();
            const confirmPassword = passwordForm.elements.confirmPassword.value.trim();

            if (!currentPassword || !newPassword || !confirmPassword) {
                feedback.textContent = "Sab password fields fill karo.";
                feedback.className = "pharmachain-profile-feedback error";
                return;
            }

            if (newPassword.length < 6) {
                feedback.textContent = "New password kam se kam 6 characters ka hona chahiye.";
                feedback.className = "pharmachain-profile-feedback error";
                return;
            }

            if (newPassword !== confirmPassword) {
                feedback.textContent = "New password aur confirm password same nahi hai.";
                feedback.className = "pharmachain-profile-feedback error";
                return;
            }

            try {
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = "Updating...";
                }

                const response = await api("/api/auth/change-password", {
                    method: "PUT",
                    body: JSON.stringify({
                        currentPassword,
                        newPassword,
                        confirmPassword
                    })
                });

                feedback.textContent = response.message || "Password changed successfully";
                feedback.className = "pharmachain-profile-feedback success";
                passwordForm.reset();
            } catch (error) {
                feedback.textContent = error.message && error.message !== "Request failed"
                    ? error.message
                    : "Password change backend abhi update nahi hua. Ek baar server restart karke phir try karo.";
                feedback.className = "pharmachain-profile-feedback error";
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Change Password";
                }
            }
        });
    }

    function isAdmin() {
        const session = getSession();
        return session?.user?.role === "admin" || session?.user?.email === "admin@pharmachain.com";
    }

    function mountPageShell(pageTitle) {
        const session = getSession();
        const userName = session?.user?.name || "User";
        const userRole = session?.user?.role || "member";
        const userEmail = session?.user?.email || "";
        const userPhone = session?.user?.phone || "";
        const userCompany = session?.user?.company || "PharmaChain";
        const userAvatar = session?.user?.avatar || "";
        const userInitials = getInitials(userName);
        const rootPrefix = getRootPrefix();
        const currentPath = window.location.pathname.toLowerCase();

        const links = [
            { label: "Dashboard", href: `${rootPrefix}Dashboard/dashboard.html`, key: "/dashboard/", icon: "fas fa-chart-line" },
            { label: "Doctors", href: `${rootPrefix}Doctor/doctor.html`, key: "/doctor/", icon: "fas fa-user-doctor" },
            { label: "Hospitals", href: `${rootPrefix}Hospital/hospital.html`, key: "/hospital/", icon: "fas fa-hospital" },
            { label: "Medicines", href: `${rootPrefix}Medecine/medecine.html`, key: "/medecine/", icon: "fas fa-capsules" },
            { label: "Patients", href: `${rootPrefix}Patient/patient.html`, key: "/patient/", icon: "fas fa-users" },
            { label: "Orders", href: `${rootPrefix}Ordered/order.html`, key: "/ordered/", icon: "fas fa-bag-shopping" }
        ];

        if (!document.getElementById("pharmachain-shell-style")) {
            const style = document.createElement("style");
            style.id = "pharmachain-shell-style";
            style.textContent = `
                body.pharmachain-shell-body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #f8fafc !important;
                    overflow-x: hidden;
                }
                body.pharmachain-shell-body > * {
                    box-sizing: border-box;
                }
                .pharmachain-page-anchor,
                #pharmachain-page-anchor {
                    margin: 0 !important;
                    padding: 0 !important;
                }
                #pharmachain-page-anchor > .container,
                #pharmachain-page-anchor > .container-fluid,
                #pharmachain-page-anchor > .page,
                #pharmachain-page-anchor > .main-app,
                #pharmachain-page-anchor > .auth-page {
                    margin-left: 0 !important;
                }
                .pharmachain-shell {
                    display: flex;
                    min-height: 100vh;
                }
                .pharmachain-sidebar {
                    width: 274px;
                    min-width: 274px;
                    max-width: 274px;
                    flex: 0 0 274px;
                    background:
                        radial-gradient(circle at top left, rgba(96,165,250,0.16), transparent 32%),
                        linear-gradient(180deg, #0f172a 0%, #172033 45%, #1e293b 100%);
                    color: #fff;
                    padding: 1.1rem 0.9rem 0.9rem;
                    position: sticky;
                    top: 0;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    gap: 0.9rem;
                    box-shadow: 16px 0 40px rgba(15, 23, 42, 0.18);
                    overflow: hidden;
                }
                .pharmachain-brand {
                    padding: 0.7rem 0.85rem 0.9rem;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    min-height: 132px;
                    display: flex;
                    gap: 0.8rem;
                    align-items: center;
                }
                .pharmachain-brand-logo {
                    width: 58px;
                    height: 58px;
                    border-radius: 16px;
                    object-fit: cover;
                    background: transparent;
                    padding: 0;
                    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
                    flex-shrink: 0;
                }
                .pharmachain-brand-copy {
                    min-width: 0;
                }
                .pharmachain-brand-title {
                    font-size: 1.8rem;
                    font-weight: 800;
                    color: #60a5fa;
                    letter-spacing: -0.03em;
                    line-height: 1.05;
                }
                .pharmachain-brand-subtitle {
                    color: rgba(255,255,255,0.72);
                    font-size: 0.9rem;
                    margin-top: 0.35rem;
                }
                .pharmachain-nav {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                    flex: 1 1 auto;
                }
                .pharmachain-nav-link {
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                    padding: 0.78rem 0.95rem;
                    color: rgba(255,255,255,0.88);
                    text-decoration: none;
                    border-radius: 14px;
                    border: 1px solid rgba(255,255,255,0);
                    transition: 0.2s ease;
                    font-weight: 600;
                    font-size: 0.98rem;
                    min-height: 54px;
                    box-sizing: border-box;
                }
                .pharmachain-nav-link:hover,
                .pharmachain-nav-link.active {
                    background: linear-gradient(135deg, rgba(59,130,246,0.22), rgba(37,99,235,0.14));
                    color: #fff;
                    border-color: rgba(96,165,250,0.34);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 24px rgba(15, 23, 42, 0.18);
                }
                .pharmachain-nav-link i {
                    width: 18px;
                    text-align: center;
                    color: #93c5fd;
                    font-size: 0.95rem;
                }
                .pharmachain-sidebar-footer {
                    margin-top: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                    padding: 0.8rem 0.55rem 0;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    min-height: 172px;
                }
                .pharmachain-profile-trigger {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    text-align: left;
                    background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.05));
                    border: 1px solid rgba(255,255,255,0.14);
                    color: #fff;
                    padding: 0.85rem 0.95rem;
                    border-radius: 14px;
                    font-weight: 700;
                    font-size: 0.95rem;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
                }
                .pharmachain-profile-trigger:hover {
                    background: linear-gradient(180deg, rgba(59,130,246,0.2), rgba(37,99,235,0.12));
                    border-color: rgba(96,165,250,0.34);
                }
                .pharmachain-profile-trigger i {
                    margin-left: auto;
                    opacity: 0.8;
                }
                .pharmachain-profile-avatar,
                .pharmachain-profile-avatar-large,
                .pharmachain-profile-avatar-preview {
                    position: relative;
                    border-radius: 50%;
                    overflow: hidden;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #3b82f6, #60a5fa);
                    color: #fff;
                    font-weight: 800;
                    flex-shrink: 0;
                }
                .pharmachain-profile-avatar {
                    width: 42px;
                    height: 42px;
                    font-size: 0.95rem;
                }
                .pharmachain-profile-avatar-large,
                .pharmachain-profile-avatar-preview {
                    width: 72px;
                    height: 72px;
                    font-size: 1.35rem;
                }
                .pharmachain-profile-avatar img,
                .pharmachain-profile-avatar-large img,
                .pharmachain-profile-avatar-preview img {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .pharmachain-profile-meta {
                    min-width: 0;
                }
                .pharmachain-profile-name {
                    display: block;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .pharmachain-profile-role {
                    display: block;
                    color: rgba(255,255,255,0.68);
                    font-size: 0.82rem;
                    font-weight: 500;
                    text-transform: capitalize;
                }
                .pharmachain-profile-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.4);
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s ease;
                    z-index: 120;
                }
                .pharmachain-profile-overlay.open {
                    opacity: 1;
                    pointer-events: auto;
                }
                .pharmachain-profile-panel {
                    position: fixed;
                    left: 292px;
                    bottom: 18px;
                    width: min(420px, calc(100vw - 330px));
                    background: #fff;
                    color: #0f172a;
                    border-radius: 24px;
                    box-shadow: 0 28px 70px rgba(15, 23, 42, 0.3);
                    border: 1px solid rgba(148,163,184,0.22);
                    z-index: 130;
                    padding: 1.05rem;
                    transform: translateY(18px);
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.2s ease, transform 0.2s ease;
                    max-height: calc(100vh - 36px);
                    overflow-y: auto;
                }
                .pharmachain-profile-panel.open {
                    opacity: 1;
                    transform: translateY(0);
                    pointer-events: auto;
                }
                .pharmachain-profile-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                .pharmachain-profile-close {
                    border: none;
                    background: #eef2ff;
                    color: #1e3a8a;
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    font-size: 1rem;
                }
                .pharmachain-profile-card {
                    background: linear-gradient(135deg, #eff6ff, #f8fafc);
                    border: 1px solid #dbeafe;
                    border-radius: 20px;
                    padding: 1rem;
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                    margin-bottom: 1rem;
                }
                .pharmachain-profile-card h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 800;
                }
                .pharmachain-profile-card p {
                    margin: 0.18rem 0;
                    color: #475569;
                }
                .pharmachain-profile-actions {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }
                .pharmachain-profile-action {
                    border: 1px solid #dbeafe;
                    background: #fff;
                    border-radius: 16px;
                    padding: 0.9rem;
                    text-align: left;
                }
                .pharmachain-profile-action strong {
                    display: block;
                    color: #0f172a;
                    margin-bottom: 0.2rem;
                }
                .pharmachain-profile-action span {
                    color: #64748b;
                    font-size: 0.88rem;
                }
                .pharmachain-profile-editor {
                    display: none;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 20px;
                    padding: 1rem;
                }
                .pharmachain-profile-editor.open {
                    display: block;
                }
                .pharmachain-profile-section-title {
                    margin: 0 0 0.9rem;
                    color: #0f172a;
                    font-size: 1rem;
                    font-weight: 800;
                }
                .pharmachain-profile-editor-grid {
                    display: grid;
                    grid-template-columns: 88px 1fr;
                    gap: 1rem;
                    align-items: start;
                    margin-bottom: 1rem;
                }
                .pharmachain-password-card {
                    margin-top: 1rem;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 18px;
                    padding: 1rem;
                }
                .pharmachain-profile-upload-controls {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.55rem;
                    margin-top: 0.65rem;
                }
                .pharmachain-profile-upload-controls label,
                .pharmachain-profile-upload-controls button {
                    border: 1px solid #cbd5e1;
                    background: #fff;
                    color: #0f172a;
                    border-radius: 999px;
                    padding: 0.45rem 0.8rem;
                    font-size: 0.84rem;
                    font-weight: 700;
                    cursor: pointer;
                }
                .pharmachain-profile-upload-controls input {
                    display: none;
                }
                .pharmachain-profile-upload-hint {
                    color: #64748b;
                    font-size: 0.84rem;
                    margin: 0;
                }
                .pharmachain-profile-editor .form-label {
                    font-weight: 700;
                    color: #334155;
                }
                .pharmachain-profile-editor .form-control {
                    border-radius: 12px;
                    padding: 0.72rem 0.85rem;
                }
                .pharmachain-profile-editor .input-group-text {
                    border-radius: 12px 0 0 12px;
                }
                .pharmachain-profile-feedback {
                    margin-top: 0.7rem;
                    font-size: 0.9rem;
                    font-weight: 700;
                }
                .pharmachain-profile-feedback.success {
                    color: #15803d;
                }
                .pharmachain-profile-feedback.error {
                    color: #b91c1c;
                }
                .pharmachain-profile-panel .btn {
                    border-radius: 12px;
                    font-weight: 700;
                }
                .pharmachain-sidebar-footer .btn {
                    border-radius: 12px;
                    font-weight: 700;
                    padding: 0.75rem 0.95rem;
                }
                .pharmachain-main {
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                }
                .pharmachain-topbar {
                    background: #fff;
                    border-bottom: 1px solid #e5e7eb;
                    padding: 0.9rem 1.35rem;
                    position: sticky;
                    top: 0;
                    z-index: 50;
                }
                .pharmachain-content {
                    padding: 1rem 1.15rem;
                }
                .pharmachain-topbar .fw-bold {
                    letter-spacing: -0.02em;
                }
                @media (max-width: 991px) {
                    .pharmachain-shell {
                        display: block;
                    }
                    .pharmachain-sidebar {
                        width: 100%;
                        min-width: 100%;
                        max-width: 100%;
                        height: auto;
                        position: static;
                    }
                    .pharmachain-profile-panel {
                        left: 16px;
                        right: 16px;
                        bottom: 16px;
                        width: auto;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.classList.add("pharmachain-shell-body");

        const shell = document.createElement("div");
        shell.className = "pharmachain-shell";
        shell.innerHTML = `
            <aside class="pharmachain-sidebar">
                <div class="pharmachain-brand">
                    <img class="pharmachain-brand-logo" src="${rootPrefix}logo_hd_no_bg.png" alt="SMART Healthcare System Logo" />
                    <div class="pharmachain-brand-copy">
                        <div class="pharmachain-brand-title">SMART</div>
                        <div class="pharmachain-brand-subtitle" id="pharmachainBrandSubtitle">${userRole === "admin" ? "Admin Panel" : "User Panel"}</div>
                    </div>
                </div>
                <nav class="pharmachain-nav">
                    ${links.map((link) => `
                        <a class="pharmachain-nav-link ${currentPath.includes(link.key) ? "active" : ""}" href="${link.href}">
                            <i class="${link.icon}"></i>
                            ${link.label}
                        </a>
                    `).join("")}
                </nav>
                <div class="pharmachain-sidebar-footer">
                    <button class="pharmachain-profile-trigger" id="profileMenuButton" type="button" aria-expanded="false">
                        <span class="pharmachain-profile-avatar">
                            <span id="profileMenuAvatarInitials" ${userAvatar ? 'style="display:none"' : ""}>${userInitials}</span>
                            <img id="profileMenuAvatarImage" alt="Profile" src="${userAvatar}" ${userAvatar ? "" : 'style="display:none"'} />
                        </span>
                        <span class="pharmachain-profile-meta">
                            <span class="pharmachain-profile-name" id="profileMenuName">${escapeHtml(userName)}</span>
                            <span class="pharmachain-profile-role" id="profileMenuRole">${escapeHtml(userRole)}</span>
                        </span>
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <button class="btn btn-danger" id="globalLogoutBtn">Logout</button>
                </div>
            </aside>
            <main class="pharmachain-main">
                <div class="pharmachain-topbar">
                    <div class="fw-bold fs-5 text-dark">${pageTitle}</div>
                </div>
                <div class="pharmachain-content" id="pharmachain-page-anchor"></div>
            </main>
            <div class="pharmachain-profile-overlay" id="profilePanelOverlay"></div>
            <section class="pharmachain-profile-panel" id="profileDropdownPanel" aria-label="Profile panel">
                <div class="pharmachain-profile-header">
                    <div>
                        <div class="fw-bold fs-5">Profile</div>
                        <div class="text-secondary small">Account settings and quick actions</div>
                    </div>
                    <button class="pharmachain-profile-close" id="profilePanelClose" type="button">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="pharmachain-profile-card">
                    <span class="pharmachain-profile-avatar-large">
                        <span id="profileCardAvatarInitials" ${userAvatar ? 'style="display:none"' : ""}>${userInitials}</span>
                        <img id="profileCardAvatarImage" alt="Profile" src="${userAvatar}" ${userAvatar ? "" : 'style="display:none"'} />
                    </span>
                    <div>
                        <h3 id="profileCardName">${escapeHtml(userName)}</h3>
                        <p id="profileCardMeta">${escapeHtml(userEmail)}</p>
                        <p>${escapeHtml(userCompany)}</p>
                        <p class="text-capitalize mb-0">${escapeHtml(userRole)}</p>
                    </div>
                </div>
                <div class="pharmachain-profile-actions">
                    <button class="pharmachain-profile-action" id="openProfileEditorBtn" type="button">
                        <strong><i class="fas fa-user-pen me-2"></i>Edit profile</strong>
                        <span>Name, phone, company and picture update karo.</span>
                    </button>
                    <button class="pharmachain-profile-action" id="profileLogoutAction" type="button">
                        <strong><i class="fas fa-right-from-bracket me-2"></i>Logout</strong>
                        <span>Is device se safe logout karo.</span>
                    </button>
                </div>
                <div class="pharmachain-profile-editor" id="profileEditorCard">
                    <form id="profileEditForm">
                        <h4 class="pharmachain-profile-section-title">Edit Profile</h4>
                        <div class="pharmachain-profile-editor-grid">
                            <div>
                                <span class="pharmachain-profile-avatar-preview">
                                    <span id="profileAvatarPreviewInitials" ${userAvatar ? 'style="display:none"' : ""}>${userInitials}</span>
                                    <img id="profileAvatarPreviewImage" alt="Profile preview" src="${userAvatar}" ${userAvatar ? "" : 'style="display:none"'} />
                                </span>
                            </div>
                            <div>
                                <div class="pharmachain-profile-upload-controls">
                                    <label for="profileAvatarInput">Upload Photo</label>
                                    <input id="profileAvatarInput" type="file" accept="image/*" />
                                    <button id="removeProfilePhotoBtn" type="button">Remove Photo</button>
                                </div>
                                <p class="pharmachain-profile-upload-hint" id="profilePictureHint">Upload JPG or PNG profile photo.</p>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label" for="profileName">Full Name</label>
                            <input class="form-control" id="profileName" name="profileName" value="${escapeHtml(userName)}" />
                        </div>
                        <div class="mb-3">
                            <label class="form-label" for="profileEmail">Email</label>
                            <input class="form-control" id="profileEmail" name="profileEmail" value="${escapeHtml(userEmail)}" readonly />
                        </div>
                        <div class="mb-3">
                            <label class="form-label" for="profilePhone">Phone</label>
                            <input class="form-control" id="profilePhone" name="profilePhone" value="${escapeHtml(userPhone)}" />
                        </div>
                        <div class="mb-3">
                            <label class="form-label" for="profileCompany">Company</label>
                            <input class="form-control" id="profileCompany" name="profileCompany" value="${escapeHtml(userCompany)}" />
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-primary" id="saveProfileBtn" type="submit">Save Profile</button>
                            <button class="btn btn-outline-secondary" id="cancelProfileEditBtn" type="button">Cancel</button>
                        </div>
                        <div class="pharmachain-profile-feedback" id="profileEditFeedback"></div>
                    </form>
                    <div class="pharmachain-password-card">
                        <h4 class="pharmachain-profile-section-title">Change Password</h4>
                        <form id="profilePasswordForm">
                            <div class="mb-3">
                                <label class="form-label" for="currentPassword">Current Password</label>
                                <input class="form-control" id="currentPassword" name="currentPassword" type="password" placeholder="Current password" />
                            </div>
                            <div class="mb-3">
                                <label class="form-label" for="newPassword">New Password</label>
                                <input class="form-control" id="newPassword" name="newPassword" type="password" placeholder="New password" />
                            </div>
                            <div class="mb-3">
                                <label class="form-label" for="confirmPassword">Confirm Password</label>
                                <input class="form-control" id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirm new password" />
                            </div>
                            <button class="btn btn-dark" id="savePasswordBtn" type="submit">Change Password</button>
                            <div class="pharmachain-profile-feedback" id="profilePasswordFeedback"></div>
                        </form>
                    </div>
                </div>
            </section>
        `;

        const existingChildren = Array.from(document.body.children);
        document.body.innerHTML = "";
        document.body.appendChild(shell);
        const anchor = document.getElementById("pharmachain-page-anchor");
        existingChildren.forEach((child) => anchor.appendChild(child));
        document.getElementById("profileLogoutAction")?.addEventListener("click", logout);
        bindProfilePanel(rootPrefix);
    }

    window.PharmaChainApp = {
        getSession,
        setSession,
        clearSession,
        getProfileOverride,
        setProfileOverride,
        clearProfileOverride,
        api,
        requireAuth,
        logout,
        isAdmin,
        mountPageShell
    };
})();

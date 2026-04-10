let doctors = [];
let appointments = [];
let paymentConfig = null;
let currentEditDoctorId = null;
let currentProfileDoctorId = null;
let currentSession = null;
let profileDocumentState = {
    aadharFrontName: "",
    panCardName: "",
    aadharBackName: "",
    cancelledChequeName: ""
};

function canAccessDoctorControls() {
    return PharmaChainApp.isAdmin?.() || currentSession?.user?.role === "doctor";
}

function isDoctorRole() {
    return currentSession?.user?.role === "doctor";
}

function canEditDoctorRecord(doctor) {
    if (PharmaChainApp.isAdmin?.()) return true;
    if (!isDoctorRole()) return false;
    return (doctor?.email || "").toLowerCase() === (currentSession?.user?.email || "").toLowerCase();
}

function getDoctorScopedAppointments(list = appointments) {
    if (PharmaChainApp.isAdmin?.()) return list;
    if (!isDoctorRole()) return [];
    const email = (currentSession?.user?.email || "").toLowerCase();
    return list.filter((item) => (item.doctorEmail || "").toLowerCase() === email);
}

function getManagedDoctors() {
    if (PharmaChainApp.isAdmin?.()) return doctors;
    if (!isDoctorRole()) return [];
    const email = (currentSession?.user?.email || "").toLowerCase();
    return doctors.filter((doctor) => (doctor.email || "").toLowerCase() === email);
}

function normalizeDoctor(doctor) {
    if (!doctor) return null;
    const nameParts = (doctor.name || "").trim().split(/\s+/).filter(Boolean);
    return {
        ...doctor,
        firstName: doctor.firstName || nameParts[0] || "",
        middleName: doctor.middleName || (nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : ""),
        lastName: doctor.lastName || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : ""),
        primarySpecialization: doctor.primarySpecialization || doctor.specialization || "General",
        invoiceName: doctor.invoiceName || doctor.name || "",
        registrationNumber: doctor.registrationNumber || doctor.licenseNumber || "",
        qualificationTags: Array.isArray(doctor.qualificationTags) ? doctor.qualificationTags : [],
        availabilityDays: Array.isArray(doctor.availabilityDays) ? doctor.availabilityDays : [],
        slotStart: doctor.slotStart || "",
        slotEnd: doctor.slotEnd || "",
        slotNotes: doctor.slotNotes || "",
        documents: {
            aadharFrontName: doctor.documents?.aadharFrontName || "",
            panCardName: doctor.documents?.panCardName || "",
            aadharBackName: doctor.documents?.aadharBackName || "",
            cancelledChequeName: doctor.documents?.cancelledChequeName || ""
        }
    };
}

function getBlockchainBadge(meta) {
    if (!meta?.enabled) return "";
    const verified = meta.verificationStatus === "verified";
    return `<span class="badge ${verified ? "bg-success" : "bg-warning text-dark"}">${verified ? "Blockchain Verified" : "Chain Sync Pending"}</span>`;
}

function getActiveProfileDoctor() {
    return normalizeDoctor(doctors.find((doctor) => doctor.id === currentProfileDoctorId)) || normalizeDoctor(getManagedDoctors()[0]) || null;
}

document.addEventListener("DOMContentLoaded", async () => {
    currentSession = await PharmaChainApp.requireAuth();
    if (!currentSession) return;
    PharmaChainApp.mountPageShell("Doctors");

    if (!PharmaChainApp.isAdmin?.()) {
        document.querySelector('[data-bs-target="#doctorModal"]')?.classList.add("d-none");
    }
    if (!canAccessDoctorControls()) {
        document.querySelector(".floating-buttons")?.classList.add("d-none");
        document.getElementById("doctorProfileDashboard")?.classList.add("d-none");
    }

    bindEvents();
    document.getElementById("detailDate").value = new Date().toISOString().split("T")[0];
    await refreshData();
});

function bindEvents() {
    document.getElementById("saveDoctorBtn")?.addEventListener("click", saveDoctor);
    document.querySelector('[data-bs-target="#doctorModal"]')?.addEventListener("click", resetDoctorForm);
    document.getElementById("globalSearchGo")?.addEventListener("click", performSearch);
    document.getElementById("toggleSearchBtn")?.addEventListener("click", () => {
        document.getElementById("globalSearchRow")?.classList.toggle("d-none");
    });
    if (canAccessDoctorControls()) {
        document.getElementById("openInboxBtn")?.addEventListener("click", openDoctorInbox);
        document.getElementById("openConfirmedBtn")?.addEventListener("click", openConfirmed);
        document.getElementById("openHistoryBtn")?.addEventListener("click", openHistory);
    }
    document.getElementById("detailConfirmBtn")?.addEventListener("click", createAppointment);
    document.querySelectorAll(".appointment-payment").forEach((input) => {
        input.addEventListener("change", updateAppointmentPaymentUI);
    });
    document.getElementById("testEmailBtn")?.addEventListener("click", testNotifications);
    document.querySelectorAll(".specialty-choose").forEach((button) => {
        button.addEventListener("click", () => {
            document.getElementById("globalSearchInput").value = button.dataset.specialty;
            performSearch();
            bootstrap.Modal.getInstance(document.getElementById("bookingSpecialtyModal"))?.hide();
        });
    });
    document.getElementById("profileDoctorSelect")?.addEventListener("change", (event) => {
        currentProfileDoctorId = event.target.value;
        populateProfileForm(getActiveProfileDoctor());
        renderProfileDashboard();
    });
    document.getElementById("editProfileDashboardBtn")?.addEventListener("click", () => {
        document.getElementById("doctorProfileForm")?.classList.remove("d-none");
        document.getElementById("doctorProfilePreview")?.classList.add("d-none");
        populateProfileForm(getActiveProfileDoctor());
    });
    document.getElementById("viewSavedProfileBtn")?.addEventListener("click", () => {
        renderProfilePreview(getActiveProfileDoctor());
        document.getElementById("doctorProfilePreview")?.classList.remove("d-none");
        document.getElementById("doctorProfileForm")?.classList.add("d-none");
    });
    document.getElementById("doctorProfileForm")?.addEventListener("submit", saveDoctorProfile);
    document.querySelectorAll(".qualification-chip").forEach((chip) => {
        chip.addEventListener("click", () => chip.classList.toggle("active"));
    });
    document.querySelectorAll(".availability-chip").forEach((chip) => {
        chip.addEventListener("click", () => chip.classList.toggle("active"));
    });
    document.querySelectorAll(".address-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".address-tab").forEach((item) => item.classList.remove("active"));
            tab.classList.add("active");
        });
    });
    document.querySelectorAll(".document-input").forEach((input) => {
        input.addEventListener("change", (event) => {
            const file = event.target.files?.[0];
            const key = event.target.dataset.docKey;
            if (!key) return;
            profileDocumentState[key] = file?.name || "";
            const labelMap = {
                aadharFrontName: "docAadhaarFrontName",
                panCardName: "docPanCardName",
                aadharBackName: "docAadhaarBackName",
                cancelledChequeName: "docCancelledChequeName"
            };
            const target = document.getElementById(labelMap[key]);
            if (target) target.textContent = file?.name || "No file chosen";
        });
    });
}

function getAppointmentPaymentMethod() {
    return document.querySelector('input[name="appointmentPaymentMethod"]:checked')?.value || "UPI";
}

function updateAppointmentPaymentUI() {
    const method = getAppointmentPaymentMethod();
    document.getElementById("appointmentUpiBox")?.classList.toggle("d-none", method !== "UPI");
    document.getElementById("appointmentCardBox")?.classList.toggle("d-none", method !== "Card");
    document.getElementById("appointmentBankBox")?.classList.toggle("d-none", method !== "Net Banking");
}

async function refreshData() {
    [doctors, appointments, paymentConfig] = await Promise.all([
        PharmaChainApp.api("/api/doctors"),
        PharmaChainApp.api("/api/appointments"),
        PharmaChainApp.api("/api/payment-config")
    ]);
    doctors = doctors.map(normalizeDoctor);
    hydrateProfileDoctorSelection();
    renderAppointmentReceiverInfo();
    renderGrid(doctors);
    updateStats();
    renderProfileDashboard();
}

function hydrateProfileDoctorSelection() {
    const managedDoctors = getManagedDoctors();
    if (!managedDoctors.length) return;
    const preferredDoctor = managedDoctors.find((doctor) => (doctor.email || "").toLowerCase() === (currentSession?.user?.email || "").toLowerCase()) || managedDoctors[0];
    if (!currentProfileDoctorId || !managedDoctors.some((doctor) => doctor.id === currentProfileDoctorId)) {
        currentProfileDoctorId = preferredDoctor.id;
    }

    const select = document.getElementById("profileDoctorSelect");
    if (!select) return;
    select.innerHTML = managedDoctors.map((doctor) => `<option value="${doctor.id}">${doctor.name}</option>`).join("");
    select.value = currentProfileDoctorId;
    select.disabled = !PharmaChainApp.isAdmin?.();
}

function renderAppointmentReceiverInfo() {
    const node = document.getElementById("appointmentReceiverInfo");
    if (!node) return;
    if (!paymentConfig) {
        node.textContent = "Payment account not available right now.";
        return;
    }
    node.innerHTML = `
        <div><strong>Account Holder:</strong> ${paymentConfig.accountName || "N/A"}</div>
        <div><strong>UPI ID:</strong> ${paymentConfig.upiId || "N/A"}</div>
        <div><strong>Account No:</strong> ${paymentConfig.accountNumber || "N/A"}</div>
    `;
}

function renderGrid(list) {
    const grid = document.getElementById("doctorsGrid");
    grid.innerHTML = list.map((doctor) => `
        <div class="col-md-6 col-xl-4 mb-4">
            <div class="card doctor-card p-3">
                <h5 class="fw-bold mb-1">${doctor.name}</h5>
                <span class="badge specialty-badge">${doctor.specialization}</span>
                <span class="badge bg-${doctor.status === "active" ? "success" : "secondary"}">${doctor.status}</span>
                <div class="mt-2">${getBlockchainBadge(doctor.blockchainMeta)}</div>
                <div class="small mt-3"><strong>Qualification:</strong> ${doctor.qualificationTags?.length ? doctor.qualificationTags.join(", ") : "Not added"}</div>
                <div class="small"><strong>Experience:</strong> ${doctor.experienceYears ? `${doctor.experienceYears} years` : "Not added"}</div>
                <div class="small"><strong>Hospital:</strong> ${doctor.hospital || "Hospital not added"}</div>
                <div class="small"><strong>Email:</strong> ${doctor.email || "Email not added"}</div>
                <div class="small"><strong>Available Days:</strong> ${doctor.availabilityDays?.length ? doctor.availabilityDays.join(", ") : "Not added"}</div>
                <div class="small"><strong>Timing:</strong> ${formatDoctorTiming(doctor)}</div>
                <div class="small"><strong>Phone:</strong> ${doctor.phone || "Phone not added"}</div>
                <div class="small text-muted"><strong>Record Hash:</strong> ${doctor.blockchainMeta?.recordHash ? `${doctor.blockchainMeta.recordHash.slice(0, 14)}...` : "Not available"}</div>
                <div class="d-flex gap-2 mt-3">
                    <button class="btn btn-sm btn-outline-primary flex-grow-1 view-detail-btn" data-id="${doctor.id}">View</button>
                    ${canEditDoctorRecord(doctor) ? `<button class="btn btn-sm btn-outline-warning edit-doctor-btn" data-id="${doctor.id}">Edit</button>` : ""}
                </div>
            </div>
        </div>
    `).join("");

    document.querySelectorAll(".view-detail-btn").forEach((button) => {
        button.addEventListener("click", () => showDetail(doctors.find((doctor) => doctor.id === button.dataset.id)));
    });
    document.querySelectorAll(".edit-doctor-btn").forEach((button) => {
        button.addEventListener("click", () => editDoctor(button.dataset.id));
    });
}

function updateStats() {
    const scopedAppointments = getDoctorScopedAppointments();
    document.getElementById("totalDoctors").textContent = doctors.length;
    document.getElementById("activeDoctors").textContent = doctors.filter((doctor) => doctor.status === "active").length;
    document.getElementById("onLeaveDoctors").textContent = doctors.filter((doctor) => doctor.status !== "active").length;
    document.getElementById("totalAppointments").textContent = scopedAppointments.length;
    document.getElementById("inboxCountBadge").textContent = scopedAppointments.filter((item) => item.status === "pending").length;
    document.getElementById("confirmedCountBadge").textContent = scopedAppointments.filter((item) => item.status === "confirmed").length;
    document.getElementById("historyCountBadge").textContent = scopedAppointments.length;
}

function renderProfileDashboard() {
    const wrapper = document.getElementById("doctorProfileDashboard");
    if (!wrapper || !canAccessDoctorControls()) return;
    wrapper.classList.remove("d-none");
    const doctor = getActiveProfileDoctor();
    if (!doctor) return;

    const completion = calculateProfileCompletion(doctor);
    const documentCount = Object.values(doctor.documents || {}).filter(Boolean).length;
    document.getElementById("profileCompletionValue").textContent = `${completion}%`;
    document.getElementById("profileCompletionBar").style.width = `${completion}%`;
    document.getElementById("profileSpecializationValue").textContent = doctor.specialization || "General";
    document.getElementById("profilePrimaryValue").textContent = doctor.primarySpecialization || "Primary";
    document.getElementById("profileQualificationCount").textContent = doctor.qualificationTags.length;
    document.getElementById("profileDocumentCount").textContent = documentCount;
    populateProfileForm(doctor);
    renderProfilePreview(doctor);
    renderProfileAppointmentRequests(doctor);
}

function calculateProfileCompletion(doctor) {
    const fields = [
        doctor.firstName,
        doctor.lastName,
        doctor.phone,
        doctor.email,
        doctor.specialization,
        doctor.licenseNumber,
        doctor.hospital,
        doctor.experienceYears,
        doctor.addressLine1,
        doctor.city,
        doctor.state,
        doctor.pincode,
        doctor.accountNumber,
        doctor.ifscCode,
        doctor.accountHolderName
    ];
    const filled = fields.filter((value) => String(value || "").trim() !== "" && String(value || "").trim() !== "0").length;
    return Math.round((filled / fields.length) * 100);
}

function populateProfileForm(doctor) {
    if (!doctor) return;
    profileDocumentState = { ...(doctor.documents || {}) };
    const setValue = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.value = value ?? "";
    };

    setValue("profileFirstName", doctor.firstName);
    setValue("profileMiddleName", doctor.middleName);
    setValue("profileLastName", doctor.lastName);
    setValue("profileGender", doctor.gender);
    setValue("profileInvoiceName", doctor.invoiceName);
    setValue("profilePhone", doctor.phone);
    setValue("profileEmail", doctor.email);
    setValue("profileRegistrationNumber", doctor.registrationNumber);
    setValue("profileExperienceYears", doctor.experienceYears || "");
    setValue("profileDateOfBirth", doctor.dateOfBirth);
    setValue("profileHealthMantra", doctor.healthMantra);
    setValue("profileConsultationFee", doctor.fee || "");
    setValue("profileSlotStart", doctor.slotStart);
    setValue("profileSlotEnd", doctor.slotEnd);
    setValue("profileSlotNotes", doctor.slotNotes);
    setValue("profileAddressLine1", doctor.addressLine1);
    setValue("profileLandmark", doctor.landmark);
    setValue("profileState", doctor.state);
    setValue("profileCity", doctor.city);
    setValue("profilePincode", doctor.pincode);
    setValue("profileAccountNumber", doctor.accountNumber);
    setValue("profileIfscCode", doctor.ifscCode);
    setValue("profileAccountHolderName", doctor.accountHolderName);
    setValue("profilePanCardNumber", doctor.panCardNumber);
    setValue("profileHospital", doctor.hospital);
    setValue("profileSpecialization", doctor.specialization);
    setValue("profileLicenseNumber", doctor.licenseNumber);

    document.querySelectorAll(".address-tab").forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.addressType === (doctor.addressType || "Home"));
    });
    document.querySelectorAll(".qualification-chip").forEach((chip) => {
        chip.classList.toggle("active", doctor.qualificationTags.includes(chip.dataset.tag));
    });
    document.querySelectorAll(".availability-chip").forEach((chip) => {
        chip.classList.toggle("active", doctor.availabilityDays.includes(chip.dataset.day));
    });
    document.getElementById("docAadhaarFrontName").textContent = doctor.documents?.aadharFrontName || "No file chosen";
    document.getElementById("docPanCardName").textContent = doctor.documents?.panCardName || "No file chosen";
    document.getElementById("docAadhaarBackName").textContent = doctor.documents?.aadharBackName || "No file chosen";
    document.getElementById("docCancelledChequeName").textContent = doctor.documents?.cancelledChequeName || "No file chosen";
}

function renderProfilePreview(doctor) {
    const body = document.getElementById("doctorProfilePreviewBody");
    if (!body || !doctor) return;
    const qualificationText = doctor.qualificationTags?.length ? doctor.qualificationTags.join(", ") : "Not selected";
    const documentText = Object.values(doctor.documents || {}).filter(Boolean).join(", ") || "No documents uploaded";
    body.innerHTML = `
        <div class="saved-profile-grid">
            <div class="saved-profile-item"><div class="label">Doctor Name</div><div class="value">${doctor.name || "Not added"}</div></div>
            <div class="saved-profile-item"><div class="label">Specialization</div><div class="value">${doctor.specialization || "Not added"}</div></div>
            <div class="saved-profile-item"><div class="label">Experience</div><div class="value">${doctor.experienceYears || 0} years</div></div>
            <div class="saved-profile-item"><div class="label">Contact</div><div class="value">${doctor.phone || "Not added"}</div></div>
            <div class="saved-profile-item"><div class="label">Email</div><div class="value">${doctor.email || "Not added"}</div></div>
            <div class="saved-profile-item"><div class="label">Hospital</div><div class="value">${doctor.hospital || "Not added"}</div></div>
            <div class="saved-profile-item"><div class="label">Available Days</div><div class="value">${doctor.availabilityDays?.length ? doctor.availabilityDays.join(", ") : "Not added"}</div></div>
            <div class="saved-profile-item"><div class="label">Timing</div><div class="value">${formatDoctorTiming(doctor)}</div></div>
            <div class="saved-profile-item"><div class="label">Address</div><div class="value">${[doctor.addressLine1, doctor.landmark, doctor.city, doctor.state, doctor.pincode].filter(Boolean).join(", ") || "Not added"}</div></div>
            <div class="saved-profile-item"><div class="label">Bank Account</div><div class="value">${doctor.accountNumber || "Not added"}</div></div>
            <div class="saved-profile-item"><div class="label">IFSC</div><div class="value">${doctor.ifscCode || "Not added"}</div></div>
            <div class="saved-profile-item"><div class="label">Qualification Tags</div><div class="value">${qualificationText}</div></div>
            <div class="saved-profile-item"><div class="label">Documents</div><div class="value">${documentText}</div></div>
            <div class="saved-profile-item"><div class="label">Health Mantra</div><div class="value">${doctor.healthMantra || "Not added"}</div></div>
        </div>
    `;
}

function renderProfileAppointmentRequests(doctor) {
    const target = document.getElementById("profileAppointmentRequests");
    if (!target || !doctor) return;
    const items = getDoctorScopedAppointments().filter((appointment) => appointment.status === "pending" && appointment.doctorId === doctor.id);
    if (!items.length) {
        target.innerHTML = `<div class="text-muted">No pending appointment requests for this doctor.</div>`;
        return;
    }

    target.innerHTML = items.slice(0, 3).map((item) => `
        <div class="appointment-request-item mb-3">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-3">
                <div>
                    <div class="fw-bold">${item.patientName} - ${item.date}, ${item.time}</div>
                    <div class="small text-muted mt-2">Email: ${item.patientEmail || "N/A"} | Phone: ${item.patientPhone || "N/A"}</div>
                    <div class="small mt-1">Reason: ${item.symptoms || "Consultation"}</div>
                    <div class="small text-success mt-2">Payment: ${item.paymentMethod || "Online"} (${item.paymentStatus || "Paid"})</div>
                </div>
                <button type="button" class="btn btn-primary confirm-profile-appointment" data-id="${item.id}">Confirm Booking</button>
            </div>
        </div>
    `).join("");

    document.querySelectorAll(".confirm-profile-appointment").forEach((button) => {
        button.addEventListener("click", async () => {
            await updateAppointment(button.dataset.id, "confirmed");
            renderProfileDashboard();
        });
    });
}

function showDetail(doctor) {
    if (!doctor) return;
    document.getElementById("detailDoctorName").textContent = doctor.name;
    document.getElementById("detailConfirmBtn").dataset.doctorId = doctor.id;
    document.getElementById("detailConfirmBtn").dataset.doctorFee = doctor.fee || 0;
    document.getElementById("doctorDetailBody").innerHTML = `
        <p><strong>Name:</strong> ${doctor.name}</p>
        <p><strong>Specialization:</strong> ${doctor.specialization}</p>
        <p><strong>Qualification:</strong> ${doctor.qualificationTags?.length ? doctor.qualificationTags.join(", ") : "Not added"}</p>
        <p><strong>Experience:</strong> ${doctor.experienceYears || 0} years</p>
        <p><strong>Hospital:</strong> ${doctor.hospital || "Not added"}</p>
        <p><strong>Phone:</strong> ${doctor.phone || "Not added"}</p>
        <p><strong>Email:</strong> ${doctor.email || "Not added"}</p>
        <p><strong>Available Days:</strong> ${doctor.availabilityDays?.length ? doctor.availabilityDays.join(", ") : "Not added"}</p>
        <p><strong>Timing:</strong> ${formatDoctorTiming(doctor)}</p>
        <p><strong>Consultation Fee:</strong> Rs ${doctor.fee || 0}</p>
        <p><strong>License:</strong> ${doctor.licenseNumber || "Not provided"}</p>
        <p><strong>Status:</strong> ${doctor.status || "active"}</p>
    `;
    document.getElementById("detailBookingSection").style.display = (PharmaChainApp.isAdmin?.() || isDoctorRole()) ? "none" : "block";
    const cancelBtn = document.getElementById("detailCancelBtn");
    if (cancelBtn) {
        cancelBtn.textContent = "Close";
        cancelBtn.onclick = () => bootstrap.Modal.getInstance(document.getElementById("doctorDetailModal"))?.hide();
    }
    const formTitle = document.querySelector("#detailBookingSection h6");
    if (formTitle) {
        formTitle.innerHTML = `Book with <span id="detailDoctorName">${doctor.name}</span> <small class="text-muted">(Fee: Rs ${doctor.fee || 0})</small>`;
    }
    updateAppointmentPaymentUI();
    new bootstrap.Modal(document.getElementById("doctorDetailModal")).show();
}

async function saveDoctor() {
    if (!canAccessDoctorControls()) {
        showNotification("Only admin or doctor can edit doctors", "warning");
        return;
    }
    const hospitalInput = document.getElementById("doctorHospital");
    const licenseInput = document.getElementById("doctorLicenseNumber");
    const statusInput = document.getElementById("doctorStatus");
    const specializationInput = document.getElementById("doctorSpecialization");
    const nameInput = document.getElementById("doctorName");
    const phoneInput = document.getElementById("doctorPhone");
    const emailInput = document.getElementById("doctorEmail");
    const feeInput = document.getElementById("doctorFee");

    const name = nameInput?.value.trim();
    const specialization = specializationInput?.value?.trim() || "General";
    const phone = phoneInput?.value.trim();
    const email = emailInput?.value.trim();
    const hospital = hospitalInput?.value?.trim() || "PharmaChain Partner Hospital";
    const licenseNumber = licenseInput?.value?.trim() || "";
    const status = statusInput?.value || "active";
    const fee = Number(feeInput?.value || 700);

    if (!name) {
        showNotification("Full name required", "warning");
        return;
    }
    if (!phone) {
        showNotification("Phone number required", "warning");
        return;
    }

    try {
        const payload = {
            name,
            specialization,
            phone,
            email,
            hospital,
            licenseNumber,
            status,
            fee
        };
        if (currentEditDoctorId) {
            await PharmaChainApp.api(`/api/doctors/${currentEditDoctorId}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
        } else {
            await PharmaChainApp.api("/api/doctors", {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }
        bootstrap.Modal.getInstance(document.getElementById("doctorModal"))?.hide();
            showNotification(currentEditDoctorId ? "Doctor updated successfully" : "Doctor added successfully", "success");
            resetDoctorForm();
            await refreshData();
        } catch (error) {
            showNotification(`Save failed: ${error.message}`, "error");
        }
}

async function saveDoctorProfile(event) {
    event.preventDefault();
    const doctor = getActiveProfileDoctor();
    if (!doctor || !canEditDoctorRecord(doctor)) {
        showNotification("You can edit only your doctor profile", "warning");
        return;
    }

    const firstName = document.getElementById("profileFirstName")?.value.trim();
    const middleName = document.getElementById("profileMiddleName")?.value.trim();
    const lastName = document.getElementById("profileLastName")?.value.trim();
    const selectedAddressType = document.querySelector(".address-tab.active")?.dataset.addressType || "Home";
    const selectedQualificationTags = Array.from(document.querySelectorAll(".qualification-chip.active")).map((chip) => chip.dataset.tag);
    const selectedAvailabilityDays = Array.from(document.querySelectorAll(".availability-chip.active")).map((chip) => chip.dataset.day);

    const payload = {
        ...doctor,
        name: [firstName, middleName, lastName].filter(Boolean).join(" ") || doctor.name,
        firstName,
        middleName,
        lastName,
        gender: document.getElementById("profileGender")?.value || "",
        invoiceName: document.getElementById("profileInvoiceName")?.value.trim(),
        phone: document.getElementById("profilePhone")?.value.trim(),
        email: document.getElementById("profileEmail")?.value.trim(),
        registrationNumber: document.getElementById("profileRegistrationNumber")?.value.trim(),
        experienceYears: Number(document.getElementById("profileExperienceYears")?.value || 0),
        dateOfBirth: document.getElementById("profileDateOfBirth")?.value || "",
        healthMantra: document.getElementById("profileHealthMantra")?.value.trim(),
        fee: Number(document.getElementById("profileConsultationFee")?.value || 0),
        slotStart: document.getElementById("profileSlotStart")?.value || "",
        slotEnd: document.getElementById("profileSlotEnd")?.value || "",
        slotNotes: document.getElementById("profileSlotNotes")?.value.trim(),
        availabilityDays: selectedAvailabilityDays,
        addressType: selectedAddressType,
        addressLine1: document.getElementById("profileAddressLine1")?.value.trim(),
        landmark: document.getElementById("profileLandmark")?.value.trim(),
        state: document.getElementById("profileState")?.value.trim(),
        city: document.getElementById("profileCity")?.value.trim(),
        pincode: document.getElementById("profilePincode")?.value.trim(),
        accountNumber: document.getElementById("profileAccountNumber")?.value.trim(),
        ifscCode: document.getElementById("profileIfscCode")?.value.trim(),
        accountHolderName: document.getElementById("profileAccountHolderName")?.value.trim(),
        panCardNumber: document.getElementById("profilePanCardNumber")?.value.trim(),
        hospital: document.getElementById("profileHospital")?.value.trim(),
        specialization: document.getElementById("profileSpecialization")?.value.trim() || doctor.specialization || "General",
        primarySpecialization: document.getElementById("profileSpecialization")?.value.trim() || doctor.primarySpecialization || "General",
        licenseNumber: document.getElementById("profileLicenseNumber")?.value.trim(),
        qualificationTags: selectedQualificationTags,
        documents: profileDocumentState
    };

    try {
        await PharmaChainApp.api(`/api/doctors/${doctor.id}`, {
            method: "PUT",
            body: JSON.stringify(payload)
        });
        showNotification("Doctor profile saved successfully", "success");
        document.getElementById("doctorProfilePreview")?.classList.remove("d-none");
        await refreshData();
    } catch (error) {
        showNotification(`Profile save failed: ${error.message}`, "error");
    }
}

function resetDoctorForm() {
    currentEditDoctorId = null;
    const title = document.querySelector("#doctorModal .modal-header h5");
    const saveButton = document.getElementById("saveDoctorBtn");
    if (title) title.textContent = "Add Doctor";
    if (saveButton) saveButton.textContent = "Save Doctor";
    document.getElementById("doctorName").value = "";
    document.getElementById("doctorSpecialization").value = "";
    document.getElementById("doctorEmail").value = "";
    document.getElementById("doctorPhone").value = "";
    document.getElementById("doctorHospital").value = "";
    document.getElementById("doctorLicenseNumber").value = "";
    document.getElementById("doctorStatus").value = "active";
    document.getElementById("doctorFee").value = "700";
}

function editDoctor(id) {
    const doctor = doctors.find((item) => item.id === id);
    if (!doctor || !canEditDoctorRecord(doctor)) return;

    currentEditDoctorId = id;
    const title = document.querySelector("#doctorModal .modal-header h5");
    const saveButton = document.getElementById("saveDoctorBtn");
    if (title) title.textContent = "Edit Doctor";
    if (saveButton) saveButton.textContent = "Update Doctor";

    document.getElementById("doctorName").value = doctor.name || "";
    document.getElementById("doctorSpecialization").value = doctor.specialization || "";
    document.getElementById("doctorEmail").value = doctor.email || "";
    document.getElementById("doctorPhone").value = doctor.phone || "";
    document.getElementById("doctorHospital").value = doctor.hospital || "";
    document.getElementById("doctorLicenseNumber").value = doctor.licenseNumber || "";
    document.getElementById("doctorStatus").value = doctor.status || "active";
    document.getElementById("doctorFee").value = doctor.fee || 700;

    new bootstrap.Modal(document.getElementById("doctorModal")).show();
}

async function createAppointment() {
    const doctorId = document.getElementById("detailConfirmBtn").dataset.doctorId;
    const doctor = doctors.find((item) => item.id === doctorId);
    if (!doctor) return;

    const patientName = document.getElementById("detailPatientName").value.trim();
    const patientPhone = document.getElementById("detailPatientPhone").value.trim();
    const patientEmail = document.getElementById("detailPatientEmail").value.trim();
    const paymentMethod = getAppointmentPaymentMethod();
    const upiId = document.getElementById("appointmentUpiId").value.trim();
    const cardNumber = document.getElementById("appointmentCardNumber").value.replace(/\s+/g, "").trim();
    const bankName = document.getElementById("appointmentBankName").value.trim();

    if (!patientName || !patientPhone || !patientEmail) {
        showNotification("Name, phone and email are required", "warning");
        return;
    }

    if (paymentMethod === "UPI" && !upiId) {
        showNotification("Please enter a UPI ID", "warning");
        return;
    }

    if (paymentMethod === "Card" && cardNumber.length < 12) {
        showNotification("Please enter a valid card number", "warning");
        return;
    }

    if (paymentMethod === "Net Banking" && !bankName) {
        showNotification("Please enter bank name", "warning");
        return;
    }

    const paymentReference = paymentMethod === "UPI"
        ? upiId
        : paymentMethod === "Card"
            ? `XXXX-${cardNumber.slice(-4)}`
            : bankName;

    try {
        await PharmaChainApp.api("/api/appointments", {
            method: "POST",
            body: JSON.stringify({
                patientName,
                patientPhone,
                patientEmail,
                symptoms: document.getElementById("detailSymptoms").value.trim(),
                date: document.getElementById("detailDate").value,
                time: document.getElementById("detailTime").value,
                doctorId: doctor.id,
                doctorName: doctor.name,
                doctorEmail: doctor.email || "",
                consultationFee: Number(doctor.fee || 0),
                paymentMethod,
                paymentStatus: "Paid",
                paymentReference,
                upiId,
                cardLastFour: paymentMethod === "Card" ? cardNumber.slice(-4) : "",
                bankName: paymentMethod === "Net Banking" ? bankName : "",
                receiverAccountName: paymentConfig?.accountName || "",
                receiverUpiId: paymentConfig?.upiId || "",
                receiverAccountNumber: paymentConfig?.accountNumber || ""
            })
        });

        bootstrap.Modal.getInstance(document.getElementById("doctorDetailModal"))?.hide();
        showNotification(`Appointment request sent to ${doctor.email || "doctor email"} and payment captured via ${paymentMethod}`, "success");
        await refreshData();
    } catch (error) {
        showNotification(`Appointment failed: ${error.message}`, "error");
    }
}

async function updateAppointment(id, status) {
    try {
        await PharmaChainApp.api(`/api/appointments/${id}`, {
            method: "PUT",
            body: JSON.stringify({ status, confirmedAt: new Date().toISOString() })
        });
        if (status === "confirmed") {
            showNotification("Appointment confirmed successfully", "success");
        } else {
            showNotification(`Appointment ${status}`, "info");
        }
        await refreshData();
    } catch (error) {
        showNotification(`Update failed: ${error.message}`, "error");
    }
}

async function testNotifications() {
    const doctor = getActiveProfileDoctor();
    if (!doctor) {
        showNotification("No doctor profile selected for testing", "warning");
        return;
    }

    const patientEmail = currentSession?.user?.email || "patient@gmail.com";
    const patientPhone = currentSession?.user?.phone || "8757463157";

    try {
        const result = await PharmaChainApp.api("/api/notifications/test", {
            method: "POST",
            body: JSON.stringify({
                doctorName: doctor.name,
                doctorEmail: doctor.email || "",
                doctorPhone: doctor.phone || "",
                patientName: currentSession?.user?.name || "Test Patient",
                patientEmail,
                patientPhone,
                date: new Date().toISOString().split("T")[0],
                time: "10:30"
            })
        });

        showNotification(
            `Doctor email: ${result.doctorEmail}, Doctor SMS: ${result.doctorSms}, Patient email: ${result.patientEmail}, Patient SMS: ${result.patientSms}`,
            "info"
        );
    } catch (error) {
        showNotification(`Notification test failed: ${error.message}`, "error");
    }
}

function openDoctorInbox() {
    const pending = getDoctorScopedAppointments().filter((item) => item.status === "pending");
    const container = document.getElementById("doctorInbox");
    container.innerHTML = pending.length ? pending.map((appointment) => `
        <div class="card mb-3"><div class="card-body">
            <h6>${appointment.patientName}</h6>
            <p>${appointment.doctorName} | ${appointment.date} ${appointment.time}</p>
            <p>${appointment.symptoms || "Consultation"}</p>
            <p class="mb-2 text-muted">Fee: Rs ${appointment.consultationFee || 0} | Payment: ${appointment.paymentMethod || "Online"} (${appointment.paymentStatus || "pending"}) | Ref: ${appointment.paymentReference || "N/A"} | Patient Email: ${appointment.patientEmail || "N/A"}</p>
            <p class="mb-2 text-muted">Doctor Email: ${appointment.doctorEmail || "N/A"} | Notification: ${appointment.doctorNotificationStatus || "not_sent"}</p>
            <button class="btn btn-success btn-sm me-2 accept-btn" data-id="${appointment.id}">Accept</button>
            <button class="btn btn-danger btn-sm reject-btn" data-id="${appointment.id}">Reject</button>
        </div></div>
    `).join("") : '<p class="text-muted">No pending requests</p>';

    container.querySelectorAll(".accept-btn").forEach((button) => button.addEventListener("click", async () => {
        await updateAppointment(button.dataset.id, "confirmed");
        openDoctorInbox();
    }));
    container.querySelectorAll(".reject-btn").forEach((button) => button.addEventListener("click", async () => {
        await updateAppointment(button.dataset.id, "rejected");
        openDoctorInbox();
    }));

    new bootstrap.Modal(document.getElementById("doctorInboxModal")).show();
}

function openConfirmed() {
    const confirmed = getDoctorScopedAppointments().filter((item) => item.status === "confirmed");
    document.getElementById("confirmedList").innerHTML = confirmed.length ? confirmed.map((item) => `
        <div class="card mb-2"><div class="card-body">
            <strong>${item.patientName}</strong> - ${item.doctorName} - ${item.date}
            <div class="small text-muted mt-1">Payment: ${item.paymentMethod || "Online"} (${item.paymentStatus || "pending"}) | Ref: ${item.paymentReference || "N/A"}</div>
            <div class="small text-muted mt-1">Doctor Email: ${item.doctorEmail || "N/A"} | Patient Email: ${item.patientEmail || "N/A"}</div>
            <div class="small text-muted mt-2">${item.confirmationMessage || "Confirmation saved"}</div>
            <div class="small text-success">Patient notification: ${item.patientNotificationStatus || "not_sent"}</div>
        </div></div>
    `).join("") : '<p class="text-muted">No confirmed appointments</p>';
    new bootstrap.Modal(document.getElementById("confirmedModal")).show();
}

function openHistory() {
    const scoped = getDoctorScopedAppointments();
    document.getElementById("historyList").innerHTML = scoped.length ? scoped.map((item) => `
        <div class="card mb-2"><div class="card-body">
            <div class="fw-semibold">${item.patientName} - ${item.doctorName}</div>
            <div class="small text-muted">${item.date} ${item.time} | ${item.status}</div>
        </div></div>
    `).join("") : '<p class="text-muted">No history found</p>';
    new bootstrap.Modal(document.getElementById("historyModal")).show();
}

function performSearch() {
    const query = document.getElementById("globalSearchInput").value.trim().toLowerCase();
    renderGrid(doctors.filter((doctor) =>
        (doctor.name || "").toLowerCase().includes(query) ||
        (doctor.specialization || "").toLowerCase().includes(query) ||
        (doctor.hospital || "").toLowerCase().includes(query)
    ));
}

function showNotification(message, type = "info") {
    const container = document.getElementById("notificationContainer");
    if (!container) return;
    const toast = document.createElement("div");
    const mapped = type === "success" ? "success" : type === "warning" ? "warning" : type === "error" ? "danger" : "info";
    toast.className = `alert alert-${mapped}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function formatDoctorTiming(doctor) {
    const timeRange = doctor.slotStart && doctor.slotEnd ? `${doctor.slotStart} - ${doctor.slotEnd}` : "";
    if (timeRange && doctor.slotNotes) {
        return `${timeRange} (${doctor.slotNotes})`;
    }
    return timeRange || doctor.slotNotes || "Not added";
}

let patients = [];
let currentEditPatientId = null;

function renderBlockchainLabel(meta) {
    if (!meta?.enabled) return "";
    const verified = meta.verificationStatus === "verified";
    return `<div class="small mt-1 ${verified ? "text-success" : "text-warning"}">${verified ? "Blockchain verified" : "Pending chain sync"}</div>`;
}

document.addEventListener("DOMContentLoaded", async () => {
    const session = await PharmaChainApp.requireAuth();
    if (!session) return;
    PharmaChainApp.mountPageShell("Patients");
    const isAdmin = PharmaChainApp.isAdmin?.();
    if (isAdmin) {
        document.getElementById("addPatientBtn").addEventListener("click", () => {
            currentEditPatientId = null;
            document.getElementById("addPatientForm").reset();
        });
        document.getElementById("savePatientBtn").addEventListener("click", savePatient);
    } else {
        document.getElementById("addPatientBtn")?.classList.add("d-none");
    }
    await loadPatients();
});

async function loadPatients() {
    patients = await PharmaChainApp.api("/api/patients");
    renderTable();
    updateStats();
}

function getVisiblePatients() {
    const session = PharmaChainApp.getSession();
    const isAdmin = PharmaChainApp.isAdmin?.();

    if (isAdmin) {
        return patients;
    }

    const email = String(session?.user?.email || "").toLowerCase();
    const phone = String(session?.user?.phone || "").trim();
    const name = String(session?.user?.name || "").trim().toLowerCase();

    return patients.filter((patient) => {
        const patientEmail = String(patient.email || "").toLowerCase();
        const patientPhone = String(patient.contact || "").trim();
        const patientName = String(patient.name || "").trim().toLowerCase();

        return Boolean(
            (email && patientEmail === email) ||
            (phone && patientPhone === phone) ||
            (name && patientName === name)
        );
    });
}

function renderTable() {
    const isAdmin = PharmaChainApp.isAdmin?.();
    const visiblePatients = getVisiblePatients();
    document.getElementById("patientsTableBody").innerHTML = visiblePatients.length ? visiblePatients.map((patient) => `
        <tr>
            <td>${patient.id}</td>
            <td>${patient.name}</td>
            <td>${patient.age}</td>
            <td>${patient.gender}</td>
            <td>${patient.contact}</td>
            <td>${patient.email}</td>
            <td>${patient.lastVisit}</td>
            <td><span class="badge ${patient.status === "Active" ? "bg-success" : "bg-secondary"}">${patient.status}</span>${renderBlockchainLabel(patient.blockchainMeta)}</td>
            <td>${patient.doctor || "—"}</td>
            <td>${patient.source || "manual"}<div class="small text-muted">${patient.blockchainMeta?.recordHash ? `${patient.blockchainMeta.recordHash.slice(0, 10)}...` : "No hash"}</div></td>
            <td>
                ${isAdmin ? `<button class="btn btn-sm btn-outline-primary edit-btn" data-id="${patient.id}"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${patient.id}"><i class="fas fa-trash"></i></button>` : "<span class=\"text-muted\">View only</span>"}
            </td>
        </tr>
    `).join("") : '<tr><td colspan="11" class="text-center text-muted">No records found for this patient</td></tr>';

    if (isAdmin) {
        document.querySelectorAll(".edit-btn").forEach((button) => button.addEventListener("click", () => editPatient(button.dataset.id)));
        document.querySelectorAll(".delete-btn").forEach((button) => button.addEventListener("click", () => deletePatient(button.dataset.id)));
    }
}

function updateStats() {
    const visiblePatients = getVisiblePatients();
    document.getElementById("totalPatients").textContent = visiblePatients.length;
    document.getElementById("activePatients").textContent = visiblePatients.filter((patient) => patient.status === "Active").length;
    document.getElementById("pendingAppointments").textContent = visiblePatients.filter((patient) => patient.source === "appointment").length;
    document.getElementById("newPatients").textContent = Math.min(visiblePatients.length, 7);
}

function getPayload() {
    return {
        name: document.getElementById("patientName").value.trim(),
        age: Number(document.getElementById("patientAge").value),
        gender: document.getElementById("patientGender").value,
        bloodGroup: document.getElementById("patientBloodGroup").value || "Not specified",
        email: document.getElementById("patientEmail").value.trim(),
        contact: document.getElementById("patientPhone").value.trim(),
        address: document.getElementById("patientAddress").value.trim(),
        status: document.getElementById("patientStatus").value,
        medicalHistory: document.getElementById("patientMedicalHistory").value.trim(),
        lastVisit: new Date().toISOString().split("T")[0],
        source: "manual"
    };
}

async function savePatient() {
    const isAdmin = PharmaChainApp.isAdmin?.();
    if (!isAdmin) {
        showNotification("Only admin can add or edit patients", "info");
        return;
    }
    const payload = getPayload();
    if (currentEditPatientId) {
        await PharmaChainApp.api(`/api/patients/${currentEditPatientId}`, { method: "PUT", body: JSON.stringify(payload) });
        showNotification("Patient updated successfully", "success");
    } else {
        await PharmaChainApp.api("/api/patients", { method: "POST", body: JSON.stringify(payload) });
        showNotification("Patient added successfully", "success");
    }
    bootstrap.Modal.getInstance(document.getElementById("addPatientModal"))?.hide();
    await loadPatients();
}

function editPatient(id) {
    const patient = patients.find((item) => item.id === id);
    if (!patient) return;
    currentEditPatientId = id;
    document.getElementById("patientName").value = patient.name;
    document.getElementById("patientAge").value = patient.age;
    document.getElementById("patientGender").value = patient.gender;
    document.getElementById("patientBloodGroup").value = patient.bloodGroup;
    document.getElementById("patientEmail").value = patient.email;
    document.getElementById("patientPhone").value = patient.contact;
    document.getElementById("patientAddress").value = patient.address;
    document.getElementById("patientStatus").value = patient.status;
    document.getElementById("patientMedicalHistory").value = patient.medicalHistory;
    new bootstrap.Modal(document.getElementById("addPatientModal")).show();
}

async function deletePatient(id) {
    const isAdmin = PharmaChainApp.isAdmin?.();
    if (!isAdmin) {
        showNotification("Only admin can delete patients", "info");
        return;
    }
    if (!confirm("Delete this patient?")) return;
    await PharmaChainApp.api(`/api/patients/${id}`, { method: "DELETE" });
    showNotification("Patient deleted", "success");
    await loadPatients();
}

function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `alert alert-${type === "success" ? "success" : "info"} alert-dismissible fade show notification`;
    notification.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.getElementById("notificationContainer").appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

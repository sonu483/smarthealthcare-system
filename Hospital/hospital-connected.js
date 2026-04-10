let hospitals = [];
let doctors = [];

document.addEventListener("DOMContentLoaded", async () => {
    const session = await PharmaChainApp.requireAuth();
    if (!session) return;
    PharmaChainApp.mountPageShell("Hospitals");
    const isAdmin = PharmaChainApp.isAdmin?.();
    if (!isAdmin) {
        document.getElementById("addHospitalBtn")?.classList.add("d-none");
    }
    bindEvents();
    await loadHospitals();
});

function bindEvents() {
    const isAdmin = PharmaChainApp.isAdmin?.();
    if (!isAdmin) return;
    document.getElementById("addHospitalBtn").addEventListener("click", () => {
        document.getElementById("addHospitalForm").reset();
        document.getElementById("hospitalId").value = "";
    });

    document.getElementById("saveHospitalBtn").addEventListener("click", async () => {
        const id = document.getElementById("hospitalId").value;
        if (id) {
            await PharmaChainApp.api(`/api/hospitals/${id}`, { method: "PUT", body: JSON.stringify(getPayload()) });
            showNotification("Hospital updated successfully", "success");
        } else {
            await PharmaChainApp.api("/api/hospitals", { method: "POST", body: JSON.stringify(getPayload()) });
            showNotification("Hospital added successfully", "success");
        }
        bootstrap.Modal.getInstance(document.getElementById("addHospitalModal"))?.hide();
        await loadHospitals();
    });
}

async function loadHospitals() {
    [hospitals, doctors] = await Promise.all([
        PharmaChainApp.api("/api/hospitals"),
        PharmaChainApp.api("/api/doctors")
    ]);
    renderHospitals();
    updateStats();
}

function getPayload() {
    return {
        name: document.getElementById("hospitalName").value.trim(),
        type: document.getElementById("hospitalType").value,
        email: document.getElementById("hospitalEmail").value.trim(),
        phone: document.getElementById("hospitalPhone").value.trim(),
        address: document.getElementById("hospitalAddress").value.trim(),
        city: document.getElementById("hospitalCity").value.trim(),
        state: document.getElementById("hospitalState").value.trim(),
        zip: document.getElementById("hospitalZip").value.trim(),
        license: document.getElementById("hospitalLicense").value.trim(),
        capacity: Number(document.getElementById("hospitalCapacity").value),
        services: document.getElementById("hospitalServices").value.trim(),
        status: document.getElementById("hospitalStatus").value,
        accreditation: document.getElementById("hospitalAccreditation").value,
        createdAt: new Date().toISOString().split("T")[0]
    };
}

function renderHospitals() {
    const isAdmin = PharmaChainApp.isAdmin?.();
    document.getElementById("hospitalsGrid").innerHTML = hospitals.map((hospital) => `
        <div class="col-md-4 mb-4">
            <div class="card hospital-card">
                <div class="card-header"><h5 class="mb-0">${hospital.name}</h5></div>
                <div class="card-body">
                    <p>${hospital.city}, ${hospital.state}</p>
                    <p>${hospital.phone}</p>
                    <p>${hospital.capacity} beds</p>
                    ${isAdmin ? `<button class="btn btn-sm btn-outline-primary edit-btn" data-id="${hospital.id}">Edit</button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${hospital.id}">Delete</button>` : ""}
                    <button class="btn btn-sm btn-outline-info doctors-btn" data-id="${hospital.id}">Doctors</button>
                </div>
            </div>
        </div>
    `).join("");

    document.getElementById("hospitalsTableBody").innerHTML = hospitals.map((hospital) => `
        <tr>
            <td>${hospital.id}</td>
            <td>${hospital.name}</td>
            <td>${hospital.type}</td>
            <td>${hospital.city}, ${hospital.state}</td>
            <td>${hospital.phone}</td>
            <td>${hospital.capacity}</td>
            <td>${hospital.status}</td>
            <td>
                ${isAdmin ? `<button class="btn btn-sm btn-outline-primary edit-btn" data-id="${hospital.id}">Edit</button>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${hospital.id}">Delete</button>` : "<span class=\"text-muted\">View only</span>"}
            </td>
        </tr>
    `).join("");

    if (isAdmin) {
        document.querySelectorAll(".edit-btn").forEach((button) => button.addEventListener("click", () => editHospital(button.dataset.id)));
        document.querySelectorAll(".delete-btn").forEach((button) => button.addEventListener("click", () => deleteHospital(button.dataset.id)));
    }
    document.querySelectorAll(".doctors-btn").forEach((button) => button.addEventListener("click", () => {
        const hospital = hospitals.find((item) => item.id === button.dataset.id);
        const count = doctors.filter((doctor) => doctor.hospital === hospital.name).length;
        showNotification(`${hospital.name}: ${count} doctor(s) linked`, "info");
    }));
}

function editHospital(id) {
    const hospital = hospitals.find((item) => item.id === id);
    if (!hospital) return;
    document.getElementById("hospitalName").value = hospital.name;
    document.getElementById("hospitalType").value = hospital.type;
    document.getElementById("hospitalEmail").value = hospital.email;
    document.getElementById("hospitalPhone").value = hospital.phone;
    document.getElementById("hospitalAddress").value = hospital.address;
    document.getElementById("hospitalCity").value = hospital.city;
    document.getElementById("hospitalState").value = hospital.state;
    document.getElementById("hospitalZip").value = hospital.zip;
    document.getElementById("hospitalLicense").value = hospital.license;
    document.getElementById("hospitalCapacity").value = hospital.capacity;
    document.getElementById("hospitalServices").value = hospital.services;
    document.getElementById("hospitalStatus").value = hospital.status;
    document.getElementById("hospitalAccreditation").value = hospital.accreditation || "";
    document.getElementById("hospitalId").value = hospital.id;
    new bootstrap.Modal(document.getElementById("addHospitalModal")).show();
}

async function deleteHospital(id) {
    const isAdmin = PharmaChainApp.isAdmin?.();
    if (!isAdmin) {
        showNotification("Only admin can delete hospitals", "info");
        return;
    }
    if (!confirm("Delete this hospital?")) return;
    await PharmaChainApp.api(`/api/hospitals/${id}`, { method: "DELETE" });
    showNotification("Hospital deleted", "success");
    await loadHospitals();
}

function updateStats() {
    document.getElementById("totalHospitals").textContent = hospitals.length;
    document.getElementById("activeHospitals").textContent = hospitals.filter((hospital) => hospital.status === "active").length;
    document.getElementById("totalBeds").textContent = hospitals.reduce((sum, hospital) => sum + (hospital.capacity || 0), 0);
    document.getElementById("totalDoctorsInHospitals").textContent = doctors.length;
}

function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `alert alert-${type === "success" ? "success" : "info"} alert-dismissible fade show notification`;
    notification.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.getElementById("notificationContainer").appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

let medicines = [];
let currentEditMedicineId = null;
let searchTerm = "";

function getBlockchainPill(meta) {
    if (!meta?.enabled) return "";
    const verified = meta.verificationStatus === "verified";
    return `<span class="badge ${verified ? "bg-success" : "bg-warning text-dark"}">${verified ? "Blockchain Verified" : "Pending Chain Sync"}</span>`;
}

document.addEventListener("DOMContentLoaded", async () => {
    const session = await PharmaChainApp.requireAuth();
    if (!session) return;
    PharmaChainApp.mountPageShell("Medicines");
    const isAdmin = PharmaChainApp.isAdmin?.();
    if (isAdmin) {
        document.getElementById("addMedicineBtn").addEventListener("click", resetMedicineForm);
        document.getElementById("saveMedicineBtn").addEventListener("click", saveMedicine);
    } else {
        document.getElementById("addMedicineBtn")?.classList.add("d-none");
    }
    document.getElementById("medicineSearchBtn")?.addEventListener("click", applySearch);
    document.getElementById("medicineSearchInput")?.addEventListener("input", applySearch);
    await loadMedicines();
});

async function loadMedicines() {
    medicines = await PharmaChainApp.api("/api/medicines");
    renderGrid();
    renderTable();
}

function resetMedicineForm() {
    currentEditMedicineId = null;
    document.getElementById("medicineForm").reset();
}

function getFilteredMedicines() {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return medicines;

    return medicines.filter((medicine) => {
        return [
            medicine.name,
            medicine.category,
            medicine.description,
            medicine.status
        ].some((value) => String(value || "").toLowerCase().includes(query));
    });
}

function applySearch() {
    searchTerm = document.getElementById("medicineSearchInput")?.value || "";
    renderGrid();
    renderTable();
}

function renderGrid() {
    const isAdmin = PharmaChainApp.isAdmin?.();
    const visibleMedicines = getFilteredMedicines();
    document.getElementById("medicineGrid").innerHTML = visibleMedicines.length ? visibleMedicines.map((medicine) => `
        <div class="col-md-4 mb-4">
            <div class="card dashboard-card">
                <div class="medicine-img">
                    <img src="${getMedicineImage(medicine)}" alt="${medicine.name}" class="medicine-photo">
                </div>
                <div class="card-body">
                    <h5>${medicine.name}</h5>
                    <div class="mb-2">${getBlockchainPill(medicine.blockchainMeta)}</div>
                    <p class="text-muted">${medicine.description}</p>
                    <p><strong>$${Number(medicine.price).toFixed(2)}</strong></p>
                    <p>${medicine.stock} in stock</p>
                    <p class="small text-muted mb-2">Hash: ${medicine.blockchainMeta?.recordHash ? `${medicine.blockchainMeta.recordHash.slice(0, 12)}...` : "Not anchored yet"}</p>
                    ${isAdmin ? `<button class="btn btn-sm btn-outline-primary edit-btn" data-id="${medicine.id}">Edit</button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${medicine.id}">Delete</button>` : ""}
                </div>
            </div>
        </div>
    `).join("") : '<div class="col-12"><div class="alert alert-light border text-center">No medicine found for this search.</div></div>';

    bindRowButtons();
}

function renderTable() {
    const isAdmin = PharmaChainApp.isAdmin?.();
    const visibleMedicines = getFilteredMedicines();
    document.getElementById("medicineTableBody").innerHTML = visibleMedicines.length ? visibleMedicines.map((medicine) => `
        <tr>
            <td>${medicine.name}</td>
            <td>${medicine.category}</td>
            <td>$${Number(medicine.price).toFixed(2)}</td>
            <td>${medicine.stock}</td>
            <td>${medicine.status}<div class="small mt-1">${getBlockchainPill(medicine.blockchainMeta)}</div></td>
            <td>
                ${isAdmin ? `<button class="btn btn-sm btn-outline-primary edit-btn" data-id="${medicine.id}">Edit</button>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${medicine.id}">Delete</button>` : "<span class=\"text-muted\">View only</span>"}
            </td>
        </tr>
    `).join("") : '<tr><td colspan="6" class="text-center text-muted">No medicine found</td></tr>';

    bindRowButtons();
}

function bindRowButtons() {
    const isAdmin = PharmaChainApp.isAdmin?.();
    if (!isAdmin) return;
    document.querySelectorAll(".edit-btn").forEach((button) => button.addEventListener("click", () => editMedicine(button.dataset.id)));
    document.querySelectorAll(".delete-btn").forEach((button) => button.addEventListener("click", () => deleteMedicine(button.dataset.id)));
}

function getPayload() {
    const stock = Number(document.getElementById("medicineStock").value);
    return {
        name: document.getElementById("medicineName").value.trim(),
        category: document.getElementById("medicineCategory").value,
        price: Number(document.getElementById("medicinePrice").value),
        stock,
        status: stock < 20 ? "Low Stock" : "In Stock",
        description: document.getElementById("medicineDescription").value.trim() || "No description provided",
        expiry: document.getElementById("medicineExpiry").value
    };
}

async function saveMedicine() {
    const isAdmin = PharmaChainApp.isAdmin?.();
    if (!isAdmin) {
        showNotification("Only admin can add or edit medicines", "info");
        return;
    }
    const payload = getPayload();
    if (currentEditMedicineId !== null) {
        await PharmaChainApp.api(`/api/medicines/${currentEditMedicineId}`, { method: "PUT", body: JSON.stringify(payload) });
        showNotification("Medicine updated successfully", "success");
    } else {
        await PharmaChainApp.api("/api/medicines", { method: "POST", body: JSON.stringify(payload) });
        showNotification("Medicine added successfully", "success");
    }
    bootstrap.Modal.getInstance(document.getElementById("medicineModal"))?.hide();
    await loadMedicines();
}

function editMedicine(id) {
    const medicine = medicines.find((item) => String(item.id) === String(id));
    if (!medicine) return;
    currentEditMedicineId = id;
    document.getElementById("medicineName").value = medicine.name;
    document.getElementById("medicineCategory").value = medicine.category;
    document.getElementById("medicinePrice").value = medicine.price;
    document.getElementById("medicineStock").value = medicine.stock;
    document.getElementById("medicineDescription").value = medicine.description;
    document.getElementById("medicineExpiry").value = medicine.expiry;
    new bootstrap.Modal(document.getElementById("medicineModal")).show();
}

async function deleteMedicine(id) {
    const isAdmin = PharmaChainApp.isAdmin?.();
    if (!isAdmin) {
        showNotification("Only admin can delete medicines", "info");
        return;
    }
    if (!confirm("Delete this medicine?")) return;
    await PharmaChainApp.api(`/api/medicines/${id}`, { method: "DELETE" });
    showNotification("Medicine deleted", "success");
    await loadMedicines();
}

function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `alert alert-${type === "success" ? "success" : "info"} alert-dismissible fade show notification`;
    notification.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    document.getElementById("notificationContainer").appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

function getMedicineImage(medicine) {
    const name = String(medicine.name || "").toLowerCase();
    const category = String(medicine.category || "").toLowerCase();

    if (name.includes("injection") || name.includes("insulin") || name.includes("vaccine") || name.includes("ceftriaxone") || name.includes("diclofenac") || name.includes("b12")) {
        return buildMedicineSvg({
            kind: "injection",
            title: medicine.name,
            accent: "#0ea5e9",
            accent2: "#16a34a"
        });
    }

    if (name.includes("saline") || name.includes("lactate") || name.includes("iv")) {
        return buildMedicineSvg({
            kind: "saline",
            title: medicine.name,
            accent: "#38bdf8",
            accent2: "#14b8a6"
        });
    }

    if (name.includes("syrup") || category.includes("cough")) {
        return buildMedicineSvg({
            kind: "bottle",
            title: medicine.name,
            accent: "#f97316",
            accent2: "#fb7185"
        });
    }

    if (category.includes("antibiotic")) {
        return buildMedicineSvg({
            kind: "capsule",
            title: medicine.name,
            accent: "#22c55e",
            accent2: "#06b6d4"
        });
    }

    if (category.includes("diabetes")) {
        return buildMedicineSvg({
            kind: "tablet-strip",
            title: medicine.name,
            accent: "#8b5cf6",
            accent2: "#3b82f6"
        });
    }

    if (category.includes("cardiac") || category.includes("cardiovascular")) {
        return buildMedicineSvg({
            kind: "heart-med",
            title: medicine.name,
            accent: "#ef4444",
            accent2: "#f59e0b"
        });
    }

    if (category.includes("allergy") || category.includes("pain")) {
        return buildMedicineSvg({
            kind: "tablet",
            title: medicine.name,
            accent: "#2563eb",
            accent2: "#84cc16"
        });
    }

    return buildMedicineSvg({
        kind: "capsule",
        title: medicine.name,
        accent: "#1d9bf0",
        accent2: "#1f3c78"
    });
}

function buildMedicineSvg({ kind, title, accent, accent2 }) {
    const safeTitle = escapeSvg(title);
    const icon = getMedicineIconSvg(kind, accent, accent2);
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#f7fbff"/>
                    <stop offset="100%" stop-color="#dceefe"/>
                </linearGradient>
                <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${accent}"/>
                    <stop offset="100%" stop-color="${accent2}"/>
                </linearGradient>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#0f172a" flood-opacity="0.18"/>
                </filter>
            </defs>
            <rect width="600" height="360" rx="26" fill="url(#bg)"/>
            <circle cx="102" cy="78" r="76" fill="${accent}" opacity="0.12"/>
            <circle cx="508" cy="296" r="90" fill="${accent2}" opacity="0.14"/>
            <g filter="url(#shadow)" transform="translate(150 58)">
                ${icon}
            </g>
            <text x="42" y="302" font-family="Segoe UI, Arial, sans-serif" font-size="36" font-weight="800" fill="#16345f">${safeTitle}</text>
            <text x="42" y="334" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#4b6b93">PharmaChain medicine collection</text>
        </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getMedicineIconSvg(kind, accent, accent2) {
    if (kind === "injection") {
        return `
            <rect x="164" y="0" width="38" height="170" rx="16" fill="url(#shine)"/>
            <rect x="174" y="30" width="18" height="88" rx="9" fill="#e0f2fe"/>
            <rect x="116" y="144" width="132" height="34" rx="17" fill="#0f172a"/>
            <rect x="238" y="154" width="90" height="14" rx="7" fill="${accent2}"/>
            <rect x="326" y="158" width="52" height="6" rx="3" fill="#64748b"/>
            <path d="M378 161 L422 161" stroke="#475569" stroke-width="4" stroke-linecap="round"/>
            <path d="M420 161 L454 146" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
        `;
    }
    if (kind === "saline") {
        return `
            <rect x="164" y="18" width="112" height="154" rx="22" fill="#e0f2fe" stroke="${accent}" stroke-width="8"/>
            <rect x="194" y="0" width="52" height="28" rx="10" fill="${accent2}"/>
            <path d="M220 172 L220 220" stroke="${accent2}" stroke-width="10" stroke-linecap="round"/>
            <path d="M220 220 C220 248 194 266 194 292" stroke="${accent2}" stroke-width="10" fill="none" stroke-linecap="round"/>
            <ellipse cx="194" cy="304" rx="18" ry="26" fill="${accent}"/>
            <path d="M186 74 h68" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>
            <path d="M220 42 v68" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>
        `;
    }
    if (kind === "bottle") {
        return `
            <rect x="174" y="20" width="94" height="44" rx="12" fill="${accent2}"/>
            <rect x="152" y="58" width="138" height="172" rx="28" fill="url(#shine)"/>
            <rect x="168" y="112" width="106" height="74" rx="16" fill="#fff" opacity="0.92"/>
            <path d="M184 138 h74" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>
            <path d="M184 162 h52" stroke="${accent2}" stroke-width="10" stroke-linecap="round"/>
        `;
    }
    if (kind === "heart-med") {
        return `
            <path d="M220 214 C116 154 128 62 198 62 c32 0 58 20 72 46 c14-26 40-46 72-46 70 0 82 92-22 152 l-50 38z" fill="url(#shine)"/>
            <path d="M166 154 h58 l20-28 26 58 22-34 h54" stroke="#ffffff" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        `;
    }
    if (kind === "tablet-strip") {
        return `
            <rect x="130" y="74" width="190" height="152" rx="24" fill="#ffffff" stroke="${accent}" stroke-width="8"/>
            <g fill="url(#shine)">
                <circle cx="176" cy="120" r="24"/>
                <circle cx="226" cy="120" r="24"/>
                <circle cx="276" cy="120" r="24"/>
                <circle cx="176" cy="180" r="24"/>
                <circle cx="226" cy="180" r="24"/>
                <circle cx="276" cy="180" r="24"/>
            </g>
        `;
    }
    if (kind === "tablet") {
        return `
            <circle cx="214" cy="144" r="82" fill="url(#shine)"/>
            <path d="M154 204 L274 84" stroke="#ffffff" stroke-width="18" stroke-linecap="round"/>
        `;
    }
    return `
        <g transform="rotate(-14 220 150)">
            <rect x="116" y="104" width="120" height="74" rx="37" fill="${accent}"/>
            <rect x="202" y="104" width="120" height="74" rx="37" fill="#ffffff" stroke="${accent2}" stroke-width="8"/>
            <path d="M230 114 L230 168" stroke="${accent2}" stroke-width="8" stroke-linecap="round"/>
        </g>
    `;
}

function escapeSvg(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

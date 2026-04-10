let orders = [];
let patients = [];
let doctors = [];
let medicines = [];
let paymentConfig = null;
let currentEditOrderId = null;
const SHIPPING_FEES = {
    normal: 2.99,
    urgent: 5.99,
    emergency: 9.99
};
const PLATFORM_FEE = 1.49;
const TRACKING_FLOW = [
    { label: "Order Placed", location: "PharmaChain Online Store" },
    { label: "Approved by Admin", location: "PharmaChain Verification Desk" },
    { label: "Packed at Pharmacy", location: "Central Medicine Warehouse" },
    { label: "Out for Delivery", location: "Last Mile Delivery Hub" },
    { label: "Delivered", location: "Customer Delivery Address" }
];

function getBlockchainBadge(meta) {
    if (!meta?.enabled) return "";
    const verified = meta.verificationStatus === "verified";
    return `<div class="small mt-1 ${verified ? "text-success" : "text-warning"}">${verified ? "Blockchain verified" : "Pending chain sync"}</div>`;
}

document.addEventListener("DOMContentLoaded", async () => {
    const session = await PharmaChainApp.requireAuth();
    if (!session) return;
    PharmaChainApp.mountPageShell("Orders");
    const isAdmin = PharmaChainApp.isAdmin?.();
    if (!isAdmin) {
        document.getElementById("patientOrdersSection")?.classList.add("d-none");
    }
    const isPatient = session?.user?.role === "patient";
    if (isPatient) {
        document.getElementById("adminStatusBox")?.classList.add("d-none");
    }
    document.getElementById("newOrderBtn").addEventListener("click", openNewOrderModal);
    document.getElementById("saveOrderBtn").addEventListener("click", saveOrder);
    document.getElementById("orderPriority").addEventListener("change", updateOrderSummary);
    document.getElementById("paymentCod").addEventListener("change", updatePaymentUI);
    document.getElementById("paymentOnline").addEventListener("change", updatePaymentUI);
    await refreshData();
});

function isAdminUser() {
    return PharmaChainApp.isAdmin?.();
}

function getVisibleOrders() {
    const session = PharmaChainApp.getSession();
    const isAdmin = PharmaChainApp.isAdmin?.();

    if (isAdmin) {
        return orders;
    }

    const email = String(session?.user?.email || "").toLowerCase();
    const name = String(session?.user?.name || "").trim().toLowerCase();

    return orders.filter((order) => {
        const patientId = String(order.patientId || "").toLowerCase();
        const patientName = String(order.patient || "").trim().toLowerCase();
        return Boolean((email && patientId === email) || (name && patientName === name));
    });
}

async function refreshData() {
    [orders, patients, doctors, medicines, paymentConfig] = await Promise.all([
        PharmaChainApp.api("/api/orders"),
        PharmaChainApp.api("/api/patients"),
        PharmaChainApp.api("/api/doctors"),
        PharmaChainApp.api("/api/medicines"),
        PharmaChainApp.api("/api/payment-config")
    ]);
    renderOrderReceiverInfo();
    populateOrderForm();
    renderOrders();
    renderPatientHistory();
    renderAdminOrders();
    updateStats();
}

function renderOrderReceiverInfo() {
    const node = document.getElementById("orderReceiverInfo");
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

function populateOrderForm() {
    const session = PharmaChainApp.getSession();
    const isPatient = session?.user?.role === "patient";
    const patientSelect = document.getElementById("orderPatient");
    if (patientSelect) {
        if (isPatient) {
            const patientId = session?.user?.email || session?.user?.id || "SELF";
            const patientName = session?.user?.name || session?.user?.email || "Patient";
            patientSelect.innerHTML = `<option value="${patientId}">${patientName}</option>`;
            patientSelect.value = patientId;
            patientSelect.disabled = true;
        } else {
            patientSelect.innerHTML = '<option value="">Select Patient</option>' +
                patients.map((patient) => `<option value="${patient.id}">${patient.name}</option>`).join("");
            patientSelect.disabled = false;
        }
    }
    document.getElementById("orderDoctor").innerHTML = '<option value="">Select Doctor</option>' +
        doctors.map((doctor) => `<option value="${doctor.id}">${doctor.name}</option>`).join("");
    document.getElementById("medicineSelection").innerHTML = medicines.map((medicine) => `
        <label class="medicine-option" for="medicine-${medicine.id}">
            <div class="form-check mb-0">
                <input class="form-check-input medicine-check" type="checkbox" value="${medicine.id}" id="medicine-${medicine.id}" data-price="${Number(medicine.price)}">
                <div class="medicine-option-header">
                    <div>
                        <div class="medicine-option-name">${medicine.name}</div>
                        <div class="medicine-option-meta">${medicine.category} · Stock ${medicine.stock} · Exp ${medicine.expiry}</div>
                    </div>
                    <strong>$${Number(medicine.price).toFixed(2)}</strong>
                </div>
            </div>
        </label>
    `).join("");

    document.querySelectorAll(".medicine-check").forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            checkbox.closest(".medicine-option")?.classList.toggle("selected", checkbox.checked);
            updateOrderSummary();
        });
    });

    const sessionPhone = session?.user?.phone || "";
    const sessionName = session?.user?.name || "";
    document.getElementById("contactNumber").value = sessionPhone;
    document.getElementById("deliveryArea").value = sessionName ? `${sessionName} delivery point` : "";
    updatePaymentUI();
    updateOrderSummary();
}

function getSelectedPaymentMethod() {
    return document.querySelector('input[name="paymentMethod"]:checked')?.value || "Cash on Delivery";
}

function updatePaymentUI() {
    const paymentCards = document.querySelectorAll(".payment-card");
    const paymentMethod = getSelectedPaymentMethod();
    paymentCards.forEach((card) => {
        const radio = card.querySelector('input[type="radio"]');
        card.classList.toggle("active", radio?.checked);
    });
    document.getElementById("onlinePaymentBox").classList.toggle("d-none", paymentMethod !== "Online Payment");
    document.getElementById("paymentStatusPreview").textContent = `Payment: ${paymentMethod}`;
    updateOrderSummary();
}

function formatCurrency(value) {
    return `$${Number(value).toFixed(2)}`;
}

function updateOrderSummary() {
    const selectedMedicines = getSelectedMedicines();
    const priority = document.getElementById("orderPriority")?.value || "normal";
    const subtotal = selectedMedicines.reduce((sum, item) => sum + Number(item.price), 0);
    const shippingFee = selectedMedicines.length ? (SHIPPING_FEES[priority] || SHIPPING_FEES.normal) : 0;
    const platformFee = selectedMedicines.length ? PLATFORM_FEE : 0;
    const total = subtotal + shippingFee + platformFee;
    const paymentMethod = getSelectedPaymentMethod();

    document.getElementById("summarySubtotal").textContent = formatCurrency(subtotal);
    document.getElementById("summaryShipping").textContent = formatCurrency(shippingFee);
    document.getElementById("summaryPlatform").textContent = formatCurrency(platformFee);
    document.getElementById("summaryTotal").textContent = formatCurrency(total);
    document.getElementById("paymentStatusPreview").textContent = `Payment: ${paymentMethod}`;

    const summaryList = document.getElementById("selectedMedicineList");
    if (!selectedMedicines.length) {
        summaryList.innerHTML = '<div class="empty-summary">Select medicines to build cart</div>';
        return;
    }

    summaryList.innerHTML = selectedMedicines.map((medicine) => `
        <div class="selected-medicine-item">
            <div>
                <strong>${medicine.name}</strong>
                <div class="medicine-option-meta">${medicine.category}</div>
            </div>
            <strong>${formatCurrency(medicine.price)}</strong>
        </div>
    `).join("");
}

function renderExistingOrderSummary(order) {
    const summaryList = document.getElementById("selectedMedicineList");
    const medicineItems = Array.isArray(order.medicines) ? order.medicines : [];
    summaryList.innerHTML = medicineItems.length ? medicineItems.map((name) => `
        <div class="selected-medicine-item">
            <div>
                <strong>${name}</strong>
                <div class="medicine-option-meta">Patient selected medicine</div>
            </div>
        </div>
    `).join("") : '<div class="empty-summary">No medicines found in this order</div>';

    const subtotal = Number(order.subtotal || 0);
    const shippingFee = Number(order.shippingFee || 0);
    const platformFee = Number(order.platformFee || 0);
    const total = Number(String(order.amount || "$0").replace(/[^0-9.]/g, "")) || subtotal + shippingFee + platformFee;

    document.getElementById("summarySubtotal").textContent = formatCurrency(subtotal);
    document.getElementById("summaryShipping").textContent = formatCurrency(shippingFee);
    document.getElementById("summaryPlatform").textContent = formatCurrency(platformFee);
    document.getElementById("summaryTotal").textContent = formatCurrency(total);
    document.getElementById("paymentStatusPreview").textContent = `Payment: ${order.paymentMethod || "Cash on Delivery"}${order.paymentStatus ? ` (${order.paymentStatus})` : ""}`;
}

function setAdminReviewMode(enabled, order = null) {
    const modalContent = document.querySelector("#createOrderModal .modal-content");
    const reviewNote = document.getElementById("adminReviewNote");
    const saveBtn = document.getElementById("saveOrderBtn");
    const title = document.getElementById("orderModalTitle");

    modalContent?.classList.toggle("admin-review-mode", enabled);
    reviewNote?.classList.toggle("d-none", !enabled);

    if (enabled && order) {
        title.textContent = `Review Order ${order.id}`;
        saveBtn.textContent = "Update Status";
        renderExistingOrderSummary(order);
        document.getElementById("orderStatus").value = order.status || "Pending";
    } else {
        title.textContent = "Create New Order";
        saveBtn.textContent = "Place Order";
        reviewNote?.classList.add("d-none");
        updateOrderSummary();
    }
}

function renderOrders() {
    const isAdmin = PharmaChainApp.isAdmin?.();
    const visibleOrders = getVisibleOrders();
    document.getElementById("ordersTableBody").innerHTML = visibleOrders.length ? visibleOrders.map((order) => `
        <tr>
            <td>${order.id}</td>
            <td>${order.patient}</td>
            <td>${order.date}</td>
            <td>${order.amount}</td>
            <td>${order.status}${getBlockchainBadge(order.blockchainMeta)}</td>
            <td>
                ${isAdmin ? `<button class="btn btn-sm btn-outline-primary edit-btn" data-id="${order.id}">Edit</button>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${order.id}">Delete</button>
                <button class="btn btn-sm btn-outline-secondary track-btn ms-1" data-id="${order.id}">Track</button>` : `<button class="btn btn-sm btn-outline-secondary track-btn" data-id="${order.id}">Track</button>`}
            </td>
        </tr>
    `).join("") : '<tr><td colspan="6" class="text-center text-muted">No orders found</td></tr>';

    document.querySelectorAll(".track-btn").forEach((button) => button.addEventListener("click", () => openTrackingModal(button.dataset.id)));
    if (isAdmin) {
        document.querySelectorAll(".edit-btn").forEach((button) => button.addEventListener("click", () => editOrder(button.dataset.id)));
        document.querySelectorAll(".delete-btn").forEach((button) => button.addEventListener("click", () => deleteOrder(button.dataset.id)));
    }
}

function renderPatientHistory() {
    const myOrders = getVisibleOrders();
    document.getElementById("patientOrderHistory").innerHTML = myOrders.length ? myOrders.map((order) => `
        <tr><td>${order.id}</td><td>${order.date}</td><td>${order.medicines.length}</td><td>${order.amount}</td><td>${order.status}${getBlockchainBadge(order.blockchainMeta)}</td><td><button class="btn btn-sm btn-outline-secondary patient-track-btn" data-id="${order.id}">Track</button></td></tr>
    `).join("") : '<tr><td colspan="6" class="text-center">No orders yet</td></tr>';
    document.querySelectorAll(".patient-track-btn").forEach((button) => button.addEventListener("click", () => openTrackingModal(button.dataset.id)));
}

function renderAdminOrders() {
    const isAdmin = PharmaChainApp.isAdmin?.();
    if (!isAdmin) {
        return;
    }
    document.getElementById("adminPatientOrdersTable").innerHTML = orders.map((order) => `
        <tr><td>${order.id}</td><td>${order.patient}</td><td>${order.date}</td><td>${order.amount}</td><td>${order.status}${getBlockchainBadge(order.blockchainMeta)}</td><td>Edit in above table</td></tr>
    `).join("");
}

function getSelectedMedicines() {
    const ids = Array.from(document.querySelectorAll(".medicine-check:checked")).map((checkbox) => Number(checkbox.value));
    return medicines.filter((medicine) => ids.includes(Number(medicine.id)));
}

function getStatusStage(status) {
    switch (status) {
        case "Pending":
            return 1;
        case "Approved":
            return 2;
        case "Delivered":
            return 4;
        case "Cancelled":
            return 1;
        default:
            return 1;
    }
}

function buildTrackingSteps(order) {
    if (Array.isArray(order.trackingSteps) && order.trackingSteps.length) {
        return order.trackingSteps;
    }

    const completedStage = getStatusStage(order.status);
    return TRACKING_FLOW.map((step, index) => {
        const status = index < completedStage ? "completed" : index === completedStage ? "active" : "pending";
        const location = index === TRACKING_FLOW.length - 1 ? (order.deliveryAddress || step.location) : step.location;
        return {
            label: step.label,
            location,
            status,
            time: index <= completedStage ? order.date : "Waiting for next update"
        };
    });
}

function getCurrentLocation(order) {
    if (order.currentLocation) return order.currentLocation;
    const steps = buildTrackingSteps(order);
    const active = steps.find((step) => step.status === "active") || steps.filter((step) => step.status === "completed").slice(-1)[0];
    return active?.location || "Tracking not available";
}

function openTrackingModal(orderId) {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;

    const steps = buildTrackingSteps(order);
    document.getElementById("trackingModalTitle").textContent = `Track Order ${order.id}`;
    document.getElementById("trackingCurrentLocation").textContent = getCurrentLocation(order);
    document.getElementById("trackingPaymentInfo").textContent = `${order.paymentMethod || "Cash on Delivery"} • ${order.amount}`;
    document.getElementById("trackingStatusPill").textContent = order.status;
    document.getElementById("trackingTimeline").innerHTML = steps.map((step, index) => `
        <div class="tracking-step ${step.status}">
            <div class="tracking-dot">${index + 1}</div>
            <div class="tracking-card">
                <h6>${step.label}</h6>
                <p><strong>Location:</strong> ${step.location}</p>
                <p><strong>Update:</strong> ${step.time || "Pending update"}</p>
            </div>
        </div>
    `).join("");
    if (order.blockchainMeta?.recordHash) {
        document.getElementById("trackingCurrentLocation").innerHTML = `${getCurrentLocation(order)}<div class="small text-muted mt-2">Record hash: ${order.blockchainMeta.recordHash.slice(0, 16)}...</div>`;
    }

    new bootstrap.Modal(document.getElementById("trackingModal")).show();
}

async function saveOrder() {
    const isAdmin = isAdminUser();
    const session = PharmaChainApp.getSession();
    const isPatient = session?.user?.role === "patient";

    if (currentEditOrderId && isAdmin) {
        const currentOrder = orders.find((item) => item.id === currentEditOrderId);
        if (!currentOrder) {
            showNotification("Order not found", "warning");
            return;
        }

        const payload = {
            ...currentOrder,
            status: document.getElementById("orderStatus").value
        };
        payload.trackingSteps = buildTrackingSteps({
            ...currentOrder,
            status: payload.status
        });
        payload.currentLocation = getCurrentLocation(payload);

        await PharmaChainApp.api(`/api/orders/${currentEditOrderId}`, { method: "PUT", body: JSON.stringify(payload) });
        showNotification("Order status updated successfully", "success");
        bootstrap.Modal.getInstance(document.getElementById("createOrderModal"))?.hide();
        currentEditOrderId = null;
        setAdminReviewMode(false);
        await refreshData();
        return;
    }

    const patientId = document.getElementById("orderPatient").value;
    const doctorId = document.getElementById("orderDoctor").value;
    const selectedMedicines = getSelectedMedicines();
    if ((!patientId && !isPatient) || !selectedMedicines.length) {
        showNotification("Patient aur medicines select kijiye", "warning");
        return;
    }

    const patient = patients.find((item) => item.id === patientId) || {
        id: session?.user?.email || session?.user?.id || "SELF",
        name: session?.user?.name || session?.user?.email || "Patient"
    };
    const doctor = doctors.find((item) => item.id === doctorId) || {
        id: "N/A",
        name: "Not assigned"
    };
    const subtotal = selectedMedicines.reduce((sum, item) => sum + Number(item.price), 0);
    const shippingFee = selectedMedicines.length ? (SHIPPING_FEES[document.getElementById("orderPriority").value] || SHIPPING_FEES.normal) : 0;
    const platformFee = selectedMedicines.length ? PLATFORM_FEE : 0;
    const total = subtotal + shippingFee + platformFee;
    const paymentMethod = getSelectedPaymentMethod();
    const paymentStatus = paymentMethod === "Online Payment" ? "Paid" : "Pending";
    const paymentReference = paymentMethod === "Online Payment"
        ? (document.getElementById("upiId").value.trim() || `CARD-${document.getElementById("cardLastFour").value.trim()}`)
        : "";
    const deliveryArea = document.getElementById("deliveryArea").value.trim();
    const deliveryAddress = document.getElementById("deliveryAddress").value.trim();
    const contactNumber = document.getElementById("contactNumber").value.trim();

    if (!deliveryAddress || !contactNumber) {
        showNotification("Delivery address aur mobile number dijiye", "warning");
        return;
    }

    if (paymentMethod === "Online Payment" && !document.getElementById("upiId").value.trim() && !document.getElementById("cardLastFour").value.trim()) {
        showNotification("Online payment ke liye UPI ya card details dijiye", "warning");
        return;
    }

    const payload = {
        patient: patient.name,
        patientId: patient.id,
        doctor: doctor.name,
        doctorId,
        date: new Date().toISOString().split("T")[0],
        amount: formatCurrency(total),
        status: isPatient ? "Pending" : document.getElementById("orderStatus").value,
        medicines: selectedMedicines.map((medicine) => medicine.name),
        priority: document.getElementById("orderPriority").value,
        deliveryDate: document.getElementById("orderDeliveryDate").value,
        notes: document.getElementById("orderNotes").value.trim(),
        deliveryAddress: `${deliveryArea}${deliveryArea && deliveryAddress ? ", " : ""}${deliveryAddress}`,
        contactNumber,
        paymentMethod,
        paymentStatus,
        paymentReference,
        receiverAccountName: paymentConfig?.accountName || "",
        receiverUpiId: paymentConfig?.upiId || "",
        receiverAccountNumber: paymentConfig?.accountNumber || "",
        subtotal,
        shippingFee,
        platformFee,
        currentLocation: "PharmaChain Online Store",
        trackingSteps: buildTrackingSteps({
            status: isPatient ? "Pending" : document.getElementById("orderStatus").value,
            date: new Date().toISOString().split("T")[0],
            deliveryAddress: `${deliveryArea}${deliveryArea && deliveryAddress ? ", " : ""}${deliveryAddress}`
        })
    };

    if (currentEditOrderId) {
        if (!isAdmin) {
            showNotification("Only admin can edit orders", "warning");
            return;
        }
        await PharmaChainApp.api(`/api/orders/${currentEditOrderId}`, { method: "PUT", body: JSON.stringify(payload) });
        showNotification("Order updated successfully", "success");
    } else {
        await PharmaChainApp.api("/api/orders", { method: "POST", body: JSON.stringify(payload) });
        showNotification("Order created successfully", "success");
    }

    bootstrap.Modal.getInstance(document.getElementById("createOrderModal"))?.hide();
    currentEditOrderId = null;
    await refreshData();
}

function openNewOrderModal() {
    currentEditOrderId = null;
    setAdminReviewMode(false);
    document.getElementById("createOrderForm").reset();
    document.querySelectorAll(".medicine-check").forEach((checkbox) => checkbox.checked = false);
    document.getElementById("paymentCod").checked = true;
    document.querySelectorAll(".medicine-option").forEach((card) => card.classList.remove("selected"));
    updatePaymentUI();
    updateOrderSummary();
}

function editOrder(id) {
    const order = orders.find((item) => item.id === id);
    if (!order) return;
    currentEditOrderId = id;
    setAdminReviewMode(true, order);
    new bootstrap.Modal(document.getElementById("createOrderModal")).show();
}

async function deleteOrder(id) {
    const isAdmin = PharmaChainApp.isAdmin?.();
    if (!isAdmin) {
        showNotification("Only admin can delete orders", "warning");
        return;
    }
    if (!confirm("Delete this order?")) return;
    await PharmaChainApp.api(`/api/orders/${id}`, { method: "DELETE" });
    showNotification("Order deleted", "success");
    await refreshData();
}

function updateStats() {
    const visibleOrders = getVisibleOrders();
    document.getElementById("pendingOrders").textContent = visibleOrders.filter((order) => order.status === "Pending").length;
    document.getElementById("approvedOrders").textContent = visibleOrders.filter((order) => order.status === "Approved").length;
    document.getElementById("deliveredOrders").textContent = visibleOrders.filter((order) => order.status === "Delivered").length;
    document.getElementById("cancelledOrders").textContent = visibleOrders.filter((order) => order.status === "Cancelled").length;
}

function showNotification(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `alert alert-${type === "success" ? "success" : type === "warning" ? "warning" : "info"} position-fixed top-0 end-0 m-3`;
    toast.style.zIndex = "2000";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

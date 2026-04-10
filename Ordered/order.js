// ========== ORDER DATA STRUCTURES ==========
let orders = [];           // All orders (admin/staff view)
let patientOrders = [];    // Patient-specific orders (used for order history)
let shoppingCart = [];     // Current patient's cart
let currentEditOrderId = null; // For editing orders

// ========== LOAD ORDERS INTO TABLE (ADMIN VIEW) ==========
function loadOrders() {
    const tableBody = document.getElementById('ordersTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (orders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5">
                    <i class="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                    <h5>No orders found</h5>
                    <p class="text-muted">Create your first order to get started</p>
                    <button class="btn btn-warning" data-bs-toggle="modal" data-bs-target="#createOrderModal">
                        <i class="fas fa-plus me-2"></i>Create Order
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    orders.forEach(order => {
        const row = document.createElement('tr');
        let statusBadge = '';
        switch(order.status) {
            case 'Pending':   statusBadge = 'status-pending'; break;
            case 'Approved':  statusBadge = 'status-approved'; break;
            case 'Delivered': statusBadge = 'status-delivered'; break;
            case 'Cancelled': statusBadge = 'status-cancelled'; break;
        }

        row.innerHTML = `
            <td><strong>${order.id}</strong></td>
            <td>${order.patient}</td>
            <td>${order.date}</td>
            <td>${order.amount}</td>
            <td><span class="order-status ${statusBadge}">${order.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary edit-order-btn" data-id="${order.id}">Edit</button>
                <button class="btn btn-sm btn-outline-danger ms-1 delete-order-btn" data-id="${order.id}">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Attach event listeners
    setTimeout(() => {
        document.querySelectorAll('.edit-order-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const orderId = this.getAttribute('data-id');
                editOrder(orderId);
            });
        });
        document.querySelectorAll('.delete-order-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const orderId = this.getAttribute('data-id');
                deleteOrder(orderId);
            });
        });
    }, 100);
}

// ========== POPULATE ORDER FORM (PATIENTS, DOCTORS, MEDICINES) ==========
function populateOrderForm() {
    const patientSelect = document.getElementById('orderPatient');
    patientSelect.innerHTML = '<option value="">Select Patient</option>';
    patients.forEach(patient => {
        const option = document.createElement('option');
        option.value = patient.id;
        option.textContent = `${patient.name} (${patient.id})`;
        patientSelect.appendChild(option);
    });

    const doctorSelect = document.getElementById('orderDoctor');
    doctorSelect.innerHTML = '<option value="">Select Doctor</option>';
    doctors.forEach(doctor => {
        const option = document.createElement('option');
        option.value = doctor.id;
        option.textContent = `${doctor.name} - ${doctor.specialization}`;
        doctorSelect.appendChild(option);
    });

    const medicineSelection = document.getElementById('medicineSelection');
    medicineSelection.innerHTML = '';
    medicines.forEach(medicine => {
        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${medicine.name}" id="medicine-${medicine.id}">
            <label class="form-check-label" for="medicine-${medicine.id}">
                ${medicine.name} - $${medicine.price.toFixed(2)} (Stock: ${medicine.stock})
            </label>
        `;
        medicineSelection.appendChild(div);
    });
}

// ========== SAVE NEW ORDER ==========
function saveOrder() {
    const patientId = document.getElementById('orderPatient').value;
    const doctorId = document.getElementById('orderDoctor').value;
    const priority = document.getElementById('orderPriority').value;
    const deliveryDate = document.getElementById('orderDeliveryDate').value;
    const notes = document.getElementById('orderNotes').value.trim();
    const status = document.getElementById('orderStatus').value;

    if (!patientId || !doctorId) {
        showNotification('Please select a patient and doctor', 'warning');
        return;
    }

    const patient = patients.find(p => p.id === patientId);
    const doctor = doctors.find(d => d.id == doctorId);
    if (!patient || !doctor) {
        showNotification('Invalid patient or doctor selection', 'warning');
        return;
    }

    // Get selected medicines
    const selectedMedicines = [];
    document.querySelectorAll('#medicineSelection input[type="checkbox"]:checked').forEach(checkbox => {
        selectedMedicines.push(checkbox.value);
    });
    if (selectedMedicines.length === 0) {
        showNotification('Please select at least one medicine', 'warning');
        return;
    }

    // Calculate total amount
    const totalAmount = selectedMedicines.reduce((total, medicineName) => {
        const medicine = medicines.find(m => m.name === medicineName);
        return total + (medicine ? medicine.price : 0);
    }, 0);

    // Generate order ID
    const orderId = `ORD-${String(orders.length + 1).padStart(3, '0')}`;

    const newOrder = {
        id: orderId,
        patient: patient.name,
        patientId: patientId,
        doctor: doctor.name,
        doctorId: parseInt(doctorId),
        date: new Date().toISOString().split('T')[0],
        amount: `$${totalAmount.toFixed(2)}`,
        status: status,
        medicines: selectedMedicines,
        priority: priority,
        deliveryDate: deliveryDate || new Date().toISOString().split('T')[0],
        notes: notes
    };

    orders.push(newOrder);
    saveDataToStorage();

    bootstrap.Modal.getInstance(document.getElementById('createOrderModal')).hide();
    loadOrders();
    updateDashboardStats();
    showNotification('Order created successfully!', 'success');

    userActivities.unshift({
        action: `Created new order: ${orderId}`,
        time: getCurrentTime(),
        icon: "fas fa-clipboard-list",
        color: "warning"
    });
    saveDataToStorage();
}

// ========== EDIT ORDER ==========
function editOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        currentEditOrderId = orderId;
        document.getElementById('orderModalTitle').textContent = 'Edit Order';
        document.getElementById('saveOrderBtn').textContent = 'Update Order';

        populateOrderForm();

        setTimeout(() => {
            document.getElementById('orderPatient').value = order.patientId;
            document.getElementById('orderDoctor').value = order.doctorId;
            document.getElementById('orderPriority').value = order.priority || 'normal';
            document.getElementById('orderDeliveryDate').value = order.deliveryDate;
            document.getElementById('orderNotes').value = order.notes || '';
            document.getElementById('orderStatus').value = order.status;
            document.getElementById('orderId').value = order.id;

            // Check selected medicines
            order.medicines.forEach(medicineName => {
                const checkbox = document.querySelector(`input[value="${medicineName}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }, 100);

        const modal = new bootstrap.Modal(document.getElementById('createOrderModal'));
        modal.show();
    }
}

// ========== UPDATE ORDER ==========
function updateOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const patientId = document.getElementById('orderPatient').value;
    const doctorId = document.getElementById('orderDoctor').value;
    const priority = document.getElementById('orderPriority').value;
    const deliveryDate = document.getElementById('orderDeliveryDate').value;
    const notes = document.getElementById('orderNotes').value.trim();
    const status = document.getElementById('orderStatus').value;

    const patient = patients.find(p => p.id === patientId);
    const doctor = doctors.find(d => d.id == doctorId);
    if (!patient || !doctor) {
        showNotification('Invalid patient or doctor selection', 'warning');
        return;
    }

    const selectedMedicines = [];
    document.querySelectorAll('#medicineSelection input[type="checkbox"]:checked').forEach(checkbox => {
        selectedMedicines.push(checkbox.value);
    });
    if (selectedMedicines.length === 0) {
        showNotification('Please select at least one medicine', 'warning');
        return;
    }

    const totalAmount = selectedMedicines.reduce((total, medicineName) => {
        const medicine = medicines.find(m => m.name === medicineName);
        return total + (medicine ? medicine.price : 0);
    }, 0);

    order.patient = patient.name;
    order.patientId = patientId;
    order.doctor = doctor.name;
    order.doctorId = parseInt(doctorId);
    order.amount = `$${totalAmount.toFixed(2)}`;
    order.status = status;
    order.medicines = selectedMedicines;
    order.priority = priority;
    order.deliveryDate = deliveryDate;
    order.notes = notes;

    saveDataToStorage();

    bootstrap.Modal.getInstance(document.getElementById('createOrderModal')).hide();
    loadOrders();
    updateDashboardStats();
    showNotification('Order updated successfully!', 'success');

    userActivities.unshift({
        action: `Updated order: ${orderId}`,
        time: getCurrentTime(),
        icon: "fas fa-edit",
        color: "warning"
    });
    saveDataToStorage();

    currentEditOrderId = null;
}

// ========== DELETE ORDER ==========
function deleteOrder(orderId) {
    if (confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
        const index = orders.findIndex(o => o.id === orderId);
        if (index !== -1) {
            orders.splice(index, 1);
            saveDataToStorage();
            loadOrders();
            updateDashboardStats();
            showNotification(`Order ${orderId} deleted successfully!`, 'success');

            userActivities.unshift({
                action: `Deleted order: ${orderId}`,
                time: getCurrentTime(),
                icon: "fas fa-trash",
                color: "danger"
            });
            saveDataToStorage();
        }
    }
}

// ========== PATIENT ORDER HISTORY ==========
function loadPatientOrderHistory() {
    const tableBody = document.getElementById('patientOrderHistory');
    if (!tableBody || !currentUser) return;

    const patientOrdersList = patientOrders.filter(order => order.patientId === currentUser.email);

    tableBody.innerHTML = '';

    if (patientOrdersList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="fas fa-shopping-cart fa-2x text-muted mb-3"></i>
                    <p>No orders yet</p>
                </td>
            </tr>
        `;
        return;
    }

    patientOrdersList.forEach(order => {
        const row = document.createElement('tr');
        let statusBadge = '';
        switch(order.status) {
            case 'Pending':   statusBadge = 'status-pending'; break;
            case 'Approved':  statusBadge = 'status-approved'; break;
            case 'Shipped':   statusBadge = 'status-approved'; break;
            case 'Delivered': statusBadge = 'status-delivered'; break;
            case 'Cancelled': statusBadge = 'status-cancelled'; break;
        }

        row.innerHTML = `
            <td><strong>${order.id}</strong></td>
            <td>${order.orderDate}</td>
            <td>${order.items.length} items</td>
            <td>$${order.total.toFixed(2)}</td>
            <td><span class="order-status ${statusBadge}">${order.status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-primary view-order-details" data-id="${order.id}">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    setTimeout(() => {
        document.querySelectorAll('.view-order-details').forEach(btn => {
            btn.addEventListener('click', function() {
                const orderId = this.getAttribute('data-id');
                showOrderDetails(orderId);
            });
        });
    }, 100);
}

// ========== SHOW ORDER DETAILS MODAL ==========
function showOrderDetails(orderId) {
    const order = patientOrders.find(o => o.id === orderId);
    if (!order) return;

    let itemsHtml = '';
    order.items.forEach(item => {
        itemsHtml += `
            <div class="d-flex justify-content-between mb-2">
                <span>${item.name} × ${item.quantity}</span>
                <span>$${item.total.toFixed(2)}</span>
            </div>
        `;
    });

    const modalHtml = `
        <div class="modal fade" id="orderDetailsModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">Order Details: ${order.id}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <h6>Order Information</h6>
                                <p><strong>Order Date:</strong> ${order.orderDate}</p>
                                <p><strong>Status:</strong> <span class="badge bg-${getStatusColor(order.status)}">${order.status}</span></p>
                                <p><strong>Payment Status:</strong> <span class="badge bg-${order.paymentStatus === 'Paid' ? 'success' : 'warning'}">${order.paymentStatus}</span></p>
                            </div>
                            <div class="col-md-6">
                                <h6>Delivery Information</h6>
                                <p><strong>Delivery Address:</strong> ${order.deliveryAddress}</p>
                                <p><strong>Delivery Date:</strong> ${order.deliveryDate}</p>
                                <p><strong>Contact:</strong> ${order.patientContact}</p>
                            </div>
                        </div>
                        
                        <h6>Order Items</h6>
                        <div class="border rounded p-3 mb-3">
                            ${itemsHtml}
                            <hr>
                            <div class="d-flex justify-content-between">
                                <strong>Subtotal:</strong>
                                <strong>$${order.subtotal.toFixed(2)}</strong>
                            </div>
                            <div class="d-flex justify-content-between">
                                <strong>Shipping:</strong>
                                <strong>$${order.shipping.toFixed(2)}</strong>
                            </div>
                            <div class="d-flex justify-content-between mt-2">
                                <strong>Total:</strong>
                                <strong class="text-success">$${order.total.toFixed(2)}</strong>
                            </div>
                        </div>
                        
                        ${order.adminNotes ? `
                        <div class="alert alert-info">
                            <strong>Admin Notes:</strong> ${order.adminNotes}
                        </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv);

    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    modal.show();

    document.getElementById('orderDetailsModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

function getStatusColor(status) {
    switch(status) {
        case 'Pending': return 'warning';
        case 'Approved': return 'info';
        case 'Shipped': return 'primary';
        case 'Delivered': return 'success';
        case 'Cancelled': return 'danger';
        default: return 'secondary';
    }
}

// ========== ADMIN PATIENT ORDERS TABLE ==========
function loadAdminPatientOrders() {
    const tableBody = document.getElementById('adminPatientOrdersTable');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (patientOrders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-3">No patient orders</td>
            </tr>
        `;
        return;
    }

    const sortedOrders = [...patientOrders].sort((a, b) => 
        new Date(b.orderDate) - new Date(a.orderDate)
    );

    sortedOrders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${order.id}</strong></td>
            <td>${order.patientName}</td>
            <td>${order.orderDate}</td>
            <td>$${order.total.toFixed(2)}</td>
            <td>
                <select class="form-select form-select-sm order-status-select" 
                        data-order-id="${order.id}" style="width: 120px;">
                    <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Approved" ${order.status === 'Approved' ? 'selected' : ''}>Approved</option>
                    <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewAdminOrderDetails('${order.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-success ms-1" onclick="updateOrderStatus('${order.id}')">
                    <i class="fas fa-check"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// ========== PATIENT CHECKOUT (CREATES ORDER) ==========
function handleCheckout() {
    if (!currentUser || currentUser.role !== 'patient') {
        showNotification('Only patients can place orders', 'warning');
        return;
    }

    const deliveryAddress = document.getElementById('deliveryAddress').value.trim();
    const deliveryDate = document.getElementById('deliveryDate').value;
    const contactNumber = document.getElementById('contactNumber').value.trim();

    if (!deliveryAddress || !deliveryDate || !contactNumber) {
        showNotification('Please fill all delivery information', 'warning');
        return;
    }

    const orderId = `PAT-ORD-${Date.now().toString().substr(-6)}`;
    const subtotal = shoppingCart.reduce((sum, item) => sum + item.total, 0);
    const shipping = 5.00;
    const total = subtotal + shipping;

    const newOrder = {
        id: orderId,
        patientId: currentUser.email,
        patientName: currentUser.name,
        patientContact: contactNumber,
        deliveryAddress: deliveryAddress,
        deliveryDate: deliveryDate,
        orderDate: new Date().toISOString().split('T')[0],
        items: [...shoppingCart],
        subtotal: subtotal,
        shipping: shipping,
        total: total,
        status: 'Pending',
        paymentStatus: 'Pending',
        notes: 'Patient order via website',
        assignedTo: null,
        adminNotes: ''
    };

    patientOrders.unshift(newOrder);

    // Also add to main orders for admin
    const adminOrder = {
        id: `ADM-${orderId}`,
        orderId: orderId,
        patient: currentUser.name,
        patientId: currentUser.email,
        doctor: 'Self-order',
        doctorId: null,
        date: newOrder.orderDate,
        amount: `$${total.toFixed(2)}`,
        status: 'Pending',
        medicines: shoppingCart.map(item => `${item.name} (x${item.quantity})`),
        priority: 'normal',
        deliveryDate: deliveryDate,
        notes: `Patient order - Contact: ${contactNumber}`,
        orderType: 'patient',
        patientOrderData: newOrder
    };

    orders.push(adminOrder);

    // Clear cart
    shoppingCart = [];
    updateCartDisplay();
    saveOrderingData();
    saveDataToStorage();

    loadPatientOrderHistory();
    loadOrders();
    loadAdminPatientOrders();

    showNotification(`Order ${orderId} placed successfully! Total: $${total.toFixed(2)}`, 'success');

    userActivities.unshift({
        action: `Placed order: ${orderId}`,
        time: getCurrentTime(),
        icon: "fas fa-shopping-cart",
        color: "success"
    });

    addAdminLog('PATIENT_ORDER', `Patient ${currentUser.name} placed order ${orderId} for $${total.toFixed(2)}`);
}

// ========== UPDATE ORDER STATUS (ADMIN) ==========
function updateOrderStatus(orderId) {
    const orderIndex = patientOrders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    const selectElement = document.querySelector(`select[data-order-id="${orderId}"]`);
    if (!selectElement) return;

    const newStatus = selectElement.value;
    patientOrders[orderIndex].status = newStatus;

    // Also update in main orders
    const adminOrderIndex = orders.findIndex(o => o.orderId === orderId);
    if (adminOrderIndex !== -1) {
        orders[adminOrderIndex].status = newStatus;
    }

    saveOrderingData();
    saveDataToStorage();

    addAdminLog('ORDER_STATUS', `Changed order ${orderId} status to ${newStatus}`);
    showNotification(`Order ${orderId} status updated to ${newStatus}`, 'success');
}

// ========== HELPER: UPDATE DASHBOARD STATS ==========
function updateOrderStats() {
    document.getElementById('pendingOrders').textContent = orders.filter(o => o.status === 'Pending').length;
    document.getElementById('approvedOrders').textContent = orders.filter(o => o.status === 'Approved').length;
    document.getElementById('deliveredOrders').textContent = orders.filter(o => o.status === 'Delivered').length;
    document.getElementById('cancelledOrders').textContent = orders.filter(o => o.status === 'Cancelled').length;
}
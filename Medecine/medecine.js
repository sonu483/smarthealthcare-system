
        // ========== GLOBAL VARIABLES ==========
        let medicines = [];
        let currentEditMedicineId = null;

        // ========== INITIALIZATION ==========
        document.addEventListener('DOMContentLoaded', function() {
            loadMedicinesFromStorage();
            renderMedicineGrid();
            renderMedicineTable();

            // Event Listeners
            document.getElementById('addMedicineBtn').addEventListener('click', resetMedicineForm);
            document.getElementById('saveMedicineBtn').addEventListener('click', handleSaveMedicine);
        });

        // ========== LOCAL STORAGE ==========
        function loadMedicinesFromStorage() {
            const stored = localStorage.getItem('pharmachain_medicines');
            if (stored) {
                try {
                    medicines = JSON.parse(stored);
                } catch (e) {
                    medicines = getDefaultMedicines();
                }
            } else {
                medicines = getDefaultMedicines();
            }
        }

        function saveMedicinesToStorage() {
            localStorage.setItem('pharmachain_medicines', JSON.stringify(medicines));
        }

        function getDefaultMedicines() {
            return [
                { 
                    id: 1, 
                    name: "Aspirin 100mg", 
                    category: "Pain Relief", 
                    price: 12.99, 
                    stock: 250, 
                    status: "In Stock", 
                    description: "Used for pain relief and reducing fever.", 
                    expiry: "2024-12-31" 
                },
                { 
                    id: 2, 
                    name: "Amoxicillin 500mg", 
                    category: "Antibiotic", 
                    price: 24.99, 
                    stock: 15, 
                    status: "Low Stock", 
                    description: "Antibiotic for bacterial infections.", 
                    expiry: "2024-06-30" 
                },
                { 
                    id: 3, 
                    name: "Insulin Glargine", 
                    category: "Diabetes", 
                    price: 45.99, 
                    stock: 80, 
                    status: "In Stock", 
                    description: "Long-acting insulin for diabetes.", 
                    expiry: "2024-09-30" 
                }
            ];
        }

        // ========== RENDERING ==========
        function renderMedicineGrid() {
            const grid = document.getElementById('medicineGrid');
            if (!grid) return;

            if (medicines.length === 0) {
                grid.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-pills fa-3x text-muted mb-3"></i>
                        <h5>No medicines found</h5>
                        <p class="text-muted">Click "Add Medicine" to get started.</p>
                    </div>
                `;
                return;
            }

            // Show first 3 in cards (optional)
            const cardsHtml = medicines.slice(0, 3).map(med => `
                <div class="col-md-4 mb-4">
                    <div class="card dashboard-card">
                        <div class="medicine-img">
                            <i class="fas fa-pills"></i>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${escapeHtml(med.name)}</h5>
                            <p class="card-text text-muted">${escapeHtml(med.description.substring(0, 80))}...</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong class="text-success">$${med.price.toFixed(2)}</strong>
                                    <div class="mt-2">
                                        <span class="${med.stock < 20 ? 'low-stock' : 'in-stock'}">
                                            ${med.stock < 20 ? 'Low Stock' : 'In Stock'}: ${med.stock}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <button class="btn btn-sm btn-outline-primary edit-medicine-btn" data-id="${med.id}">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger ms-1 delete-medicine-btn" data-id="${med.id}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            grid.innerHTML = cardsHtml;
            attachCardEventListeners();
        }

        function renderMedicineTable() {
            const tbody = document.getElementById('medicineTableBody');
            if (!tbody) return;

            if (medicines.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-4">
                            <i class="fas fa-pills fa-2x text-muted mb-2"></i><br>
                            No medicines available.
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = medicines.map(med => `
                <tr>
                    <td>${escapeHtml(med.name)}</td>
                    <td>${escapeHtml(med.category)}</td>
                    <td>$${med.price.toFixed(2)}</td>
                    <td><span class="${med.stock < 20 ? 'low-stock' : 'in-stock'}">${med.stock}</span></td>
                    <td>
                        <span class="badge ${med.stock < 20 ? 'bg-warning' : 'bg-success'}">
                            ${med.stock < 20 ? 'Low Stock' : 'In Stock'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary edit-medicine-btn" data-id="${med.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger ms-1 delete-medicine-btn" data-id="${med.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');

            attachTableEventListeners();
        }

        // Attach event listeners to buttons in cards
        function attachCardEventListeners() {
            document.querySelectorAll('.edit-medicine-btn').forEach(btn => {
                btn.removeEventListener('click', handleEditClick);
                btn.addEventListener('click', handleEditClick);
            });
            document.querySelectorAll('.delete-medicine-btn').forEach(btn => {
                btn.removeEventListener('click', handleDeleteClick);
                btn.addEventListener('click', handleDeleteClick);
            });
        }

        function attachTableEventListeners() {
            document.querySelectorAll('.edit-medicine-btn').forEach(btn => {
                btn.removeEventListener('click', handleEditClick);
                btn.addEventListener('click', handleEditClick);
            });
            document.querySelectorAll('.delete-medicine-btn').forEach(btn => {
                btn.removeEventListener('click', handleDeleteClick);
                btn.addEventListener('click', handleDeleteClick);
            });
        }

        // Event handlers
        function handleEditClick(e) {
            const id = parseInt(e.currentTarget.getAttribute('data-id'));
            editMedicine(id);
        }

        function handleDeleteClick(e) {
            const id = parseInt(e.currentTarget.getAttribute('data-id'));
            deleteMedicine(id);
        }

        // ========== CRUD OPERATIONS ==========
        function resetMedicineForm() {
            currentEditMedicineId = null;
            document.getElementById('medicineModalTitle').textContent = 'Add New Medicine';
            document.getElementById('saveMedicineBtn').textContent = 'Save Medicine';
            document.getElementById('medicineForm').reset();
            document.getElementById('medicineId').value = '';
            // Set default expiry to today+1 year (optional)
            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            document.getElementById('medicineExpiry').valueAsDate = nextYear;
        }

        function editMedicine(id) {
            const medicine = medicines.find(m => m.id === id);
            if (!medicine) return;

            currentEditMedicineId = id;
            document.getElementById('medicineModalTitle').textContent = 'Edit Medicine';
            document.getElementById('saveMedicineBtn').textContent = 'Update Medicine';
            document.getElementById('medicineName').value = medicine.name;
            document.getElementById('medicineCategory').value = medicine.category;
            document.getElementById('medicinePrice').value = medicine.price;
            document.getElementById('medicineStock').value = medicine.stock;
            document.getElementById('medicineDescription').value = medicine.description;
            document.getElementById('medicineExpiry').value = medicine.expiry;
            document.getElementById('medicineId').value = medicine.id;

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('medicineModal'));
            modal.show();
        }

        function handleSaveMedicine() {
            const name = document.getElementById('medicineName').value.trim();
            const category = document.getElementById('medicineCategory').value;
            const price = parseFloat(document.getElementById('medicinePrice').value);
            const stock = parseInt(document.getElementById('medicineStock').value);
            const description = document.getElementById('medicineDescription').value.trim();
            const expiry = document.getElementById('medicineExpiry').value;

            // Validation
            if (!name || !category || isNaN(price) || isNaN(stock) || !expiry) {
                showNotification('Please fill in all required fields', 'warning');
                return;
            }

            if (currentEditMedicineId === null) {
                // Add new
                const newId = medicines.length > 0 ? Math.max(...medicines.map(m => m.id)) + 1 : 1;
                const newMedicine = {
                    id: newId,
                    name: name,
                    category: category,
                    price: price,
                    stock: stock,
                    status: stock < 20 ? 'Low Stock' : 'In Stock',
                    description: description || 'No description provided',
                    expiry: expiry
                };
                medicines.push(newMedicine);
                showNotification('Medicine added successfully!', 'success');
            } else {
                // Update existing
                const index = medicines.findIndex(m => m.id === currentEditMedicineId);
                if (index !== -1) {
                    medicines[index] = {
                        ...medicines[index],
                        name: name,
                        category: category,
                        price: price,
                        stock: stock,
                        status: stock < 20 ? 'Low Stock' : 'In Stock',
                        description: description || medicines[index].description,
                        expiry: expiry
                    };
                    showNotification('Medicine updated successfully!', 'success');
                }
            }

            // Save to localStorage
            saveMedicinesToStorage();

            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('medicineModal')).hide();

            // Re-render views
            renderMedicineGrid();
            renderMedicineTable();
        }

        function deleteMedicine(id) {
            if (!confirm('Are you sure you want to delete this medicine? This action cannot be undone.')) return;

            const index = medicines.findIndex(m => m.id === id);
            if (index !== -1) {
                const name = medicines[index].name;
                medicines.splice(index, 1);
                saveMedicinesToStorage();
                renderMedicineGrid();
                renderMedicineTable();
                showNotification(`Medicine "${name}" deleted successfully!`, 'success');
            }
        }

        // ========== UTILITIES ==========
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function showNotification(message, type = 'success') {
            const container = document.getElementById('notificationContainer');
            const notification = document.createElement('div');
            notification.className = `alert alert-${type} alert-dismissible fade show notification`;
            notification.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle'} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            container.appendChild(notification);

            setTimeout(() => {
                if (notification.parentNode) notification.remove();
            }, 4000);
        }
 
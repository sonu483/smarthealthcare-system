
        // ========== GLOBAL VARIABLES ==========
        let hospitals = [];
        let doctors = []; // for doctor association demo

        // ========== HELPER FUNCTIONS ==========
        function showNotification(message, type = 'success') {
            const container = document.getElementById('notificationContainer');
            const notification = document.createElement('div');
            notification.className = `alert alert-${type} alert-dismissible fade show notification`;
            notification.innerHTML = `
                ${type === 'success' ? '<i class="fas fa-check-circle me-2"></i>' : 
                  type === 'danger' ? '<i class="fas fa-exclamation-circle me-2"></i>' : 
                  type === 'warning' ? '<i class="fas fa-exclamation-triangle me-2"></i>' :
                  '<i class="fas fa-info-circle me-2"></i>'}
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            container.appendChild(notification);
            setTimeout(() => {
                if (notification.parentNode) notification.remove();
            }, 5000);
        }

        function getCurrentTime() {
            return 'Just now';
        }

        // ========== HOSPITAL FUNCTIONS ==========
        function loadHospitals() {
            const storedHospitals = localStorage.getItem('pharmachain_hospitals');
            if (storedHospitals) {
                try {
                    hospitals = JSON.parse(storedHospitals);
                } catch (e) {
                    console.error('Error parsing hospitals:', e);
                    hospitals = getDefaultHospitals();
                }
            } else {
                hospitals = getDefaultHospitals();
            }
            updateHospitalDisplay();
            updateHospitalStats();
        }

        function getDefaultHospitals() {
            return [
                {
                    id: "H-001",
                    name: "City General Hospital",
                    type: "general",
                    email: "info@citygeneral.com",
                    phone: "+1 (555) 123-4567",
                    address: "123 Main Street",
                    city: "New York",
                    state: "NY",
                    zip: "10001",
                    license: "LIC123456",
                    capacity: 500,
                    services: "Emergency, Surgery, ICU, Cardiology",
                    status: "active",
                    accreditation: "JCI",
                    createdAt: "2023-01-15"
                },
                {
                    id: "H-002",
                    name: "St. Mary's Medical Center",
                    type: "teaching",
                    email: "contact@stmarys.org",
                    phone: "+1 (555) 234-5678",
                    address: "456 Oak Avenue",
                    city: "Los Angeles",
                    state: "CA",
                    zip: "90001",
                    license: "LIC234567",
                    capacity: 750,
                    services: "Emergency, Oncology, Pediatrics, Research",
                    status: "active",
                    accreditation: "NABH",
                    createdAt: "2023-02-20"
                }
            ];
        }

        function updateHospitalDisplay() {
            const hospitalsGrid = document.getElementById('hospitalsGrid');
            const tableBody = document.getElementById('hospitalsTableBody');
            if (!hospitalsGrid) return;
            
            hospitalsGrid.innerHTML = '';
            
            if (hospitals.length === 0) {
                hospitalsGrid.innerHTML = `
                    <div class="col-12">
                        <div class="hospital-empty-state">
                            <i class="fas fa-hospital"></i>
                            <h5>No hospitals found</h5>
                            <p class="text-muted">Add your first hospital to get started</p>
                            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addHospitalModal">
                                <i class="fas fa-plus me-2"></i>Add Hospital
                            </button>
                        </div>
                    </div>
                `;
                return;
            }
            
            hospitals.forEach(hospital => {
                const col = document.createElement('div');
                col.className = 'col-md-4 mb-4';
                col.innerHTML = `
                    <div class="card hospital-card">
                        <div class="card-header">
                            <h5 class="mb-0">${hospital.name}</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <span class="badge bg-info">${hospital.type}</span>
                                <span class="badge ${hospital.status === 'active' ? 'bg-success' : 'bg-secondary'} ms-2">
                                    ${hospital.status}
                                </span>
                            </div>
                            <p class="mb-2"><i class="fas fa-map-marker-alt"></i> ${hospital.city}, ${hospital.state}</p>
                            <p class="mb-2"><i class="fas fa-phone"></i> ${hospital.phone}</p>
                            <p class="mb-2"><i class="fas fa-envelope"></i> ${hospital.email}</p>
                            <p class="mb-2"><i class="fas fa-users"></i> Capacity: ${hospital.capacity} beds</p>
                            
                            <!-- Capacity Meter -->
                            <div class="capacity-meter">
                                <div class="capacity-meter-fill" style="width: ${(hospital.capacity / 1000) * 100}%"></div>
                            </div>
                            <div class="capacity-label">
                                <span>0</span>
                                <span>1000</span>
                            </div>
                            
                            <!-- Services Tags -->
                            <div class="hospital-services">
                                ${hospital.services.split(',').map(service => 
                                    `<span class="service-tag">${service.trim()}</span>`
                                ).join('')}
                            </div>
                            
                            <div class="hospital-quick-actions">
                                <button class="btn btn-sm btn-outline-primary edit-hospital-btn" data-id="${hospital.id}">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-hospital-btn" data-id="${hospital.id}">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                                <button class="btn btn-sm btn-outline-info view-hospital-doctors" data-id="${hospital.id}">
                                    <i class="fas fa-user-md"></i> Doctors
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                hospitalsGrid.appendChild(col);
            });
            
            // Update table
            if (tableBody) {
                tableBody.innerHTML = '';
                hospitals.forEach(hospital => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><strong>${hospital.id}</strong></td>
                        <td>${hospital.name}</td>
                        <td>${hospital.type}</td>
                        <td>${hospital.city}, ${hospital.state}</td>
                        <td>${hospital.phone}</td>
                        <td>${hospital.capacity}</td>
                        <td>
                            <span class="badge ${hospital.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                                ${hospital.status}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary edit-hospital-btn" data-id="${hospital.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-hospital-btn" data-id="${hospital.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            }
            
            // Attach event listeners to buttons
            setTimeout(() => {
                document.querySelectorAll('.edit-hospital-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const hospitalId = this.getAttribute('data-id');
                        editHospital(hospitalId);
                    });
                });
                document.querySelectorAll('.delete-hospital-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const hospitalId = this.getAttribute('data-id');
                        deleteHospital(hospitalId);
                    });
                });
                document.querySelectorAll('.view-hospital-doctors').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const hospitalId = this.getAttribute('data-id');
                        viewHospitalDoctors(hospitalId);
                    });
                });
            }, 100);
        }

        function updateHospitalStats() {
            const totalHospitals = hospitals.length;
            const activeHospitals = hospitals.filter(h => h.status === 'active').length;
            const totalBeds = hospitals.reduce((sum, h) => sum + (h.capacity || 0), 0);
            const doctorsInHospitals = doctors.filter(d => d.hospitalId).length;
            
            document.getElementById('totalHospitals').textContent = totalHospitals;
            document.getElementById('activeHospitals').textContent = activeHospitals;
            document.getElementById('totalBeds').textContent = totalBeds;
            document.getElementById('totalDoctorsInHospitals').textContent = doctorsInHospitals;
        }

        function saveHospital() {
            const name = document.getElementById('hospitalName').value.trim();
            const type = document.getElementById('hospitalType').value;
            const email = document.getElementById('hospitalEmail').value.trim();
            const phone = document.getElementById('hospitalPhone').value.trim();
            const address = document.getElementById('hospitalAddress').value.trim();
            const city = document.getElementById('hospitalCity').value.trim();
            const state = document.getElementById('hospitalState').value.trim();
            const zip = document.getElementById('hospitalZip').value.trim();
            const license = document.getElementById('hospitalLicense').value.trim();
            const capacity = parseInt(document.getElementById('hospitalCapacity').value);
            const services = document.getElementById('hospitalServices').value.trim();
            const status = document.getElementById('hospitalStatus').value;
            const accreditation = document.getElementById('hospitalAccreditation').value;
            
            if (!name || !type || !email || !phone || !address || !city || !state || !zip || !license || isNaN(capacity)) {
                showNotification('Please fill in all required fields', 'warning');
                return;
            }
            
            const hospitalId = `H-${String(hospitals.length + 1).padStart(3, '0')}`;
            const newHospital = {
                id: hospitalId,
                name: name,
                type: type,
                email: email,
                phone: phone,
                address: address,
                city: city,
                state: state,
                zip: zip,
                license: license,
                capacity: capacity,
                services: services || 'Not specified',
                status: status,
                accreditation: accreditation || 'None',
                createdAt: new Date().toISOString().split('T')[0]
            };
            
            hospitals.push(newHospital);
            saveHospitalsToStorage();
            
            bootstrap.Modal.getInstance(document.getElementById('addHospitalModal')).hide();
            document.getElementById('addHospitalForm').reset();
            
            updateHospitalDisplay();
            updateHospitalStats();
            
            showNotification('Hospital added successfully!', 'success');
        }

        function editHospital(hospitalId) {
            const hospital = hospitals.find(h => h.id === hospitalId);
            if (hospital) {
                document.getElementById('hospitalModalTitle').textContent = 'Edit Hospital';
                document.getElementById('saveHospitalBtn').textContent = 'Update Hospital';
                
                document.getElementById('hospitalName').value = hospital.name;
                document.getElementById('hospitalType').value = hospital.type;
                document.getElementById('hospitalEmail').value = hospital.email;
                document.getElementById('hospitalPhone').value = hospital.phone;
                document.getElementById('hospitalAddress').value = hospital.address;
                document.getElementById('hospitalCity').value = hospital.city;
                document.getElementById('hospitalState').value = hospital.state;
                document.getElementById('hospitalZip').value = hospital.zip;
                document.getElementById('hospitalLicense').value = hospital.license;
                document.getElementById('hospitalCapacity').value = hospital.capacity;
                document.getElementById('hospitalServices').value = hospital.services;
                document.getElementById('hospitalStatus').value = hospital.status;
                document.getElementById('hospitalAccreditation').value = hospital.accreditation || '';
                document.getElementById('hospitalId').value = hospital.id;
                
                const modal = new bootstrap.Modal(document.getElementById('addHospitalModal'));
                modal.show();
            }
        }

        function updateHospital() {
            const hospitalId = document.getElementById('hospitalId').value;
            const hospital = hospitals.find(h => h.id === hospitalId);
            if (hospital) {
                hospital.name = document.getElementById('hospitalName').value.trim();
                hospital.type = document.getElementById('hospitalType').value;
                hospital.email = document.getElementById('hospitalEmail').value.trim();
                hospital.phone = document.getElementById('hospitalPhone').value.trim();
                hospital.address = document.getElementById('hospitalAddress').value.trim();
                hospital.city = document.getElementById('hospitalCity').value.trim();
                hospital.state = document.getElementById('hospitalState').value.trim();
                hospital.zip = document.getElementById('hospitalZip').value.trim();
                hospital.license = document.getElementById('hospitalLicense').value.trim();
                hospital.capacity = parseInt(document.getElementById('hospitalCapacity').value);
                hospital.services = document.getElementById('hospitalServices').value.trim();
                hospital.status = document.getElementById('hospitalStatus').value;
                hospital.accreditation = document.getElementById('hospitalAccreditation').value;
                
                saveHospitalsToStorage();
                
                bootstrap.Modal.getInstance(document.getElementById('addHospitalModal')).hide();
                document.getElementById('addHospitalForm').reset();
                
                updateHospitalDisplay();
                updateHospitalStats();
                
                showNotification('Hospital updated successfully!', 'success');
            }
        }

        function deleteHospital(hospitalId) {
            if (confirm('Are you sure you want to delete this hospital? This action cannot be undone.')) {
                const index = hospitals.findIndex(h => h.id === hospitalId);
                if (index !== -1) {
                    const hospitalName = hospitals[index].name;
                    hospitals.splice(index, 1);
                    
                    saveHospitalsToStorage();
                    updateHospitalDisplay();
                    updateHospitalStats();
                    
                    showNotification(`Hospital ${hospitalName} deleted successfully!`, 'success');
                }
            }
        }

        function viewHospitalDoctors(hospitalId) {
            const hospital = hospitals.find(h => h.id === hospitalId);
            if (!hospital) return;
            
            // For demo, show some dummy doctors
            const hospitalDoctors = doctors.filter(d => d.hospital === hospital.name);
            let doctorsList = '';
            if (hospitalDoctors.length === 0) {
                doctorsList = '<p class="text-muted">No doctors associated with this hospital</p>';
            } else {
                doctorsList = '<ul class="list-group">';
                hospitalDoctors.forEach(doctor => {
                    doctorsList += `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            ${doctor.name}
                            <span class="badge bg-primary">${doctor.specialization}</span>
                        </li>
                    `;
                });
                doctorsList += '</ul>';
            }
            
            const modalHtml = `
                <div class="modal fade" id="hospitalDoctorsModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">Doctors at ${hospital.name}</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                ${doctorsList}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const modalDiv = document.createElement('div');
            modalDiv.innerHTML = modalHtml;
            document.body.appendChild(modalDiv);
            
            const modal = new bootstrap.Modal(document.getElementById('hospitalDoctorsModal'));
            modal.show();
            
            document.getElementById('hospitalDoctorsModal').addEventListener('hidden.bs.modal', function() {
                this.remove();
            });
        }

        function saveHospitalsToStorage() {
            localStorage.setItem('pharmachain_hospitals', JSON.stringify(hospitals));
        }

        // ========== INITIALIZATION ==========
        document.addEventListener('DOMContentLoaded', function() {
            // Dummy doctors for demo
            doctors = [
                { id: 1, name: "Dr. John Smith", specialization: "Cardiology", hospital: "City General Hospital", hospitalId: "H-001" },
                { id: 2, name: "Dr. Sarah Johnson", specialization: "Neurology", hospital: "St. Mary's Medical Center", hospitalId: "H-002" }
            ];

            loadHospitals();

            document.getElementById('addHospitalBtn').addEventListener('click', function() {
                document.getElementById('hospitalModalTitle').textContent = 'Add New Hospital';
                document.getElementById('saveHospitalBtn').textContent = 'Save Hospital';
                document.getElementById('addHospitalForm').reset();
                document.getElementById('hospitalId').value = '';
            });

            document.getElementById('saveHospitalBtn').addEventListener('click', function() {
                const hospitalId = document.getElementById('hospitalId').value;
                if (!hospitalId) {
                    saveHospital();
                } else {
                    updateHospital();
                }
            });
        });

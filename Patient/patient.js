       // ========== GLOBAL VARIABLES ==========
        let manualPatients = [];               // manually added via the form
        let acceptedPatients = [];              // from doctor's acceptance (via localStorage)
        let currentEditPatientId = null;

        // ========== INITIALIZATION ==========
        document.addEventListener('DOMContentLoaded', function() {
            loadManualPatientsFromStorage();
            loadAcceptedPatientsFromStorage();
            renderCombinedTable();
            updateStats();

            // Event Listeners
            document.getElementById('addPatientBtn').addEventListener('click', function() {
                currentEditPatientId = null;
                document.getElementById('patientModalTitle').textContent = 'Add New Patient';
                document.getElementById('savePatientBtn').textContent = 'Save Patient';
                document.getElementById('addPatientForm').reset();
            });

            document.getElementById('savePatientBtn').addEventListener('click', function() {
                if (currentEditPatientId === null) {
                    saveManualPatient();
                } else {
                    updateManualPatient(currentEditPatientId);
                }
            });

            // Listen for storage changes (when doctor accepts a patient in another tab)
            window.addEventListener('storage', function(e) {
                if (e.key === 'acceptedPatients') {
                    loadAcceptedPatientsFromStorage();
                    renderCombinedTable();
                    updateStats();
                }
            });
        });

        // ========== STORAGE FUNCTIONS ==========
        function loadManualPatientsFromStorage() {
            const stored = localStorage.getItem('patients');
            if (stored) {
                try {
                    manualPatients = JSON.parse(stored);
                } catch (e) {
                    manualPatients = getDefaultManualPatients();
                }
            } else {
                manualPatients = getDefaultManualPatients();
            }
        }

        function loadAcceptedPatientsFromStorage() {
            const stored = localStorage.getItem('acceptedPatients');
            if (stored) {
                try {
                    acceptedPatients = JSON.parse(stored);
                } catch (e) {
                    acceptedPatients = [];
                }
            } else {
                acceptedPatients = [];
            }
        }

        function saveManualPatientsToStorage() {
            localStorage.setItem('patients', JSON.stringify(manualPatients));
        }

        function getDefaultManualPatients() {
            return [
                { 
                    id: "P-001", 
                    name: "John Smith", 
                    age: 45, 
                    gender: "Male", 
                    bloodGroup: "A+", 
                    contact: "+1 (555) 123-4567", 
                    email: "john.smith@email.com", 
                    lastVisit: "2023-08-10", 
                    status: "Active", 
                    address: "123 Main St, New York",
                    medicalHistory: "Hypertension, Type 2 Diabetes",
                    source: 'manual'
                },
                { 
                    id: "P-002", 
                    name: "Sarah Johnson", 
                    age: 32, 
                    gender: "Female", 
                    bloodGroup: "O+", 
                    contact: "+1 (555) 234-5678", 
                    email: "sarah.j@email.com", 
                    lastVisit: "2023-08-09", 
                    status: "Active", 
                    address: "456 Oak Ave, Chicago",
                    medicalHistory: "Asthma, Allergic rhinitis",
                    source: 'manual'
                }
            ];
        }

        // ========== UI: COMBINED TABLE ==========
        function renderCombinedTable() {
            const tableBody = document.getElementById('patientsTableBody');
            if (!tableBody) return;

            // Merge manual and accepted patients
            const allPatients = [
                ...manualPatients.map(p => ({ ...p, source: 'manual' })),
                ...acceptedPatients.map(p => ({ 
                    id: p.id || ('APT_' + Date.now() + Math.random()), 
                    name: p.patientName,
                    age: p.patientAge || '—',
                    gender: p.patientGender || '—',
                    contact: p.patientPhone || '—',
                    email: p.patientEmail || '—',
                    lastVisit: `${p.date} ${p.time}`,
                    status: 'Active',   // default for accepted
                    doctor: p.doctorName,
                    source: 'appointment'
                }))
            ];

            if (allPatients.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="11" class="text-center py-5">
                            <i class="fas fa-users fa-3x text-muted mb-3"></i>
                            <h5>No patients found</h5>
                            <p class="text-muted">Add a patient manually or wait for accepted appointments.</p>
                        </td>
                    </tr>
                `;
                return;
            }

            tableBody.innerHTML = '';
            allPatients.forEach(patient => {
                const row = document.createElement('tr');
                // For accepted patients, we might not have edit/delete
                const actionButtons = patient.source === 'manual' 
                    ? `<button class="btn btn-sm btn-outline-primary edit-patient-btn" data-id="${patient.id}"><i class="fas fa-edit"></i></button>
                       <button class="btn btn-sm btn-outline-danger ms-1 delete-patient-btn" data-id="${patient.id}"><i class="fas fa-trash"></i></button>`
                    : `<span class="badge bg-secondary">from appointment</span>`;

                row.innerHTML = `
                    <td><strong>${patient.id}</strong></td>
                    <td>${patient.name}</td>
                    <td>${patient.age}</td>
                    <td>${patient.gender}</td>
                    <td>${patient.contact}</td>
                    <td>${patient.email}</td>
                    <td>${patient.lastVisit}</td>
                    <td>
                        <span class="badge ${patient.status === 'Active' ? 'bg-success' : 'bg-secondary'}">
                            ${patient.status}
                        </span>
                    </td>
                    <td>${patient.doctor || '—'}</td>
                    <td><span class="badge badge-appointment">${patient.source}</span></td>
                    <td>${actionButtons}</td>
                `;
                tableBody.appendChild(row);
            });

            // Attach event listeners only for manual patient buttons
            document.querySelectorAll('.edit-patient-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const patientId = this.getAttribute('data-id');
                    editManualPatient(patientId);
                });
            });
            document.querySelectorAll('.delete-patient-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const patientId = this.getAttribute('data-id');
                    deleteManualPatient(patientId);
                });
            });
        }

        function updateStats() {
            const total = manualPatients.length + acceptedPatients.length;
            const active = manualPatients.filter(p => p.status === 'Active').length + acceptedPatients.length; // all accepted are considered active
            const pending = 0; // you can calculate if needed
            const newThisWeek = manualPatients.filter(p => {
                const lastVisit = new Date(p.lastVisit);
                const now = new Date();
                const diffTime = Math.abs(now - lastVisit);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 7;
            }).length + acceptedPatients.filter(p => {
                const apptDate = new Date(p.date);
                const now = new Date();
                const diffTime = Math.abs(now - apptDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 7;
            }).length;

            document.getElementById('totalPatients').textContent = total;
            document.getElementById('activePatients').textContent = active;
            document.getElementById('pendingAppointments').textContent = pending;
            document.getElementById('newPatients').textContent = newThisWeek;
        }

        // ========== CRUD for MANUAL patients (unchanged) ==========
        function saveManualPatient() {
            const name = document.getElementById('patientName').value.trim();
            const age = parseInt(document.getElementById('patientAge').value);
            const gender = document.getElementById('patientGender').value;
            const bloodGroup = document.getElementById('patientBloodGroup').value;
            const email = document.getElementById('patientEmail').value.trim();
            const phone = document.getElementById('patientPhone').value.trim();
            const address = document.getElementById('patientAddress').value.trim();
            const status = document.getElementById('patientStatus').value;
            const medicalHistory = document.getElementById('patientMedicalHistory').value.trim();

            if (!name || isNaN(age) || !gender || !phone || !status) {
                showNotification('Please fill in all required fields', 'warning');
                return;
            }

            const patientId = `P-${String(manualPatients.length + 1).padStart(3, '0')}`;

            const newPatient = {
                id: patientId,
                name: name,
                age: age,
                gender: gender,
                bloodGroup: bloodGroup || 'Not specified',
                contact: phone,
                email: email || 'Not provided',
                lastVisit: new Date().toISOString().split('T')[0],
                status: status,
                address: address || 'Not provided',
                medicalHistory: medicalHistory || 'No medical history',
                source: 'manual'
            };

            manualPatients.push(newPatient);
            saveManualPatientsToStorage();
            bootstrap.Modal.getInstance(document.getElementById('addPatientModal')).hide();
            renderCombinedTable();
            updateStats();
            showNotification('Patient added successfully!', 'success');
        }

        function editManualPatient(patientId) {
            const patient = manualPatients.find(p => p.id === patientId);
            if (!patient) return;

            currentEditPatientId = patientId;
            document.getElementById('patientModalTitle').textContent = 'Edit Patient';
            document.getElementById('savePatientBtn').textContent = 'Update Patient';

            document.getElementById('patientName').value = patient.name;
            document.getElementById('patientAge').value = patient.age;
            document.getElementById('patientGender').value = patient.gender;
            document.getElementById('patientBloodGroup').value = patient.bloodGroup;
            document.getElementById('patientEmail').value = patient.email;
            document.getElementById('patientPhone').value = patient.contact;
            document.getElementById('patientAddress').value = patient.address;
            document.getElementById('patientStatus').value = patient.status;
            document.getElementById('patientMedicalHistory').value = patient.medicalHistory;
            document.getElementById('patientId').value = patient.id;

            const modal = new bootstrap.Modal(document.getElementById('addPatientModal'));
            modal.show();
        }

        function updateManualPatient(patientId) {
            const patient = manualPatients.find(p => p.id === patientId);
            if (!patient) return;

            patient.name = document.getElementById('patientName').value.trim();
            patient.age = parseInt(document.getElementById('patientAge').value);
            patient.gender = document.getElementById('patientGender').value;
            patient.bloodGroup = document.getElementById('patientBloodGroup').value;
            patient.email = document.getElementById('patientEmail').value.trim();
            patient.contact = document.getElementById('patientPhone').value.trim();
            patient.address = document.getElementById('patientAddress').value.trim();
            patient.status = document.getElementById('patientStatus').value;
            patient.medicalHistory = document.getElementById('patientMedicalHistory').value.trim();
            patient.lastVisit = new Date().toISOString().split('T')[0];

            saveManualPatientsToStorage();
            bootstrap.Modal.getInstance(document.getElementById('addPatientModal')).hide();
            renderCombinedTable();
            updateStats();
            showNotification('Patient updated successfully!', 'success');

            currentEditPatientId = null;
        }

        function deleteManualPatient(patientId) {
            if (!confirm('Are you sure you want to delete this patient? This action cannot be undone.')) return;

            const index = manualPatients.findIndex(p => p.id === patientId);
            if (index === -1) return;

            const patientName = manualPatients[index].name;
            manualPatients.splice(index, 1);

            saveManualPatientsToStorage();
            renderCombinedTable();
            updateStats();
            showNotification(`Patient ${patientName} deleted successfully!`, 'success');
        }

        // ========== NOTIFICATION FUNCTION ==========
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
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 5000);
        }
        
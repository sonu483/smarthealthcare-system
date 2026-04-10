
        (function() {
            // ========== EMAILJS CONFIGURATION ==========
            const EMAILJS_PUBLIC_KEY = 'Cql3rpzoGiD0IkyZV';
            const EMAILJS_SERVICE_ID = 'service_bpin0sp';
            const EMAILJS_TEMPLATE_ID = 'desisonutemplate_fmyp5r3';
            
            // Doctor's email
            const DOCTOR_EMAIL = 'ksonukumar875746@gmail.com';
            
            // Initialize EmailJS
            emailjs.init(EMAILJS_PUBLIC_KEY);
            
            // Data storage
            let pendingRequests = [];      // जो doctor को देखने हैं
            let confirmedAppointments = []; // accepted appointments
            let allRequests = [];           // सभी requests का history
            
            // Doctors data
            let doctors = [
                { id: 'd1', name: 'Dr. Ananya Sharma', specialization: 'Cardiology', email: DOCTOR_EMAIL, phone: '8757463157', hospital: 'City Heart Institute', status: 'active', fee: 1200 },
                { id: 'd2', name: 'Dr. Rajesh Kumar', specialization: 'Pediatrics', email: DOCTOR_EMAIL, phone: '8757463157', hospital: 'Children Care', status: 'active', fee: 900 },
                { id: 'd3', name: 'Dr. Meera Nair', specialization: 'Pulmonology', email: DOCTOR_EMAIL, phone: '8757463157', hospital: 'National Chest', status: 'active', fee: 1500 },
                { id: 'd4', name: 'Dr. Vikram Seth', specialization: 'General', email: DOCTOR_EMAIL, phone: '8757463157', hospital: 'Seth Family Clinic', status: 'active', fee: 600 },
                { id: 'd5', name: 'Dr. Priya Kapoor', specialization: 'General', email: DOCTOR_EMAIL, phone: '8757463157', hospital: 'City General', status: 'active', fee: 700 },
            ];

            // Update all stats
            function updateStats() {
                document.getElementById('totalDoctors').innerText = doctors.length;
                document.getElementById('activeDoctors').innerText = doctors.filter(d => d.status === 'active').length;
                document.getElementById('inboxCountBadge').innerText = pendingRequests.length;
                document.getElementById('confirmedCountBadge').innerText = confirmedAppointments.length;
                document.getElementById('historyCountBadge').innerText = allRequests.length;
                document.getElementById('totalAppointments').innerText = 212 + confirmedAppointments.length;
            }

            // Render doctors grid
            function renderGrid(filtered = doctors) {
                const grid = document.getElementById('doctorsGrid');
                grid.innerHTML = '';
                filtered.forEach(d => {
                    const statusClass = d.status === 'active' ? 'success' : (d.status === 'on leave' ? 'warning' : 'secondary');
                    grid.innerHTML += `
                        <div class="col-md-6 col-xl-4 mb-4">
                            <div class="card doctor-card p-3">
                                <div class="d-flex align-items-start justify-content-between">
                                    <div>
                                        <h5 class="fw-bold mb-1">${d.name}</h5>
                                        <span class="badge specialty-badge">${d.specialization}</span> 
                                        <span class="badge bg-${statusClass}">${d.status}</span>
                                    </div>
                                    <span class="fee-chip"><i class="fas fa-rupee-sign me-1"></i>${d.fee}</span>
                                </div>
                                <div class="mt-2 d-flex align-items-center">
                                    <i class="fas fa-hospital me-1 text-secondary"></i>
                                    <span class="small me-3">${d.hospital}</span>
                                </div>
                                <hr>
                                <div class="d-flex justify-content-between">
                                    <span><i class="fas fa-phone-alt me-1 text-primary"></i>${d.phone}</span>
                                    <button class="btn btn-sm btn-outline-primary btn-view view-detail-btn" data-id="${d.id}">
                                        <i class="fas fa-eye me-1"></i>View
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                document.querySelectorAll('.view-detail-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const doctor = doctors.find(d => d.id === this.dataset.id);
                        if (doctor) showDetail(doctor);
                    });
                });
            }

            // Show doctor detail
            function showDetail(doctor) {
                const modal = new bootstrap.Modal(document.getElementById('doctorDetailModal'));
                document.getElementById('doctorDetailBody').innerHTML = `
                    <div class="row">
                        <div class="col-md-6"><span class="text-secondary">Name</span><p class="fw-bold">${doctor.name}</p></div>
                        <div class="col-md-6"><span class="text-secondary">Specialization</span><p>${doctor.specialization}</p></div>
                        <div class="col-md-6"><span class="text-secondary">Phone</span><p>${doctor.phone}</p></div>
                        <div class="col-md-6"><span class="text-secondary">Fee</span><p><i class="fas fa-rupee-sign"></i> ${doctor.fee}</p></div>
                        <div class="col-12"><span class="text-secondary">Hospital</span><p>${doctor.hospital}</p></div>
                        <div class="col-12"><span class="text-secondary">Doctor's Email</span><p><i class="fas fa-envelope me-1"></i>${doctor.email}</p></div>
                    </div>
                    <hr>
                    <button class="btn btn-success w-100" id="showBookingFromDetail">
                        <i class="fas fa-calendar-check me-2"></i>Request appointment via Email
                    </button>
                `;
                
                document.getElementById('detailDoctorName').innerText = doctor.name;
                document.getElementById('detailConfirmBtn').dataset.doctorId = doctor.id;
                document.getElementById('detailConfirmBtn').dataset.doctorName = doctor.name;
                document.getElementById('detailDoctorEmail').value = doctor.email;
                document.getElementById('detailBookingSection').style.display = 'none';
                modal.show();

                const showBookingBtn = document.getElementById('showBookingFromDetail');
                const newBtn = showBookingBtn.cloneNode(true);
                showBookingBtn.parentNode.replaceChild(newBtn, showBookingBtn);
                
                newBtn.addEventListener('click', function() {
                    document.getElementById('detailBookingSection').style.display = 'block';
                    this.style.display = 'none';
                });
                
                document.getElementById('detailCancelBtn').onclick = () => {
                    document.getElementById('detailBookingSection').style.display = 'none';
                    document.getElementById('showBookingFromDetail').style.display = 'block';
                };
            }

            // ========== SEND REQUEST EMAIL TO DOCTOR ==========
            document.getElementById('detailConfirmBtn').addEventListener('click', async function() {
                const doctorId = this.dataset.doctorId;
                const doctor = doctors.find(d => d.id === doctorId);
                if (!doctor) return;

                const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
                
                const requestData = {
                    id: requestId,
                    patientName: document.getElementById('detailPatientName').value || 'Patient',
                    patientPhone: document.getElementById('detailPatientPhone').value || '9876543210',
                    patientEmail: document.getElementById('detailPatientEmail').value || 'patient@gmail.com',
                    symptoms: document.getElementById('detailSymptoms').value || 'general',
                    date: document.getElementById('detailDate').value || new Date().toISOString().split('T')[0],
                    time: document.getElementById('detailTime').value || '10:30',
                    doctorId: doctor.id,
                    doctorName: doctor.name,
                    doctorEmail: doctor.email,
                    status: 'pending',
                    timestamp: new Date().toLocaleString()
                };

                // Show loading
                const btn = this;
                const btnText = btn.querySelector('.btn-text');
                const spinner = document.getElementById('emailSpinner');
                btn.disabled = true;
                btnText.textContent = 'भेज रहा है...';
                spinner.classList.remove('d-none');

                try {
                    // Email to doctor
                    const templateParams = {
                        to_email: doctor.email,
                        to_name: doctor.name,
                        patient_name: requestData.patientName,
                        patient_email: requestData.patientEmail,
                        patient_phone: requestData.patientPhone,
                        doctor_name: doctor.name,
                        symptoms: requestData.symptoms,
                        appointment_date: requestData.date,
                        appointment_time: requestData.time,
                        hospital: doctor.hospital,
                        request_id: requestId,
                        message: `नया अपॉइंटमेंट अनुरोध\n\nमरीज: ${requestData.patientName}\nफोन: ${requestData.patientPhone}\nईमेल: ${requestData.patientEmail}\nडॉक्टर: ${doctor.name}\nतारीख: ${requestData.date}\nसमय: ${requestData.time}\nलक्षण: ${requestData.symptoms}\n\nअनुरोध ID: ${requestId}`
                    };

                    // Send email to doctor
                    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
                    
                    // Add to pending and history
                    pendingRequests.push(requestData);
                    allRequests.push({...requestData, status: 'pending'});
                    
                    // Hide detail modal
                    bootstrap.Modal.getInstance(document.getElementById('doctorDetailModal')).hide();
                    
                    // Show success
                    showNotification('✅ Request sent to doctor!', 'success');
                    
                    // Update UI
                    updateStats();
                    
                } catch (error) {
                    console.error('Error:', error);
                    showNotification('❌ Error sending request: ' + error.text, 'error');
                } finally {
                    btn.disabled = false;
                    btnText.textContent = '📧 Send Request';
                    spinner.classList.add('d-none');
                }
            });

            // ========== ACCEPT REQUEST WITH PATIENT EMAIL ==========
            window.acceptRequest = async function(requestId) {
                const request = pendingRequests.find(r => r.id === requestId);
                if (!request) return;
                
                // Find and disable the accept button
                const acceptBtn = document.querySelector(`button[onclick="acceptRequest('${requestId}')"]`);
                if (acceptBtn) {
                    acceptBtn.disabled = true;
                    acceptBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Sending...';
                }

                try {
                    // Remove from pending
                    pendingRequests = pendingRequests.filter(r => r.id !== requestId);
                    
                    // Add to confirmed
                    const confirmed = {
                        ...request,
                        status: 'confirmed',
                        confirmedAt: new Date().toLocaleString()
                    };
                    confirmedAppointments.push(confirmed);
                    
                    // Update in history
                    const historyIndex = allRequests.findIndex(r => r.id === requestId);
                    if (historyIndex !== -1) {
                        allRequests[historyIndex].status = 'confirmed';
                        allRequests[historyIndex].confirmedAt = confirmed.confirmedAt;
                    }
                    
                    // SEND CONFIRMATION EMAIL TO PATIENT
                    await sendConfirmationEmail(request);
                    
                    // Show success modal
                    const successModal = new bootstrap.Modal(document.getElementById('clientSuccessModal'));
                    document.getElementById('successMessage').innerText = '✅ Appointment Confirmed!';
                    document.getElementById('successDetail').innerHTML = `
                        <strong>Patient:</strong> ${request.patientName}<br>
                        <strong>Doctor:</strong> Dr. ${request.doctorName}<br>
                        <strong>Date:</strong> ${request.date}<br>
                        <strong>Time:</strong> ${request.time}<br>
                        <strong>Confirmation sent to:</strong> ${request.patientEmail}
                    `;
                    successModal.show();
                    
                    // Update UI
                    updateStats();
                    
                    // Refresh inbox if open
                    if (document.getElementById('doctorInboxModal').classList.contains('show')) {
                        openDoctorInbox();
                    }
                    
                    showNotification(`✅ Appointment confirmed for ${request.patientName}. Email sent!`, 'accept');
                    
                } catch (error) {
                    console.error('Error in acceptRequest:', error);
                    showNotification('❌ Appointment confirmed but email failed to send', 'error');
                    
                    // Still add to confirmed even if email fails
                    if (!confirmedAppointments.find(c => c.id === requestId)) {
                        confirmedAppointments.push({
                            ...request,
                            status: 'confirmed',
                            confirmedAt: new Date().toLocaleString()
                        });
                    }
                } finally {
                    if (acceptBtn) {
                        acceptBtn.disabled = false;
                        acceptBtn.innerHTML = '<i class="fas fa-check-circle me-1"></i>Accept';
                    }
                }
            };

            // ========== SEND CONFIRMATION EMAIL TO PATIENT ==========
            async function sendConfirmationEmail(request) {
                try {
                    console.log('Sending confirmation email to patient:', request.patientEmail);
                    
                    // Template params for patient confirmation
                    const templateParams = {
                        to_email: request.patientEmail,
                        to_name: request.patientName,
                        patient_name: request.patientName,
                        doctor_name: request.doctorName,
                        doctor_email: DOCTOR_EMAIL,
                        appointment_date: request.date,
                        appointment_time: request.time,
                        symptoms: request.symptoms,
                        hospital: request.hospital || 'City Hospital',
                        message: `Your appointment with Dr. ${request.doctorName} has been CONFIRMED!\n\nAppointment Details:\nDate: ${request.date}\nTime: ${request.time}\nDoctor: ${request.doctorName}\n\nThank you for choosing PharmaChain.`,
                        subject: '✅ Your Appointment is Confirmed - PharmaChain',
                        status: 'confirmed',
                        // Add alternative field names for template compatibility
                        to_mail: request.patientEmail,
                        reply_to: DOCTOR_EMAIL,
                        from_name: 'PharmaChain',
                        appointment_id: request.id
                    };
                    
                    // Send email using EmailJS
                    const response = await emailjs.send(
                        EMAILJS_SERVICE_ID, 
                        EMAILJS_TEMPLATE_ID, 
                        templateParams
                    );
                    
                    console.log('✅ Patient confirmation email sent successfully:', response);
                    
                    // Also send a copy to doctor for records
                    const doctorCopyParams = {
                        ...templateParams,
                        to_email: DOCTOR_EMAIL,
                        to_name: request.doctorName || 'Doctor',
                        message: `Appointment confirmed with ${request.patientName}\nDate: ${request.date}\nTime: ${request.time}\nPatient Email: ${request.patientEmail}\nPatient Phone: ${request.patientPhone}`
                    };
                    
                    // Send copy to doctor (optional - you can comment this out if not needed)
                    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, doctorCopyParams)
                        .then(() => console.log('Copy sent to doctor'))
                        .catch(err => console.log('Doctor copy not sent:', err));
                    
                    return true;
                    
                } catch (error) {
                    console.error('❌ Failed to send patient confirmation email:', error);
                    throw error;
                }
            }

            // ========== REJECT REQUEST ==========
            window.rejectRequest = function(requestId) {
                const request = pendingRequests.find(r => r.id === requestId);
                if (!request) return;
                
                pendingRequests = pendingRequests.filter(r => r.id !== requestId);
                
                // Update in history
                const historyIndex = allRequests.findIndex(r => r.id === requestId);
                if (historyIndex !== -1) {
                    allRequests[historyIndex].status = 'rejected';
                }
                
                updateStats();
                
                if (document.getElementById('doctorInboxModal').classList.contains('show')) {
                    openDoctorInbox();
                }
                
                showNotification('❌ Request rejected', 'info');
            };

            // ========== OPEN INBOX ==========
            function openDoctorInbox() {
                const modal = new bootstrap.Modal(document.getElementById('doctorInboxModal'));
                const container = document.getElementById('doctorInbox');
                
                if (pendingRequests.length === 0) {
                    container.innerHTML = '<div class="text-center p-5"><i class="fas fa-inbox fa-4x text-muted mb-3"></i><p class="text-muted">कोई पेंडिंग request नहीं</p></div>';
                } else {
                    let html = '';
                    pendingRequests.forEach(req => {
                        html += `
                            <div class="card mb-3 border-0 shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h6><i class="fas fa-user me-2 text-primary"></i>${req.patientName}</h6>
                                        <span class="status-badge status-pending">Pending</span>
                                    </div>
                                    <p class="mb-1"><strong>Phone:</strong> ${req.patientPhone}</p>
                                    <p class="mb-1"><strong>Email:</strong> ${req.patientEmail}</p>
                                    <p class="mb-1"><strong>Doctor:</strong> ${req.doctorName}</p>
                                    <p class="mb-1"><strong>Date/Time:</strong> ${req.date} at ${req.time}</p>
                                    <p class="mb-1"><strong>Symptoms:</strong> ${req.symptoms}</p>
                                    <p class="mb-2"><small class="text-muted">Requested: ${req.timestamp}</small></p>
                                    <hr>
                                    <div class="d-flex gap-2">
                                        <button class="btn btn-success btn-sm" onclick='acceptRequest("${req.id}")'>
                                            <i class="fas fa-check-circle me-1"></i>Accept
                                        </button>
                                        <button class="btn btn-danger btn-sm" onclick='rejectRequest("${req.id}")'>
                                            <i class="fas fa-times-circle me-1"></i>Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    container.innerHTML = html;
                }
                modal.show();
            }

            // ========== OPEN CONFIRMED ==========
            function openConfirmed() {
                const modal = new bootstrap.Modal(document.getElementById('confirmedModal'));
                const container = document.getElementById('confirmedList');
                
                if (confirmedAppointments.length === 0) {
                    container.innerHTML = '<div class="text-center p-5"><i class="fas fa-check-circle fa-4x text-muted mb-3"></i><p class="text-muted">कोई confirmed appointment नहीं</p></div>';
                } else {
                    let html = '';
                    confirmedAppointments.forEach(apt => {
                        html += `
                            <div class="card mb-2 border-success">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between">
                                        <h6><i class="fas fa-check-circle text-success me-2"></i>${apt.patientName}</h6>
                                        <span class="status-badge status-accepted">Confirmed</span>
                                    </div>
                                    <p class="mb-1">Dr. ${apt.doctorName} - ${apt.date} at ${apt.time}</p>
                                    <p class="mb-1"><small>Phone: ${apt.patientPhone}</small></p>
                                    <p class="mb-1"><small>Email: ${apt.patientEmail}</small></p>
                                    <small class="text-muted">Confirmed: ${apt.confirmedAt}</small>
                                </div>
                            </div>
                        `;
                    });
                    container.innerHTML = html;
                }
                modal.show();
            }

            // ========== OPEN HISTORY ==========
            function openHistory() {
                const modal = new bootstrap.Modal(document.getElementById('historyModal'));
                const container = document.getElementById('historyList');
                
                if (allRequests.length === 0) {
                    container.innerHTML = '<div class="text-center p-5"><i class="fas fa-history fa-4x text-muted mb-3"></i><p class="text-muted">कोई history नहीं</p></div>';
                } else {
                    let html = '';
                    allRequests.slice().reverse().forEach(req => {
                        const statusClass = req.status === 'confirmed' ? 'status-accepted' : (req.status === 'rejected' ? 'status-rejected' : 'status-pending');
                        const statusText = req.status === 'confirmed' ? 'Confirmed' : (req.status === 'rejected' ? 'Rejected' : 'Pending');
                        
                        html += `
                            <div class="card mb-2">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between">
                                        <h6>${req.patientName}</h6>
                                        <span class="status-badge ${statusClass}">${statusText}</span>
                                    </div>
                                    <p class="mb-1">Dr. ${req.doctorName} - ${req.date} at ${req.time}</p>
                                    <p class="mb-1"><small>Phone: ${req.patientPhone}</small></p>
                                    <p class="mb-1"><small>Email: ${req.patientEmail}</small></p>
                                    <small class="text-muted">${req.timestamp}</small>
                                </div>
                            </div>
                        `;
                    });
                    container.innerHTML = html;
                }
                modal.show();
            }

            // ========== TEST EMAIL FUNCTION ==========
            async function testEmailSystem() {
                showNotification('📧 Testing email system...', 'info');
                
                try {
                    const testParams = {
                        to_email: DOCTOR_EMAIL,
                        to_name: 'Test Doctor',
                        patient_name: 'Test Patient',
                        doctor_name: 'Dr. Test',
                        appointment_date: '2024-01-20',
                        appointment_time: '10:30',
                        message: 'This is a test email from PharmaChain',
                        subject: 'Test Email - PharmaChain',
                        patient_email: 'test@example.com'
                    };
                    
                    const response = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, testParams);
                    console.log('✅ Test email sent:', response);
                    showNotification('✅ Test email sent successfully!', 'success');
                } catch (error) {
                    console.error('❌ Test email failed:', error);
                    showNotification('❌ Test email failed: ' + (error.text || 'Unknown error'), 'error');
                }
            }

            // Button listeners
            document.getElementById('openInboxBtn').addEventListener('click', openDoctorInbox);
            document.getElementById('openConfirmedBtn').addEventListener('click', openConfirmed);
            document.getElementById('openHistoryBtn').addEventListener('click', openHistory);
            document.getElementById('testEmailBtn').addEventListener('click', testEmailSystem);

            // Search
            function performSearch() {
                const q = document.getElementById('globalSearchInput').value.toLowerCase();
                if (!q) renderGrid(doctors);
                else renderGrid(doctors.filter(d => d.name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q)));
            }
            
            document.getElementById('globalSearchGo').addEventListener('click', performSearch);
            document.getElementById('toggleSearchBtn').addEventListener('click', function() {
                document.getElementById('globalSearchRow').classList.toggle('d-none');
            });

            // Specialty modal
            document.querySelectorAll('.specialty-choose').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.getElementById('globalSearchInput').value = this.dataset.specialty;
                    performSearch();
                    bootstrap.Modal.getInstance(document.getElementById('bookingSpecialtyModal')).hide();
                });
            });

            // Add doctor
            document.getElementById('saveDoctorBtn').addEventListener('click', function() {
                doctors.push({
                    id: 'd'+Date.now(),
                    name: document.getElementById('doctorName').value || 'Dr. New',
                    specialization: document.getElementById('doctorSpecialization').value || 'General',
                    phone: document.getElementById('doctorPhone').value || '8757463157',
                    email: document.getElementById('doctorEmail').value || DOCTOR_EMAIL,
                    hospital: 'New Clinic',
                    status: 'active',
                    fee: 700
                });
                renderGrid();
                updateStats();
                bootstrap.Modal.getInstance(document.getElementById('doctorModal')).hide();
                showNotification('✅ डॉक्टर जोड़ा गया', 'success');
            });

            // Notification helper
            function showNotification(msg, type) {
                const container = document.getElementById('notificationContainer');
                const toast = document.createElement('div');
                
                let icon = 'fa-bell';
                let color = '#0d6efd';
                
                if (type === 'success' || type === 'accept') {
                    icon = 'fa-check-circle';
                    color = '#198754';
                } else if (type === 'error') {
                    icon = 'fa-exclamation-circle';
                    color = '#dc3545';
                } else if (type === 'info') {
                    icon = 'fa-info-circle';
                    color = '#0dcaf0';
                }
                
                toast.className = 'notif-toast';
                if (type === 'accept') toast.classList.add('accepted');
                toast.style.borderLeftColor = color;
                toast.innerHTML = `<i class="fas ${icon}" style="color: ${color}"></i><span>${msg}</span>`;
                
                container.appendChild(toast);
                setTimeout(() => toast.remove(), 5000);
            }

            // Set today's date
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('detailDate').value = today;

            // Add hidden email field for doctor
            const detailModal = document.getElementById('doctorDetailModal');
            const hiddenEmail = document.createElement('input');
            hiddenEmail.type = 'hidden';
            hiddenEmail.id = 'detailDoctorEmail';
            detailModal.appendChild(hiddenEmail);

            // Initial render
            renderGrid();
            updateStats();
            
            // Add sample data for testing
            setTimeout(() => {
                if (pendingRequests.length === 0) {
                    // Add sample pending request
                    const sampleRequest = {
                        id: 'sample_1',
                        patientName: 'Sample Patient',
                        patientPhone: '9876543210',
                        patientEmail: 'sample@gmail.com',
                        symptoms: 'fever',
                        date: '2024-01-20',
                        time: '11:00',
                        doctorName: 'Dr. Ananya Sharma',
                        doctorId: 'd1',
                        doctorEmail: DOCTOR_EMAIL,
                        status: 'pending',
                        timestamp: new Date().toLocaleString()
                    };
                    pendingRequests.push(sampleRequest);
                    allRequests.push({...sampleRequest});
                    
                    // Add another sample
                    const sampleRequest2 = {
                        id: 'sample_2',
                        patientName: 'John Doe',
                        patientPhone: '1234567890',
                        patientEmail: 'john@example.com',
                        symptoms: 'headache',
                        date: '2024-01-21',
                        time: '14:30',
                        doctorName: 'Dr. Rajesh Kumar',
                        doctorId: 'd2',
                        doctorEmail: DOCTOR_EMAIL,
                        status: 'pending',
                        timestamp: new Date().toLocaleString()
                    };
                    pendingRequests.push(sampleRequest2);
                    allRequests.push({...sampleRequest2});
                    
                    updateStats();
                    console.log('Sample data added for testing');
                }
            }, 1000);
        })();
// PharmaChain - Main JavaScript File

// ==================== GLOBAL VARIABLES ====================
let currentUser = null;
let isAuthenticated = false;
let walletConnected = false;
let walletAddress = null;
let walletNetwork = null;

// Demo data
const demoData = {
    doctors: [
        { id: 1, name: 'Dr. John Smith', specialty: 'Cardiology', email: 'john.smith@hospital.com', phone: '+1 (555) 123-4567', status: 'active' },
        { id: 2, name: 'Dr. Sarah Johnson', specialty: 'Neurology', email: 'sarah.j@hospital.com', phone: '+1 (555) 234-5678', status: 'active' },
        { id: 3, name: 'Dr. Michael Chen', specialty: 'Pediatrics', email: 'm.chen@hospital.com', phone: '+1 (555) 345-6789', status: 'onleave' },
        { id: 4, name: 'Dr. Emily Wilson', specialty: 'Orthopedics', email: 'e.wilson@hospital.com', phone: '+1 (555) 456-7890', status: 'active' }
    ],
    medicines: [
        { id: 1, name: 'Aspirin 100mg', category: 'Pain Relief', price: 12.99, stock: 250, status: 'in-stock' },
        { id: 2, name: 'Amoxicillin 500mg', category: 'Antibiotic', price: 24.99, stock: 15, status: 'low-stock' },
        { id: 3, name: 'Insulin Glargine', category: 'Diabetes', price: 45.99, stock: 80, status: 'in-stock' },
        { id: 4, name: 'Paracetamol 500mg', category: 'Pain Relief', price: 8.99, stock: 120, status: 'in-stock' },
        { id: 5, name: 'Metformin 500mg', category: 'Diabetes', price: 15.99, stock: 8, status: 'critical' },
        { id: 6, name: 'Lisinopril 10mg', category: 'Blood Pressure', price: 22.99, stock: 22, status: 'low-stock' }
    ],
    orders: [
        { id: 'ORD-001', customer: 'John Smith', date: '2023-08-10', amount: 245.99, status: 'pending' },
        { id: 'ORD-002', customer: 'Sarah Johnson', date: '2023-08-09', amount: 128.50, status: 'approved' },
        { id: 'ORD-003', customer: 'Mike Brown', date: '2023-08-08', amount: 89.99, status: 'delivered' },
        { id: 'ORD-004', customer: 'Emily Davis', date: '2023-08-07', amount: 345.00, status: 'cancelled' },
        { id: 'ORD-005', customer: 'Robert Wilson', date: '2023-08-06', amount: 76.50, status: 'pending' }
    ],
    patients: [
        { id: 'P-001', name: 'John Doe', age: 45, gender: 'Male', phone: '+1 (555) 123-4567', lastVisit: '2023-08-10', status: 'active' },
        { id: 'P-002', name: 'Sarah Johnson', age: 32, gender: 'Female', phone: '+1 (555) 234-5678', lastVisit: '2023-08-09', status: 'active' },
        { id: 'P-003', name: 'Mike Brown', age: 58, gender: 'Male', phone: '+1 (555) 345-6789', lastVisit: '2023-08-08', status: 'inactive' },
        { id: 'P-004', name: 'Emily Davis', age: 27, gender: 'Female', phone: '+1 (555) 456-7890', lastVisit: '2023-08-07', status: 'active' },
        { id: 'P-005', name: 'Robert Wilson', age: 63, gender: 'Male', phone: '+1 (555) 567-8901', lastVisit: '2023-08-06', status: 'active' }
    ]
};

// ==================== DOM ELEMENTS ====================
const dom = {
    // Auth elements
    authPage: document.getElementById('authPage'),
    mainApp: document.getElementById('mainApp'),
    loginFormContainer: document.getElementById('loginFormContainer'),
    registerFormContainer: document.getElementById('registerFormContainer'),
    registrationSuccess: document.getElementById('registrationSuccess'),
    forgotPasswordContainer: document.getElementById('forgotPasswordContainer'),
    
    // Forms
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    forgotPasswordForm: document.getElementById('forgotPasswordForm'),
    
    // Buttons
    demoLogin: document.getElementById('demoLogin'),
    logoutBtn: document.getElementById('logoutBtn'),
    showRegisterLink: document.getElementById('showRegisterLink'),
    showLoginLink: document.getElementById('showLoginLink'),
    showLoginFromForgot: document.getElementById('showLoginFromForgot'),
    forgotPasswordLink: document.getElementById('forgotPasswordLink'),
    goToLoginAfterRegister: document.getElementById('goToLoginAfterRegister'),
    
    // Wallet buttons
    connectWalletBtn: document.getElementById('connectWalletBtn'),
    connectBtn: document.getElementById('connectBtn'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    
    // Verify button
    verifyBtn: document.getElementById('verifyBtn'),
    packageInput: document.getElementById('packageInput'),
    verificationResult: document.getElementById('verificationResult'),
    
    // User elements
    currentUser: document.getElementById('currentUser'),
    userRoleBadge: document.getElementById('userRoleBadge'),
    
    // Profile elements
    profileName: document.getElementById('profileName'),
    profileRole: document.getElementById('profileRole'),
    profileCompany: document.getElementById('profileCompany'),
    profileFullName: document.getElementById('profileFullName'),
    profileEmail: document.getElementById('profileEmail'),
    profilePhone: document.getElementById('profilePhone'),
    profileAccountType: document.getElementById('profileAccountType'),
    profileMemberSince: document.getElementById('profileMemberSince'),
    profileLastLogin: document.getElementById('profileLastLogin'),
    
    // Current year
    currentYear: document.getElementById('currentYear'),
    
    // Sidebar
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    mobileSidebarToggle: document.getElementById('mobileSidebarToggle'),
    mainContent: document.getElementById('mainContent'),
    
    // Navigation
    menuItems: document.querySelectorAll('.menu-item'),
    pages: document.querySelectorAll('.page'),
    
    // Notification container
    notificationContainer: document.getElementById('notificationContainer')
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('PharmaChain platform initialized');
    
    // Set current year in footer
    if (dom.currentYear) {
        dom.currentYear.textContent = new Date().getFullYear();
    }
    
    // Initialize all event listeners
    initEventListeners();
    
    // Initialize password strength checker
    initPasswordStrengthChecker();
    
    // Initialize user role selection
    initUserRoleSelection();
    
    // Check if Chart.js is available and initialize chart
    if (typeof Chart !== 'undefined') {
        initSalesChart();
    }
});

// ==================== EVENT LISTENERS ====================
function initEventListeners() {
    // Auth navigation
    if (dom.showRegisterLink) {
        dom.showRegisterLink.addEventListener('click', showRegisterForm);
    }
    
    if (dom.showLoginLink) {
        dom.showLoginLink.addEventListener('click', showLoginForm);
    }
    
    if (dom.showLoginFromForgot) {
        dom.showLoginFromForgot.addEventListener('click', showLoginForm);
    }
    
    if (dom.forgotPasswordLink) {
        dom.forgotPasswordLink.addEventListener('click', showForgotPasswordForm);
    }
    
    if (dom.goToLoginAfterRegister) {
        dom.goToLoginAfterRegister.addEventListener('click', showLoginForm);
    }
    
    // Login form
    if (dom.loginForm) {
        dom.loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register form
    if (dom.registerForm) {
        dom.registerForm.addEventListener('submit', handleRegister);
    }
    
    // Forgot password form
    if (dom.forgotPasswordForm) {
        dom.forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
    
    // Demo login
    if (dom.demoLogin) {
        dom.demoLogin.addEventListener('click', handleDemoLogin);
    }
    
    // Logout
    if (dom.logoutBtn) {
        dom.logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Password toggle buttons
    initPasswordToggles();
    
    // Wallet connections
    if (dom.connectWalletBtn) {
        dom.connectWalletBtn.addEventListener('click', connectWallet);
    }
    
    if (dom.connectBtn) {
        dom.connectBtn.addEventListener('click', connectWallet);
    }
    
    if (dom.disconnectBtn) {
        dom.disconnectBtn.addEventListener('click', disconnectWallet);
    }
    
    // Verify button
    if (dom.verifyBtn) {
        dom.verifyBtn.addEventListener('click', verifyPackage);
    }
    
    // Sidebar toggle
    if (dom.sidebarToggle) {
        dom.sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    if (dom.mobileSidebarToggle) {
        dom.mobileSidebarToggle.addEventListener('click', toggleMobileSidebar);
    }
    
    // Page navigation
    initPageNavigation();
    
    // Nav profile link
    const navProfile = document.getElementById('navProfile');
    if (navProfile) {
        navProfile.addEventListener('click', function(e) {
            e.preventDefault();
            navigateToPage('profilePage');
        });
    }
    
    // Nav settings link
    const navSettings = document.getElementById('navSettings');
    if (navSettings) {
        navSettings.addEventListener('click', function(e) {
            e.preventDefault();
            navigateToPage('settingsPage');
        });
    }
    
    // Nav home link
    const navHome = document.getElementById('navHome');
    if (navHome) {
        navHome.addEventListener('click', function(e) {
            e.preventDefault();
            navigateToPage('dashboardPage');
        });
    }
    
    // Go to demo link
    const goToDemo = document.getElementById('goToDemo');
    if (goToDemo) {
        goToDemo.addEventListener('click', function(e) {
            e.preventDefault();
            navigateToPage('trackingPage');
        });
    }
    
    // Save settings button
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function() {
            showNotification('Settings saved successfully!', 'success');
        });
    }
    
    // Back to profile button
    const backToProfileBtn = document.getElementById('backToProfileBtn');
    if (backToProfileBtn) {
        backToProfileBtn.addEventListener('click', function(e) {
            e.preventDefault();
            navigateToPage('profilePage');
        });
    }
}

// ==================== AUTH FUNCTIONS ====================
function showRegisterForm(e) {
    e.preventDefault();
    dom.loginFormContainer.style.display = 'none';
    dom.registerFormContainer.style.display = 'block';
    dom.forgotPasswordContainer.style.display = 'none';
    dom.registrationSuccess.style.display = 'none';
}

function showLoginForm(e) {
    e.preventDefault();
    dom.loginFormContainer.style.display = 'block';
    dom.registerFormContainer.style.display = 'none';
    dom.forgotPasswordContainer.style.display = 'none';
    dom.registrationSuccess.style.display = 'none';
}

function showForgotPasswordForm(e) {
    e.preventDefault();
    dom.loginFormContainer.style.display = 'none';
    dom.registerFormContainer.style.display = 'none';
    dom.forgotPasswordContainer.style.display = 'block';
    dom.registrationSuccess.style.display = 'none';
}

function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginUserRole').value;
    
    // Show spinner
    document.getElementById('loginSpinner').style.display = 'inline-block';
    document.getElementById('loginText').textContent = 'Logging in...';
    
    // Simulate API call
    setTimeout(() => {
        // Hide spinner
        document.getElementById('loginSpinner').style.display = 'none';
        document.getElementById('loginText').textContent = 'Login to Platform';
        
        // Demo login - always successful
        isAuthenticated = true;
        currentUser = {
            name: 'John Doe',
            email: email,
            role: role,
            company: 'MedCo Pharmaceuticals',
            phone: '+1 (555) 123-4567',
            memberSince: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            lastLogin: 'Just now'
        };
        
        // Hide auth page, show main app
        dom.authPage.style.display = 'none';
        dom.mainApp.style.display = 'block';
        
        // Update UI with user info
        updateUserInterface();
        
        showNotification('Login successful! Welcome to PharmaChain.', 'success');
    }, 1500);
}

function handleRegister(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('registerEmail').value;
    const company = document.getElementById('company').value;
    const phone = document.getElementById('phone').value;
    const role = document.getElementById('registerUserRole').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showError('registerError', 'registerErrorMessage', 'Passwords do not match!');
        return;
    }
    
    // Show spinner
    document.getElementById('registerSpinner').style.display = 'inline-block';
    document.getElementById('registerText').textContent = 'Creating Account...';
    
    // Simulate API call
    setTimeout(() => {
        // Hide spinner
        document.getElementById('registerSpinner').style.display = 'none';
        document.getElementById('registerText').textContent = 'Create Account';
        
        // Hide register form, show success
        dom.registerFormContainer.style.display = 'none';
        dom.registrationSuccess.style.display = 'block';
        
        // Reset form
        document.getElementById('registerForm').reset();
    }, 2000);
}

function handleDemoLogin(e) {
    e.preventDefault();
    
    // Demo login
    isAuthenticated = true;
    currentUser = {
        name: 'Demo User',
        email: 'demo@pharmachain.example',
        role: 'manufacturer',
        company: 'PharmaChain Demo',
        phone: '+1 (555) 987-6543',
        memberSince: 'January 15, 2024',
        lastLogin: 'Just now'
    };
    
    // Hide auth page, show main app
    dom.authPage.style.display = 'none';
    dom.mainApp.style.display = 'block';
    
    // Update UI with user info
    updateUserInterface();
    
    showNotification('Demo access granted! Explore the platform.', 'info');
}

function handleLogout(e) {
    e.preventDefault();
    
    // Reset auth state
    isAuthenticated = false;
    currentUser = null;
    
    // Hide main app, show auth page
    dom.mainApp.style.display = 'none';
    dom.authPage.style.display = 'flex';
    
    // Show login form
    showLoginForm(e);
    
    showNotification('Logged out successfully.', 'info');
}

function updateUserInterface() {
    if (!currentUser) return;
    
    // Update user name in navbar
    if (dom.currentUser) {
        dom.currentUser.textContent = currentUser.name.split(' ')[0];
    }
    
    // Update role badge
    if (dom.userRoleBadge) {
        let roleText = '';
        switch(currentUser.role) {
            case 'manufacturer': roleText = 'Manufacturer'; break;
            case 'distributor': roleText = 'Distributor'; break;
            case 'pharmacy': roleText = 'Pharmacy'; break;
            case 'patient': roleText = 'Patient'; break;
            case 'regulator': roleText = 'Regulator'; break;
            case 'auditor': roleText = 'Auditor'; break;
            default: roleText = 'Manufacturer';
        }
        dom.userRoleBadge.textContent = roleText;
    }
    
    // Update profile page
    if (dom.profileName) dom.profileName.textContent = currentUser.name;
    if (dom.profileRole) dom.profileRole.textContent = getRoleDisplayName(currentUser.role);
    if (dom.profileCompany) dom.profileCompany.textContent = currentUser.company || 'Not specified';
    if (dom.profileFullName) dom.profileFullName.textContent = currentUser.name;
    if (dom.profileEmail) dom.profileEmail.textContent = currentUser.email;
    if (dom.profilePhone) dom.profilePhone.textContent = currentUser.phone || 'Not provided';
    if (dom.profileAccountType) dom.profileAccountType.textContent = getRoleDisplayName(currentUser.role);
    if (dom.profileMemberSince) dom.profileMemberSince.textContent = currentUser.memberSince || 'Today';
    if (dom.profileLastLogin) dom.profileLastLogin.textContent = currentUser.lastLogin || 'Just now';
}

function getRoleDisplayName(role) {
    const roles = {
        'manufacturer': 'Manufacturer',
        'distributor': 'Distributor',
        'pharmacy': 'Pharmacy',
        'patient': 'Patient',
        'regulator': 'Regulator',
        'auditor': 'Auditor'
    };
    return roles[role] || role;
}

// ==================== PASSWORD FUNCTIONS ====================
function initPasswordStrengthChecker() {
    const passwordInput = document.getElementById('registerPassword');
    if (!passwordInput) return;
    
    passwordInput.addEventListener('input', function() {
        const strength = calculatePasswordStrength(this.value);
        updatePasswordStrengthIndicator(strength);
    });
}

function calculatePasswordStrength(password) {
    if (!password) return 0;
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    
    return Math.min(score, 4);
}

function updatePasswordStrengthIndicator(score) {
    const strengthBar = document.getElementById('passwordStrength');
    if (!strengthBar) return;
    
    strengthBar.className = 'password-strength mt-2';
    
    switch(score) {
        case 0:
        case 1:
            strengthBar.classList.add('strength-weak');
            break;
        case 2:
            strengthBar.classList.add('strength-fair');
            break;
        case 3:
            strengthBar.classList.add('strength-good');
            break;
        case 4:
            strengthBar.classList.add('strength-strong');
            break;
    }
}

function initPasswordToggles() {
    // Toggle login password
    const toggleLogin = document.getElementById('toggleLoginPassword');
    if (toggleLogin) {
        toggleLogin.addEventListener('click', function() {
            const passwordInput = document.getElementById('loginPassword');
            togglePasswordVisibility(passwordInput, this);
        });
    }
    
    // Toggle register password
    const toggleRegister = document.getElementById('toggleRegisterPassword');
    if (toggleRegister) {
        toggleRegister.addEventListener('click', function() {
            const passwordInput = document.getElementById('registerPassword');
            togglePasswordVisibility(passwordInput, this);
        });
    }
    
    // Toggle confirm password
    const toggleConfirm = document.getElementById('toggleConfirmPassword');
    if (toggleConfirm) {
        toggleConfirm.addEventListener('click', function() {
            const passwordInput = document.getElementById('confirmPassword');
            togglePasswordVisibility(passwordInput, this);
        });
    }
}

function togglePasswordVisibility(input, button) {
    if (input.type === 'password') {
        input.type = 'text';
        button.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        input.type = 'password';
        button.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

// ==================== USER ROLE SELECTION ====================
function initUserRoleSelection() {
    const roleCards = document.querySelectorAll('.user-role');
    const loginUserRole = document.getElementById('loginUserRole');
    
    roleCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove active class from all cards
            roleCards.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked card
            this.classList.add('active');
            
            // Update hidden input
            const role = this.getAttribute('data-role');
            if (loginUserRole) {
                loginUserRole.value = role;
            }
        });
    });
    
    // Set default active
    if (roleCards.length > 0) {
        roleCards[0].classList.add('active');
    }
}

// ==================== WALLET FUNCTIONS ====================
function connectWallet() {
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
        // Show loading state
        dom.connectBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Connecting...';
        
        // Request account access
        window.ethereum.request({ method: 'eth_requestAccounts' })
            .then(handleAccountsChanged)
            .catch((error) => {
                console.error('User denied account access');
                showNotification('Failed to connect wallet: ' + error.message, 'danger');
                dom.connectBtn.innerHTML = '<i class="fab fa-metamask me-2"></i>Connect MetaMask';
            });
    } else {
        showNotification('MetaMask is not installed. Please install MetaMask to use this feature.', 'warning');
        window.open('https://metamask.io/download.html', '_blank');
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // MetaMask is locked or no accounts
        walletConnected = false;
        walletAddress = null;
        updateWalletUI();
        showNotification('Please unlock MetaMask and connect.', 'warning');
    } else {
        walletConnected = true;
        walletAddress = accounts[0];
        
        // Get network
        window.ethereum.request({ method: 'net_version' })
            .then(networkId => {
                walletNetwork = getNetworkName(networkId);
                updateWalletUI();
                showNotification('Wallet connected successfully!', 'success');
            });
    }
}

function getNetworkName(networkId) {
    const networks = {
        '1': 'Ethereum Mainnet',
        '3': 'Ropsten Testnet',
        '4': 'Rinkeby Testnet',
        '5': 'Goerli Testnet',
        '42': 'Kovan Testnet',
        '56': 'Binance Smart Chain',
        '97': 'BSC Testnet',
        '137': 'Polygon Mainnet',
        '80001': 'Mumbai Testnet'
    };
    return networks[networkId] || `Network ID: ${networkId}`;
}

function disconnectWallet() {
    walletConnected = false;
    walletAddress = null;
    walletNetwork = null;
    updateWalletUI();
    showNotification('Wallet disconnected.', 'info');
}

function updateWalletUI() {
    const walletStatus = document.getElementById('walletStatus');
    const walletAddressEl = document.getElementById('walletAddress');
    const walletNetworkEl = document.getElementById('walletNetwork');
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    
    if (walletConnected) {
        if (walletStatus) walletStatus.textContent = 'Status: Connected';
        if (walletAddressEl) walletAddressEl.textContent = `Address: ${shortenAddress(walletAddress)}`;
        if (walletNetworkEl) walletNetworkEl.textContent = `Network: ${walletNetwork || 'Unknown'}`;
        if (connectBtn) {
            connectBtn.innerHTML = '<i class="fab fa-metamask me-2"></i>Connected';
            connectBtn.classList.add('btn-success');
            connectBtn.classList.remove('btn-outline-success');
        }
        if (disconnectBtn) disconnectBtn.disabled = false;
    } else {
        if (walletStatus) walletStatus.textContent = 'Status: Not connected';
        if (walletAddressEl) walletAddressEl.textContent = '';
        if (walletNetworkEl) walletNetworkEl.textContent = '';
        if (connectBtn) {
            connectBtn.innerHTML = '<i class="fab fa-metamask me-2"></i>Connect MetaMask';
            connectBtn.classList.remove('btn-success');
            connectBtn.classList.add('btn-outline-success');
        }
        if (disconnectBtn) disconnectBtn.disabled = true;
    }
}

function shortenAddress(address) {
    if (!address) return '';
    return address.substring(0, 6) + '...' + address.substring(address.length - 4);
}

// ==================== VERIFICATION FUNCTIONS ====================
function verifyPackage() {
    const packageId = dom.packageInput ? dom.packageInput.value : 'PC-2025-08-A1B2C3';
    
    if (!packageId) {
        showNotification('Please enter a package ID', 'warning');
        return;
    }
    
    // Show loading
    if (dom.verificationResult) {
        dom.verificationResult.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Verifying package...</p></div>';
    }
    
    // Simulate blockchain verification
    setTimeout(() => {
        const isGenuine = Math.random() > 0.2; // 80% chance of being genuine
        
        if (isGenuine) {
            dom.verificationResult.innerHTML = `
                <div class="alert alert-success">
                    <h5><i class="fas fa-check-circle me-2"></i>Verified - Genuine Product</h5>
                    <p>Package ID: <strong>${packageId}</strong></p>
                    <hr>
                    <p class="mb-0">Manufacturer: MedCo Pharmaceuticals</p>
                    <p class="mb-0">Manufacturing Date: 2025-08-01</p>
                    <p class="mb-0">Expiry Date: 2027-07-31</p>
                    <p class="mb-0">Blockchain TX: 0x8a3f...c2d1</p>
                </div>
            `;
            showNotification('Package verified as genuine!', 'success');
        } else {
            dom.verificationResult.innerHTML = `
                <div class="alert alert-danger">
                    <h5><i class="fas fa-exclamation-triangle me-2"></i>Alert - Counterfeit Detected!</h5>
                    <p>Package ID: <strong>${packageId}</strong></p>
                    <hr>
                    <p class="mb-0">This package does not exist in our blockchain records.</p>
                    <p class="mb-0">Please contact your supplier immediately.</p>
                </div>
            `;
            showNotification('Warning: Counterfeit package detected!', 'danger');
        }
    }, 2000);
}

// ==================== SIDEBAR FUNCTIONS ====================
function toggleSidebar() {
    if (dom.sidebar) {
        dom.sidebar.classList.toggle('collapsed');
        dom.mainContent.classList.toggle('expanded');
        
        const toggleIcon = dom.sidebarToggle.querySelector('i');
        if (dom.sidebar.classList.contains('collapsed')) {
            toggleIcon.className = 'fas fa-chevron-right';
        } else {
            toggleIcon.className = 'fas fa-chevron-left';
        }
    }
}

function toggleMobileSidebar() {
    if (dom.sidebar) {
        dom.sidebar.classList.toggle('show');
    }
}

// ==================== PAGE NAVIGATION ====================
function initPageNavigation() {
    dom.menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            navigateToPage(pageId);
        });
    });
}

function navigateToPage(pageId) {
    // Remove active class from all pages and menu items
    dom.pages.forEach(page => {
        page.classList.remove('active');
    });
    
    dom.menuItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected page and menu item
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Find and activate the corresponding menu item
    dom.menuItems.forEach(item => {
        if (item.getAttribute('data-page') === pageId) {
            item.classList.add('active');
        }
    });
    
    // Close mobile sidebar if open
    if (window.innerWidth <= 768 && dom.sidebar) {
        dom.sidebar.classList.remove('show');
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// ==================== NOTIFICATION FUNCTIONS ====================
function showNotification(message, type = 'info') {
    if (!dom.notificationContainer) return;
    
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification alert-dismissible fade show`;
    notification.role = 'alert';
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    dom.notificationContainer.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle',
        'primary': 'bell'
    };
    return icons[type] || 'info-circle';
}

function showError(errorDivId, errorSpanId, message) {
    const errorDiv = document.getElementById(errorDivId);
    const errorSpan = document.getElementById(errorSpanId);
    
    if (errorDiv && errorSpan) {
        errorSpan.textContent = message;
        errorDiv.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// ==================== CHART FUNCTIONS ====================
function initSalesChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
            datasets: [{
                label: 'Sales ($)',
                data: [12000, 15000, 18000, 22000, 19000, 25000, 28000, 32000],
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                borderColor: '#0d6efd',
                borderWidth: 2,
                tension: 0.4,
                pointBackgroundColor: '#0d6efd',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ==================== FORGOT PASSWORD ====================
function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('resetEmail').value;
    
    // Show spinner
    document.getElementById('resetSpinner').style.display = 'inline-block';
    document.getElementById('resetText').textContent = 'Sending...';
    
    // Simulate API call
    setTimeout(() => {
        // Hide spinner
        document.getElementById('resetSpinner').style.display = 'none';
        document.getElementById('resetText').textContent = 'Send Reset Link';
        
        // Show success message
        const resetSuccess = document.getElementById('resetSuccess');
        const resetSuccessMessage = document.getElementById('resetSuccessMessage');
        
        if (resetSuccess && resetSuccessMessage) {
            resetSuccessMessage.textContent = `Password reset link has been sent to ${email}`;
            resetSuccess.style.display = 'block';
            
            // Hide after 5 seconds
            setTimeout(() => {
                resetSuccess.style.display = 'none';
            }, 5000);
        }
        
        // Clear input
        document.getElementById('resetEmail').value = '';
    }, 1500);
}

function loginUser() {
    let role = document.getElementById("loginUserRole").value;

    if (role === "manufacturer") {
        window.location.href = "../Dashboard/dashboard.html";
    }
    else if (role === "patient") {
        window.location.href = "../Patient/patient.html";
    }
    else if (role === "pharmacy") {
        window.location.href = "../Doctor/doctor.html";
    }
    else if (role === "distributor") {
        window.location.href = "../Hospital/hospital.html";
    }
}
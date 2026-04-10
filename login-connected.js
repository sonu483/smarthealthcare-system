const dom = {
    loginFormContainer: document.getElementById("loginFormContainer"),
    registerFormContainer: document.getElementById("registerFormContainer"),
    forgotPasswordContainer: document.getElementById("forgotPasswordContainer"),
    registrationSuccess: document.getElementById("registrationSuccess"),
    loginForm: document.getElementById("loginForm"),
    registerForm: document.getElementById("registerForm"),
    forgotPasswordForm: document.getElementById("forgotPasswordForm"),
    showRegisterLink: document.getElementById("showRegisterLink"),
    showLoginLink: document.getElementById("showLoginLink"),
    showLoginFromForgot: document.getElementById("showLoginFromForgot"),
    forgotPasswordLink: document.getElementById("forgotPasswordLink"),
    goToLoginAfterRegister: document.getElementById("goToLoginAfterRegister"),
    demoLogin: document.getElementById("demoLogin"),
    notificationContainer: document.getElementById("notificationContainer")
};

document.addEventListener("DOMContentLoaded", () => {
    if (PharmaChainApp.getSession()?.token) {
        window.location.href = "Dashboard/dashboard.html";
        return;
    }

    dom.showRegisterLink?.addEventListener("click", showRegisterForm);
    dom.showLoginLink?.addEventListener("click", showLoginForm);
    dom.showLoginFromForgot?.addEventListener("click", showLoginForm);
    dom.forgotPasswordLink?.addEventListener("click", showForgotPasswordForm);
    dom.goToLoginAfterRegister?.addEventListener("click", showLoginForm);
    dom.loginForm?.addEventListener("submit", handleLogin);
    dom.registerForm?.addEventListener("submit", handleRegister);
    dom.forgotPasswordForm?.addEventListener("submit", handleForgotPassword);
    dom.demoLogin?.addEventListener("click", handleDemoLogin);
    document.getElementById("adminLogin")?.addEventListener("click", handleAdminLogin);
    document.getElementById("doctorLogin")?.addEventListener("click", handleDoctorLogin);
    initRoleSelection();
    initPasswordToggles();

    const loginCard = document.querySelector(".auth-card .card-body");
    if (loginCard) {
        const hint = document.createElement("div");
        hint.className = "alert alert-info mt-3";
        hint.innerHTML = "<strong>Quick login:</strong> admin@pharmachain.com / admin123 ya doctor@pharmachain.com / doctor123 use karo";
        loginCard.prepend(hint);
    }

    window.loginUser = () => {
        if (dom.loginForm?.requestSubmit) {
            dom.loginForm.requestSubmit();
            return;
        }

        handleLogin({
            preventDefault() {}
        });
    };
});

function initRoleSelection() {
    const roleCards = document.querySelectorAll(".user-role");
    const loginRoleInput = document.getElementById("loginUserRole");

    roleCards.forEach((card) => {
        card.addEventListener("click", () => {
            roleCards.forEach((item) => item.classList.remove("active"));
            card.classList.add("active");
            if (loginRoleInput) {
                loginRoleInput.value = card.getAttribute("data-role") || "manufacturer";
            }
        });
    });

    if (roleCards[0]) {
        roleCards[0].classList.add("active");
        if (loginRoleInput) loginRoleInput.value = roleCards[0].getAttribute("data-role") || "manufacturer";
    }
}

function initPasswordToggles() {
    bindPasswordToggle("toggleLoginPassword", "loginPassword");
    bindPasswordToggle("toggleRegisterPassword", "registerPassword");
    bindPasswordToggle("toggleConfirmPassword", "confirmPassword");
}

function bindPasswordToggle(buttonId, inputId) {
    const button = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    if (!button || !input) return;

    button.addEventListener("click", () => {
        input.type = input.type === "password" ? "text" : "password";
        button.innerHTML = input.type === "password"
            ? '<i class="fas fa-eye"></i>'
            : '<i class="fas fa-eye-slash"></i>';
    });
}

function showRegisterForm(event) {
    event.preventDefault();
    dom.loginFormContainer.style.display = "none";
    dom.registerFormContainer.style.display = "block";
    dom.forgotPasswordContainer.style.display = "none";
    dom.registrationSuccess.style.display = "none";
}

function showLoginForm(event) {
    event.preventDefault();
    dom.loginFormContainer.style.display = "block";
    dom.registerFormContainer.style.display = "none";
    dom.forgotPasswordContainer.style.display = "none";
    dom.registrationSuccess.style.display = "none";
}

function showForgotPasswordForm(event) {
    event.preventDefault();
    dom.loginFormContainer.style.display = "none";
    dom.registerFormContainer.style.display = "none";
    dom.forgotPasswordContainer.style.display = "block";
    dom.registrationSuccess.style.display = "none";
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const role = document.getElementById("loginUserRole").value;
    const loginButton = document.querySelector('#loginForm button.btn.btn-primary');
    const loginError = document.getElementById("loginError");
    const loginErrorMessage = document.getElementById("loginErrorMessage");

    if (!email || !password) {
        showNotification("Email aur password dijiye", "warning");
        return;
    }

    try {
        if (loginError) loginError.style.display = "none";
        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = "Logging in...";
        }
        const response = await PharmaChainApp.api("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password, role })
        });
        PharmaChainApp.setSession(response);
        showNotification("Login successful", "success");
        setTimeout(() => {
            window.location.href = "Dashboard/dashboard.html";
        }, 500);
    } catch (error) {
        if (loginError && loginErrorMessage) {
            loginErrorMessage.textContent = error.message;
            loginError.style.display = "block";
        }
        showNotification(error.message, "danger");
    } finally {
        if (loginButton) {
            loginButton.disabled = false;
            loginButton.textContent = "Login to Platform";
        }
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const registerEmail = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!registerEmail || !password) {
        showNotification("Register form complete bhariye", "warning");
        return;
    }

    if (password !== confirmPassword) {
        showNotification("Passwords do not match", "warning");
        return;
    }

    try {
        const response = await PharmaChainApp.api("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
                firstName: document.getElementById("firstName").value.trim(),
                lastName: document.getElementById("lastName").value.trim(),
                email: document.getElementById("registerEmail").value.trim(),
                company: document.getElementById("company").value.trim(),
                phone: document.getElementById("phone").value.trim(),
                role: document.getElementById("registerUserRole").value,
                password
            })
        });
        PharmaChainApp.setSession(response);
        showNotification("Account created successfully", "success");
        setTimeout(() => {
            window.location.href = "Dashboard/dashboard.html";
        }, 600);
    } catch (error) {
        showNotification(error.message, "danger");
    }
}

function handleForgotPassword(event) {
    event.preventDefault();
    showNotification("Reset link demo mode me show ho raha hai", "info");
    event.target.reset();
}

async function handleDemoLogin(event) {
    event.preventDefault();
    const demoButton = document.getElementById("demoLogin");
    try {
        if (demoButton) {
            demoButton.disabled = true;
            demoButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Opening Demo';
        }
        const response = await PharmaChainApp.api("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: "admin@pharmachain.com",
                password: "admin123",
                role: "manufacturer"
            })
        });
        PharmaChainApp.setSession(response);
        window.location.href = "Dashboard/dashboard.html";
    } catch (error) {
        showNotification(error.message, "danger");
    } finally {
        if (demoButton) {
            demoButton.disabled = false;
            demoButton.innerHTML = '<i class="fas fa-rocket me-2"></i>Quick Demo Access';
        }
    }
}

async function handleAdminLogin(event) {
    event.preventDefault();
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const roleInput = document.getElementById("loginUserRole");
    if (emailInput) emailInput.value = "admin@pharmachain.com";
    if (passwordInput) passwordInput.value = "admin123";
    if (roleInput) roleInput.value = "admin";
    await handleLogin({ preventDefault() {} });
}

async function handleDoctorLogin(event) {
    event.preventDefault();
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const roleInput = document.getElementById("loginUserRole");
    if (emailInput) emailInput.value = "doctor@pharmachain.com";
    if (passwordInput) passwordInput.value = "doctor123";
    if (roleInput) roleInput.value = "doctor";
    document.querySelectorAll(".user-role").forEach((item) => {
        item.classList.toggle("active", item.getAttribute("data-role") === "doctor");
    });
    await handleLogin({ preventDefault() {} });
}

function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `alert alert-${type} notification alert-dismissible fade show`;
    notification.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    dom.notificationContainer.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

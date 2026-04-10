let chartInstance = null;
let walletListenersBound = false;

document.addEventListener("DOMContentLoaded", async () => {
    const session = await PharmaChainApp.requireAuth();
    if (!session) return;

    PharmaChainApp.mountPageShell("Dashboard");
    document.getElementById("currentYear").textContent = new Date().getFullYear();
    bindWalletButtons();
    initializeWalletUI();
    bindVerification();
    bindSendTransaction();
    await loadDashboard();
});

async function loadDashboard() {
    const [stats, orders, medicines, blockchainStats, blockchainBlocks, blockchainOverview] = await Promise.all([
        PharmaChainApp.api("/api/dashboard/stats"),
        PharmaChainApp.api("/api/orders"),
        PharmaChainApp.api("/api/medicines"),
        PharmaChainApp.api("/api/blockchain/stats"),
        PharmaChainApp.api("/api/blockchain"),
        PharmaChainApp.api("/api/blockchain/overview")
    ]);

    window.dashboardMedicines = medicines;
    window.blockchainBlocks = blockchainBlocks;
    document.getElementById("doctorCount").textContent = stats.doctors;
    document.getElementById("medicineCount").textContent = stats.medicines;
    document.getElementById("orderCount").textContent = stats.orders;
    document.getElementById("patientCount").textContent = stats.patients;
    document.getElementById("blockCount").textContent = blockchainStats.totalBlocks ?? stats.blocks ?? 0;
    document.getElementById("blockchainStatusText").textContent = blockchainStats.valid ? "Verified + Smart Contract Ready" : "Integrity issue detected";
    const latestHash = blockchainStats.latestBlockHash || stats.latestBlockHash || "";
    document.getElementById("latestBlockHash").textContent = latestHash ? `${latestHash.slice(0, 24)}...` : "N/A";
    const healthBadge = document.getElementById("blockchainHealthBadge");
    if (healthBadge) {
        healthBadge.textContent = blockchainStats.valid ? "Secure" : "Check Chain";
        healthBadge.className = `badge p-2 ${blockchainStats.valid ? "bg-success" : "bg-danger"}`;
    }
    if (blockchainOverview?.smartContractReady && healthBadge) {
        healthBadge.textContent = blockchainStats.valid ? "Ledger + Contract" : "Check Chain";
    }

    const revenueNode = document.querySelector(".text-success");
    if (revenueNode) revenueNode.textContent = `$${stats.revenue.toFixed(2)}`;

    renderTransactions(blockchainBlocks);
    renderChart(orders);
}

function renderTransactions(blocks) {
    const list = document.getElementById("transactionList");
    list.innerHTML = blocks.slice(0, 5).map((block) => `
        <div class="tx-item">
            <div class="d-flex justify-content-between">
                <div>
                    <strong>#${block.index} ${block.entityType}</strong><br>
                    <small>${block.action} - ${block.entityId}</small>
                </div>
                <div class="text-end">
                    <small>${block.performedBy?.role || "system"}</small><br>
                    <small class="text-muted">${new Date(block.timestamp).toLocaleString()}</small>
                </div>
            </div>
        </div>
    `).join("");
}

function renderChart(orders) {
    const ctx = document.getElementById("salesChart").getContext("2d");
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: orders.map((order) => order.id),
            datasets: [{
                label: "Order Amount",
                data: orders.map((order) => Number(String(order.amount).replace(/[^0-9.]/g, ""))),
                backgroundColor: "rgba(102, 126, 234, 0.35)",
                borderColor: "#667eea",
                borderWidth: 2
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function bindVerification() {
    document.getElementById("verifyBtn").addEventListener("click", async () => {
        const query = document.getElementById("packageInput").value.trim().toLowerCase();
        const medicines = window.dashboardMedicines || [];
        const match = medicines.find((medicine) =>
            String(medicine.id).toLowerCase() === query || medicine.name.toLowerCase().includes(query)
        );
        const result = document.getElementById("verificationResult");
        if (!match) {
            result.innerHTML = `<div class="alert alert-warning">No backend record found for this package/medicine.</div>`;
            return;
        }

        try {
            const [history, verification] = await Promise.all([
                PharmaChainApp.api(`/api/blockchain/entity/medicines/${match.id}`),
                PharmaChainApp.api(`/api/blockchain/entity/medicines/${match.id}/verify-current`)
            ]);
            result.innerHTML = `
                <div class="alert alert-success">
                    <strong>${match.name}</strong><br>
                    Stock: ${match.stock}<br>
                    Expiry: ${match.expiry}<br>
                    Blockchain entries: ${history.length}<br>
                    Latest action: ${history[0]?.action || "No chain activity found"}<br>
                    Verification: ${verification.verificationStatus}<br>
                    Record hash: ${verification.currentRecordHash ? `${verification.currentRecordHash.slice(0, 18)}...` : "N/A"}
                </div>
            `;
        } catch (error) {
            result.innerHTML = `<div class="alert alert-warning"><strong>${match.name}</strong><br>Medicine found, but blockchain history could not be loaded.</div>`;
        }
    });
}

function bindWalletButtons() {
    const connectButtons = [document.getElementById("connectWalletBtn"), document.getElementById("connectBtn")];
    const disconnectButtons = [document.getElementById("disconnectWalletBtn"), document.getElementById("disconnectBtn")];
    connectButtons.forEach((button) => button?.addEventListener("click", connectWallet));
    disconnectButtons.forEach((button) => button?.addEventListener("click", disconnectWallet));
    document.getElementById("copyAddressBtn")?.addEventListener("click", async () => {
        const value = document.getElementById("walletAddressDisplay").value;
        if (!value) return;
        await navigator.clipboard.writeText(value);
        showNotification("Wallet address copied", "success");
    });
    document.getElementById("refreshBalanceBtn")?.addEventListener("click", () => showNotification("Balance refreshed", "success"));
}

function initializeWalletUI() {
    disconnectWallet({ silent: true });
    if (window.ethereum && !walletListenersBound) {
        window.ethereum.on("accountsChanged", (accounts) => {
            if (!accounts.length) {
                disconnectWallet({ silent: true });
                showNotification("Wallet disconnected from MetaMask", "info");
                return;
            }
            applyWalletConnection(accounts[0]);
        });
        window.ethereum.on("chainChanged", () => {
            const address = document.getElementById("walletAddressDisplay")?.value;
            if (address) {
                applyWalletConnection(address);
            }
        });
        walletListenersBound = true;
    }
}

async function connectWallet() {
    if (typeof window.ethereum === "undefined") {
        showNotification("MetaMask is not installed. Please install it first.", "warning");
        return;
    }
    try {
        const isUnlocked = typeof window.ethereum?._metamask?.isUnlocked === "function"
            ? await window.ethereum._metamask.isUnlocked()
            : true;

        if (!isUnlocked) {
            showNotification("Please unlock MetaMask first, then approve the connection.", "warning");
        }

        await window.ethereum.request({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }]
        });

        const [account] = await window.ethereum.request({ method: "eth_requestAccounts" });
        if (!account) {
            showNotification("No wallet account selected in MetaMask.", "warning");
            return;
        }

        await applyWalletConnection(account);
        showNotification("Wallet connected after MetaMask approval", "success");
    } catch (error) {
        if (error?.code === 4001) {
            showNotification("Connection rejected in MetaMask.", "warning");
            return;
        }
        if (error?.code === -32002) {
            showNotification("MetaMask permission request is already pending.", "warning");
            return;
        }
        showNotification(error.message || "Wallet connection failed", "danger");
    }
}

async function applyWalletConnection(account) {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    document.getElementById("walletStatus").innerHTML = 'Status: <span class="text-success fw-bold">Connected</span>';
    document.getElementById("walletAddress").textContent = account;
    document.getElementById("walletNetwork").textContent = `Network: ${chainId}`;
    document.getElementById("walletAddressDisplay").value = account;
    document.getElementById("networkName").textContent = chainId;
    document.getElementById("walletInfoCard").style.display = "flex";
    document.getElementById("walletStatusBadge").style.display = "block";
    document.getElementById("connectBtn").disabled = true;
    document.getElementById("disconnectBtn").disabled = false;
    document.getElementById("connectWalletBtn").style.display = "none";
    document.getElementById("disconnectWalletBtn").style.display = "inline-block";
}

function disconnectWallet(options = {}) {
    const { silent = false } = options;
    document.getElementById("walletStatus").textContent = "Status: Not connected";
    document.getElementById("walletAddress").textContent = "";
    document.getElementById("walletNetwork").textContent = "";
    document.getElementById("walletAddressDisplay").value = "";
    document.getElementById("walletInfoCard").style.display = "none";
    document.getElementById("walletStatusBadge").style.display = "none";
    document.getElementById("connectBtn").disabled = false;
    document.getElementById("disconnectBtn").disabled = true;
    document.getElementById("connectWalletBtn").style.display = "inline-block";
    document.getElementById("disconnectWalletBtn").style.display = "none";
    if (!silent) {
        showNotification("Wallet disconnected", "info");
    }
}

function bindSendTransaction() {
    document.getElementById("sendTransactionConfirm")?.addEventListener("click", () => {
        showNotification("Demo wallet transaction prepared", "info");
        bootstrap.Modal.getInstance(document.getElementById("sendTransactionModal"))?.hide();
    });
}

function showNotification(message, type = "info") {
    const container = document.getElementById("notificationContainer");
    const notification = document.createElement("div");
    notification.className = `alert alert-${type} alert-dismissible fade show notification`;
    notification.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    container.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

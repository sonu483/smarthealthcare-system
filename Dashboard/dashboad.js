
        // DOM Elements
        const notificationContainer = document.getElementById('notificationContainer');
        const transactionList = document.getElementById('transactionList');
        const verificationResult = document.getElementById('verificationResult');
        const packageInput = document.getElementById('packageInput');
        const verifyBtn = document.getElementById('verifyBtn');
        const connectBtn = document.getElementById('connectBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        const disconnectWalletBtn = document.getElementById('disconnectWalletBtn');
        const walletStatus = document.getElementById('walletStatus');
        const walletAddress = document.getElementById('walletAddress');
        const walletNetwork = document.getElementById('walletNetwork');
        const walletInfoCard = document.getElementById('walletInfoCard');
        const walletStatusBadge = document.getElementById('walletStatusBadge');
        const walletAddressDisplay = document.getElementById('walletAddressDisplay');
        const networkName = document.getElementById('networkName');
        const ethBalance = document.getElementById('ethBalance');
        const tokenBalance = document.getElementById('tokenBalance');
        const copyAddressBtn = document.getElementById('copyAddressBtn');
        const sendTransactionBtn = document.getElementById('sendTransactionBtn');
        const refreshBalanceBtn = document.getElementById('refreshBalanceBtn');
        const sendTransactionConfirm = document.getElementById('sendTransactionConfirm');
        const refreshBtn = document.getElementById('refreshDashboard');
        const currentYear = document.getElementById('currentYear');

        // Wallet state
        let isWalletConnected = false;
        let currentAccount = null;
        let web3 = null;
        let chainId = null;
        let provider = null;

        // Sample data
        const mockTransactions = [
            { hash: '0x8a3f...c2d1', action: 'Batch Registered', party: 'Manufacturer A', time: '2 mins ago' },
            { hash: '0x5b9e...f8a7', action: 'Transferred to Distributor', party: 'Logistics Co.', time: '1 hour ago' },
            { hash: '0x3c2a...d9b4', action: 'Temperature Log Updated', party: 'Sensor #882', time: '3 hours ago' },
            { hash: '0x7f1d...e6c3', action: 'Received at Pharmacy', party: 'City Pharmacy', time: '1 day ago' },
            { hash: '0x9e4b...a2d8', action: 'Patient Verification', party: 'Consumer App', time: '2 days ago' }
        ];

        // Network names
        const networks = {
            '0x1': { name: 'Ethereum Mainnet', class: 'network-ethereum' },
            '0x3': { name: 'Ropsten Testnet', class: 'network-ethereum' },
            '0x4': { name: 'Rinkeby Testnet', class: 'network-ethereum' },
            '0x5': { name: 'Goerli Testnet', class: 'network-ethereum' },
            '0x2a': { name: 'Kovan Testnet', class: 'network-ethereum' },
            '0x89': { name: 'Polygon Mainnet', class: 'network-polygon' },
            '0x13881': { name: 'Polygon Mumbai', class: 'network-polygon' },
            '0x38': { name: 'BNB Smart Chain', class: 'network-bsc' },
            '0x61': { name: 'BSC Testnet', class: 'network-bsc' }
        };

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            currentYear.textContent = new Date().getFullYear();
            loadTransactions();
            initializeCharts();
            setupEventListeners();
            checkExistingConnection();
        });

        function setupEventListeners() {
            connectBtn.addEventListener('click', connectMetaMask);
            disconnectBtn.addEventListener('click', disconnectMetaMask);
            connectWalletBtn.addEventListener('click', connectMetaMask);
            disconnectWalletBtn.addEventListener('click', disconnectMetaMask);
            verifyBtn.addEventListener('click', verifyPackage);
            refreshBtn.addEventListener('click', refreshDashboard);
            copyAddressBtn.addEventListener('click', copyAddress);
            sendTransactionBtn.addEventListener('click', () => {
                if (isWalletConnected) {
                    new bootstrap.Modal(document.getElementById('sendTransactionModal')).show();
                } else {
                    showNotification('Please connect your wallet first!', 'warning');
                }
            });
            refreshBalanceBtn.addEventListener('click', updateWalletBalance);
            sendTransactionConfirm.addEventListener('click', sendTransaction);
        }

        // Check for existing MetaMask connection
        async function checkExistingConnection() {
            if (typeof window.ethereum !== 'undefined') {
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        currentAccount = accounts[0];
                        chainId = await window.ethereum.request({ method: 'eth_chainId' });
                        web3 = new Web3(window.ethereum);
                        isWalletConnected = true;
                        
                        updateWalletUI(true);
                        await updateWalletBalance();
                        setupMetaMaskListeners();
                    }
                } catch (error) {
                    console.log('Error checking connection:', error);
                }
            }
        }

        // MetaMask Connection
        async function connectMetaMask() {
            try {
                // Check if MetaMask is installed
                if (typeof window.ethereum === 'undefined') {
                    showNotification(
                        'MetaMask is not installed! Please install it first.', 
                        'danger',
                        10000
                    );
                    window.open('https://metamask.io/download/', '_blank');
                    return;
                }

                // Request account access
                const accounts = await window.ethereum.request({ 
                    method: 'eth_requestAccounts' 
                });
                
                if (accounts.length > 0) {
                    currentAccount = accounts[0];
                    chainId = await window.ethereum.request({ method: 'eth_chainId' });
                    web3 = new Web3(window.ethereum);
                    isWalletConnected = true;
                    
                    updateWalletUI(true);
                    await updateWalletBalance();
                    setupMetaMaskListeners();
                    
                    showNotification('Wallet connected successfully!', 'success');
                }
            } catch (error) {
                console.error('Connection error:', error);
                
                if (error.code === 4001) {
                    showNotification('Connection rejected. Please approve in MetaMask.', 'warning');
                } else if (error.code === -32002) {
                    showNotification('Connection already pending. Check MetaMask.', 'warning');
                } else {
                    showNotification('Connection failed: ' + error.message, 'danger');
                }
            }
        }

        function disconnectMetaMask() {
            isWalletConnected = false;
            currentAccount = null;
            web3 = null;
            chainId = null;
            
            updateWalletUI(false);
            showNotification('Wallet disconnected', 'info');
        }

        function updateWalletUI(connected) {
            if (connected && currentAccount) {
                const shortAddress = `${currentAccount.substring(0, 6)}...${currentAccount.substring(38)}`;
                
                // Update main UI
                walletStatus.innerHTML = 'Status: <span class="text-success fw-bold">Connected</span>';
                walletAddress.textContent = shortAddress;
                walletAddressDisplay.value = currentAccount;
                
                // Update network info
                const network = networks[chainId] || { name: `Chain ID: ${chainId}`, class: 'network-ethereum' };
                networkName.textContent = network.name;
                networkName.className = `badge ${network.class}`;
                walletNetwork.textContent = `Network: ${network.name}`;
                
                // Enable/disable buttons
                connectBtn.disabled = true;
                disconnectBtn.disabled = false;
                connectWalletBtn.style.display = 'none';
                disconnectWalletBtn.style.display = 'inline-block';
                
                // Show wallet info
                walletInfoCard.style.display = 'flex';
                walletStatusBadge.style.display = 'block';
                
                // Update connect button text
                connectWalletBtn.innerHTML = `<i class="fas fa-check-circle me-2"></i>Connected`;
                connectWalletBtn.className = 'btn btn-success btn-lg me-3';
            } else {
                // Update main UI
                walletStatus.innerHTML = 'Status: <span class="text-muted">Not connected</span>';
                walletAddress.textContent = '';
                walletNetwork.textContent = '';
                
                // Enable/disable buttons
                connectBtn.disabled = false;
                disconnectBtn.disabled = true;
                connectWalletBtn.style.display = 'inline-block';
                disconnectWalletBtn.style.display = 'none';
                
                // Hide wallet info
                walletInfoCard.style.display = 'none';
                walletStatusBadge.style.display = 'none';
                
                // Reset balance displays
                ethBalance.textContent = '0.0000';
                tokenBalance.textContent = '0';
                
                // Update connect button text
                connectWalletBtn.innerHTML = '<i class="fas fa-wallet me-2"></i>Connect MetaMask';
                connectWalletBtn.className = 'btn btn-light btn-lg me-3';
            }
        }

        // Update wallet balance
        async function updateWalletBalance() {
            if (!isWalletConnected || !web3 || !currentAccount) return;
            
            try {
                const balance = await web3.eth.getBalance(currentAccount);
                const ethBalanceValue = web3.utils.fromWei(balance, 'ether');
                ethBalance.textContent = parseFloat(ethBalanceValue).toFixed(4);
                
                // Simulate token balance (in real app, would call token contract)
                tokenBalance.textContent = Math.floor(Math.random() * 1000);
                
                showNotification('Balance updated!', 'success');
            } catch (error) {
                console.error('Error updating balance:', error);
            }
        }

        // Send ETH transaction
        async function sendTransaction() {
            const recipient = document.getElementById('recipientAddress').value.trim();
            const amount = document.getElementById('amountEth').value;
            
            if (!recipient || !amount) {
                showNotification('Please fill all fields', 'warning');
                return;
            }
            
            if (!web3.utils.isAddress(recipient)) {
                showNotification('Invalid recipient address', 'warning');
                return;
            }
            
            try {
                const amountWei = web3.utils.toWei(amount, 'ether');
                
                const transaction = {
                    from: currentAccount,
                    to: recipient,
                    value: amountWei,
                    gas: 21000
                };
                
                const txHash = await window.ethereum.request({
                    method: 'eth_sendTransaction',
                    params: [transaction]
                });
                
                showNotification(`Transaction sent! Hash: ${txHash.substring(0, 10)}...`, 'success');
                
                // Close modal
                bootstrap.Modal.getInstance(document.getElementById('sendTransactionModal')).hide();
                
                // Update balance after transaction
                setTimeout(updateWalletBalance, 5000);
                
            } catch (error) {
                console.error('Transaction error:', error);
                if (error.code === 4001) {
                    showNotification('Transaction rejected', 'warning');
                } else {
                    showNotification('Transaction failed: ' + error.message, 'danger');
                }
            }
        }

        // Copy address to clipboard
        function copyAddress() {
            if (currentAccount) {
                navigator.clipboard.writeText(currentAccount).then(() => {
                    showNotification('Address copied to clipboard!', 'success');
                });
            }
        }

        // Setup MetaMask event listeners
        function setupMetaMaskListeners() {
            if (window.ethereum) {
                window.ethereum.on('accountsChanged', (accounts) => {
                    if (accounts.length === 0) {
                        disconnectMetaMask();
                    } else if (accounts[0] !== currentAccount) {
                        currentAccount = accounts[0];
                        updateWalletUI(true);
                        updateWalletBalance();
                    }
                });
                
                window.ethereum.on('chainChanged', (newChainId) => {
                    chainId = newChainId;
                    updateWalletUI(true);
                    updateWalletBalance();
                });
                
                window.ethereum.on('disconnect', () => {
                    disconnectMetaMask();
                });
            }
        }

        // Transactions
        function loadTransactions() {
            transactionList.innerHTML = '';
            mockTransactions.forEach(tx => {
                const div = document.createElement('div');
                div.className = 'tx-item';
                div.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <div>
                            <strong>${tx.action}</strong><br>
                            <small class="tx-hash">${tx.hash}</small>
                        </div>
                        <div class="text-end">
                            <small>${tx.party}</small><br>
                            <small class="text-muted">${tx.time}</small>
                        </div>
                    </div>
                `;
                transactionList.appendChild(div);
            });
        }

        // Charts
        function initializeCharts() {
            const ctx = document.getElementById('salesChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                    datasets: [{
                        label: 'Sales ($)',
                        data: [12000, 19000, 15000, 25000, 22000, 30000, 28000, 32000],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: value => '$' + value
                            }
                        }
                    }
                }
            });
        }

        // Package Verification
        function verifyPackage() {
            const pkgId = packageInput.value.trim();
            
            if (!pkgId) {
                showNotification('Please enter a package ID', 'warning');
                return;
            }

            verificationResult.innerHTML = `
                <div class="alert alert-success">
                    <h6><i class="fas fa-check-circle me-2"></i>Package Verified!</h6>
                    <p class="mb-1"><strong>ID:</strong> ${pkgId}</p>
                    <p class="mb-1"><strong>Status:</strong> Genuine • Blockchain‑verified</p>
                    <p class="mb-0"><strong>Journey:</strong> Manufacturer → Distributor → Pharmacy</p>
                </div>
            `;

            showNotification(`Package ${pkgId} verified successfully!`, 'success');
            
            // Update stats
            document.getElementById('medicineCount').textContent = 
                parseInt(document.getElementById('medicineCount').textContent) + 1;
        }

        // Refresh Dashboard
        function refreshDashboard() {
            // Update stats with random values
            document.getElementById('doctorCount').textContent = Math.floor(Math.random() * 20) + 5;
            document.getElementById('medicineCount').textContent = Math.floor(Math.random() * 300) + 100;
            document.getElementById('orderCount').textContent = Math.floor(Math.random() * 50) + 10;
            document.getElementById('patientCount').textContent = Math.floor(Math.random() * 500) + 200;
            
            if (isWalletConnected) {
                updateWalletBalance();
            }
            
            showNotification('Dashboard refreshed!', 'success');
        }

        // Notification System
        function showNotification(message, type = 'success', duration = 5000) {
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
            
            notificationContainer.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }

/* ========================================
   Royal Flush Casino - Core App Logic
   ======================================== */

// ===== State =====
let currentUser = null;

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    // Check for existing session
    const savedUser = sessionStorage.getItem('casino_user');
    if (savedUser) {
        currentUser = savedUser;
        showApp();
    }

    // Handle hash routing
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
});

// ===== Routing =====
function navigate(page) {
    window.location.hash = page;
}

function handleRoute() {
    if (!currentUser) return;

    const hash = window.location.hash.slice(1) || 'lobby';
    const validPages = ['lobby', 'slots', 'blackjack', 'roulette', 'wallet'];

    if (!validPages.includes(hash)) {
        navigate('lobby');
        return;
    }

    // Hide all pages, show target
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + hash);
    if (target) {
        target.classList.add('active');
    }

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === hash);
    });
}

// ===== Auth =====
function showAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('form-login').classList.toggle('hidden', tab !== 'login');
    document.getElementById('form-register').classList.toggle('hidden', tab !== 'register');

    if (tab === 'login') {
        document.querySelectorAll('.auth-tab')[0].classList.add('active');
    } else {
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
    }

    // Clear errors
    document.getElementById('login-error').textContent = '';
    document.getElementById('reg-error').textContent = '';
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    const users = JSON.parse(localStorage.getItem('casino_users') || '{}');

    if (!users[username]) {
        document.getElementById('login-error').textContent = 'User not found.';
        return;
    }

    if (users[username].password !== password) {
        document.getElementById('login-error').textContent = 'Incorrect password.';
        return;
    }

    currentUser = username;
    sessionStorage.setItem('casino_user', username);
    showApp();
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (username.length < 3) {
        document.getElementById('reg-error').textContent = 'Username must be at least 3 characters.';
        return;
    }

    if (password.length < 4) {
        document.getElementById('reg-error').textContent = 'Password must be at least 4 characters.';
        return;
    }

    if (password !== confirm) {
        document.getElementById('reg-error').textContent = 'Passwords do not match.';
        return;
    }

    const users = JSON.parse(localStorage.getItem('casino_users') || '{}');

    if (users[username]) {
        document.getElementById('reg-error').textContent = 'Username already taken.';
        return;
    }

    // Create user
    users[username] = { email, password };
    localStorage.setItem('casino_users', JSON.stringify(users));

    // Initialize wallet with $100 welcome bonus
    const wallets = JSON.parse(localStorage.getItem('casino_wallets') || '{}');
    wallets[username] = { balance: 100 };
    localStorage.setItem('casino_wallets', JSON.stringify(wallets));

    // Initialize transaction history
    const transactions = JSON.parse(localStorage.getItem('casino_transactions') || '{}');
    transactions[username] = [
        { type: 'Welcome Bonus', amount: 100, date: new Date().toISOString() }
    ];
    localStorage.setItem('casino_transactions', JSON.stringify(transactions));

    currentUser = username;
    sessionStorage.setItem('casino_user', username);
    showToast('Welcome! You received a $100 bonus!', 'success');
    showApp();
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('casino_user');

    // Hide nav, show auth
    document.getElementById('main-nav').classList.add('hidden');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-auth').classList.add('active');

    // Clear forms
    document.getElementById('form-login').reset();
    document.getElementById('form-register').reset();
    window.location.hash = '';
}

function showApp() {
    // Show nav
    document.getElementById('main-nav').classList.remove('hidden');
    document.getElementById('nav-user').textContent = currentUser;

    // Hide auth, show lobby
    document.getElementById('page-auth').classList.remove('active');
    updateBalanceDisplay();
    navigate('lobby');
}

// ===== Balance helpers =====
function getBalance() {
    const wallets = JSON.parse(localStorage.getItem('casino_wallets') || '{}');
    return (wallets[currentUser] && wallets[currentUser].balance) || 0;
}

function setBalance(amount) {
    const wallets = JSON.parse(localStorage.getItem('casino_wallets') || '{}');
    if (!wallets[currentUser]) wallets[currentUser] = {};
    wallets[currentUser].balance = Math.round(amount * 100) / 100;
    localStorage.setItem('casino_wallets', JSON.stringify(wallets));
    updateBalanceDisplay();
}

function updateBalanceDisplay() {
    const balance = getBalance();
    const formatted = '$' + balance.toFixed(2);
    document.getElementById('nav-balance').textContent = formatted;

    const walletEl = document.getElementById('wallet-balance');
    if (walletEl) walletEl.textContent = formatted;
}

function addTransaction(type, amount) {
    const transactions = JSON.parse(localStorage.getItem('casino_transactions') || '{}');
    if (!transactions[currentUser]) transactions[currentUser] = [];
    transactions[currentUser].unshift({
        type,
        amount,
        date: new Date().toISOString()
    });
    // Keep last 50 transactions
    transactions[currentUser] = transactions[currentUser].slice(0, 50);
    localStorage.setItem('casino_transactions', JSON.stringify(transactions));
}

// ===== Toast =====
let toastTimeout;
function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== Utility =====
function formatMoney(amount) {
    return '$' + amount.toFixed(2);
}

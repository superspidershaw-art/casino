/* ========================================
   Royal Flush Casino - Core App Logic
   ======================================== */

let currentUser = null;

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = sessionStorage.getItem('casino_user');
    if (savedUser) {
        currentUser = savedUser;
        showApp();
    }
    window.addEventListener('hashchange', handleRoute);
});

// ===== Routing =====
function navigate(page) {
    window.location.hash = page;
}

function handleRoute() {
    if (!currentUser) return;

    const hash = window.location.hash.slice(1) || 'lobby';
    const validPages = ['lobby', 'slots', 'blackjack', 'roulette', 'crash', 'wallet'];

    if (!validPages.includes(hash)) {
        navigate('lobby');
        return;
    }

    // Switch pages
    document.querySelectorAll('.main-content .page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + hash);
    if (target) target.classList.add('active');

    // Update sidebar active link
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === hash);
    });

    // Close mobile sidebar on navigate
    closeSidebar();
}

// ===== Sidebar =====
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');

    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = closeSidebar;
        document.body.appendChild(overlay);
    }
    overlay.classList.toggle('show', sidebar.classList.contains('open'));
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('open');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.classList.remove('show');
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

    users[username] = { email, password };
    localStorage.setItem('casino_users', JSON.stringify(users));

    const wallets = JSON.parse(localStorage.getItem('casino_wallets') || '{}');
    wallets[username] = { balance: 100 };
    localStorage.setItem('casino_wallets', JSON.stringify(wallets));

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

    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('page-auth').classList.add('active');
    document.querySelectorAll('.main-content .page').forEach(p => p.classList.remove('active'));

    document.getElementById('form-login').reset();
    document.getElementById('form-register').reset();
    window.location.hash = '';
}

function showApp() {
    // Hide auth, show app shell
    document.getElementById('page-auth').classList.remove('active');
    document.getElementById('app-shell').classList.remove('hidden');

    // Update user displays
    const initial = currentUser.charAt(0).toUpperCase();
    document.getElementById('sidebar-avatar').textContent = initial;
    document.getElementById('sidebar-username').textContent = currentUser;

    const lobbyName = document.getElementById('lobby-username');
    if (lobbyName) lobbyName.textContent = currentUser;

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

function formatMoney(amount) {
    return '$' + amount.toFixed(2);
}

/* ========================================
   Royal Flush Casino - Wallet System
   ======================================== */

function setDeposit(amount) {
    document.getElementById('deposit-amount').value = amount;
}

function deposit() {
    const input = document.getElementById('deposit-amount');
    const amount = parseFloat(input.value);

    if (!amount || amount <= 0) {
        showToast('Enter a valid deposit amount.', 'error');
        return;
    }

    if (amount > 10000000) {
        showToast('Maximum deposit is $10,000,000.', 'error');
        return;
    }

    const newBalance = getBalance() + amount;
    setBalance(newBalance);
    addTransaction('Deposit', amount);
    input.value = '';
    renderTransactions();
    showToast('Deposited ' + formatMoney(amount) + ' successfully!', 'success');
}

function withdraw() {
    const input = document.getElementById('withdraw-amount');
    const amount = parseFloat(input.value);

    if (!amount || amount <= 0) {
        showToast('Enter a valid withdrawal amount.', 'error');
        return;
    }

    const balance = getBalance();
    if (amount > balance) {
        showToast('Insufficient funds.', 'error');
        return;
    }

    setBalance(balance - amount);
    addTransaction('Withdrawal', -amount);
    input.value = '';
    renderTransactions();
    showToast('Withdrew ' + formatMoney(amount) + ' successfully!', 'success');
}

function renderTransactions() {
    const container = document.getElementById('transaction-list');
    const transactions = JSON.parse(localStorage.getItem('casino_transactions') || '{}');
    const userTx = (transactions[currentUser] || []);

    if (userTx.length === 0) {
        container.innerHTML = '<p class="empty-msg">No transactions yet.</p>';
        return;
    }

    container.innerHTML = userTx.map(tx => {
        const isPositive = tx.amount >= 0;
        const date = new Date(tx.date);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `
            <div class="transaction-item">
                <div>
                    <div>${tx.type}</div>
                    <div class="transaction-type">${dateStr}</div>
                </div>
                <div class="transaction-amount ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '+' : ''}${formatMoney(Math.abs(tx.amount))}
                </div>
            </div>
        `;
    }).join('');
}

// Render transactions when navigating to wallet
const walletObserver = new MutationObserver(() => {
    const walletPage = document.getElementById('page-wallet');
    if (walletPage && walletPage.classList.contains('active')) {
        updateBalanceDisplay();
        renderTransactions();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const walletPage = document.getElementById('page-wallet');
    if (walletPage) {
        walletObserver.observe(walletPage, { attributes: true, attributeFilter: ['class'] });
    }
});

/* ========================================
   Royal Flush Casino - Slot Machine
   ======================================== */

const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];
const SLOT_PAYOUTS = {
    '7️⃣': 50,
    '💎': 25,
    '🍒': 10,
    '🍋': 5,
    '🍊': 5,
    '🍇': 5,
};
const TWO_MATCH_PAYOUT = 2;

let slotBet = 5;
let isSpinning = false;

function adjustSlotBet(delta) {
    slotBet = Math.max(1, Math.min(100, slotBet + delta));
    document.getElementById('slot-bet').textContent = '$' + slotBet;
}

function spinSlots() {
    if (isSpinning) return;

    const balance = getBalance();
    if (balance < slotBet) {
        showToast('Insufficient funds! Visit the wallet to deposit.', 'error');
        return;
    }

    isSpinning = true;
    setBalance(balance - slotBet);
    document.getElementById('btn-spin').disabled = true;
    document.getElementById('slots-result').textContent = '';
    document.getElementById('slots-result').className = 'game-result';

    // Generate all 3x3 symbols
    const grid = [];
    for (let row = 0; row < 3; row++) {
        grid[row] = [];
        for (let col = 0; col < 3; col++) {
            grid[row][col] = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        }
    }

    // Spinning animation
    const allReels = [];
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            allReels.push(document.getElementById(`reel-${row}-${col}`));
        }
    }

    allReels.forEach(reel => reel.classList.add('spinning'));

    let spinCount = 0;
    const spinInterval = setInterval(() => {
        allReels.forEach(reel => {
            reel.textContent = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
        });
        spinCount++;
    }, 80);

    // Stop spinning after delay, reveal results column by column
    setTimeout(() => {
        clearInterval(spinInterval);
        allReels.forEach(reel => reel.classList.remove('spinning'));

        // Reveal column by column
        for (let col = 0; col < 3; col++) {
            setTimeout(() => {
                for (let row = 0; row < 3; row++) {
                    const reel = document.getElementById(`reel-${row}-${col}`);
                    reel.textContent = grid[row][col];
                }

                // After last column, calculate result
                if (col === 2) {
                    setTimeout(() => calculateSlotResult(grid), 200);
                }
            }, col * 300);
        }
    }, 1500);
}

function calculateSlotResult(grid) {
    // Check center row (row 1) for wins
    const centerRow = grid[1];
    const resultEl = document.getElementById('slots-result');
    let winAmount = 0;

    // Three of a kind on center row
    if (centerRow[0] === centerRow[1] && centerRow[1] === centerRow[2]) {
        const symbol = centerRow[0];
        const multiplier = SLOT_PAYOUTS[symbol] || 5;
        winAmount = slotBet * multiplier;

        // Highlight winning reels
        for (let col = 0; col < 3; col++) {
            document.getElementById(`reel-1-${col}`).classList.add('winner');
        }
    }
    // Two of a kind on center row
    else if (centerRow[0] === centerRow[1] || centerRow[1] === centerRow[2] || centerRow[0] === centerRow[2]) {
        winAmount = slotBet * TWO_MATCH_PAYOUT;
    }

    if (winAmount > 0) {
        setBalance(getBalance() + winAmount);
        addTransaction('Slots Win', winAmount);
        resultEl.textContent = 'YOU WIN ' + formatMoney(winAmount) + '!';
        resultEl.className = 'game-result win';
        showToast('Winner! +' + formatMoney(winAmount), 'success');
    } else {
        addTransaction('Slots Loss', -slotBet);
        resultEl.textContent = 'No luck this time. Try again!';
        resultEl.className = 'game-result lose';
    }

    // Clean up
    setTimeout(() => {
        document.querySelectorAll('.slot-reel.winner').forEach(r => r.classList.remove('winner'));
    }, 2000);

    isSpinning = false;
    document.getElementById('btn-spin').disabled = false;
}

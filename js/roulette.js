/* ========================================
   Royal Flush Casino - European Roulette
   ======================================== */

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const ROULETTE_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
    11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
    22, 18, 29, 7, 28, 12, 35, 3, 26
];

let selectedChip = 1;
let rouletteBets = []; // { position: string, amount: number }
let isRouletteSpinning = false;
let wheelRotation = 0;

function selectChip(value, el) {
    selectedChip = value;
    document.querySelectorAll('.chip-select').forEach(btn => btn.classList.remove('active'));
    if (el) el.classList.add('active');
}

function placeBet(cell) {
    if (isRouletteSpinning) return;

    const position = cell.dataset.bet;
    const balance = getBalance();
    const totalBet = getTotalBet();

    if (balance - totalBet < selectedChip) {
        showToast('Insufficient funds for this bet.', 'error');
        return;
    }

    // Add or increase bet on this position
    const existing = rouletteBets.find(b => b.position === position);
    if (existing) {
        existing.amount += selectedChip;
    } else {
        rouletteBets.push({ position, amount: selectedChip });
    }

    cell.classList.add('selected');
    updateRouletteBetDisplay();
}

function clearBets() {
    if (isRouletteSpinning) return;
    rouletteBets = [];
    document.querySelectorAll('.board-cell.selected, .board-dozen.selected, .board-outside-bet.selected, .board-col-bet.selected').forEach(el => {
        el.classList.remove('selected');
    });
    updateRouletteBetDisplay();
}

function getTotalBet() {
    return rouletteBets.reduce((sum, b) => sum + b.amount, 0);
}

function updateRouletteBetDisplay() {
    document.getElementById('roulette-total-bet').textContent = '$' + getTotalBet();
}

function spinRoulette() {
    if (isRouletteSpinning) return;

    const totalBet = getTotalBet();
    if (totalBet === 0) {
        showToast('Place at least one bet!', 'error');
        return;
    }

    if (getBalance() < totalBet) {
        showToast('Insufficient funds!', 'error');
        return;
    }

    isRouletteSpinning = true;
    document.getElementById('btn-roulette-spin').disabled = true;

    // Deduct total bet
    setBalance(getBalance() - totalBet);

    // Generate result
    const resultNumber = Math.floor(Math.random() * 37); // 0-36
    const resultIndex = ROULETTE_ORDER.indexOf(resultNumber);
    const sliceDeg = 360 / 37;

    // Spin wheel
    const wheel = document.getElementById('roulette-wheel');
    const spins = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
    const targetDeg = spins * 360 + (resultIndex * sliceDeg);
    wheelRotation += targetDeg;
    wheel.style.transform = `rotate(${wheelRotation}deg)`;

    document.getElementById('roulette-result').textContent = '';
    document.getElementById('roulette-result').className = 'game-result';
    document.getElementById('roulette-result-display').textContent = '';

    setTimeout(() => {
        // Show result
        const isRed = RED_NUMBERS.includes(resultNumber);
        const color = resultNumber === 0 ? 'green' : (isRed ? 'red' : 'black');
        document.getElementById('roulette-result-display').textContent = resultNumber;

        // Calculate winnings
        let totalWin = 0;

        for (const bet of rouletteBets) {
            const payout = calculatePayout(bet.position, resultNumber, color);
            if (payout > 0) {
                totalWin += bet.amount * payout + bet.amount; // payout + original bet
            }
        }

        const resultEl = document.getElementById('roulette-result');
        const netWin = totalWin - totalBet;

        if (totalWin > 0) {
            setBalance(getBalance() + totalWin);
            addTransaction('Roulette Win', netWin);
            resultEl.textContent = `${resultNumber} ${color.toUpperCase()} - You win ${formatMoney(totalWin)}!`;
            resultEl.className = 'game-result win';
            showToast('Winner! +' + formatMoney(netWin), 'success');
        } else {
            addTransaction('Roulette Loss', -totalBet);
            resultEl.textContent = `${resultNumber} ${color.toUpperCase()} - No win this time.`;
            resultEl.className = 'game-result lose';
        }

        // Reset for next spin
        clearBets();
        isRouletteSpinning = false;
        document.getElementById('btn-roulette-spin').disabled = false;
    }, 4500);
}

function calculatePayout(position, number, color) {
    // Straight number bet
    if (position === String(number)) return 35;

    // Color bets
    if (position === 'red' && color === 'red') return 1;
    if (position === 'black' && color === 'black') return 1;

    // Even/Odd
    if (position === 'even' && number !== 0 && number % 2 === 0) return 1;
    if (position === 'odd' && number % 2 === 1) return 1;

    // High/Low
    if (position === '1-18' && number >= 1 && number <= 18) return 1;
    if (position === '19-36' && number >= 19 && number <= 36) return 1;

    // Dozens
    if (position === '1st12' && number >= 1 && number <= 12) return 2;
    if (position === '2nd12' && number >= 13 && number <= 24) return 2;
    if (position === '3rd12' && number >= 25 && number <= 36) return 2;

    // Columns
    if (position === 'col1' && number !== 0 && number % 3 === 1) return 2;
    if (position === 'col2' && number !== 0 && number % 3 === 2) return 2;
    if (position === 'col3' && number !== 0 && number % 3 === 0) return 2;

    return 0;
}

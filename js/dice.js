/* ========================================
   Royal Flush Casino - Dice
   ======================================== */

let diceBet = 10;
let diceTarget = 50.00;
let diceMode = 'over'; // over | under
let diceRolling = false;

function setDiceBet(amount) {
    const val = parseFloat(amount);
    if (!val || val < 1) diceBet = 1;
    else diceBet = Math.round(val * 100) / 100;
    const input = document.getElementById('dice-bet-input');
    if (input && document.activeElement !== input) input.value = diceBet;
}

function halveDiceBet() { setDiceBet(diceBet / 2); document.getElementById('dice-bet-input').value = diceBet; }
function doubleDiceBet() { setDiceBet(diceBet * 2); document.getElementById('dice-bet-input').value = diceBet; }

function getDiceMultiplier() {
    const winChance = diceMode === 'over' ? (99.99 - diceTarget) : diceTarget;
    if (winChance <= 0) return 0;
    return Math.floor((99 / winChance) * 100) / 100; // 1% house edge
}

function getDiceWinChance() {
    return diceMode === 'over' ? (99.99 - diceTarget) : diceTarget;
}

function updateDiceDisplay() {
    const mult = getDiceMultiplier();
    const chance = getDiceWinChance();
    document.getElementById('dice-multiplier').textContent = mult.toFixed(2) + 'x';
    document.getElementById('dice-chance').textContent = chance.toFixed(2) + '%';
    document.getElementById('dice-profit').textContent = formatMoney(Math.floor(diceBet * mult * 100) / 100);
    document.getElementById('dice-target-value').textContent = diceTarget.toFixed(2);

    // Update slider visual
    const slider = document.getElementById('dice-slider');
    if (slider) slider.value = diceTarget;

    const fill = document.getElementById('dice-slider-fill');
    if (fill) {
        if (diceMode === 'over') {
            fill.style.left = diceTarget + '%';
            fill.style.right = '0';
            fill.style.width = (100 - diceTarget) + '%';
        } else {
            fill.style.left = '0';
            fill.style.right = (100 - diceTarget) + '%';
            fill.style.width = diceTarget + '%';
        }
    }
}

function setDiceTarget(val) {
    diceTarget = Math.max(1, Math.min(98, parseFloat(val) || 50));
    updateDiceDisplay();
}

function toggleDiceMode() {
    diceMode = diceMode === 'over' ? 'under' : 'over';
    document.getElementById('dice-mode-btn').textContent = diceMode === 'over' ? 'Roll Over' : 'Roll Under';
    updateDiceDisplay();
}

function rollDice() {
    if (diceRolling) return;

    const balance = getBalance();
    if (balance < diceBet) {
        showToast('Insufficient funds!', 'error');
        return;
    }

    diceRolling = true;
    setBalance(balance - diceBet);

    document.getElementById('dice-result').textContent = '';
    document.getElementById('dice-result').className = 'result-bar';

    // Generate result (0.00 - 99.99)
    const result = Math.floor(Math.random() * 10000) / 100;

    // Animate rolling number
    const rollDisplay = document.getElementById('dice-roll-value');
    rollDisplay.className = 'dice-roll-value rolling';
    let animCount = 0;
    const animInterval = setInterval(() => {
        rollDisplay.textContent = (Math.floor(Math.random() * 10000) / 100).toFixed(2);
        animCount++;
        if (animCount > 20) {
            clearInterval(animInterval);
            rollDisplay.textContent = result.toFixed(2);

            // Check win
            const won = diceMode === 'over' ? result > diceTarget : result < diceTarget;
            const mult = getDiceMultiplier();

            if (won) {
                rollDisplay.className = 'dice-roll-value win';
                const payout = Math.floor(diceBet * mult * 100) / 100;
                const profit = payout - diceBet;
                setBalance(getBalance() + payout);
                addTransaction('Dice Win', profit);

                const resultEl = document.getElementById('dice-result');
                resultEl.textContent = `Rolled ${result.toFixed(2)} — Won ${formatMoney(payout)}!`;
                resultEl.className = 'result-bar win';
                showToast('+' + formatMoney(profit), 'success');
            } else {
                rollDisplay.className = 'dice-roll-value lose';
                addTransaction('Dice Loss', -diceBet);

                const resultEl = document.getElementById('dice-result');
                resultEl.textContent = `Rolled ${result.toFixed(2)} — You lost`;
                resultEl.className = 'result-bar lose';
            }

            diceRolling = false;
        }
    }, 50);
}

document.addEventListener('DOMContentLoaded', () => {
    updateDiceDisplay();

    const slider = document.getElementById('dice-slider');
    if (slider) {
        slider.addEventListener('input', (e) => {
            setDiceTarget(e.target.value);
        });
    }
});

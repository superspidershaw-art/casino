/* ========================================
   Royal Flush Casino - Mines
   ======================================== */

let minesState = 'idle'; // idle | playing | revealed
let minesBet = 10;
let minesCount = 5;
let minesGrid = []; // 25 cells: 'gem' or 'mine'
let minesRevealed = []; // boolean[25]
let minesMultiplier = 1;
let minesGemsFound = 0;

function setMinesBet(amount) {
    const val = parseFloat(amount);
    if (!val || val < 1) minesBet = 1;
    else minesBet = Math.round(val * 100) / 100;
    const input = document.getElementById('mines-bet-input');
    if (input && document.activeElement !== input) input.value = minesBet;
}

function halveMinesBet() { setMinesBet(minesBet / 2); document.getElementById('mines-bet-input').value = minesBet; }
function doubleMinesBet() { setMinesBet(minesBet * 2); document.getElementById('mines-bet-input').value = minesBet; }

function setMinesCount(val) {
    minesCount = Math.max(1, Math.min(24, parseInt(val) || 5));
    document.getElementById('mines-count-input').value = minesCount;
}

function getMinesMultiplier(gemsRevealed, totalMines) {
    // Fair multiplier based on probability
    const totalCells = 25;
    let mult = 0.97; // 3% house edge
    for (let i = 0; i < gemsRevealed; i++) {
        mult *= totalCells - i;
        mult /= (totalCells - totalMines - i);
    }
    return Math.floor(mult * 100) / 100;
}

function startMines() {
    if (minesState === 'playing') return;

    const balance = getBalance();
    if (balance < minesBet) {
        showToast('Insufficient funds!', 'error');
        return;
    }

    setBalance(balance - minesBet);
    minesState = 'playing';
    minesGemsFound = 0;
    minesMultiplier = 1;
    minesRevealed = new Array(25).fill(false);

    // Generate grid
    minesGrid = new Array(25).fill('gem');
    const minePositions = [];
    while (minePositions.length < minesCount) {
        const pos = Math.floor(Math.random() * 25);
        if (!minePositions.includes(pos)) {
            minePositions.push(pos);
            minesGrid[pos] = 'mine';
        }
    }

    // UI
    document.getElementById('mines-bet-panel').classList.add('hidden');
    document.getElementById('mines-cashout-panel').classList.remove('hidden');
    document.getElementById('mines-result').textContent = '';
    document.getElementById('mines-result').className = 'result-bar';
    updateMinesCashout();
    renderMinesGrid();
}

function renderMinesGrid() {
    const container = document.getElementById('mines-grid');
    container.innerHTML = '';
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'mines-cell';
        cell.dataset.index = i;

        if (minesRevealed[i]) {
            if (minesGrid[i] === 'mine') {
                cell.classList.add('mine');
                cell.innerHTML = '<span class="mines-icon mine-icon">&#x1F4A3;</span>';
            } else {
                cell.classList.add('gem');
                cell.innerHTML = '<span class="mines-icon gem-icon">&#x1F48E;</span>';
            }
        } else if (minesState === 'revealed') {
            // Show all after game over
            if (minesGrid[i] === 'mine') {
                cell.classList.add('mine', 'revealed-end');
                cell.innerHTML = '<span class="mines-icon mine-icon">&#x1F4A3;</span>';
            } else {
                cell.classList.add('gem-hidden');
                cell.innerHTML = '<span class="mines-icon gem-dim">&#x1F48E;</span>';
            }
        } else {
            cell.classList.add('unrevealed');
            cell.onclick = () => revealMinesCell(i);
        }

        container.appendChild(cell);
    }
}

function revealMinesCell(index) {
    if (minesState !== 'playing' || minesRevealed[index]) return;

    minesRevealed[index] = true;

    if (minesGrid[index] === 'mine') {
        // Hit a mine - lose
        minesState = 'revealed';
        addTransaction('Mines Loss', -minesBet);
        renderMinesGrid();

        document.getElementById('mines-cashout-panel').classList.add('hidden');
        const resultEl = document.getElementById('mines-result');
        resultEl.textContent = `You hit a mine! Lost ${formatMoney(minesBet)}`;
        resultEl.className = 'result-bar lose';

        setTimeout(() => {
            document.getElementById('mines-bet-panel').classList.remove('hidden');
            minesState = 'idle';
        }, 2000);
    } else {
        // Found a gem
        minesGemsFound++;
        minesMultiplier = getMinesMultiplier(minesGemsFound, minesCount);
        updateMinesCashout();
        renderMinesGrid();

        // Check if all gems found
        if (minesGemsFound === 25 - minesCount) {
            cashOutMines();
        }
    }
}

function updateMinesCashout() {
    const payout = Math.floor(minesBet * minesMultiplier * 100) / 100;
    document.getElementById('mines-cashout-amount').textContent = formatMoney(payout);
    document.getElementById('mines-multiplier').textContent = minesMultiplier.toFixed(2) + 'x';
    document.getElementById('mines-gems-count').textContent = minesGemsFound;
}

function cashOutMines() {
    if (minesState !== 'playing') return;

    minesState = 'revealed';
    const payout = Math.floor(minesBet * minesMultiplier * 100) / 100;
    const profit = payout - minesBet;
    setBalance(getBalance() + payout);
    addTransaction('Mines Win', profit);

    renderMinesGrid();

    document.getElementById('mines-cashout-panel').classList.add('hidden');
    const resultEl = document.getElementById('mines-result');
    resultEl.textContent = `Cashed out at ${minesMultiplier.toFixed(2)}x — Won ${formatMoney(payout)}!`;
    resultEl.className = 'result-bar win';
    showToast('+' + formatMoney(profit), 'success');

    setTimeout(() => {
        document.getElementById('mines-bet-panel').classList.remove('hidden');
        minesState = 'idle';
    }, 2000);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    renderMinesGrid();
});

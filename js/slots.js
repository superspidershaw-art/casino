/* ========================================
   Royal Flush Casino - Professional Slot Machine
   5x3 Reels, 20 Paylines, Wilds, Scatters, Free Spins
   ======================================== */

// Symbol definitions with payouts (per bet-line)
const SYMBOLS = [
    { id: 'wild',    icon: 'W',  label: 'WILD',    color: '#ffd700', bg: 'linear-gradient(135deg, #ffd700, #ff8c00)', payout: [0, 0, 50, 125, 500], isWild: true },
    { id: 'scatter', icon: 'S',  label: 'SCATTER', color: '#e040fb', bg: 'linear-gradient(135deg, #e040fb, #7c4dff)', payout: [0, 0, 5, 20, 100], isScatter: true },
    { id: 'seven',   icon: '7',  label: '7',       color: '#ff1744', bg: 'linear-gradient(135deg, #ff1744, #d50000)', payout: [0, 0, 30, 100, 300] },
    { id: 'diamond', icon: '\u2666', label: 'Diamond', color: '#00e5ff', bg: 'linear-gradient(135deg, #00e5ff, #0091ea)', payout: [0, 0, 25, 75, 250] },
    { id: 'crown',   icon: '\u265B', label: 'Crown',   color: '#ffd740', bg: 'linear-gradient(135deg, #ffd740, #ff6f00)', payout: [0, 0, 20, 50, 200] },
    { id: 'bell',    icon: '\u266A', label: 'Bell',    color: '#69f0ae', bg: 'linear-gradient(135deg, #69f0ae, #00c853)', payout: [0, 0, 15, 40, 150] },
    { id: 'cherry',  icon: '\u2764', label: 'Cherry',  color: '#ff5252', bg: 'linear-gradient(135deg, #ff5252, #d32f2f)', payout: [0, 0, 10, 30, 100] },
    { id: 'grape',   icon: '\u25C6', label: 'Grape',   color: '#b388ff', bg: 'linear-gradient(135deg, #b388ff, #7c4dff)', payout: [0, 0, 5, 15, 50] },
    { id: 'lemon',   icon: '\u2605', label: 'Star',    color: '#ffff00', bg: 'linear-gradient(135deg, #ffff00, #ffc400)', payout: [0, 0, 5, 15, 50] },
];

// Weighted symbol pool (higher symbols appear less)
const REEL_WEIGHTS = [
    { id: 'wild', weight: 2 },
    { id: 'scatter', weight: 3 },
    { id: 'seven', weight: 4 },
    { id: 'diamond', weight: 5 },
    { id: 'crown', weight: 6 },
    { id: 'bell', weight: 8 },
    { id: 'cherry', weight: 10 },
    { id: 'grape', weight: 12 },
    { id: 'lemon', weight: 12 },
];

// 20 Paylines (positions on 5x3 grid, [row] for each reel)
const PAYLINES = [
    [1,1,1,1,1], // center horizontal
    [0,0,0,0,0], // top horizontal
    [2,2,2,2,2], // bottom horizontal
    [0,1,2,1,0], // V shape
    [2,1,0,1,2], // inverted V
    [0,0,1,0,0], // slight dip
    [2,2,1,2,2], // slight rise
    [1,0,0,0,1], // U shape
    [1,2,2,2,1], // inverted U
    [0,1,1,1,0], // shallow V
    [2,1,1,1,2], // shallow inverted V
    [1,0,1,0,1], // zigzag up
    [1,2,1,2,1], // zigzag down
    [0,1,0,1,0], // wave up
    [2,1,2,1,2], // wave down
    [1,0,0,1,1], // left dip
    [1,2,2,1,1], // left rise
    [0,0,1,2,2], // diagonal down
    [2,2,1,0,0], // diagonal up
    [0,1,2,2,1], // slide
];

const PAYLINE_COLORS = [
    '#ff1744','#ffd740','#00e5ff','#69f0ae','#e040fb',
    '#ff6d00','#76ff03','#40c4ff','#ff4081','#ffab40',
    '#b388ff','#18ffff','#f4ff81','#ff80ab','#82b1ff',
    '#ea80fc','#b9f6ca','#80d8ff','#ffe57f','#ff9e80'
];

// Game state
let slotBet = 1;
let totalBet = 20; // bet * 20 paylines
let isSpinning = false;
let freeSpinsLeft = 0;
let freeSpinsWon = 0;
let currentGrid = null;
let autoSpinActive = false;
let autoSpinCount = 0;

function getSymbol(id) {
    return SYMBOLS.find(s => s.id === id);
}

function buildWeightedPool() {
    const pool = [];
    for (const w of REEL_WEIGHTS) {
        for (let i = 0; i < w.weight; i++) {
            pool.push(w.id);
        }
    }
    return pool;
}

const REEL_POOL = buildWeightedPool();

function randomSymbolId() {
    return REEL_POOL[Math.floor(Math.random() * REEL_POOL.length)];
}

function setSlotBet(amount) {
    const val = parseFloat(amount);
    if (!val || val < 0.05) {
        slotBet = 0.05;
    } else {
        slotBet = Math.round(val * 100) / 100;
    }
    totalBet = Math.round(slotBet * 20 * 100) / 100;
    const input = document.getElementById('slot-bet-input');
    if (input && document.activeElement !== input) {
        input.value = slotBet;
    }
    document.getElementById('slot-total-bet').textContent = formatMoney(totalBet);
}

function halveSlotBet() {
    setSlotBet(slotBet / 2);
    document.getElementById('slot-bet-input').value = slotBet;
}

function doubleSlotBet() {
    setSlotBet(slotBet * 2);
    document.getElementById('slot-bet-input').value = slotBet;
}

function maxSlotBet() {
    const maxFromBalance = Math.floor(getBalance() / 20 * 100) / 100;
    setSlotBet(maxFromBalance);
    document.getElementById('slot-bet-input').value = slotBet;
}

// Build the slot display
function initSlotMachine() {
    const viewport = document.getElementById('slots-viewport');
    if (!viewport) return;

    viewport.innerHTML = '';
    for (let col = 0; col < 5; col++) {
        const reelCol = document.createElement('div');
        reelCol.className = 'slot-reel-col';
        reelCol.id = `reel-col-${col}`;

        for (let row = 0; row < 3; row++) {
            const cell = document.createElement('div');
            cell.className = 'slot-cell';
            cell.id = `slot-${row}-${col}`;

            const sym = getSymbol('seven');
            cell.innerHTML = `<div class="slot-symbol" style="background:${sym.bg}"><span>${sym.icon}</span></div>`;
            reelCol.appendChild(cell);
        }
        viewport.appendChild(reelCol);
    }
}

function renderGrid(grid) {
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
            const cell = document.getElementById(`slot-${row}-${col}`);
            const sym = getSymbol(grid[row][col]);
            cell.innerHTML = `<div class="slot-symbol" style="background:${sym.bg}"><span>${sym.icon}</span></div>`;
            cell.className = 'slot-cell';
        }
    }
}

function spinSlots() {
    if (isSpinning) return;

    const balance = getBalance();
    const cost = freeSpinsLeft > 0 ? 0 : totalBet;

    if (cost > 0 && balance < cost) {
        showToast('Insufficient funds! Visit the wallet to deposit.', 'error');
        autoSpinActive = false;
        return;
    }

    isSpinning = true;
    if (cost > 0) {
        setBalance(balance - cost);
    }

    document.getElementById('btn-spin').disabled = true;
    document.getElementById('slots-result').textContent = '';
    document.getElementById('slots-result').className = 'result-bar';

    // Clear win highlights
    document.querySelectorAll('.slot-cell').forEach(c => {
        c.classList.remove('winner', 'scatter-win');
    });
    document.querySelectorAll('.payline-overlay').forEach(el => el.remove());

    // Free spins indicator
    if (freeSpinsLeft > 0) {
        document.getElementById('free-spins-display').textContent = `Free Spins: ${freeSpinsLeft}`;
        document.getElementById('free-spins-display').classList.remove('hidden');
    }

    // Generate result grid
    const grid = [];
    for (let row = 0; row < 3; row++) {
        grid[row] = [];
        for (let col = 0; col < 5; col++) {
            grid[row][col] = randomSymbolId();
        }
    }
    currentGrid = grid;

    // Spin animation - each reel stops with delay
    const reelCols = document.querySelectorAll('.slot-reel-col');
    reelCols.forEach(col => col.classList.add('spinning'));

    // Quick random cycling during spin
    let spinFrame = 0;
    const spinInterval = setInterval(() => {
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = document.getElementById(`slot-${row}-${col}`);
                const rSym = getSymbol(randomSymbolId());
                cell.innerHTML = `<div class="slot-symbol" style="background:${rSym.bg}"><span>${rSym.icon}</span></div>`;
            }
        }
        spinFrame++;
    }, 60);

    // Stop reels one by one
    const stopDelay = [600, 900, 1200, 1500, 1800];
    stopDelay.forEach((delay, col) => {
        setTimeout(() => {
            // Set final symbols for this column
            for (let row = 0; row < 3; row++) {
                const cell = document.getElementById(`slot-${row}-${col}`);
                const sym = getSymbol(grid[row][col]);
                cell.innerHTML = `<div class="slot-symbol" style="background:${sym.bg}"><span>${sym.icon}</span></div>`;
                cell.classList.add('stopping');
            }
            reelCols[col].classList.remove('spinning');
            reelCols[col].classList.add('stopped');

            // After all reels stop
            if (col === 4) {
                clearInterval(spinInterval);
                setTimeout(() => {
                    reelCols.forEach(c => c.classList.remove('stopped'));
                    document.querySelectorAll('.slot-cell.stopping').forEach(c => c.classList.remove('stopping'));
                    evaluateSpinResult(grid);
                }, 300);
            }
        }, delay);
    });
}

function evaluateSpinResult(grid) {
    let totalWin = 0;
    const winningCells = new Set();
    const winLines = [];

    // Check each payline
    for (let lineIdx = 0; lineIdx < PAYLINES.length; lineIdx++) {
        const line = PAYLINES[lineIdx];
        const lineSymbols = line.map((row, col) => grid[row][col]);

        // Find first non-wild symbol
        let baseSymbol = null;
        for (const symId of lineSymbols) {
            const sym = getSymbol(symId);
            if (!sym.isWild && !sym.isScatter) {
                baseSymbol = symId;
                break;
            }
        }

        if (!baseSymbol) {
            // All wilds
            if (lineSymbols.every(s => getSymbol(s).isWild)) {
                baseSymbol = 'wild';
            } else {
                continue;
            }
        }

        // Count consecutive matching symbols from left (wilds count)
        let matchCount = 0;
        for (let col = 0; col < 5; col++) {
            const symId = lineSymbols[col];
            const sym = getSymbol(symId);
            if (symId === baseSymbol || sym.isWild) {
                matchCount++;
            } else {
                break;
            }
        }

        if (matchCount >= 3) {
            const baseSym = getSymbol(baseSymbol);
            const linePayout = baseSym.payout[matchCount - 1] * slotBet;
            totalWin += linePayout;

            // Track winning cells
            for (let col = 0; col < matchCount; col++) {
                winningCells.add(`${line[col]}-${col}`);
            }

            winLines.push({ lineIdx, matchCount, payout: linePayout, symbol: baseSymbol });
        }
    }

    // Count scatters (anywhere on grid)
    let scatterCount = 0;
    const scatterPositions = [];
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
            if (grid[row][col] === 'scatter') {
                scatterCount++;
                scatterPositions.push(`${row}-${col}`);
            }
        }
    }

    // Scatter pays (total bet multiplier)
    if (scatterCount >= 3) {
        const scatterSym = getSymbol('scatter');
        const scatterPay = scatterSym.payout[scatterCount - 1] * totalBet;
        totalWin += scatterPay;

        scatterPositions.forEach(pos => {
            const cell = document.getElementById(`slot-${pos}`);
            if (cell) cell.classList.add('scatter-win');
        });

        // Trigger free spins
        const freeSpinsAwarded = scatterCount === 3 ? 10 : (scatterCount === 4 ? 15 : 25);
        freeSpinsLeft += freeSpinsAwarded;
        freeSpinsWon += freeSpinsAwarded;
        showToast(`${freeSpinsAwarded} Free Spins awarded!`, 'success');
    }

    // Highlight winning cells
    winningCells.forEach(pos => {
        const cell = document.getElementById(`slot-${pos}`);
        if (cell) cell.classList.add('winner');
    });

    // Display results
    const resultEl = document.getElementById('slots-result');

    if (totalWin > 0) {
        const payout = Math.round(totalWin * 100) / 100;
        setBalance(getBalance() + payout);
        const transLabel = freeSpinsLeft > 0 ? 'Slots Free Spin Win' : 'Slots Win';
        addTransaction(transLabel, payout);
        resultEl.textContent = `WIN ${formatMoney(payout)}!`;
        resultEl.className = 'result-bar win';

        if (payout >= totalBet * 10) {
            resultEl.textContent = `BIG WIN! ${formatMoney(payout)}!`;
            resultEl.classList.add('big-win');
        }

        showToast('+' + formatMoney(payout), 'success');

        // Animate win lines
        if (winLines.length > 0) {
            animateWinLines(winLines);
        }
    } else {
        if (freeSpinsLeft <= 0) {
            addTransaction('Slots Loss', -totalBet);
        }
        resultEl.textContent = 'No win this spin';
        resultEl.className = 'result-bar lose';
    }

    // Free spins management
    if (freeSpinsLeft > 0) {
        freeSpinsLeft--;
        if (freeSpinsLeft === 0) {
            document.getElementById('free-spins-display').classList.add('hidden');
            if (freeSpinsWon > 0) {
                showToast('Free spins complete!', 'success');
                freeSpinsWon = 0;
            }
        } else {
            document.getElementById('free-spins-display').textContent = `Free Spins: ${freeSpinsLeft}`;
        }
    }

    isSpinning = false;
    document.getElementById('btn-spin').disabled = false;

    // Auto spin
    if (autoSpinActive && autoSpinCount > 0) {
        autoSpinCount--;
        if (autoSpinCount <= 0) {
            autoSpinActive = false;
            document.getElementById('btn-auto-spin').textContent = 'Auto';
            return;
        }
        document.getElementById('btn-auto-spin').textContent = `Stop (${autoSpinCount})`;
        setTimeout(() => {
            if (autoSpinActive) spinSlots();
        }, 1200);
    }
}

function animateWinLines(winLines) {
    let lineIndex = 0;
    const showNext = () => {
        if (lineIndex >= winLines.length || lineIndex >= 3) return; // Show max 3 lines

        const wl = winLines[lineIndex];
        const line = PAYLINES[wl.lineIdx];
        const color = PAYLINE_COLORS[wl.lineIdx];

        // Highlight the cells for this payline
        for (let col = 0; col < wl.matchCount; col++) {
            const cell = document.getElementById(`slot-${line[col]}-${col}`);
            if (cell) {
                cell.style.boxShadow = `inset 0 0 0 3px ${color}, 0 0 15px ${color}40`;
                setTimeout(() => {
                    cell.style.boxShadow = '';
                }, 1500);
            }
        }

        lineIndex++;
        if (lineIndex < winLines.length && lineIndex < 3) {
            setTimeout(showNext, 600);
        }
    };
    showNext();
}

function toggleAutoSpin() {
    if (autoSpinActive) {
        autoSpinActive = false;
        autoSpinCount = 0;
        document.getElementById('btn-auto-spin').textContent = 'Auto';
        return;
    }

    autoSpinActive = true;
    autoSpinCount = 25;
    document.getElementById('btn-auto-spin').textContent = `Stop (${autoSpinCount})`;
    if (!isSpinning) spinSlots();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initSlotMachine();

    const betInput = document.getElementById('slot-bet-input');
    if (betInput) {
        betInput.addEventListener('change', () => setSlotBet(betInput.value));
        betInput.addEventListener('input', () => {
            const val = parseFloat(betInput.value);
            if (val && val > 0) {
                slotBet = val;
                totalBet = Math.round(slotBet * 20 * 100) / 100;
                document.getElementById('slot-total-bet').textContent = formatMoney(totalBet);
            }
        });
    }
});

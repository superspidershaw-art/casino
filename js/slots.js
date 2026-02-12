/* ========================================
   Royal Flush Casino - Multi-Theme Slot Engine
   5x3 Reels, 20 Paylines, Wilds, Scatters, Free Spins
   ======================================== */

const PAYLINES = [
    [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
    [0,0,1,0,0],[2,2,1,2,2],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],
    [2,1,1,1,2],[1,0,1,0,1],[1,2,1,2,1],[0,1,0,1,0],[2,1,2,1,2],
    [1,0,0,1,1],[1,2,2,1,1],[0,0,1,2,2],[2,2,1,0,0],[0,1,2,2,1],
];

const PAYLINE_COLORS = [
    '#ff1744','#ffd740','#00e5ff','#69f0ae','#e040fb',
    '#ff6d00','#76ff03','#40c4ff','#ff4081','#ffab40',
    '#b388ff','#18ffff','#f4ff81','#ff80ab','#82b1ff',
    '#ea80fc','#b9f6ca','#80d8ff','#ffe57f','#ff9e80'
];

let activeSlotTheme = null;
let slotBet = 1;
let totalBet = 20;
let isSpinning = false;
let freeSpinsLeft = 0;
let freeSpinsWon = 0;
let currentGrid = null;
let autoSpinActive = false;
let autoSpinCount = 0;
let slotReelPool = [];

function getSlotSymbol(id) {
    if (!activeSlotTheme) return null;
    return activeSlotTheme.symbols.find(s => s.id === id);
}

function buildSlotPool(theme) {
    const pool = [];
    for (const w of theme.weights) {
        for (let i = 0; i < w.weight; i++) pool.push(w.id);
    }
    return pool;
}

function randomSlotSymbolId() {
    return slotReelPool[Math.floor(Math.random() * slotReelPool.length)];
}

function loadSlotGame(themeId) {
    const theme = SLOT_THEMES[themeId];
    if (!theme) return;

    activeSlotTheme = theme;
    slotReelPool = buildSlotPool(theme);
    slotBet = 1;
    totalBet = 20;
    isSpinning = false;
    freeSpinsLeft = 0;
    freeSpinsWon = 0;
    autoSpinActive = false;
    autoSpinCount = 0;

    const header = document.querySelector('#page-slots .game-header h2');
    if (header) header.textContent = theme.name;

    renderSlotPaytable(theme);
    initSlotMachine();

    const betInput = document.getElementById('slot-bet-input');
    if (betInput) betInput.value = slotBet;
    document.getElementById('slot-total-bet').textContent = formatMoney(totalBet);
    document.getElementById('slots-result').textContent = '';
    document.getElementById('slots-result').className = 'result-bar';
    document.getElementById('free-spins-display').classList.add('hidden');

    const infoEl = document.getElementById('slot-game-info');
    if (infoEl) {
        infoEl.innerHTML = `<div class="slot-info-row"><span>RTP</span><strong>${theme.rtp}</strong></div>
            <div class="slot-info-row"><span>Volatility</span><strong>${theme.volatility}</strong></div>
            <div class="slot-info-row"><span>Max Win</span><strong>${theme.maxWin}</strong></div>`;
    }

    navigate('slots');
}

function renderSlotPaytable(theme) {
    const container = document.getElementById('slot-paytable');
    if (!container) return;
    const topSymbols = theme.symbols.slice(0, 5);
    container.innerHTML = topSymbols.map(sym => {
        const label = sym.isWild ? 'WILD' : (sym.isScatter ? 'SCATTER' : sym.label);
        const payoutText = sym.isScatter ? 'Free Spins' : sym.payout[4] + 'x';
        return `<div class="pt-row"><span class="pt-sym" style="background:${sym.bg}">${sym.icon}</span><span class="pt-label">${label}</span><span class="pt-payout">${payoutText}</span></div>`;
    }).join('');
}

function setSlotBet(amount) {
    const val = parseFloat(amount);
    if (!val || val < 0.05) slotBet = 0.05;
    else slotBet = Math.round(val * 100) / 100;
    totalBet = Math.round(slotBet * 20 * 100) / 100;
    const input = document.getElementById('slot-bet-input');
    if (input && document.activeElement !== input) input.value = slotBet;
    document.getElementById('slot-total-bet').textContent = formatMoney(totalBet);
}

function halveSlotBet() { setSlotBet(slotBet / 2); document.getElementById('slot-bet-input').value = slotBet; }
function doubleSlotBet() { setSlotBet(slotBet * 2); document.getElementById('slot-bet-input').value = slotBet; }
function maxSlotBet() {
    setSlotBet(Math.floor(getBalance() / 20 * 100) / 100);
    document.getElementById('slot-bet-input').value = slotBet;
}

function initSlotMachine() {
    const viewport = document.getElementById('slots-viewport');
    if (!viewport || !activeSlotTheme) return;
    viewport.innerHTML = '';
    const defSym = activeSlotTheme.symbols[2];
    for (let col = 0; col < 5; col++) {
        const reelCol = document.createElement('div');
        reelCol.className = 'slot-reel-col';
        reelCol.id = `reel-col-${col}`;
        for (let row = 0; row < 3; row++) {
            const cell = document.createElement('div');
            cell.className = 'slot-cell';
            cell.id = `slot-${row}-${col}`;
            cell.innerHTML = `<div class="slot-symbol" style="background:${defSym.bg}"><span>${defSym.icon}</span></div>`;
            reelCol.appendChild(cell);
        }
        viewport.appendChild(reelCol);
    }
}

function spinSlots() {
    if (isSpinning || !activeSlotTheme) return;
    const balance = getBalance();
    const cost = freeSpinsLeft > 0 ? 0 : totalBet;
    if (cost > 0 && balance < cost) { showToast('Insufficient funds!', 'error'); autoSpinActive = false; return; }
    isSpinning = true;
    if (cost > 0) setBalance(balance - cost);
    document.getElementById('btn-spin').disabled = true;
    document.getElementById('slots-result').textContent = '';
    document.getElementById('slots-result').className = 'result-bar';
    document.querySelectorAll('.slot-cell').forEach(c => c.classList.remove('winner', 'scatter-win'));
    if (freeSpinsLeft > 0) {
        document.getElementById('free-spins-display').textContent = `Free Spins: ${freeSpinsLeft}`;
        document.getElementById('free-spins-display').classList.remove('hidden');
    }
    const grid = [];
    for (let row = 0; row < 3; row++) { grid[row] = []; for (let col = 0; col < 5; col++) grid[row][col] = randomSlotSymbolId(); }
    currentGrid = grid;
    const reelCols = document.querySelectorAll('.slot-reel-col');
    reelCols.forEach(col => col.classList.add('spinning'));
    const spinInterval = setInterval(() => {
        for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
            const cell = document.getElementById(`slot-${row}-${col}`);
            const rSym = getSlotSymbol(randomSlotSymbolId());
            cell.innerHTML = `<div class="slot-symbol" style="background:${rSym.bg}"><span>${rSym.icon}</span></div>`;
        }
    }, 60);
    [600, 900, 1200, 1500, 1800].forEach((delay, col) => {
        setTimeout(() => {
            for (let row = 0; row < 3; row++) {
                const cell = document.getElementById(`slot-${row}-${col}`);
                const sym = getSlotSymbol(grid[row][col]);
                cell.innerHTML = `<div class="slot-symbol" style="background:${sym.bg}"><span>${sym.icon}</span></div>`;
                cell.classList.add('stopping');
            }
            reelCols[col].classList.remove('spinning');
            reelCols[col].classList.add('stopped');
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
    for (let lineIdx = 0; lineIdx < PAYLINES.length; lineIdx++) {
        const line = PAYLINES[lineIdx];
        const lineSymbols = line.map((row, col) => grid[row][col]);
        let baseSymbol = null;
        for (const symId of lineSymbols) { const sym = getSlotSymbol(symId); if (!sym.isWild && !sym.isScatter) { baseSymbol = symId; break; } }
        if (!baseSymbol) { if (lineSymbols.every(s => getSlotSymbol(s).isWild)) baseSymbol = 'wild'; else continue; }
        let matchCount = 0;
        for (let col = 0; col < 5; col++) { const sym = getSlotSymbol(lineSymbols[col]); if (lineSymbols[col] === baseSymbol || sym.isWild) matchCount++; else break; }
        if (matchCount >= 3) {
            const baseSym = getSlotSymbol(baseSymbol);
            const linePayout = baseSym.payout[matchCount - 1] * slotBet;
            totalWin += linePayout;
            for (let col = 0; col < matchCount; col++) winningCells.add(`${line[col]}-${col}`);
            winLines.push({ lineIdx, matchCount, payout: linePayout, symbol: baseSymbol });
        }
    }
    let scatterCount = 0; const scatterPositions = [];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) { if (grid[row][col] === 'scatter') { scatterCount++; scatterPositions.push(`${row}-${col}`); } }
    if (scatterCount >= 3) {
        const scatterSym = getSlotSymbol('scatter');
        totalWin += scatterSym.payout[scatterCount - 1] * totalBet;
        scatterPositions.forEach(pos => { const cell = document.getElementById(`slot-${pos}`); if (cell) cell.classList.add('scatter-win'); });
        const fsa = scatterCount === 3 ? 10 : (scatterCount === 4 ? 15 : 25);
        freeSpinsLeft += fsa; freeSpinsWon += fsa;
        showToast(`${fsa} Free Spins awarded!`, 'success');
    }
    winningCells.forEach(pos => { const cell = document.getElementById(`slot-${pos}`); if (cell) cell.classList.add('winner'); });
    const resultEl = document.getElementById('slots-result');
    const tName = activeSlotTheme ? activeSlotTheme.name : 'Slots';
    if (totalWin > 0) {
        const payout = Math.round(totalWin * 100) / 100;
        setBalance(getBalance() + payout); addTransaction(tName + ' Win', payout);
        resultEl.textContent = `WIN ${formatMoney(payout)}!`; resultEl.className = 'result-bar win';
        if (payout >= totalBet * 10) { resultEl.textContent = `BIG WIN! ${formatMoney(payout)}!`; resultEl.classList.add('big-win'); }
        showToast('+' + formatMoney(payout), 'success');
        if (winLines.length > 0) animateWinLines(winLines);
    } else {
        if (freeSpinsLeft <= 0) addTransaction(tName + ' Loss', -totalBet);
        resultEl.textContent = 'No win this spin'; resultEl.className = 'result-bar lose';
    }
    if (freeSpinsLeft > 0) { freeSpinsLeft--; if (freeSpinsLeft === 0) { document.getElementById('free-spins-display').classList.add('hidden'); if (freeSpinsWon > 0) { showToast('Free spins complete!', 'success'); freeSpinsWon = 0; } } else { document.getElementById('free-spins-display').textContent = `Free Spins: ${freeSpinsLeft}`; } }
    isSpinning = false;
    document.getElementById('btn-spin').disabled = false;
    if (autoSpinActive && autoSpinCount > 0) {
        autoSpinCount--;
        if (autoSpinCount <= 0) { autoSpinActive = false; document.getElementById('btn-auto-spin').textContent = 'Auto'; return; }
        document.getElementById('btn-auto-spin').textContent = `Stop (${autoSpinCount})`;
        setTimeout(() => { if (autoSpinActive) spinSlots(); }, 1200);
    }
}

function animateWinLines(winLines) {
    let i = 0;
    const show = () => {
        if (i >= winLines.length || i >= 3) return;
        const wl = winLines[i]; const line = PAYLINES[wl.lineIdx]; const color = PAYLINE_COLORS[wl.lineIdx];
        for (let col = 0; col < wl.matchCount; col++) {
            const cell = document.getElementById(`slot-${line[col]}-${col}`);
            if (cell) { cell.style.boxShadow = `inset 0 0 0 3px ${color}, 0 0 15px ${color}40`; setTimeout(() => { cell.style.boxShadow = ''; }, 1500); }
        }
        i++;
        if (i < winLines.length && i < 3) setTimeout(show, 600);
    };
    show();
}

function toggleAutoSpin() {
    if (autoSpinActive) { autoSpinActive = false; autoSpinCount = 0; document.getElementById('btn-auto-spin').textContent = 'Auto'; return; }
    autoSpinActive = true; autoSpinCount = 25;
    document.getElementById('btn-auto-spin').textContent = `Stop (${autoSpinCount})`;
    if (!isSpinning) spinSlots();
}

document.addEventListener('DOMContentLoaded', () => {
    if (SLOT_THEMES && SLOT_THEMES['mega-fortune'] && !activeSlotTheme) {
        activeSlotTheme = SLOT_THEMES['mega-fortune'];
        slotReelPool = buildSlotPool(activeSlotTheme);
        initSlotMachine();
        renderSlotPaytable(activeSlotTheme);
    }
    const betInput = document.getElementById('slot-bet-input');
    if (betInput) {
        betInput.addEventListener('change', () => setSlotBet(betInput.value));
        betInput.addEventListener('input', () => {
            const val = parseFloat(betInput.value);
            if (val && val > 0) { slotBet = val; totalBet = Math.round(slotBet * 20 * 100) / 100; document.getElementById('slot-total-bet').textContent = formatMoney(totalBet); }
        });
    }
});

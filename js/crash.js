/* ========================================
   Royal Flush Casino - Crash Game
   ======================================== */

let crashState = 'idle'; // idle | running | crashed | cashedout
let crashMultiplier = 1.00;
let crashPoint = 1.00;
let crashBetAmount = 0;
let crashAnimFrame = null;
let crashStartTime = 0;
let crashHistory = [];
let crashGraphPoints = [];

const CRASH_TICK = 50; // ms per update

// Generate a provably-fair-style crash point
function generateCrashPoint() {
    // House edge ~3.5%: E = 0.99 / random
    // Clamped so ~3.5% of rounds crash at 1.00x (instant crash)
    const r = Math.random();
    if (r < 0.035) return 1.00;
    return Math.max(1.00, Math.floor((0.99 / r) * 100) / 100);
}

function startCrash() {
    const betInput = document.getElementById('crash-bet');
    const bet = parseFloat(betInput.value);

    if (!bet || bet < 1) {
        showToast('Minimum bet is $1.', 'error');
        return;
    }

    if (bet > getBalance()) {
        showToast('Insufficient funds!', 'error');
        return;
    }

    // Deduct bet
    crashBetAmount = bet;
    setBalance(getBalance() - crashBetAmount);

    // Generate crash point
    crashPoint = generateCrashPoint();
    crashMultiplier = 1.00;
    crashState = 'running';
    crashGraphPoints = [];
    crashStartTime = performance.now();

    // UI
    document.getElementById('crash-bet-controls').classList.add('hidden');
    document.getElementById('crash-cashout-controls').classList.remove('hidden');
    document.getElementById('crash-wait-controls').classList.add('hidden');
    document.getElementById('crash-result').textContent = '';
    document.getElementById('crash-result').className = 'result-bar';

    const multiplierEl = document.getElementById('crash-multiplier');
    multiplierEl.className = 'crash-multiplier rising';
    multiplierEl.textContent = '1.00x';

    // Start animation
    runCrashLoop();
}

function runCrashLoop() {
    if (crashState !== 'running') return;

    const elapsed = performance.now() - crashStartTime;
    // Multiplier grows exponentially: 1.0 * e^(0.00006 * elapsed)
    // This gives roughly: 2x at ~11.5s, 5x at ~26.8s, 10x at ~38.4s
    crashMultiplier = Math.floor(Math.pow(Math.E, 0.00006 * elapsed) * 100) / 100;

    // Record point for graph
    crashGraphPoints.push({ time: elapsed, mult: crashMultiplier });

    // Update display
    const multiplierEl = document.getElementById('crash-multiplier');
    multiplierEl.textContent = crashMultiplier.toFixed(2) + 'x';

    // Update cashout button amount
    const payout = Math.floor(crashBetAmount * crashMultiplier * 100) / 100;
    document.getElementById('cashout-amount').textContent = formatMoney(payout);

    // Check auto cashout
    const autoVal = parseFloat(document.getElementById('crash-auto').value);
    if (autoVal && crashMultiplier >= autoVal) {
        cashOut();
        return;
    }

    // Check if crashed
    if (crashMultiplier >= crashPoint) {
        crashEnd();
        return;
    }

    // Draw graph
    drawCrashGraph();

    crashAnimFrame = requestAnimationFrame(runCrashLoop);
}

function cashOut() {
    if (crashState !== 'running') return;

    crashState = 'cashedout';
    cancelAnimationFrame(crashAnimFrame);

    const payout = Math.floor(crashBetAmount * crashMultiplier * 100) / 100;
    const profit = payout - crashBetAmount;
    setBalance(getBalance() + payout);
    addTransaction('Crash Win', profit);

    // UI
    const multiplierEl = document.getElementById('crash-multiplier');
    multiplierEl.className = 'crash-multiplier cashed';
    multiplierEl.textContent = crashMultiplier.toFixed(2) + 'x';

    const resultEl = document.getElementById('crash-result');
    resultEl.textContent = `Cashed out at ${crashMultiplier.toFixed(2)}x — Won ${formatMoney(payout)}!`;
    resultEl.className = 'result-bar win';

    document.getElementById('crash-cashout-controls').classList.add('hidden');
    showToast(`+${formatMoney(profit)}`, 'success');

    // Continue animation to show crash point
    continueUntilCrash();
}

function continueUntilCrash() {
    if (crashMultiplier >= crashPoint) {
        finishRound();
        return;
    }

    const elapsed = performance.now() - crashStartTime;
    crashMultiplier = Math.floor(Math.pow(Math.E, 0.00006 * elapsed) * 100) / 100;
    crashGraphPoints.push({ time: elapsed, mult: crashMultiplier });

    if (crashMultiplier >= crashPoint) {
        crashMultiplier = crashPoint;
        finishRound();
        return;
    }

    drawCrashGraph();
    crashAnimFrame = requestAnimationFrame(continueUntilCrash);
}

function crashEnd() {
    crashState = 'crashed';
    cancelAnimationFrame(crashAnimFrame);

    crashMultiplier = crashPoint;
    addTransaction('Crash Loss', -crashBetAmount);

    // UI
    const multiplierEl = document.getElementById('crash-multiplier');
    multiplierEl.className = 'crash-multiplier crashed';
    multiplierEl.textContent = crashPoint.toFixed(2) + 'x';

    const resultEl = document.getElementById('crash-result');
    resultEl.textContent = `Crashed at ${crashPoint.toFixed(2)}x — You lost ${formatMoney(crashBetAmount)}`;
    resultEl.className = 'result-bar lose';

    document.getElementById('crash-cashout-controls').classList.add('hidden');

    drawCrashGraph(true);
    finishRound();
}

function finishRound() {
    // Add to history
    crashHistory.unshift(crashPoint);
    if (crashHistory.length > 20) crashHistory.pop();
    renderCrashHistory();

    // Show bet controls again after a delay
    setTimeout(() => {
        document.getElementById('crash-bet-controls').classList.remove('hidden');
        document.getElementById('crash-cashout-controls').classList.add('hidden');
        document.getElementById('crash-wait-controls').classList.add('hidden');
        crashState = 'idle';
    }, 2000);
}

// ===== Canvas Graph =====
function drawCrashGraph(isCrashed = false) {
    const canvas = document.getElementById('crash-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    // Handle high-DPI displays
    if (canvas.getAttribute('data-scaled') !== 'true') {
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.scale(dpr, dpr);
        canvas.setAttribute('data-scaled', 'true');
    }

    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = 'rgba(47, 69, 83, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
        const y = H - (H * i / 6);
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(W - 10, y);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#7a8a9e';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        const label = (1 + (i / 6) * (Math.max(crashMultiplier, 2) - 1)).toFixed(1) + 'x';
        ctx.fillText(label, 36, y + 4);
    }

    if (crashGraphPoints.length < 2) return;

    // Scale
    const maxMult = Math.max(crashMultiplier, 2);
    const maxTime = crashGraphPoints[crashGraphPoints.length - 1].time;

    const toX = (t) => 45 + (t / maxTime) * (W - 60);
    const toY = (m) => H - 20 - ((m - 1) / (maxMult - 1)) * (H - 40);

    // Draw filled area
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(1));
    for (const p of crashGraphPoints) {
        ctx.lineTo(toX(p.time), toY(p.mult));
    }
    const lastPoint = crashGraphPoints[crashGraphPoints.length - 1];
    ctx.lineTo(toX(lastPoint.time), H - 20);
    ctx.lineTo(toX(0), H - 20);
    ctx.closePath();

    if (isCrashed || crashState === 'crashed') {
        ctx.fillStyle = 'rgba(237, 66, 69, 0.08)';
    } else if (crashState === 'cashedout') {
        ctx.fillStyle = 'rgba(31, 255, 32, 0.06)';
    } else {
        ctx.fillStyle = 'rgba(31, 255, 32, 0.08)';
    }
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(toX(crashGraphPoints[0].time), toY(crashGraphPoints[0].mult));
    for (let i = 1; i < crashGraphPoints.length; i++) {
        ctx.lineTo(toX(crashGraphPoints[i].time), toY(crashGraphPoints[i].mult));
    }
    ctx.lineWidth = 3;
    if (isCrashed || crashState === 'crashed') {
        ctx.strokeStyle = '#ed4245';
    } else {
        ctx.strokeStyle = '#1fff20';
    }
    ctx.stroke();

    // Draw dot at end
    ctx.beginPath();
    ctx.arc(toX(lastPoint.time), toY(lastPoint.mult), 5, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
}

// ===== History =====
function renderCrashHistory() {
    const container = document.getElementById('crash-history');
    if (!container) return;

    if (crashHistory.length === 0) {
        container.innerHTML = '<p class="empty-state">No rounds yet</p>';
        return;
    }

    container.innerHTML = crashHistory.map(point => {
        const cls = point < 2 ? 'crash-hist-low' : (point >= 10 ? 'crash-hist-high' : 'crash-hist-mid');
        return `<span class="crash-hist-item ${cls}">${point.toFixed(2)}x</span>`;
    }).join('');
}

/* ========================================
   Royal Flush Casino - Plinko
   ======================================== */

let plinkoBet = 10;
let plinkoRisk = 'medium'; // low | medium | high
let plinkoRows = 12;
let plinkoDropping = false;

const PLINKO_MULTIPLIERS = {
    low:    { 12: [1.2, 1.1, 1, 0.7, 0.5, 0.3, 0.5, 0.7, 1, 1.1, 1.2, 1.5, 2] },
    medium: { 12: [3, 1.5, 1.2, 0.8, 0.5, 0.3, 0.5, 0.8, 1.2, 1.5, 3, 5, 10] },
    high:   { 12: [10, 3, 1.5, 0.5, 0.3, 0.2, 0.3, 0.5, 1.5, 3, 10, 25, 50] }
};

function setPlinkoBet(amount) {
    const val = parseFloat(amount);
    if (!val || val < 1) plinkoBet = 1;
    else plinkoBet = Math.round(val * 100) / 100;
    const input = document.getElementById('plinko-bet-input');
    if (input && document.activeElement !== input) input.value = plinkoBet;
}

function halvePlinkoBet() { setPlinkoBet(plinkoBet / 2); document.getElementById('plinko-bet-input').value = plinkoBet; }
function doublePlinkoBet() { setPlinkoBet(plinkoBet * 2); document.getElementById('plinko-bet-input').value = plinkoBet; }

function setPlinkoRisk(risk, el) {
    plinkoRisk = risk;
    document.querySelectorAll('.plinko-risk-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    renderPlinkoMultipliers();
}

function renderPlinkoMultipliers() {
    const mults = PLINKO_MULTIPLIERS[plinkoRisk][plinkoRows];
    const container = document.getElementById('plinko-multipliers');
    container.innerHTML = mults.map((m, i) => {
        let cls = 'plinko-mult';
        if (m >= 10) cls += ' mult-high';
        else if (m >= 2) cls += ' mult-mid';
        else if (m < 1) cls += ' mult-low';
        return `<div class="${cls}">${m}x</div>`;
    }).join('');
}

function dropPlinko() {
    if (plinkoDropping) return;

    const balance = getBalance();
    if (balance < plinkoBet) {
        showToast('Insufficient funds!', 'error');
        return;
    }

    plinkoDropping = true;
    setBalance(balance - plinkoBet);
    document.getElementById('plinko-result').textContent = '';
    document.getElementById('plinko-result').className = 'result-bar';

    const canvas = document.getElementById('plinko-canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    if (canvas.getAttribute('data-scaled') !== 'true') {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
        canvas.setAttribute('data-scaled', 'true');
    }

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const rows = plinkoRows;
    const pegSpacingY = (H - 60) / (rows + 1);
    const pegSpacingX = (W - 40) / (rows + 2);

    // Simulate path
    let col = 0; // offset from center
    const path = [{ x: W / 2, y: 15 }];

    for (let row = 0; row < rows; row++) {
        const goRight = Math.random() < 0.5;
        col += goRight ? 1 : 0;

        const pegsInRow = row + 3;
        const startX = (W - (pegsInRow - 1) * pegSpacingX) / 2;
        const x = startX + col * pegSpacingX + (goRight ? pegSpacingX * 0.1 : -pegSpacingX * 0.1);
        const y = 30 + (row + 1) * pegSpacingY;
        path.push({ x, y });
    }

    // Final bucket position
    const mults = PLINKO_MULTIPLIERS[plinkoRisk][rows];
    const bucketIndex = col;
    const clampedIndex = Math.max(0, Math.min(mults.length - 1, bucketIndex));
    const multiplier = mults[clampedIndex];

    // Animate ball
    let step = 0;
    const ballRadius = 8;

    function drawFrame() {
        ctx.clearRect(0, 0, W, H);

        // Draw pegs
        for (let row = 0; row < rows; row++) {
            const pegsInRow = row + 3;
            const startX = (W - (pegsInRow - 1) * pegSpacingX) / 2;
            for (let p = 0; p < pegsInRow; p++) {
                const px = startX + p * pegSpacingX;
                const py = 30 + (row + 1) * pegSpacingY;
                ctx.beginPath();
                ctx.arc(px, py, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#2f4553';
                ctx.fill();
            }
        }

        // Draw multiplier buckets
        const bucketsCount = mults.length;
        const bucketW = W / bucketsCount;
        for (let b = 0; b < bucketsCount; b++) {
            const bx = b * bucketW;
            const by = H - 30;
            let color = '#213743';
            if (mults[b] >= 10) color = '#1a6b3c';
            else if (mults[b] >= 2) color = '#2f4553';
            else if (mults[b] < 1) color = '#3d1f1f';

            if (step >= path.length && b === clampedIndex) {
                color = '#1fff20';
            }

            ctx.fillStyle = color;
            ctx.fillRect(bx + 1, by, bucketW - 2, 28);
            ctx.fillStyle = step >= path.length && b === clampedIndex ? '#000' : '#b1bad3';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(mults[b] + 'x', bx + bucketW / 2, by + 18);
        }

        // Draw ball trail
        if (step > 0) {
            const trailStart = Math.max(0, step - 4);
            ctx.beginPath();
            for (let t = trailStart; t < Math.min(step, path.length); t++) {
                const p = path[t];
                if (t === trailStart) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            }
            ctx.strokeStyle = 'rgba(31, 255, 32, 0.3)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Draw ball
        if (step < path.length) {
            const pos = path[step];
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd700';
            ctx.fill();
            ctx.strokeStyle = '#ff8c00';
            ctx.lineWidth = 2;
            ctx.stroke();

            step++;
            requestAnimationFrame(drawFrame);
        } else {
            // Landing
            const landX = clampedIndex * bucketW + bucketW / 2;
            const landY = H - 16;
            ctx.beginPath();
            ctx.arc(landX, landY, ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd700';
            ctx.fill();

            // Calculate result
            const payout = Math.floor(plinkoBet * multiplier * 100) / 100;
            const profit = payout - plinkoBet;
            const resultEl = document.getElementById('plinko-result');

            if (payout > 0) {
                setBalance(getBalance() + payout);
                if (profit > 0) {
                    addTransaction('Plinko Win', profit);
                    resultEl.textContent = `${multiplier}x — Won ${formatMoney(payout)}!`;
                    resultEl.className = 'result-bar win';
                    showToast('+' + formatMoney(profit), 'success');
                } else if (profit === 0) {
                    resultEl.textContent = `${multiplier}x — Bet returned`;
                    resultEl.className = 'result-bar push';
                } else {
                    addTransaction('Plinko Loss', profit);
                    resultEl.textContent = `${multiplier}x — Lost ${formatMoney(Math.abs(profit))}`;
                    resultEl.className = 'result-bar lose';
                }
            } else {
                addTransaction('Plinko Loss', -plinkoBet);
                resultEl.textContent = `${multiplier}x — Lost ${formatMoney(plinkoBet)}`;
                resultEl.className = 'result-bar lose';
            }

            plinkoDropping = false;
        }
    }

    drawFrame();
}

document.addEventListener('DOMContentLoaded', () => {
    renderPlinkoMultipliers();
});

/* ========================================
   Royal Flush Casino - Live Baccarat
   ======================================== */

let bacBet = 10;
let bacBetType = 'player'; // player | banker | tie
let bacState = 'betting'; // betting | dealing | done
let bacPlayerHand = [];
let bacBankerHand = [];

const BAC_SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const BAC_SUIT_SYM = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const BAC_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function setBacBet(amount) {
    const val = parseFloat(amount);
    if (!val || val < 1) bacBet = 1;
    else bacBet = Math.round(val * 100) / 100;
    const input = document.getElementById('bac-bet-input');
    if (input && document.activeElement !== input) input.value = bacBet;
}

function halveBacBet() { setBacBet(bacBet / 2); document.getElementById('bac-bet-input').value = bacBet; }
function doubleBacBet() { setBacBet(bacBet * 2); document.getElementById('bac-bet-input').value = bacBet; }

function setBacBetType(type, el) {
    bacBetType = type;
    document.querySelectorAll('.bac-type-btn').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
}

function createBacDeck() {
    const deck = [];
    for (let d = 0; d < 6; d++) { // 6-deck shoe
        for (const suit of BAC_SUITS) {
            for (const rank of BAC_RANKS) {
                deck.push({ suit, rank });
            }
        }
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function bacCardValue(card) {
    if (['10', 'J', 'Q', 'K'].includes(card.rank)) return 0;
    if (card.rank === 'A') return 1;
    return parseInt(card.rank);
}

function bacHandValue(hand) {
    return hand.reduce((sum, c) => sum + bacCardValue(c), 0) % 10;
}

function renderBacCard(card) {
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const colorClass = isRed ? 'card-red' : 'card-black';
    return `<div class="playing-card ${colorClass}">
        <span>${card.rank}</span>
        <span class="card-suit">${BAC_SUIT_SYM[card.suit]}</span>
    </div>`;
}

function dealBaccarat() {
    if (bacState !== 'betting') return;

    const balance = getBalance();
    if (balance < bacBet) {
        showToast('Insufficient funds!', 'error');
        return;
    }

    setBalance(balance - bacBet);
    bacState = 'dealing';

    document.getElementById('bac-bet-controls').classList.add('hidden');
    document.getElementById('bac-result').textContent = '';
    document.getElementById('bac-result').className = 'result-bar';

    const deck = createBacDeck();
    bacPlayerHand = [deck.pop(), deck.pop()];
    bacBankerHand = [deck.pop(), deck.pop()];

    // Show initial cards
    renderBacHands();

    let playerVal = bacHandValue(bacPlayerHand);
    let bankerVal = bacHandValue(bacBankerHand);

    // Natural check (8 or 9)
    if (playerVal >= 8 || bankerVal >= 8) {
        setTimeout(() => resolveBaccarat(), 1000);
        return;
    }

    // Player third card rule
    let playerThird = null;
    if (playerVal <= 5) {
        playerThird = deck.pop();
        bacPlayerHand.push(playerThird);
    }

    // Banker third card rule
    setTimeout(() => {
        renderBacHands();

        const pThirdVal = playerThird ? bacCardValue(playerThird) : -1;

        let bankerDraws = false;
        if (!playerThird) {
            bankerDraws = bankerVal <= 5;
        } else {
            if (bankerVal <= 2) bankerDraws = true;
            else if (bankerVal === 3) bankerDraws = pThirdVal !== 8;
            else if (bankerVal === 4) bankerDraws = pThirdVal >= 2 && pThirdVal <= 7;
            else if (bankerVal === 5) bankerDraws = pThirdVal >= 4 && pThirdVal <= 7;
            else if (bankerVal === 6) bankerDraws = pThirdVal === 6 || pThirdVal === 7;
        }

        if (bankerDraws) {
            bacBankerHand.push(deck.pop());
        }

        setTimeout(() => {
            renderBacHands();
            resolveBaccarat();
        }, 800);
    }, 800);
}

function resolveBaccarat() {
    bacState = 'done';
    const playerVal = bacHandValue(bacPlayerHand);
    const bankerVal = bacHandValue(bacBankerHand);

    renderBacHands();

    const resultEl = document.getElementById('bac-result');
    let outcome;
    if (playerVal > bankerVal) outcome = 'player';
    else if (bankerVal > playerVal) outcome = 'banker';
    else outcome = 'tie';

    let payout = 0;
    if (bacBetType === outcome) {
        if (outcome === 'player') payout = bacBet * 2;
        else if (outcome === 'banker') payout = bacBet * 1.95 + bacBet; // 5% commission
        else if (outcome === 'tie') payout = bacBet * 8 + bacBet;
    } else if (outcome === 'tie' && bacBetType !== 'tie') {
        // Tie returns player/banker bets
        payout = bacBet;
    }

    payout = Math.floor(payout * 100) / 100;
    const profit = payout - bacBet;

    const winnerLabel = outcome === 'player' ? 'Player' : (outcome === 'banker' ? 'Banker' : 'Tie');

    if (payout > bacBet) {
        setBalance(getBalance() + payout);
        addTransaction('Baccarat Win', profit);
        resultEl.textContent = `${winnerLabel} wins! (P:${playerVal} B:${bankerVal}) — Won ${formatMoney(payout)}`;
        resultEl.className = 'result-bar win';
        showToast('+' + formatMoney(profit), 'success');
    } else if (payout === bacBet) {
        setBalance(getBalance() + payout);
        resultEl.textContent = `${winnerLabel} wins (P:${playerVal} B:${bankerVal}) — Bet returned`;
        resultEl.className = 'result-bar push';
    } else {
        addTransaction('Baccarat Loss', -bacBet);
        resultEl.textContent = `${winnerLabel} wins (P:${playerVal} B:${bankerVal}) — You lost`;
        resultEl.className = 'result-bar lose';
    }

    setTimeout(() => {
        document.getElementById('bac-bet-controls').classList.remove('hidden');
        document.getElementById('bac-continue').classList.remove('hidden');
        bacState = 'betting';
    }, 1500);
}

function renderBacHands() {
    document.getElementById('bac-player-hand').innerHTML = bacPlayerHand.map(c => renderBacCard(c)).join('');
    document.getElementById('bac-banker-hand').innerHTML = bacBankerHand.map(c => renderBacCard(c)).join('');
    document.getElementById('bac-player-score').textContent = '(' + bacHandValue(bacPlayerHand) + ')';
    document.getElementById('bac-banker-score').textContent = '(' + bacHandValue(bacBankerHand) + ')';
}

function resetBaccarat() {
    document.getElementById('bac-player-hand').innerHTML = '';
    document.getElementById('bac-banker-hand').innerHTML = '';
    document.getElementById('bac-player-score').textContent = '';
    document.getElementById('bac-banker-score').textContent = '';
    document.getElementById('bac-result').textContent = '';
    document.getElementById('bac-result').className = 'result-bar';
    document.getElementById('bac-continue').classList.add('hidden');
}

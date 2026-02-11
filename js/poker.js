/* ========================================
   Royal Flush Casino - Three Card Poker (Live)
   ======================================== */

let pokerBet = 10;
let pokerState = 'betting'; // betting | deciding | done
let pokerPlayerHand = [];
let pokerDealerHand = [];

const PKR_SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const PKR_SUIT_SYM = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const PKR_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const PKR_RANK_VAL = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

function setPokerBet(amount) {
    const val = parseFloat(amount);
    if (!val || val < 1) pokerBet = 1;
    else pokerBet = Math.round(val * 100) / 100;
    const input = document.getElementById('poker-bet-input');
    if (input && document.activeElement !== input) input.value = pokerBet;
}

function halvePokerBet() { setPokerBet(pokerBet / 2); document.getElementById('poker-bet-input').value = pokerBet; }
function doublePokerBet() { setPokerBet(pokerBet * 2); document.getElementById('poker-bet-input').value = pokerBet; }

function createPokerDeck() {
    const deck = [];
    for (const suit of PKR_SUITS) {
        for (const rank of PKR_RANKS) {
            deck.push({ suit, rank });
        }
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function renderPokerCard(card, faceDown = false) {
    if (faceDown) return '<div class="playing-card face-down"></div>';
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const colorClass = isRed ? 'card-red' : 'card-black';
    return `<div class="playing-card ${colorClass}">
        <span>${card.rank}</span>
        <span class="card-suit">${PKR_SUIT_SYM[card.suit]}</span>
    </div>`;
}

// Hand ranking: 0=high card, 1=pair, 2=flush, 3=straight, 4=three of a kind, 5=straight flush
function evaluateHand(hand) {
    const vals = hand.map(c => PKR_RANK_VAL[c.rank]).sort((a, b) => b - a);
    const suits = hand.map(c => c.suit);
    const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
    const isStraight = (vals[0] - vals[1] === 1 && vals[1] - vals[2] === 1) ||
                       (vals[0] === 14 && vals[1] === 3 && vals[2] === 2); // A-2-3
    const isThreeOfAKind = vals[0] === vals[1] && vals[1] === vals[2];
    const isPair = vals[0] === vals[1] || vals[1] === vals[2];

    if (isStraight && isFlush) return { rank: 5, name: 'Straight Flush', vals };
    if (isThreeOfAKind) return { rank: 4, name: 'Three of a Kind', vals };
    if (isStraight) return { rank: 3, name: 'Straight', vals };
    if (isFlush) return { rank: 2, name: 'Flush', vals };
    if (isPair) {
        // Sort so pair comes first for comparison
        const sorted = [...vals];
        if (sorted[1] === sorted[2]) {
            sorted.unshift(sorted.pop()); // move non-pair to end... actually let's redo
        }
        return { rank: 1, name: 'Pair', vals };
    }
    return { rank: 0, name: 'High Card', vals };
}

function compareHands(playerEval, dealerEval) {
    if (playerEval.rank !== dealerEval.rank) return playerEval.rank > dealerEval.rank ? 1 : -1;
    for (let i = 0; i < 3; i++) {
        if (playerEval.vals[i] !== dealerEval.vals[i]) {
            return playerEval.vals[i] > dealerEval.vals[i] ? 1 : -1;
        }
    }
    return 0;
}

// Ante bonus pays regardless of dealer qualifying
function getAnteBonus(eval_) {
    if (eval_.rank === 5) return 5; // Straight Flush
    if (eval_.rank === 4) return 4; // Three of a Kind
    if (eval_.rank === 3) return 1; // Straight
    return 0;
}

function dealPoker() {
    if (pokerState !== 'betting') return;

    const balance = getBalance();
    if (balance < pokerBet) {
        showToast('Insufficient funds!', 'error');
        return;
    }

    // Ante bet
    setBalance(balance - pokerBet);
    pokerState = 'deciding';

    const deck = createPokerDeck();
    pokerPlayerHand = [deck.pop(), deck.pop(), deck.pop()];
    pokerDealerHand = [deck.pop(), deck.pop(), deck.pop()];

    // Show player cards, dealer face down
    document.getElementById('poker-player-hand').innerHTML = pokerPlayerHand.map(c => renderPokerCard(c)).join('');
    document.getElementById('poker-dealer-hand').innerHTML = pokerDealerHand.map(c => renderPokerCard(c, true)).join('');

    const playerEval = evaluateHand(pokerPlayerHand);
    document.getElementById('poker-player-eval').textContent = playerEval.name;
    document.getElementById('poker-dealer-eval').textContent = '';

    document.getElementById('poker-bet-controls').classList.add('hidden');
    document.getElementById('poker-action-controls').classList.remove('hidden');
    document.getElementById('poker-result').textContent = '';
    document.getElementById('poker-result').className = 'result-bar';
}

function pokerPlay() {
    if (pokerState !== 'deciding') return;

    // Place play bet (equal to ante)
    const balance = getBalance();
    if (balance < pokerBet) {
        showToast('Insufficient funds for play bet!', 'error');
        return;
    }
    setBalance(balance - pokerBet);

    resolvePoker(true);
}

function pokerFold() {
    if (pokerState !== 'deciding') return;

    pokerState = 'done';
    // Reveal dealer
    document.getElementById('poker-dealer-hand').innerHTML = pokerDealerHand.map(c => renderPokerCard(c)).join('');
    const dealerEval = evaluateHand(pokerDealerHand);
    document.getElementById('poker-dealer-eval').textContent = dealerEval.name;

    addTransaction('Poker Fold', -pokerBet);
    const resultEl = document.getElementById('poker-result');
    resultEl.textContent = `You folded — Lost ${formatMoney(pokerBet)} ante`;
    resultEl.className = 'result-bar lose';

    document.getElementById('poker-action-controls').classList.add('hidden');
    document.getElementById('poker-continue').classList.remove('hidden');
}

function resolvePoker(played) {
    pokerState = 'done';
    const totalBet = pokerBet * 2; // ante + play

    // Reveal dealer
    document.getElementById('poker-dealer-hand').innerHTML = pokerDealerHand.map(c => renderPokerCard(c)).join('');

    const playerEval = evaluateHand(pokerPlayerHand);
    const dealerEval = evaluateHand(pokerDealerHand);
    document.getElementById('poker-dealer-eval').textContent = dealerEval.name;

    const resultEl = document.getElementById('poker-result');
    document.getElementById('poker-action-controls').classList.add('hidden');
    document.getElementById('poker-continue').classList.remove('hidden');

    // Dealer must qualify with Q-high or better
    const dealerQualifies = dealerEval.rank > 0 || dealerEval.vals[0] >= 12;

    const anteBonus = getAnteBonus(playerEval);
    let payout = 0;

    if (!dealerQualifies) {
        // Ante pays 1:1, play bet returned
        payout = pokerBet * 2 + pokerBet; // ante win + play returned
        if (anteBonus > 0) payout += pokerBet * anteBonus;
        const profit = payout - totalBet;
        setBalance(getBalance() + payout);
        addTransaction('Poker Win', profit);
        resultEl.textContent = `Dealer doesn't qualify — Won ${formatMoney(payout)}!`;
        resultEl.className = 'result-bar win';
        showToast('+' + formatMoney(profit), 'success');
    } else {
        const comparison = compareHands(playerEval, dealerEval);
        if (comparison > 0) {
            // Player wins: ante + play pay 1:1
            payout = totalBet * 2;
            if (anteBonus > 0) payout += pokerBet * anteBonus;
            const profit = payout - totalBet;
            setBalance(getBalance() + payout);
            addTransaction('Poker Win', profit);
            resultEl.textContent = `${playerEval.name} beats ${dealerEval.name} — Won ${formatMoney(payout)}!`;
            resultEl.className = 'result-bar win';
            showToast('+' + formatMoney(profit), 'success');
        } else if (comparison === 0) {
            // Push
            payout = totalBet;
            if (anteBonus > 0) payout += pokerBet * anteBonus;
            setBalance(getBalance() + payout);
            resultEl.textContent = `Push — Bets returned`;
            resultEl.className = 'result-bar push';
        } else {
            // Dealer wins
            if (anteBonus > 0) {
                payout = pokerBet * anteBonus;
                setBalance(getBalance() + payout);
            }
            addTransaction('Poker Loss', -totalBet + (anteBonus > 0 ? payout : 0));
            resultEl.textContent = `${dealerEval.name} beats ${playerEval.name} — You lost`;
            resultEl.className = 'result-bar lose';
        }
    }
}

function resetPoker() {
    pokerState = 'betting';
    document.getElementById('poker-player-hand').innerHTML = '';
    document.getElementById('poker-dealer-hand').innerHTML = '';
    document.getElementById('poker-player-eval').textContent = '';
    document.getElementById('poker-dealer-eval').textContent = '';
    document.getElementById('poker-result').textContent = '';
    document.getElementById('poker-result').className = 'result-bar';
    document.getElementById('poker-bet-controls').classList.remove('hidden');
    document.getElementById('poker-action-controls').classList.add('hidden');
    document.getElementById('poker-continue').classList.add('hidden');
}

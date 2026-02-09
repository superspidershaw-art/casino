/* ========================================
   Royal Flush Casino - Blackjack
   ======================================== */

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS = { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' };
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let bjBet = 10;
let bjDeck = [];
let playerHand = [];
let dealerHand = [];
let bjGameActive = false;

function adjustBjBet(delta) {
    bjBet = Math.max(5, Math.min(500, bjBet + delta));
    document.getElementById('bj-bet').textContent = '$' + bjBet;
}

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    // Shuffle (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function cardValue(hand) {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
        if (card.rank === 'A') {
            aces++;
            value += 11;
        } else if (['K', 'Q', 'J'].includes(card.rank)) {
            value += 10;
        } else {
            value += parseInt(card.rank);
        }
    }

    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return value;
}

function renderCard(card, faceDown = false) {
    if (faceDown) {
        return '<div class="playing-card face-down"></div>';
    }

    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    const colorClass = isRed ? 'card-red' : 'card-black';

    return `
        <div class="playing-card ${colorClass}">
            <span>${card.rank}</span>
            <span class="card-suit">${SUIT_SYMBOLS[card.suit]}</span>
        </div>
    `;
}

function renderHands(hideDealer = false) {
    const dealerEl = document.getElementById('dealer-hand');
    const playerEl = document.getElementById('player-hand');
    const dealerScoreEl = document.getElementById('dealer-score');
    const playerScoreEl = document.getElementById('player-score');

    // Dealer hand
    dealerEl.innerHTML = dealerHand.map((card, i) => {
        if (hideDealer && i === 1) return renderCard(card, true);
        return renderCard(card);
    }).join('');

    // Dealer score
    if (hideDealer) {
        const visibleCard = dealerHand[0];
        const visibleValue = visibleCard.rank === 'A' ? 11 :
            ['K', 'Q', 'J'].includes(visibleCard.rank) ? 10 : parseInt(visibleCard.rank);
        dealerScoreEl.textContent = '(' + visibleValue + ')';
    } else {
        dealerScoreEl.textContent = '(' + cardValue(dealerHand) + ')';
    }

    // Player hand
    playerEl.innerHTML = playerHand.map(card => renderCard(card)).join('');
    playerScoreEl.textContent = '(' + cardValue(playerHand) + ')';
}

function startBlackjack() {
    const balance = getBalance();
    if (balance < bjBet) {
        showToast('Insufficient funds! Visit the wallet to deposit.', 'error');
        return;
    }

    // Deduct bet
    setBalance(balance - bjBet);

    // Reset
    bjDeck = createDeck();
    playerHand = [];
    dealerHand = [];
    bjGameActive = true;

    document.getElementById('bj-result').textContent = '';
    document.getElementById('bj-result').className = 'result-bar';

    // Deal initial cards
    playerHand.push(bjDeck.pop());
    dealerHand.push(bjDeck.pop());
    playerHand.push(bjDeck.pop());
    dealerHand.push(bjDeck.pop());

    renderHands(true);

    // Show action controls, hide bet controls
    document.getElementById('bj-bet-controls').classList.add('hidden');
    document.getElementById('bj-action-controls').classList.remove('hidden');
    document.getElementById('bj-continue').classList.add('hidden');

    // Enable/disable double down (only on first two cards and if player has enough funds)
    const canDouble = getBalance() >= bjBet;
    document.getElementById('btn-double').disabled = !canDouble;

    // Check for natural blackjack
    if (cardValue(playerHand) === 21) {
        bjStand();
    }
}

function bjHit() {
    if (!bjGameActive) return;

    playerHand.push(bjDeck.pop());
    renderHands(true);

    // Disable double down after hit
    document.getElementById('btn-double').disabled = true;

    if (cardValue(playerHand) > 21) {
        endBlackjack('bust');
    } else if (cardValue(playerHand) === 21) {
        bjStand();
    }
}

function bjStand() {
    if (!bjGameActive) return;
    bjGameActive = false;

    // Reveal dealer card
    renderHands(false);

    // Dealer draws to 17
    dealerDraw();
}

function bjDouble() {
    if (!bjGameActive) return;

    const balance = getBalance();
    if (balance < bjBet) {
        showToast('Insufficient funds to double down.', 'error');
        return;
    }

    // Double the bet
    setBalance(balance - bjBet);
    bjBet *= 2;

    // Draw one card and stand
    playerHand.push(bjDeck.pop());
    renderHands(true);

    if (cardValue(playerHand) > 21) {
        bjBet /= 2; // Reset bet display
        endBlackjack('bust');
    } else {
        bjStand();
        bjBet /= 2; // Reset bet for next hand
    }
}

function dealerDraw() {
    const drawNext = () => {
        if (cardValue(dealerHand) < 17) {
            dealerHand.push(bjDeck.pop());
            renderHands(false);
            setTimeout(drawNext, 500);
        } else {
            evaluateBlackjack();
        }
    };
    setTimeout(drawNext, 500);
}

function evaluateBlackjack() {
    const playerVal = cardValue(playerHand);
    const dealerVal = cardValue(dealerHand);
    const isPlayerBJ = playerHand.length === 2 && playerVal === 21;
    const isDealerBJ = dealerHand.length === 2 && dealerVal === 21;

    if (dealerVal > 21) {
        endBlackjack('dealer-bust');
    } else if (isPlayerBJ && !isDealerBJ) {
        endBlackjack('blackjack');
    } else if (playerVal > dealerVal) {
        endBlackjack('win');
    } else if (playerVal < dealerVal) {
        endBlackjack('lose');
    } else {
        endBlackjack('push');
    }
}

function endBlackjack(result) {
    bjGameActive = false;
    renderHands(false);

    const resultEl = document.getElementById('bj-result');
    document.getElementById('bj-action-controls').classList.add('hidden');
    document.getElementById('bj-continue').classList.remove('hidden');

    // Determine if double was active (check if bet was doubled in the round)
    const actualBet = bjBet;
    let winAmount = 0;

    switch (result) {
        case 'blackjack':
            winAmount = actualBet * 2.5; // 3:2 payout
            resultEl.textContent = 'BLACKJACK! You win ' + formatMoney(winAmount) + '!';
            resultEl.className = 'result-bar win';
            break;
        case 'win':
        case 'dealer-bust':
            winAmount = actualBet * 2;
            resultEl.textContent = (result === 'dealer-bust' ? 'Dealer busts! ' : '') + 'You win ' + formatMoney(winAmount) + '!';
            resultEl.className = 'result-bar win';
            break;
        case 'push':
            winAmount = actualBet; // Return bet
            resultEl.textContent = 'Push! Bet returned.';
            resultEl.className = 'result-bar push';
            break;
        case 'bust':
            resultEl.textContent = 'Bust! You went over 21.';
            resultEl.className = 'result-bar lose';
            break;
        case 'lose':
            resultEl.textContent = 'Dealer wins with ' + cardValue(dealerHand) + '.';
            resultEl.className = 'result-bar lose';
            break;
    }

    if (winAmount > 0) {
        setBalance(getBalance() + winAmount);
        if (result !== 'push') {
            addTransaction('Blackjack Win', winAmount - actualBet);
            showToast('You won ' + formatMoney(winAmount - actualBet) + '!', 'success');
        }
    } else {
        addTransaction('Blackjack Loss', -actualBet);
    }
}

function resetBlackjack() {
    document.getElementById('bj-bet-controls').classList.remove('hidden');
    document.getElementById('bj-action-controls').classList.add('hidden');
    document.getElementById('bj-continue').classList.add('hidden');
    document.getElementById('bj-result').textContent = '';
    document.getElementById('bj-result').className = 'result-bar';
    document.getElementById('dealer-hand').innerHTML = '';
    document.getElementById('player-hand').innerHTML = '';
    document.getElementById('dealer-score').textContent = '';
    document.getElementById('player-score').textContent = '';
}

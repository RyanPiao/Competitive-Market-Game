/* * GAME CONFIGURATION */
const GAME_STATE = {
    user: {
        role: null,
        units: 3,
        values: [],
        costs: [],
        currentUnitIndex: 0,
        earnings: 0
    },
    market: {
        bids: [],
        asks: [],
    },
    bots: [],
    active: false
};

let UI = {};

/* * INITIALIZATION */
document.addEventListener('DOMContentLoaded', () => {
    // Map UI elements
    UI = {
        overlay: document.getElementById('role-overlay'),
        gameInterface: document.getElementById('game-interface'),
        roleDisplay: document.getElementById('user-role-display'),
        labelUnitVal: document.getElementById('label-unit-val'),
        unitVal: document.getElementById('unit-val'),
        inventory: document.getElementById('inventory'),
        earnings: document.getElementById('earnings'),
        slider: document.getElementById('price-slider'),
        sliderDisplay: document.getElementById('slider-display'),
        actionLabel: document.getElementById('action-label'),
        potentialProfit: document.getElementById('potential-profit'),
        bidsList: document.getElementById('bids-list'),
        asksList: document.getElementById('asks-list'),
        transactionLog: document.getElementById('transaction-log'),
        btnPrimary: document.getElementById('btn-primary'),
        btnQuick: document.getElementById('btn-quick')
    };

    if(UI.slider) UI.slider.addEventListener('input', updateUI);
    if(UI.btnPrimary) UI.btnPrimary.addEventListener('click', handlePrimaryAction);
    if(UI.btnQuick) UI.btnQuick.addEventListener('click', handleQuickAction);
});

/* * START GAME */
window.startGame = function(role) {
    GAME_STATE.user.role = role;
    GAME_STATE.active = true;

    if (role === 'BUYER') {
        GAME_STATE.user.values = [1.50, 1.25, 1.00];
        // Add 5 Seller Bots, 4 Buyer Bots (User is 5th Buyer)
        setupBots(4, 5); 
    } else {
        GAME_STATE.user.costs = [0.50, 0.75, 1.00];
        // Add 5 Buyer Bots, 4 Seller Bots (User is 5th Seller)
        setupBots(5, 4);
    }

    // Hide Start Screen, Show Game
    UI.overlay.style.display = 'none';
    UI.gameInterface.style.display = 'flex';
    
    updateUI();
    setInterval(runBotLogic, 1000); 
};

function setupBots(numBuyers, numSellers) {
    for(let i=0; i<numBuyers; i++) {
        GAME_STATE.bots.push({ 
            id: `BotBuy${i}`, role: 'BUYER', 
            value: (0.80 + Math.random() * 1.20).toFixed(2) 
        });
    }
    for(let i=0; i<numSellers; i++) {
        GAME_STATE.bots.push({ 
            id: `BotSell${i}`, role: 'SELLER', 
            cost: (0.40 + Math.random() * 1.10).toFixed(2) 
        });
    }
}

/* * USER ACTIONS */
function handlePrimaryAction() {
    const price = parseFloat(UI.slider.value);
    const role = GAME_STATE.user.role;

    if (role === 'BUYER') {
        // Clear previous user bid
        GAME_STATE.market.bids = GAME_STATE.market.bids.filter(b => b.owner !== 'USER');
        addOrder('BID', price, 'USER');
    } else {
        // Clear previous user ask
        GAME_STATE.market.asks = GAME_STATE.market.asks.filter(a => a.owner !== 'USER');
        addOrder('ASK', price, 'USER');
    }
}

function handleQuickAction() {
    if (GAME_STATE.user.role === 'BUYER') {
        if (GAME_STATE.market.asks.length > 0) {
            addOrder('BID', GAME_STATE.market.asks[0].price, 'USER');
        } else {
            alert("No sellers available!");
        }
    } else {
        if (GAME_STATE.market.bids.length > 0) {
            addOrder('ASK', GAME_STATE.market.bids[0].price, 'USER');
        } else {
            alert("No buyers available!");
        }
    }
}

/* * UPDATE UI */
function updateUI() {
    if(!GAME_STATE.active) return;

    const role = GAME_STATE.user.role;
    const idx = GAME_STATE.user.currentUnitIndex;

    // Stats
    UI.roleDisplay.textContent = role;
    UI.inventory.textContent = GAME_STATE.user.units - idx;
    UI.earnings.textContent = `$${GAME_STATE.user.earnings.toFixed(2)}`;

    // Unit Logic
    let currentVal = 0;
    let isDone = idx >= 3;

    if (role === 'BUYER') {
        UI.labelUnitVal.textContent = "Willingness to Pay";
        currentVal = GAME_STATE.user.values[idx] || 0;
        UI.actionLabel.textContent = "Your Bid";
        UI.btnPrimary.textContent = "SUBMIT BID";
    } else {
        UI.labelUnitVal.textContent = "Marginal Cost";
        currentVal = GAME_STATE.user.costs[idx] || 0;
        UI.actionLabel.textContent = "Your Ask";
        UI.btnPrimary.textContent = "SUBMIT ASK";
    }

    UI.unitVal.textContent = isDone ? "Done" : `$${currentVal.toFixed(2)}`;

    // Controls State
    if (isDone) {
        UI.btnPrimary.disabled = true;
        UI.btnQuick.disabled = true;
        UI.potentialProfit.textContent = "Max Units Traded";
        UI.potentialProfit.style.color = "#999";
    } else {
        UI.btnPrimary.disabled = false;
        UI.btnQuick.disabled = false;
        
        const sliderVal = parseFloat(UI.slider.value);
        UI.sliderDisplay.textContent = sliderVal.toFixed(2);
        
        let surplus = 0;
        if (role === 'BUYER') surplus = currentVal - sliderVal;
        else surplus = sliderVal - currentVal;
        
        UI.potentialProfit.textContent = `$${surplus.toFixed(2)}`;
        UI.potentialProfit.style.color = surplus >= 0 ? '#2a9d8f' : '#e76f51';
    }

    // Order Book Lists
    GAME_STATE.market.bids.sort((a, b) => b.price - a.price);
    GAME_STATE.market.asks.sort((a, b) => a.price - b.price);

    UI.bidsList.innerHTML = GAME_STATE.market.bids.map(b => 
        `<div class='bid-item'>$${b.price.toFixed(2)}</div>`).join('');
    UI.asksList.innerHTML = GAME_STATE.market.asks.map(a => 
        `<div class='ask-item'>$${a.price.toFixed(2)}</div>`).join('');
}

/* * MARKET ENGINE */
function addOrder(type, price, owner) {
    if(!GAME_STATE.active) return;
    const order = { type, price: parseFloat(price), owner, timestamp: Date.now() };

    if (type === 'BID') GAME_STATE.market.bids.push(order);
    else GAME_STATE.market.asks.push(order);

    checkMatch();
    updateUI();
}

function checkMatch() {
    GAME_STATE.market.bids.sort((a, b) => b.price - a.price);
    GAME_STATE.market.asks.sort((a, b) => a.price - b.price);

    if (GAME_STATE.market.bids.length > 0 && GAME_STATE.market.asks.length > 0) {
        const bestBid = GAME_STATE.market.bids[0];
        const bestAsk = GAME_STATE.market.asks[0];

        if (bestBid.price >= bestAsk.price) {
            executeTrade(bestBid, bestAsk);
        }
    }
}

function executeTrade(bid, ask) {
    const price = bid.price;
    
    // Log Transaction
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    // Highlight if user was involved
    const userInvolved = (bid.owner === 'USER' || ask.owner === 'USER');
    const traderName = userInvolved ? "YOU" : "BOT";
    const color = userInvolved ? "#4ade80" : "#333";
    
    entry.innerHTML = `<span style="color:${color}">$${price.toFixed(2)}</span><span>${traderName}</span>`;
    UI.transactionLog.prepend(entry);

    GAME_STATE.market.bids.shift();
    GAME_STATE.market.asks.shift();

    // Update User Earnings
    if (bid.owner === 'USER') {
        const value = GAME_STATE.user.values[GAME_STATE.user.currentUnitIndex];
        GAME_STATE.user.earnings += (value - price);
        GAME_STATE.user.currentUnitIndex++;
        // Clear user bids
        GAME_STATE.market.bids = GAME_STATE.market.bids.filter(b => b.owner !== 'USER');
    } else if (ask.owner === 'USER') {
        const cost = GAME_STATE.user.costs[GAME_STATE.user.currentUnitIndex];
        GAME_STATE.user.earnings += (price - cost);
        GAME_STATE.user.currentUnitIndex++;
        // Clear user asks
        GAME_STATE.market.asks = GAME_STATE.market.asks.filter(a => a.owner !== 'USER');
    }
}

/* * BOT LOGIC */
function runBotLogic() {
    if(!GAME_STATE.active) return;

    GAME_STATE.bots.forEach(bot => {
        if (Math.random() > 0.1) return; 

        const bestAsk = GAME_STATE.market.asks.length > 0 ? GAME_STATE.market.asks[0].price : null;
        const bestBid = GAME_STATE.market.bids.length > 0 ? GAME_STATE.market.bids[0].price : null;

        if (bot.role === 'BUYER') {
            const wtp = parseFloat(bot.value);
            // 1. Buy Now
            if (bestAsk && bestAsk < wtp && (wtp - bestAsk) > 0.05) {
                addOrder('BID', bestAsk, bot.id);
            } 
            // 2. Bid
            else if (!GAME_STATE.market.bids.find(b => b.owner === bot.id)) {
                let target = bestBid ? Math.min(bestBid + 0.05, wtp - 0.10) : wtp * 0.8;
                if (target < wtp) addOrder('BID', target.toFixed(2), bot.id);
            }
        } 
        else { // SELLER
            const mc = parseFloat(bot.cost);
            // 1. Sell Now
            if (bestBid && bestBid > mc && (bestBid - mc) > 0.05) {
                addOrder('ASK', bestBid, bot.id);
            } 
            // 2. Ask
            else if (!GAME_STATE.market.asks.find(a => a.owner === bot.id)) {
                let target = bestAsk ? Math.max(bestAsk - 0.05, mc + 0.10) : mc * 1.2;
                if (target > mc) addOrder('ASK', target.toFixed(2), bot.id);
            }
        }
    });
    updateUI();
}

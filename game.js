/* * GAME CONFIGURATION */
const GAME_STATE = {
    user: {
        role: null, // Set on start
        units: 3,
        values: [], // If Buyer (Decreasing marginal valuation)
        costs: [],  // If Seller (Increasing marginal cost)
        currentUnitIndex: 0,
        earnings: 0
    },
    market: {
        bids: [], // Buy orders
        asks: [], // Sell orders
    },
    bots: [],
    active: false
};

const UI = {
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
    marketLog: document.getElementById('market-log'),
    btnPrimary: document.getElementById('btn-primary'),
    btnQuick: document.getElementById('btn-quick')
};

/* * START GAME LOGIC */
function startGame(role) {
    GAME_STATE.user.role = role;
    GAME_STATE.active = true;

    // CONFIGURATION BASED ON MANUAL 
    // Buyers: Decreasing Marginal Valuation
    // Sellers: Increasing Marginal Cost
    if (role === 'BUYER') {
        GAME_STATE.user.values = [1.50, 1.25, 1.00]; 
        setupBots(4, 5); // 4 Buyer Bots (User is 5th), 5 Seller Bots
    } else {
        GAME_STATE.user.costs = [0.50, 0.75, 1.00];
        setupBots(5, 4); // 5 Buyer Bots, 4 Seller Bots (User is 5th)
    }

    // Hide Overlay, Show Game
    UI.overlay.style.display = 'none';
    UI.gameInterface.style.display = 'flex';
    
    updateUI();
    setInterval(runBotLogic, 1000);
}

function setupBots(numBuyers, numSellers) {
    for(let i=0; i<numBuyers; i++) {
        GAME_STATE.bots.push({ 
            id: `BotBuy${i}`, role: 'BUYER', 
            value: (1.00 + Math.random()).toFixed(2) 
        });
    }
    for(let i=0; i<numSellers; i++) {
        GAME_STATE.bots.push({ 
            id: `BotSell${i}`, role: 'SELLER', 
            cost: (0.50 + Math.random() * 0.5).toFixed(2) 
        });
    }
}

/* * UI UPDATES */
function updateUI() {
    const role = GAME_STATE.user.role;
    const idx = GAME_STATE.user.currentUnitIndex;

    // 1. Text & Stats
    UI.roleDisplay.textContent = role;
    UI.inventory.textContent = GAME_STATE.user.units - idx;
    UI.earnings.textContent = `$${GAME_STATE.user.earnings.toFixed(2)}`;

    // 2. Logic for Value/Cost Display
    let currentVal = 0;
    let isDone = idx >= 3;

    if (role === 'BUYER') {
        UI.labelUnitVal.textContent = "Unit Value";
        currentVal = GAME_STATE.user.values[idx];
        UI.actionLabel.textContent = "Your Bid";
        UI.btnPrimary.textContent = "SUBMIT BID";
        UI.btnQuick.textContent = "Buy at Lowest Ask";
    } else {
        UI.labelUnitVal.textContent = "Unit Cost";
        currentVal = GAME_STATE.user.costs[idx];
        UI.actionLabel.textContent = "Your Ask";
        UI.btnPrimary.textContent = "SUBMIT ASK";
        UI.btnQuick.textContent = "Sell at Highest Bid";
    }

    UI.unitVal.textContent = isDone ? "Done" : `$${currentVal.toFixed(2)}`;

    // 3. Profit Calc
    if (isDone) {
        UI.btnPrimary.disabled = true;
        UI.btnQuick.disabled = true;
        UI.potentialProfit.textContent = "--";
    } else {
        const sliderVal = parseFloat(UI.slider.value);
        UI.sliderDisplay.textContent = sliderVal.toFixed(2);
        
        let profit = 0;
        if (role === 'BUYER') profit = currentVal - sliderVal; // Value - Price
        else profit = sliderVal - currentVal;                 // Price - Cost
        
        UI.potentialProfit.textContent = `$${profit.toFixed(2)}`;
        // Color code profit (Green positive, Red negative)
        UI.potentialProfit.style.color = profit >= 0 ? '#2a9d8f' : '#e76f51';
    }

    // 4. Order Book
    GAME_STATE.market.bids.sort((a, b) => b.price - a.price); // High to Low
    GAME_STATE.market.asks.sort((a, b) => a.price - b.price); // Low to High

    UI.bidsList.innerHTML = GAME_STATE.market.bids.map(b => 
        `<div class='bid-item'>$${b.price.toFixed(2)}</div>`).join('');
    UI.asksList.innerHTML = GAME_STATE.market.asks.map(a => 
        `<div class='ask-item'>$${a.price.toFixed(2)}</div>`).join('');
}

/* * MARKET MECHANICS */
function addOrder(type, price, owner) {
    if(!GAME_STATE.active) return;
    const order = { type, price: parseFloat(price), owner, timestamp: Date.now() };

    if (type === 'BID') GAME_STATE.market.bids.push(order);
    else GAME_STATE.market.asks.push(order);

    checkMatch();
    updateUI();
}

function checkMatch() {
    // Sort orders to find match
    GAME_STATE.market.bids.sort((a, b) => b.price - a.price);
    GAME_STATE.market.asks.sort((a, b) => a.price - b.price);

    if (GAME_STATE.market.bids.length > 0 && GAME_STATE.market.asks.length > 0) {
        const bestBid = GAME_STATE.market.bids[0];
        const bestAsk = GAME_STATE.market.asks[0];

        // Match if Bid >= Ask
        if (bestBid.price >= bestAsk.price) {
            executeTrade(bestBid, bestAsk);
        }
    }
}

function executeTrade(bid, ask) {
    const price = bid.price; // Simplified: Transaction happens at Bid price
    
    // Log
    const entry = document.createElement('div');
    entry.textContent = `Transaction: $${price.toFixed(2)}`;
    UI.marketLog.prepend(entry);

    // Remove orders
    GAME_STATE.market.bids.shift();
    GAME_STATE.market.asks.shift();

    // Check User Involvement [cite: 32]
    if (bid.owner === 'USER') {
        const value = GAME_STATE.user.values[GAME_STATE.user.currentUnitIndex];
        GAME_STATE.user.earnings += (value - price);
        GAME_STATE.user.currentUnitIndex++;
    } else if (ask.owner === 'USER') {
        const cost = GAME_STATE.user.costs[GAME_STATE.user.currentUnitIndex];
        GAME_STATE.user.earnings += (price - cost);
        GAME_STATE.user.currentUnitIndex++;
    }

    // Cleanup: If user transacted, remove their other pending orders
    if(bid.owner === 'USER') GAME_STATE.market.bids = GAME_STATE.market.bids.filter(b => b.owner !== 'USER');
    if(ask.owner === 'USER') GAME_STATE.market.asks = GAME_STATE.market.asks.filter(a => a.owner !== 'USER');
}

/* * BOT AI [cite: 94-98] */
function runBotLogic() {
    if(!GAME_STATE.active) return;

    GAME_STATE.bots.forEach(bot => {
        if (Math.random() > 0.05) return; // Reaction delay

        const bestAsk = GAME_STATE.market.asks.length > 0 ? GAME_STATE.market.asks[0].price : null;
        const bestBid = GAME_STATE.market.bids.length > 0 ? GAME_STATE.market.bids[0].price : null;

        if (bot.role === 'BUYER') {
            const target = bot.value * 0.90;
            // Strategy: Buy at lowest ask if ask < 90% val, else Bid 90% val
            if (bestAsk && bestAsk <= target) {
                addOrder('BID', bestAsk, bot.id);
            } else {
                if (!GAME_STATE.market.bids.find(b => b.owner === bot.id)) {
                    addOrder('BID', target, bot.id);
                }
            }
        } 
        else { // SELLER
            const target = bot.cost * 1.10;
            // Strategy: Sell at highest bid if bid > 110% cost, else Ask 110% cost
            if (bestBid && bestBid >= target) {
                addOrder('ASK', bestBid, bot.id);
            } else {
                if (!GAME_STATE.market.asks.find(a => a.owner === bot.id)) {
                    addOrder('ASK', target, bot.id);
                }
            }
        }
    });
}

/* * CONTROLS */
UI.slider.addEventListener('input', updateUI);

UI.btnPrimary.addEventListener('click', () => {
    // Clear previous user orders
    if (GAME_STATE.user.role === 'BUYER') {
        GAME_STATE.market.bids = GAME_STATE.market.bids.filter(b => b.owner !== 'USER');
        addOrder('BID', UI.slider.value, 'USER');
    } else {
        GAME_STATE.market.asks = GAME_STATE.market.asks.filter(a => a.owner !== 'USER');
        addOrder('ASK', UI.slider.value, 'USER');
    }
});

UI.btnQuick.addEventListener('click', () => {
    if (GAME_STATE.user.role === 'BUYER') {
        // Buy at Lowest Ask
        if (GAME_STATE.market.asks.length > 0) {
            addOrder('BID', GAME_STATE.market.asks[0].price, 'USER');
        }
    } else {
        // Sell at Highest Bid
        if (GAME_STATE.market.bids.length > 0) {
            addOrder('ASK', GAME_STATE.market.bids[0].price, 'USER');
        }
    }
});

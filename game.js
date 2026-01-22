/* * GAME CONFIGURATION AND STATE */
const GAME_STATE = {
    user: {
        role: null,
        units: 3,
        values: [], // For Buyers (Willingness to Pay)
        costs: [],  // For Sellers (Marginal Cost)
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

// UI Elements Container
let UI = {};

/* * INITIALIZATION (Wait for DOM) */
document.addEventListener('DOMContentLoaded', () => {
    // Connect all HTML Elements
    UI = {
        overlay: document.getElementById('role-overlay'),
        gameInterface: document.getElementById('game-interface'),
        instructionText: document.getElementById('instruction-text'),
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

    // Attach Listeners
    if(UI.slider) UI.slider.addEventListener('input', updateUI);
    if(UI.btnPrimary) UI.btnPrimary.addEventListener('click', handlePrimaryAction);
    if(UI.btnQuick) UI.btnQuick.addEventListener('click', handleQuickAction);
});

/* * START GAME LOGIC */
window.startGame = function(role) {
    GAME_STATE.user.role = role;
    GAME_STATE.active = true;

    // Set Economic Parameters [cite: 8, 24]
    if (role === 'BUYER') {
        GAME_STATE.user.values = [1.50, 1.25, 1.00]; // Decreasing marginal value
        setupBots(5, 5); // Balanced Market
        
        // [cite: 146, 147, 148] Instructions for Buyer
        UI.instructionText.innerHTML = `
            <strong>You are a BUYER.</strong><br>
            1. Your goal is to buy oranges for <strong>less</strong> than your Unit Value.<br>
            2. <strong>Profit = Value - Price</strong>.<br>
            3. Use the slider to submit a <strong>Bid</strong> (offer to buy) OR click "Accept Best Market Price" to buy instantly from a Seller.
        `;
    } else {
        GAME_STATE.user.costs = [0.50, 0.75, 1.00]; // Increasing marginal cost
        setupBots(5, 5); // Balanced Market
        
        // [cite: 149, 150, 151] Instructions for Seller
        UI.instructionText.innerHTML = `
            <strong>You are a SELLER.</strong><br>
            1. Your goal is to sell oranges for <strong>more</strong> than your Unit Cost.<br>
            2. <strong>Profit = Price - Cost</strong>.<br>
            3. Use the slider to submit an <strong>Ask</strong> (offer to sell) OR click "Accept Best Market Price" to sell instantly to a Buyer.
        `;
    }

    // Show Game Interface
    UI.overlay.style.display = 'none';
    UI.gameInterface.style.display = 'flex';
    
    updateUI();
    setInterval(runBotLogic, 1000); // Bots think every second
};

function setupBots(numBuyers, numSellers) {
    for(let i=0; i<numBuyers; i++) {
        GAME_STATE.bots.push({ 
            id: `BotBuy${i}`, role: 'BUYER', 
            value: (0.80 + Math.random() * 1.20).toFixed(2) // Random Value $0.80-$2.00
        });
    }
    for(let i=0; i<numSellers; i++) {
        GAME_STATE.bots.push({ 
            id: `BotSell${i}`, role: 'SELLER', 
            cost: (0.40 + Math.random() * 1.10).toFixed(2) // Random Cost $0.40-$1.50
        });
    }
}

/* * USER ACTIONS */
function handlePrimaryAction() {
    const role = GAME_STATE.user.role;
    const price = parseFloat(UI.slider.value);
    
    if (role === 'BUYER') {
        // Remove existing user bids (prevent spamming order book)
        GAME_STATE.market.bids = GAME_STATE.market.bids.filter(b => b.owner !== 'USER');
        addOrder('BID', price, 'USER');
    } else {
        // Remove existing user asks
        GAME_STATE.market.asks = GAME_STATE.market.asks.filter(a => a.owner !== 'USER');
        addOrder('ASK', price, 'USER');
    }
}

function handleQuickAction() {
    if (GAME_STATE.user.role === 'BUYER') {
        if (GAME_STATE.market.asks.length > 0) {
            // [cite: 29] Buyer accepts lowest ask
            addOrder('BID', GAME_STATE.market.asks[0].price, 'USER');
        } else {
            alert("No sellers in the market right now!");
        }
    } else {
        if (GAME_STATE.market.bids.length > 0) {
            // [cite: 26] Seller accepts highest bid
            addOrder('ASK', GAME_STATE.market.bids[0].price, 'USER');
        } else {
            alert("No buyers in the market right now!");
        }
    }
}

/* * UI UPDATE LOOP */
function updateUI() {
    if(!GAME_STATE.active) return;

    const role = GAME_STATE.user.role;
    const idx = GAME_STATE.user.currentUnitIndex;

    // 1. Text Labels
    UI.roleDisplay.textContent = role;
    UI.inventory.textContent = GAME_STATE.user.units - idx;
    UI.earnings.textContent = `$${GAME_STATE.user.earnings.toFixed(2)}`;

    // 2. Unit Values Logic
    let currentVal = 0;
    let isDone = idx >= 3; // Max 3 units

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

    // 3. Profit Estimator
    if (isDone) {
        UI.btnPrimary.disabled = true;
        UI.btnQuick.disabled = true;
        UI.potentialProfit.textContent = "Max Units Traded";
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

    // 4. Order Book Visualization
    // Sort Bids: Highest to Lowest
    GAME_STATE.market.bids.sort((a, b) => b.price - a.price);
    // Sort Asks: Lowest to Highest
    GAME_STATE.market.asks.sort((a, b) => a.price - b.price);

    UI.bidsList.innerHTML = GAME_STATE.market.bids.map(b => 
        `<div class='bid-item'>$${b.price.toFixed(2)}</div>`).join('');
    UI.asksList.innerHTML = GAME_STATE.market.asks.map(a => 
        `<div class='ask-item'>$${a.price.toFixed(2)}</div>`).join('');
}

/* * MARKET ENGINE (Double Auction) */
function addOrder(type, price, owner) {
    if(!GAME_STATE.active) return;
    const order = { type, price: parseFloat(price), owner, timestamp: Date.now() };

    if (type === 'BID') GAME_STATE.market.bids.push(order);
    else GAME_STATE.market.asks.push(order);

    checkMatch(); // Check if this new order creates a trade
    updateUI();
}

function checkMatch() {
    // Re-sort to find best match
    GAME_STATE.market.bids.sort((a, b) => b.price - a.price);
    GAME_STATE.market.asks.sort((a, b) => a.price - b.price);

    if (GAME_STATE.market.bids.length > 0 && GAME_STATE.market.asks.length > 0) {
        const bestBid = GAME_STATE.market.bids[0];
        const bestAsk = GAME_STATE.market.asks[0];

        // [cite: 10, 163] Trade occurs if Bid >= Ask
        if (bestBid.price >= bestAsk.price) {
            executeTrade(bestBid, bestAsk);
        }
    }
}

function executeTrade(bid, ask) {
    // Transaction Price Rule: Price is set by the existing order in book
    // For simplicity here, we use the Bid Price.
    const price = bid.price;
    
    // [cite: 165] Record Transaction in Ticker
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span>$${price.toFixed(2)}</span><span>${bid.owner === 'USER' || ask.owner === 'USER' ? 'YOU' : 'BOT'}</span>`;
    UI.transactionLog.prepend(entry);

    // Remove orders
    GAME_STATE.market.bids.shift();
    GAME_STATE.market.asks.shift();

    // Process Earnings [cite: 32, 164]
    if (bid.owner === 'USER') {
        const value = GAME_STATE.user.values[GAME_STATE.user.currentUnitIndex];
        GAME_STATE.user.earnings += (value - price);
        GAME_STATE.user.currentUnitIndex++;
        // Clear user's other bids
        GAME_STATE.market.bids = GAME_STATE.market.bids.filter(b => b.owner !== 'USER');
    } 
    else if (ask.owner === 'USER') {
        const cost = GAME_STATE.user.costs[GAME_STATE.user.currentUnitIndex];
        GAME_STATE.user.earnings += (price - cost);
        GAME_STATE.user.currentUnitIndex++;
        // Clear user's other asks
        GAME_STATE.market.asks = GAME_STATE.market.asks.filter(a => a.owner !== 'USER');
    }
}

/* * BOT INTELLIGENCE (Rational Maximizers) */
function runBotLogic() {
    if(!GAME_STATE.active) return;

    GAME_STATE.bots.forEach(bot => {
        if (Math.random() > 0.1) return; // Reaction delay

        const bestAsk = GAME_STATE.market.asks.length > 0 ? GAME_STATE.market.asks[0].price : null;
        const bestBid = GAME_STATE.market.bids.length > 0 ? GAME_STATE.market.bids[0].price : null;

        if (bot.role === 'BUYER') {
            const wtp = parseFloat(bot.value);
            
            // 1. Buy Now if profitable [cite: 95]
            if (bestAsk && bestAsk < wtp) {
                if ((wtp - bestAsk) > 0.05) {
                    addOrder('BID', bestAsk, bot.id);
                    return;
                }
            }
            // 2. Or Place Bid [cite: 96]
            if (!GAME_STATE.market.bids.find(b => b.owner === bot.id)) {
                // Bid slightly above best bid to compete, but below WTP
                let target = bestBid ? Math.min(bestBid + 0.05, wtp - 0.10) : wtp * 0.8;
                if (target < wtp) addOrder('BID', target.toFixed(2), bot.id);
            }
        } 
        else { // SELLER
            const mc = parseFloat(bot.cost);
            
            // 1. Sell Now if profitable [cite: 97]
            if (bestBid && bestBid > mc) {
                if ((bestBid - mc) > 0.05) {
                    addOrder('ASK', bestBid, bot.id);
                    return;
                }
            }
            // 2. Or Place Ask [cite: 98]
            if (!GAME_STATE.market.asks.find(a => a.owner === bot.id)) {
                // Ask slightly below best ask to compete, but above MC
                let target = bestAsk ? Math.max(bestAsk - 0.05, mc + 0.10) : mc * 1.2;
                if (target > mc) addOrder('ASK', target.toFixed(2), bot.id);
            }
        }
    });
    updateUI();
}

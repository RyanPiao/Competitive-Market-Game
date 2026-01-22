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

// We declare UI globally but fill it only after the page loads
let UI = {};

/* * INITIALIZATION (Waits for page load) */
document.addEventListener('DOMContentLoaded', () => {
    console.log("Game Loaded. Initializing UI...");
    
    // 1. Grab all HTML elements
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
        marketLog: document.getElementById('market-log'),
        btnPrimary: document.getElementById('btn-primary'),
        btnQuick: document.getElementById('btn-quick')
    };

    // 2. Attach Event Listeners
    if(UI.slider) UI.slider.addEventListener('input', updateUI);
    
    if(UI.btnPrimary) {
        UI.btnPrimary.addEventListener('click', () => {
            if (GAME_STATE.user.role === 'BUYER') {
                // Clear old user bids to prevent spam
                GAME_STATE.market.bids = GAME_STATE.market.bids.filter(b => b.owner !== 'USER');
                addOrder('BID', UI.slider.value, 'USER');
            } else {
                // Clear old user asks
                GAME_STATE.market.asks = GAME_STATE.market.asks.filter(a => a.owner !== 'USER');
                addOrder('ASK', UI.slider.value, 'USER');
            }
        });
    }

    if(UI.btnQuick) {
        UI.btnQuick.addEventListener('click', () => {
            if (GAME_STATE.user.role === 'BUYER') {
                if (GAME_STATE.market.asks.length > 0) {
                    addOrder('BID', GAME_STATE.market.asks[0].price, 'USER');
                } else {
                    alert("No sellers available right now!");
                }
            } else {
                if (GAME_STATE.market.bids.length > 0) {
                    addOrder('ASK', GAME_STATE.market.bids[0].price, 'USER');
                } else {
                    alert("No buyers available right now!");
                }
            }
        });
    }

    console.log("UI Initialized.");
});

/* * START FUNCTION (Attached to Window for HTML access) */
window.startGame = function(role) {
    console.log("Starting game as " + role);
    GAME_STATE.user.role = role;
    GAME_STATE.active = true;

    // Config based on role
    if (role === 'BUYER') {
        GAME_STATE.user.values = [1.50, 1.25, 1.00]; 
        setupBots(4, 5); // 4 Bot Buyers, 5 Bot Sellers
    } else {
        GAME_STATE.user.costs = [0.50, 0.75, 1.00];
        setupBots(5, 4); // 5 Bot Buyers, 4 Bot Sellers
    }

    // Switch Screens
    if(UI.overlay) UI.overlay.style.display = 'none';
    if(UI.gameInterface) UI.gameInterface.style.display = 'flex';
    
    updateUI();
    setInterval(runBotLogic, 1000);
};

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
    if(!GAME_STATE.active) return;

    const role = GAME_STATE.user.role;
    const idx = GAME_STATE.user.currentUnitIndex;

    // Stats
    UI.roleDisplay.textContent = role;
    UI.inventory.textContent = GAME_STATE.user.units - idx;
    UI.earnings.textContent = `$${GAME_STATE.user.earnings.toFixed(2)}`;

    // Unit Values/Costs
    let currentVal = 0;
    let isDone = idx >= 3;

    if (role === 'BUYER') {
        UI.labelUnitVal.textContent = "Unit Value";
        currentVal = GAME_STATE.user.values[idx] || 0;
        UI.actionLabel.textContent = "Your Bid";
        UI.btnPrimary.textContent = "SUBMIT BID";
        UI.btnQuick.textContent = "Buy at Lowest Ask";
    } else {
        UI.labelUnitVal.textContent = "Unit Cost";
        currentVal = GAME_STATE.user.costs[idx] || 0;
        UI.actionLabel.textContent = "Your Ask";
        UI.btnPrimary.textContent = "SUBMIT ASK";
        UI.btnQuick.textContent = "Sell at Highest Bid";
    }

    UI.unitVal.textContent = isDone ? "Done" : `$${currentVal.toFixed(2)}`;

    // Profit Calculation
    if (isDone) {
        UI.btnPrimary.disabled = true;
        UI.btnQuick.disabled = true;
        UI.potentialProfit.textContent = "--";
    } else {
        UI.btnPrimary.disabled = false;
        UI.btnQuick.disabled = false;
        
        const sliderVal = parseFloat(UI.slider.value);
        UI.sliderDisplay.textContent = sliderVal.toFixed(2);
        
        let profit = 0;
        if (role === 'BUYER') profit = currentVal - sliderVal;
        else profit = sliderVal - currentVal;
        
        UI.potentialProfit.textContent = `$${profit.toFixed(2)}`;
        UI.potentialProfit.style.color = profit >= 0 ? '#2a9d8f' : '#e76f51';
    }

    // Order Book Rendering
    GAME_STATE.market.bids.sort((a, b) => b.price - a.price);
    GAME_STATE.market.asks.sort((a, b) => a.price - b.price);

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
    
    const entry = document.createElement('div');
    entry.textContent = `Transaction: $${price.toFixed(2)}`;
    if(UI.marketLog) UI.marketLog.prepend(entry);

    GAME_STATE.market.bids.shift();
    GAME_STATE.market.asks.shift();

    // Update User Earnings
    if (bid.owner === 'USER') {
        const value = GAME_STATE.user.values[GAME_STATE.user.currentUnitIndex];
        GAME_STATE.user.earnings += (value - price);
        GAME_STATE.user.currentUnitIndex++;
        // Remove other pending user bids
        GAME_STATE.market.bids = GAME_STATE.market.bids.filter(b => b.owner !== 'USER');
    } else if (ask.owner === 'USER') {
        const cost = GAME_STATE.user.costs[GAME_STATE.user.currentUnitIndex];
        GAME_STATE.user.earnings += (price - cost);
        GAME_STATE.user.currentUnitIndex++;
        // Remove other pending user asks
        GAME_STATE.market.asks = GAME_STATE.market.asks.filter(a => a.owner !== 'USER');
    }
}

/* * BOT LOGIC */
function runBotLogic() {
    if(!GAME_STATE.active) return;

    GAME_STATE.bots.forEach(bot => {
        if (Math.random() > 0.05) return; 

        const bestAsk = GAME_STATE.market.asks.length > 0 ? GAME_STATE.market.asks[0].price : null;
        const bestBid = GAME_STATE.market.bids.length > 0 ? GAME_STATE.market.bids[0].price : null;

        if (bot.role === 'BUYER') {
            const target = bot.value * 0.90;
            if (bestAsk && bestAsk <= target) {
                addOrder('BID', bestAsk, bot.id);
            } else {
                if (!GAME_STATE.market.bids.find(b => b.owner === bot.id)) {
                    addOrder('BID', target, bot.id);
                }
            }
        } 
        else {
            const target = bot.cost * 1.10;
            if (bestBid && bestBid >= target) {
                addOrder('ASK', bestBid, bot.id);
            } else {
                if (!GAME_STATE.market.asks.find(a => a.owner === bot.id)) {
                    addOrder('ASK', target, bot.id);
                }
            }
        }
    });
    updateUI(); // Keep UI fresh even if bots don't trade
}

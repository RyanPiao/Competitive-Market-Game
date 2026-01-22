/* * GAME CONFIGURATION 
 * Logic based on Competitive Market Guide 
 */

const GAME_STATE = {
    user: {
        role: 'SELLER',
        units: 3,
        costs: [0.50, 0.75, 1.00], // Increasing marginal cost [cite: 24]
        currentUnitIndex: 0,
        earnings: 0
    },
    market: {
        bids: [], // Buy orders
        asks: [], // Sell orders
        history: []
    },
    bots: [],
    active: true
};

// Initialize Bots
function initBots() {
    // Creating 5 Buyer Bots and 4 Seller Bots (User is the 5th seller)
    for(let i=0; i<5; i++) {
        GAME_STATE.bots.push({ 
            id: `Buyer${i}`, role: 'BUYER', 
            value: (1.00 + Math.random()).toFixed(2) // Random value between $1.00-$2.00
        });
    }
    for(let i=0; i<4; i++) {
        GAME_STATE.bots.push({ 
            id: `Seller${i}`, role: 'SELLER', 
            cost: (0.50 + Math.random() * 0.5).toFixed(2) // Random cost between $0.50-$1.00
        });
    }
}

/* * UI UPDATES 
 */
const ui = {
    cost: document.getElementById('unit-cost'),
    inventory: document.getElementById('inventory'),
    earnings: document.getElementById('earnings'),
    slider: document.getElementById('price-slider'),
    sliderDisplay: document.getElementById('slider-display'),
    potentialProfit: document.getElementById('potential-profit'),
    bidsList: document.getElementById('bids-list'),
    asksList: document.getElementById('asks-list'),
    marketLog: document.getElementById('market-log'),
    btnAsk: document.getElementById('btn-ask'),
    btnSellNow: document.getElementById('btn-sell-now')
};

function updateUI() {
    // User Stats
    const currentCost = GAME_STATE.user.costs[GAME_STATE.user.currentUnitIndex];
    ui.cost.textContent = currentCost ? `$${currentCost.toFixed(2)}` : "Done";
    ui.inventory.textContent = GAME_STATE.user.units - GAME_STATE.user.currentUnitIndex;
    ui.earnings.textContent = `$${GAME_STATE.user.earnings.toFixed(2)}`;

    // Order Book Visualization
    // Sort Bids Descending (Highest buy price first)
    GAME_STATE.market.bids.sort((a, b) => b.price - a.price);
    // Sort Asks Ascending (Lowest sell price first)
    GAME_STATE.market.asks.sort((a, b) => a.price - b.price);

    ui.bidsList.innerHTML = GAME_STATE.market.bids.map(b => `<div class='bid-item'>$${b.price.toFixed(2)}</div>`).join('');
    ui.asksList.innerHTML = GAME_STATE.market.asks.map(a => `<div class='ask-item'>$${a.price.toFixed(2)}</div>`).join('');

    // Controls
    if (GAME_STATE.user.currentUnitIndex >= 3) {
        ui.btnAsk.disabled = true;
        ui.btnSellNow.disabled = true;
        ui.sliderDisplay.textContent = "All Sold";
    } else {
        const sliderVal = parseFloat(ui.slider.value);
        ui.sliderDisplay.textContent = sliderVal.toFixed(2);
        ui.potentialProfit.textContent = `$${(sliderVal - currentCost).toFixed(2)}`;
    }
}

/* * MARKET MECHANICS (Double Auction)
 */
function addOrder(type, price, owner) {
    if(!GAME_STATE.active) return;
    
    const order = { type, price: parseFloat(price), owner, timestamp: Date.now() };

    if (type === 'BID') {
        GAME_STATE.market.bids.push(order);
        checkMatch();
    } else {
        GAME_STATE.market.asks.push(order);
        checkMatch();
    }
    updateUI();
}

function checkMatch() {
    // Match Highest Bid with Lowest Ask [cite: 9]
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
    // Transaction price is usually the earlier order's price, simplified here to Bid price
    const price = bid.price; 
    
    // Log
    const entry = document.createElement('div');
    entry.textContent = `Transaction at $${price.toFixed(2)}`;
    ui.marketLog.prepend(entry);

    // Remove orders
    GAME_STATE.market.bids.shift();
    GAME_STATE.market.asks.shift();

    // Check if User was involved
    if (ask.owner === 'USER') {
        const cost = GAME_STATE.user.costs[GAME_STATE.user.currentUnitIndex];
        GAME_STATE.user.earnings += (price - cost);
        GAME_STATE.user.currentUnitIndex++;
    }

    // Clear user pending orders if they sold
    if (ask.owner === 'USER') {
        GAME_STATE.market.asks = GAME_STATE.market.asks.filter(a => a.owner !== 'USER');
    }
}

/* * BOT AI [cite: 94-98]
 */
function runBotLogic() {
    GAME_STATE.bots.forEach(bot => {
        // Random chance to act this tick (simulates reaction time)
        if (Math.random() > 0.05) return;

        // Current Market State
        const bestAsk = GAME_STATE.market.asks.length > 0 ? GAME_STATE.market.asks[0].price : null;
        const bestBid = GAME_STATE.market.bids.length > 0 ? GAME_STATE.market.bids[0].price : null;

        if (bot.role === 'BUYER') {
            /* * BUYER STRATEGY [cite: 95, 96]
             * If best ask < 90% of value, buy. 
             * Else make bid at 90% of value.
             */
            const targetPrice = bot.value * 0.90;
            
            // Should I buy now?
            if (bestAsk && bestAsk <= targetPrice) {
                 // Simulate clicking "Buy at Lowest Ask"
                 // Note: In this simplified engine, we just add a matching bid
                 addOrder('BID', bestAsk, bot.id);
            } else {
                // Submit a bid
                // Only bid if I don't already have a high bid
                const myActiveBids = GAME_STATE.market.bids.filter(b => b.owner === bot.id);
                if (myActiveBids.length === 0) {
                    addOrder('BID', targetPrice, bot.id);
                }
            }
        } 
        else if (bot.role === 'SELLER') {
            /* * SELLER STRATEGY [cite: 97, 98]
             * If best bid > 110% of cost, sell.
             * Else make ask at 110% of cost.
             */
            const targetPrice = bot.cost * 1.10;

            if (bestBid && bestBid >= targetPrice) {
                // Sell at highest bid
                addOrder('ASK', bestBid, bot.id);
            } else {
                // Submit an ask
                const myActiveAsks = GAME_STATE.market.asks.filter(a => a.owner === bot.id);
                if (myActiveAsks.length === 0) {
                    addOrder('ASK', targetPrice, bot.id);
                }
            }
        }
    });
}

/* * EVENT LISTENERS 
 */
ui.slider.addEventListener('input', updateUI);

ui.btnAsk.addEventListener('click', () => {
    // Remove previous user asks to prevent spamming
    GAME_STATE.market.asks = GAME_STATE.market.asks.filter(a => a.owner !== 'USER');
    
    addOrder('ASK', ui.slider.value, 'USER');
});

ui.btnSellNow.addEventListener('click', () => {
    if (GAME_STATE.market.bids.length > 0) {
        const bestBid = GAME_STATE.market.bids[0]; // Bids are sorted high-to-low
        addOrder('ASK', bestBid.price, 'USER');
    } else {
        alert("No buyers available!");
    }
});

/* * INIT 
 */
initBots();
updateUI();
setInterval(runBotLogic, 1000); // Bots think every 1 second

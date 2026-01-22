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

// Global UI Object
let UI = {};

/* * INITIALIZATION */
document.addEventListener('DOMContentLoaded', () => {
    console.log("Economic Engine Loaded. Strategies: CS (Buyers) / PS (Firms).");
    
    // 1. Grab HTML elements
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

    // 2. Attach Event Listeners (with safety checks)
    if(UI.slider) UI.slider.addEventListener('input', updateUI);
    
    if(UI.btnPrimary) {
        UI.btnPrimary.addEventListener('click', () => {
            const role = GAME_STATE.user.role;
            const price = parseFloat(UI.slider.value);
            
            // Validation: Don't trade if negative surplus (irrational)
            // But we allow it if user really wants to.
            
            if (role === 'BUYER') {
                // Clear old user bids
                GAME_STATE.market.bids = GAME_STATE.market.bids.filter(b => b.owner !== 'USER');
                addOrder('BID', price, 'USER');
            } else {
                // Clear old user asks
                GAME_STATE.market.asks = GAME_STATE.market.asks.filter(a => a.owner !== 'USER');
                addOrder('ASK', price, 'USER');
            }
        });
    }

    if(UI.btnQuick) {
        UI.btnQuick.addEventListener('click', () => {
            if (GAME_STATE.user.role === 'BUYER') {
                if (GAME_STATE.market.asks.length > 0) {
                    // Buy at Lowest Ask (Capture CS immediately)
                    addOrder('BID', GAME_STATE.market.asks[0].price, 'USER');
                } else {
                    alert("No sellers available!");
                }
            } else {
                if (GAME_STATE.market.bids.length > 0) {
                    // Sell at Highest Bid (Capture PS immediately)
                    addOrder('ASK', GAME_STATE.market.bids[0].price, 'USER');
                } else {
                    alert("No buyers available!");
                }
            }
        });
    }
});

/* * START FUNCTION */
window.startGame = function(role) {
    GAME_STATE.user.role = role;
    GAME_STATE.active = true;

    // CONFIG: User has 3 units.
    if (role === 'BUYER') {
        GAME_STATE.user.values = [1.50, 1.25, 1.00]; // Decreasing WTP
        setupBots(5, 5); // Balanced market
    } else {
        GAME_STATE.user.costs = [0.50, 0.75, 1.00];  // Increasing MC
        setupBots(5, 5);
    }

    // Switch Screens
    UI.overlay.style.display = 'none';
    UI.gameInterface.style.display = 'flex';
    
    updateUI();
    setInterval(runBotLogic, 1000); // Bots think every second
};

function setupBots(numBuyers, numSellers) {
    for(let i=0; i<numBuyers; i++) {
        GAME_STATE.bots.push({ 
            id: `BotBuy${i}`, role: 'BUYER', 
            // Random WTP between $0.80 and $2.00
            value: (0.80 + Math.random() * 1.20).toFixed(2) 
        });
    }
    for(let i=0; i<numSellers; i++) {
        GAME_STATE.bots.push({ 
            id: `BotSell${i}`, role: 'SELLER', 
            // Random MC between $0.40 and $1.50
            cost: (0.40 + Math.random() * 1.10).toFixed(2) 
        });
    }
}

/* * UI UPDATES */
function updateUI() {
    if(!GAME_STATE.active) return;

    const role = GAME_STATE.user.role;
    const idx = GAME_STATE.user.currentUnitIndex;

    // Display Stats
    UI.roleDisplay.textContent = role;
    UI.inventory.textContent = GAME_STATE.user.units - idx;
    UI.earnings.textContent = `$${GAME_STATE.user.earnings.toFixed(2)}`;

    // Unit Values vs Costs
    let currentVal = 0;
    let isDone = idx >= 3;

    if (role === 'BUYER') {
        UI.labelUnitVal.textContent = "Willingness to Pay"; // Economic Term
        currentVal = GAME_STATE.user.values[idx] || 0;
        UI.actionLabel.textContent = "Your Bid";
        UI.btnPrimary.textContent = "SUBMIT BID";
        UI.btnQuick.textContent = "Buy Now (Best Ask)";
    } else {
        UI.labelUnitVal.textContent = "Marginal Cost"; // Economic Term
        currentVal = GAME_STATE.user.costs[idx] || 0;
        UI.actionLabel.textContent = "Your Ask";
        UI.btnPrimary.textContent = "SUBMIT ASK";
        UI.btnQuick.textContent = "Sell Now (Best Bid)";
    }

    UI.unitVal.textContent = isDone ? "Done" : `$${currentVal.toFixed(2)}`;

    // Profit / Surplus Monitor
    if (isDone) {
        UI.btnPrimary.disabled = true;
        UI.btnQuick.disabled = true;
        UI.potentialProfit.textContent = "--";
    } else {
        UI.btnPrimary.disabled = false;
        UI.btnQuick.disabled = false;
        
        const sliderVal = parseFloat(UI.slider.value);
        UI.sliderDisplay.textContent = sliderVal.toFixed(2);
        
        let surplus = 0;
        if (role === 'BUYER') {
            surplus = currentVal - sliderVal; // CS = WTP - Price
        } else {
            surplus = sliderVal - currentVal; // PS = Price - MC
        }
        
        UI.potentialProfit.textContent = `$${surplus.toFixed(2)}`;
        // Green if Positive Surplus (Rational), Red if Negative (Irrational)
        UI.potentialProfit.style.color = surplus >= 0 ? '#2a9d8f' : '#e76f51';
    }

    // Order Book
    GAME_STATE.market.bids.sort((a, b) => b.price - a.price);
    GAME_STATE.market.asks.sort((a, b) => a.price - b.price);

    UI.bidsList.innerHTML = GAME_STATE.market.bids.map(b => 
        `<div class='bid-item'>$${b.price.toFixed(2)}</div>`).join('');
    UI.asksList.innerHTML = GAME_STATE.market.asks.map(a => 
        `<div class='ask-item'>$${a.price.toFixed(2)}</div>`).join('');
}

/* * MARKET MECHANICS (Double Auction) */
function addOrder(type, price, owner) {
    if(!GAME_STATE.active) return;
    const order = { type, price: parseFloat(price), owner, timestamp: Date.now() };

    if (type === 'BID') GAME_STATE.market.bids.push(order);
    else GAME_STATE.market.asks.push(order);

    checkMatch();
    updateUI();
}

function checkMatch() {
    // Sort: Highest Bid vs Lowest Ask
    GAME_STATE.market.bids.sort((a, b) => b.price - a.price);
    GAME_STATE.market.asks.sort((a, b) => a.price - b.price);

    if (GAME_STATE.market.bids.length > 0 && GAME_STATE.market.asks.length > 0) {
        const bestBid = GAME_STATE.market.bids[0];
        const bestAsk = GAME_STATE.market.asks[0];

        // Trade Condition: Bid >= Ask
        if (bestBid.price >= bestAsk.price) {
            executeTrade(bestBid, bestAsk);
        }
    }
}

function executeTrade(bid, ask) {
    // Price Determination: Set at the Bid price (simplified)
    const price = bid.price;
    
    // Log
    const entry = document.createElement('div');
    entry.textContent = `Transaction: $${price.toFixed(2)}`;
    if(UI.marketLog) UI.marketLog.prepend(entry);

    // Remove filled orders
    GAME_STATE.market.bids.shift();
    GAME_STATE.market.asks.shift();

    // CALCULATE REALIZED SURPLUS (Earnings)
    if (bid.owner === 'USER') {
        const wtp = GAME_STATE.user.values[GAME_STATE.user.currentUnitIndex];
        const cs = wtp - price; // Consumer Surplus
        GAME_STATE.user.earnings += cs;
        GAME_STATE.user.currentUnitIndex++;
        
        // Remove other pending user bids
        GAME_STATE.market.bids = GAME_STATE.market.bids.filter(b => b.owner !== 'USER');
    } 
    else if (ask.owner === 'USER') {
        const mc = GAME_STATE.user.costs[GAME_STATE.user.currentUnitIndex];
        const ps = price - mc; // Producer Surplus
        GAME_STATE.user.earnings += ps;
        GAME_STATE.user.currentUnitIndex++;
        
        // Remove other pending user asks
        GAME_STATE.market.asks = GAME_STATE.market.asks.filter(a => a.owner !== 'USER');
    }
}

/* * ECONOMIC BOT LOGIC 
 * Bots now trade based on Rational Expectations of Surplus (CS/PS)
 */
function runBotLogic() {
    if(!GAME_STATE.active) return;

    GAME_STATE.bots.forEach(bot => {
        // Reaction delay (market friction)
        if (Math.random() > 0.1) return; 

        // Analyze Market
        const bestAsk = GAME_STATE.market.asks.length > 0 ? GAME_STATE.market.asks[0].price : null;
        const bestBid = GAME_STATE.market.bids.length > 0 ? GAME_STATE.market.bids[0].price : null;

        /* BUYER LOGIC (Maximize Consumer Surplus) */
        if (bot.role === 'BUYER') {
            const wtp = parseFloat(bot.value);
            
            // 1. Check for immediate CS
            if (bestAsk && bestAsk < wtp) {
                const potentialCS = wtp - bestAsk;
                // If surplus is decent (> $0.05), TAKE IT
                if (potentialCS > 0.05) {
                    addOrder('BID', bestAsk, bot.id);
                    return;
                }
            }

            // 2. If no immediate trade, place a competitive BID
            // Strategy: Bid slightly higher than current best bid, but keep margin for CS
            // If no bids, bid 50% of WTP to start liquidity
            if (!GAME_STATE.market.bids.find(b => b.owner === bot.id)) {
                let targetBid = 0;
                
                if (bestBid) {
                    // Beat the best bid by $0.05, but don't exceed WTP
                    targetBid = Math.min(bestBid + 0.05, wtp - 0.10);
                } else {
                    targetBid = wtp * 0.8; // Open conservative
                }

                // Only bid if it makes rational sense (Positive CS)
                if (targetBid < wtp) {
                    addOrder('BID', targetBid.toFixed(2), bot.id);
                }
            }
        } 
        
        /* SELLER LOGIC (Maximize Producer Surplus) */
        else { // SELLER
            const mc = parseFloat(bot.cost);

            // 1. Check for immediate PS
            if (bestBid && bestBid > mc) {
                const potentialPS = bestBid - mc;
                // If surplus is decent (> $0.05), TAKE IT
                if (potentialPS > 0.05) {
                    addOrder('ASK', bestBid, bot.id);
                    return;
                }
            }

            // 2. If no immediate trade, place a competitive ASK
            // Strategy: Undercut best ask, but keep margin for PS
            if (!GAME_STATE.market.asks.find(a => a.owner === bot.id)) {
                let targetAsk = 0;

                if (bestAsk) {
                    // Undercut by $0.05, but don't go below Cost
                    targetAsk = Math.max(bestAsk - 0.05, mc + 0.10);
                } else {
                    targetAsk = mc * 1.2; // Open conservative
                }

                // Only ask if it makes rational sense (Positive PS)
                if (targetAsk > mc) {
                    addOrder('ASK', targetAsk.toFixed(2), bot.id);
                }
            }
        }
    });
    
    updateUI();
}

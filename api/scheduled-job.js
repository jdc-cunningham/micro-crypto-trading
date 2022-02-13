require('dotenv').config({ path: './.env' });

const {
  localCoinMap,
} = require('./globals.js');

const {
  getCoinMarketCapCryptoPrices, updateLocalCryptoPrices, buy, sell, getOrderStatus, getPortfolioValues,
  countDecimals, truncatePriceUnit, delayNextIteration
} = require('./methods');

/**
 * this script is what the 5-min CRON job runs
 * it will update prices, then attempt to do some algo/the actual
 * buy/sell process
 * 
 * currently the algo is a basic 2% price increase from prev_buy_price
 */
const runScript = async () => {
  const coinCurrentPrices = await getCoinMarketCapCryptoPrices(
    `${Object.keys(localCoinMap).map(coinSymbol => localCoinMap[coinSymbol].id).join(',')}`
  );

  const pricesUpdated = updateLocalCryptoPrices(coinCurrentPrices.data);

  if (pricesUpdated) {
    // loop through all coins, find any that have 0 amt and or no prev transaction id
    // if you have money to buy, buy
    // if it's sell, check that it's 2% above prev price
    const portfolioValues = getPortfolioValues();
    let looper = 0;

    // https://stackoverflow.com/a/37576787
    for (const coinSymbol of Object.keys(portfolioValues)) {
      const coinPrice = coinCurrentPrices.data[localCoinMap[coinSymbol].id].quote.USD.price;
      const portfolio = portfolioValues[coinSymbol];

      if (portfolio.last_tx_id && !portfolio.last_tx_complete) {
        // check if it's complete
        const orderStatus = getOrderStatus(coinSymbol, portfolio.last_tx_id);

        if (orderStatus === 'done') {
          portfolioValues[coinSymbol].last_tx_id = ''; // reset
          portfolioValues[coinSymbol].last_tx_id = true;

          const sellAtGainPrice = (portfolio.prev_buy_price * 1.02).toFixed(2);

          if (coinPrice >= sellAtGainPrice) {
            // can sell
            await sell(coinSymbol, sellAtGainPrice, portfolio.amount);
          }
        }
      } else {
        // can buy
        const smallestPriceUnit = portfolio.smallest_price_unit;
        const priceUnitDecimals = countDecimals(smallestPriceUnit);
        let buySubtractionMultiplier = 0;
        
        if (priceUnitDecimals <= 4) {
          buySubtractionMultiplier = 10;
        } else if (priceUnitDecimals === 5) {
          buySubtractionMultiplier = 25;
        } else {
          buySubtractionMultiplier = 100;
        }

        await buy(
          coinSymbol,
          truncatePriceUnit(
            parseFloat(coinPrice) - (smallestPriceUnit * buySubtractionMultiplier),
            smallestPriceUnit
          ),
          portfolio.balance
        ); // * 5 is hopefully definitely under current price
      }

      console.log(Date.now());
      await delayNextIteration();
    };
  }
};

runScript();
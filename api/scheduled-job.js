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

      if (
        (portfolio.last_tx_id && !portfolio.last_tx_complete)
        || (portfolio.last_tx_complete && parseInt(portfolio.amount) > 0)
      ) {
        // check if it's complete
        const orderStatus = portfolio.last_tx_id ? await getOrderStatus(coinSymbol, portfolio.last_tx_id) : 'done';

        if (orderStatus === 'done') {
          portfolio.last_tx_id = ''; // reset
          portfolio.last_tx_complete = true;

          const sellAtGainPrice = portfolio.prev_buy_price > coinPrice
            ? (portfolio.prev_buy_price * 1.02).toFixed(countDecimals(portfolio.smallest_price_unit))
            : (coinPrice * 1.02).toFixed(countDecimals(portfolio.smallest_price_unit));

          // can sell
          try {
            await sell(coinSymbol, sellAtGainPrice, portfolio.amount);
          } catch (err) {
            console.error(err);
          }
        }
      } else {
        // can buy
        const smallestPriceUnit = portfolio.smallest_price_unit;
        const priceUnitDecimals = countDecimals(smallestPriceUnit);
        let buySubtractionMultiplier = 0;
        portfolio.last_tx_id = ''; // reset
        portfolio.last_tx_complete = true;
        
        if (priceUnitDecimals <= 4) {
          buySubtractionMultiplier = 10;
        } else if (priceUnitDecimals === 5) {
          buySubtractionMultiplier = 25;
        } else {
          buySubtractionMultiplier = 100;
        }

        try {
          await buy(
            coinSymbol,
            truncatePriceUnit(
              parseFloat(coinPrice) - (smallestPriceUnit * buySubtractionMultiplier),
              smallestPriceUnit
            ),
            portfolio.balance
          ); // * 5 is hopefully definitely under current price
        } catch (err) {
          console.error(err);
        }
      }

      console.log(Date.now());
      await delayNextIteration();
    };
  }
};

runScript();
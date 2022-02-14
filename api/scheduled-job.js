require('dotenv').config({
  path: __dirname + '/.env'
});

const {
  localCoinMap,
} = require('/home/pi/micro-crypto-trading/api/globals.js');

const {
  getCoinMarketCapCryptoPrices, updateLocalCryptoPrices, buy, sell, getOrderStatus, getPortfolioValues,
  countDecimals, truncatePriceUnit, delayNextIteration
} = require('/home/pi/micro-crypto-trading/api/methods.js');

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

      if (portfolio.amount && portfolio.current_order_type !== 'sell' && portfolio.last_tx_complete) {
        const sellAtGainPrice = portfolio.prev_buy_price > coinPrice
          ? (portfolio.prev_buy_price * 1.02).toFixed(countDecimals(portfolio.smallest_price_unit))
          : (coinPrice * 1.02).toFixed(countDecimals(portfolio.smallest_price_unit));

        // can sell
        try {
          await sell(coinSymbol, sellAtGainPrice, portfolio.amount);
          console.log(`${Date.now()} ${coinSymbol} sell order placed`);
        } catch (err) {
          console.error(err);
        }
      } else if (await getOrderStatus(coinSymbol, portfolio.last_tx_id) === 'done') {
        // can buy
        const smallestPriceUnit = portfolio.smallest_price_unit;
        const priceUnitDecimals = countDecimals(smallestPriceUnit);
        let buySubtractionMultiplier = 0;
        portfolioValues.last_tx_id = ''; // reset
        portfolioValues.last_tx_complete = true;

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

          console.log(`${Date.now()} ${coinSymbol} buy order placed`);
        } catch (err) {
          console.error(err);
        }
      } else {
        console.log(`${coinSymbol} ${portfolio.current_order_type} order in progress`);
      }

      await delayNextIteration();
    };
  }
};

runScript();
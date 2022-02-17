require('dotenv').config({
  path: __dirname + '/.env'
});

const {
  localCoinMap,
} = require('/home/pi/micro-crypto-trading/api/globals.js');

const {
  getCoinMarketCapCryptoPrices, updateLocalCryptoPrices, buy, sell, getOrder, getPortfolioValues,
  countDecimals, truncatePriceUnit, delayNextIteration, updatePortfolioValues
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

    // https://stackoverflow.com/a/37576787
    for (const coinSymbol of Object.keys(portfolioValues)) {
      const coinPrice = coinCurrentPrices.data[localCoinMap[coinSymbol].id].quote.USD.price;
      const portfolio = portfolioValues[coinSymbol];
      const curOrderType = portfolio.current_order_type;
      const curOrder = portfolio.last_tx_id ? await getOrder(coinSymbol, portfolio.last_tx_id) : null;
      const curOrderComplete = curOrder ? curOrder.status.status === 'done' : false;
      const portfolioHasCoin = parseInt(portfolio.amount) > 0; // wares
      
      if (
        (curOrderType === "sell" && curOrderComplete)
        || (curOrderType === "" && !portfolioHasCoin)
      ) {
        if (curOrderComplete) {
          const { price, size } = curOrder.status;
          portfolio.amount = 0;
          portfolio.balance = (parseFloat(portfolio.balance) + ((parseFloat(price) * parseFloat(size)))).toFixed(2);
          portfolio.last_tx_id = '';
          portfolio.last_tx_complete = true;
          updatePortfolioValues(portfolioValues);
        }

        const priceUnitDecimals = countDecimals(portfolio.smallest_price_unit);
        let buySubtractionMultiplier = 0;

        if (priceUnitDecimals <= 4) {
          buySubtractionMultiplier = 10;
        } else if (priceUnitDecimals === 5) {
          buySubtractionMultiplier = 25;
        } else {
          buySubtractionMultiplier = 100;
        }

        const amountToBuy = truncatePriceUnit(
          parseFloat(coinPrice) - (portfolio.smallest_price_unit * buySubtractionMultiplier),
          portfolio.smallest_price_unit
        );

        try {
          await buy(
            coinSymbol,
            amountToBuy,
            portfolio.balance > 10
              ? portfolio.balance
              : ((size * parseFloat(portfolio.prev_sell_price)) + parseFloat(portfolio.balance)).toFixed(2)
          );

          console.log(`${coinSymbol} buy`);
        } catch (err) {
          console.error(err);
        }
      } else if (
        (curOrderType === "buy" && curOrderComplete)
        || (curOrderType === "" && portfolioHasCoin)
      ) {
        if (curOrderComplete) {
          const { size, price } = curOrder.status;
          portfolio.amount = parseInt(size);
          portfolio.balance = (parseFloat(portfolio.balance) - ((parseFloat(price) * parseFloat(size))).toFixed(2));
          portfolio.last_tx_id = '';
          portfolio.last_tx_complete = true;
          updatePortfolioValues(portfolioValues);
        }

        const sellAtGainPrice = portfolio.prev_buy_price > coinPrice
          ? (portfolio.prev_buy_price * 1.02).toFixed(countDecimals(portfolio.smallest_price_unit))
          : (coinPrice * 1.02).toFixed(countDecimals(portfolio.smallest_price_unit));

        try {
          await sell(coinSymbol, sellAtGainPrice, portfolio.amount);
          console.log(`${coinSymbol} sell`);
        } catch (err) {
          console.error(err);
        }
      }

      await delayNextIteration();
    };

    console.log(Date.now());
  }
};

runScript();
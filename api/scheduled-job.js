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
      let order = {};

      if (
        portfolio.current_order_type === 'sell'
        || (portfolio.current_order_type === "" && parseInt(portfolio.balance) > 10)
      ) {
        order = portfolio.current_order_type === ""
          ? {status: 'done'}
          : await getOrder(coinSymbol, portfolio.last_tx_id);

        console.log(order);

        console.log(`${coinSymbol} sell order status ${JSON.stringify(order.status)}`);

        if (order.status === 'done') {
          // portfolio.current_order_type = "buy";

          // if (order?.size) {
          //   portfolio.amount = 0;
          //   portfolio.balance = ((parseInt(order.size) * parseFloat(order.price)) + parseFloat(portfolio.balance)).toFixed(2);
          //   portfolio.gain = parseFloat(portfolio.balance) > 55 ? parseFloat(portfolio.balance) - 55 : 0;
          //   portfolio.loss = parseFloat(portfolio.balance) < 55 ? 55 - parseFloat(portfolio.balance) : 0;
          // }

          // portfolio.last_tx_id = "";
          // portfolio.last_tx_complete = true;
          // updatePortfolioValues(portfolioValues);

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

          const amountToBuy = truncatePriceUnit(
            parseFloat(coinPrice) - (smallestPriceUnit * buySubtractionMultiplier),
            smallestPriceUnit
          );

          console.log('amount to buy');
          console.log(amountToBuy);

          try {
            await buy(
              coinSymbol,
              amountToBuy,
              portfolio.balance > 10 ? portfolio.balance : ((portfolio.amount * parseFloat(portfolio.prev_sell_price)) + portfolio.balance).toFixed(2),
              order
            ); // * 5 is hopefully definitely under current price

            console.log(`${Date.now()} ${coinSymbol} buy order placed`);
          } catch (err) {
            console.error(err);
          }
        }
      } else if (
        portfolio.current_order_type === 'buy'
        || (portfolio.current_order_type === "" && parseInt(portfolio.amount) > 10)
      ) {
        order = portfolio.current_order_type === ""
          ? {status: 'done'}
          : await getOrder(coinSymbol, portfolio.last_tx_id);

        console.log(order);

        console.log(`${coinSymbol} buy order status ${JSON.stringify(order.status)}`);

        if (order.status === 'done') {
          // portfolio.current_order_type = "";
          // portfolio.last_tx_id = "";
          // portfolio.last_tx_complete = true;

          // if (order?.size) {
          //   portfolio.balance = (parseFloat(portfolio.balance) - (parseInt(order.size) * parseFloat(order.price))).toFixed(2);
          //   portfolio.amount = parseInt(order.size);
          // }

          // updatePortfolioValues(portfolioValues);

          // can sell
          const sellAtGainPrice = portfolio.prev_buy_price > coinPrice
            ? (portfolio.prev_buy_price * 1.02).toFixed(countDecimals(portfolio.smallest_price_unit))
            : (coinPrice * 1.02).toFixed(countDecimals(portfolio.smallest_price_unit));

          try {
            await sell(coinSymbol, sellAtGainPrice, portfolio.amount, order);
            console.log(`${Date.now()} ${coinSymbol} sell order placed`);
          } catch (err) {
            console.error(err);
          }
        }
      } else {
        console.log(`${coinSymbol} ${portfolio.current_order_type} order in progress`);
      }

      await delayNextIteration();
    };
  }
};

runScript();
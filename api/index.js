require('dotenv').config({ path: './.env' });

const {
  getPrice, getCoinMarketCapCryptoPrices, getCoinMarketCapCryptoMap, createOrder,
  getPortfolios, getPortfolioBalance, updateLocalCryptoPrices
} = require('./methods');

const {
  localCoinMap, tradingFee, coinSymbolPortfolioMap, portfolioCredentialsMap,
} = require('./globals.js');

const buy = async (coinSymbol) => {
  const startingBalance = 55.00; // USD

  const coinPrices = await getCoinMarketCapCryptoPrices(
    `${Object.keys(localCoinMap).map(coinSymbol => localCoinMap[coinSymbol].id).join(',')}`
  );

  const coinId = localCoinMap[coin].id;
  const coinPrice = 0.2240; // coinPrices.data[coinId].quote.USD.price;
  const balanceAvailable = startingBalance - (startingBalance * tradingFee);
  const size = (balanceAvailable / coinPrice).toFixed(1);

  createOrder({
    portfolio,
    currencySymbol: coin,
    side: 'buy',
    price: coinPrice,
    size
  });
};

const sell = async (coinSymbol) => {
  const portfolio = portfolioCredentialsMap[coinSymbol];

  const currentCryptoBalance = 243.1; // need to get this from the stored state, flip between USD and crypto

  // const coinPrices = await getCoinMarketCapCryptoPrices(
  //   `${Object.keys(localCoinMap).map(coinSymbol => localCoinMap[coinSymbol].id).join(',')}`
  // );

  // const coinId = localCoinMap[coin].id;
  const coinPrice = 0.229; // coinPrices.data[coinId].quote.USD.price;
  // const balanceAvailable = startingBalance - (startingBalance * tradingFee);
  // const size = (balanceAvailable / coinPrice).toFixed(1);

  createOrder({
    portfolio,
    currencySymbol: coinSymbol,
    side: 'sell',
    price: coinPrice,
    size: currentCryptoBalance
  });
};

const run = async () => {
  // const dntPrice = await getPrice();
  const coinMarketCapCryptoPrices = await getCoinMarketCapCryptoPrices(
    `${Object.keys(localCoinMap).map(coinSymbol => localCoinMap[coinSymbol].id).join(',')}`
  );

  updateLocalCryptoPrices(coinMarketCapCryptoPrices.data);

  // const portfolio2 = {
  //   id: process.env.CBP_PORTFOLIO_2_ID,
  //   key: process.env.CBP_PORTFOLIO_2_KEY,
  //   passphrase: process.env.CBP_PORTFOLIO_2_PASSPHRASE,
  //   secret: process.env.CBP_PORTFOLIO_2_SECRET
  // }

  // console.log(getPortfolios());

  // buy('DNT', portfolio2);
  // sell('DNT');
  // console.log(await getCoinMarketCapHistoricalData(localCoinMap['DNT'].id));
};

run();
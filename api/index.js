require('dotenv').config({ path: './.env' });

const {
  getPrice, getCoinMarketCapCryptoPrices, getCoinMarketCapCryptoMap, createOrder,
  getPortfolios, getPortfolioBalance
} = require('./methods');

const { localCoinMap, tradingFee } = require('./globals.js');

const buy = async (coin, portfolio) => {
  const startingBalance = 55.00; // USD

  const coinPrices = await getCoinMarketCapCryptoPrices(
    `${Object.keys(localCoinMap).map(coinSymbol => localCoinMap[coinSymbol].id).join(',')}`
  );

  const coinId = localCoinMap[coin].id;
  const coinPrice = 0.2245; // coinPrices.data[coinId].quote.USD.price;
  const balanceAvailable = startingBalance - (startingBalance * tradingFee);
  const size = (balanceAvailable / coinPrice).toFixed(4);

  createOrder({
    portfolio,
    currencySymbol: coin,
    side: 'buy',
    price: coinPrice,
    size
  });
}

const run = async () => {
  // const truPrice = await getPrice();
  // const coinMarketCapCryptoMap = await getCoinMarketCapCryptoMap();
  // const coinMarketCapCryptoPrices = await getCoinMarketCapCryptoPrices(
  //   `${Object.keys(localCoinMap).map(coinSymbol => localCoinMap[coinSymbol].id).join(',')}`
  // );
  // console.log(coinMarketCapCryptoPrices);
  // console.log(coinMarketCapCryptoPrices.data['7725'].quote);

  const portfolio2 = {
    id: process.env.CBP_PORTFOLIO_2_ID,
    key: process.env.CBP_PORTFOLIO_2_KEY,
    passphrase: process.env.CBP_PORTFOLIO_2_PASSPHRASE,
    secret: process.env.CBP_PORTFOLIO_2_SECRET
  }

  // console.log(getPortfolios());

  buy('TRU', portfolio2);
}

run();
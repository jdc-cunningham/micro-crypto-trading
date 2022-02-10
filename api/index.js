require('dotenv').config({ path: './.env' });
const { getPrice, getCoinMarketCapCryptoPrices, getCoinMarketCapCryptoMap } = require('./methods');
const { localCoinMap } = require('./globals.js');

const process = async () => {
  // const truPrice = await getPrice();
  // const coinMarketCapCryptoMap = await getCoinMarketCapCryptoMap();
  const coinMarketCapCryptoPrices = await getCoinMarketCapCryptoPrices(
    `${Object.keys(localCoinMap).map(coinSymbol => localCoinMap[coinSymbol].id).join(',')}`
  );
  console.log(coinMarketCapCryptoPrices);
  console.log(coinMarketCapCryptoPrices.data['7725'].quote);
}

process();
require('dotenv').config({ path: './.env' });

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 5011;

const {
  getPrice, getCoinMarketCapCryptoPrices, getCoinMarketCapCryptoMap, createOrder,
  getPortfolios, getPortfolioBalance, updateLocalCryptoPrices, buy, sell, getAllChartData
} = require('./methods');

const {
  localCoinMap, tradingFee, coinSymbolPortfolioMap, portfolioCredentialsMap,
} = require('./globals.js');

const run = async () => {
  // const dntPrice = await getPrice();

  // const coinMarketCapCryptoPrices = await getCoinMarketCapCryptoPrices(
  //   `${Object.keys(localCoinMap).map(coinSymbol => localCoinMap[coinSymbol].id).join(',')}`
  // );
  // updateLocalCryptoPrices(coinMarketCapCryptoPrices.data);

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

// run();

// took this base server code from previous apps I've made
// this is running in my own home network eg. 192 ip address so security is not a huge concern
// CORs
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(
  bodyParser.urlencoded({
      extended: true
  })
);

app.use(bodyParser.json()); // can set limit

// routes
app.get('/get-all-chart-data', getAllChartData);

app.listen(port, () => {
  console.log(`App running... on port ${port}`);
});
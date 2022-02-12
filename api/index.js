require('dotenv').config({ path: './.env' });

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 5011;

const {
  getPrice, getCoinMarketCapCryptoPrices, getCoinMarketCapCryptoMap, createOrder,
  getPortfolios, getPortfolioBalance, updateLocalCryptoPrices, buy, sell, getAllChartData, getErrors
} = require('./methods');

const {
  localCoinMap, tradingFee, coinSymbolPortfolioMap, portfolioCredentialsMap,
} = require('./globals.js');

const run = async () => {
  buy('DNT', '0.0878', 55.00);
};

run();
return;

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
app.get('/check-errors', getErrors);

app.listen(port, () => {
  console.log(`App running... on port ${port}`);
});
require('dotenv').config({ path: './.env' });

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 5011;

const {
  getPrice, getCoinMarketCapCryptoPrices, getCoinMarketCapCryptoMap, createOrder,
  getPortfolios, getPortfolioBalance, updateLocalCryptoPrices, buy, sell, getAllChartData, getErrors, getOrderStatus
} = require('./methods');

const {
  localCoinMap, tradingFee, coinSymbolPortfolioMap, portfolioCredentialsMap,
} = require('./globals.js');

const run = async () => {
  try {
    // await buy('LOOM', 0.0853, 55.00);
    await sell('LOOM', 0.0855, 638);
    // console.log(await getOrderStatus('AMP', '8498069d-9437-4ee6-a33d-18b5a7e472f9'));
  } catch (err) {
    console.error(err);
  }
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
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const { cbpProductIdMap } = require('./globals.js');

const getCoinMarketCapCryptoPrices = (coinIdCommaStr) => {
  return new Promise((resolve, reject) => {
    axios.get(`${process.env.COIN_MARKET_CAP_BASE_URL}/quotes/latest?id=${coinIdCommaStr}`, {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.COIN_MARKET_CAP_API_KEY
      }
    })
      .then((response) => {
        resolve({
          data: response?.data?.data
        });
      })
      .catch((error) => {
        // yeah error ignored
        console.log(error);
        reject({error: true});
      });
    });
}

// combine functions above
const getCoinMarketCapCryptoMap = () => {
  return new Promise((resolve, reject) => {
    axios.get(`${process.env.COIN_MARKET_CAP_BASE_URL}/map`, {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.COIN_MARKET_CAP_API_KEY
      }
    })
      .then((response) => {
        if (response?.data?.data) {
          const coinMap = response.data.data;
          const wantedCoins = [
            'SPELL', 'XYO', 'AMP', 'MDT', 'LOOM', 'ANKR', 'DNT', 'IOTX', 'BLZ'
          ];
          const matchedCoins = coinMap.filter(coin => wantedCoins.indexOf(coin.symbol) !== -1);
          resolve({data: matchedCoins});
        } else {
          resolve({error: true});
        }
      })
      .catch((error) => {
        reject({error: true});
      });
    });
}

// these errors are read by the web app
const writeError = errMsg => {
  const pastRawErrors = fs.readFileSync('./data/errors.json', 'utf8', (err, data) => {
    if (err) {
      return false;
    } else {
      return data;
    }
  });

  if (!pastErrors) { // doesn't make sense, errors failed to read not no errors
    const pastErrors = JSON.parse(pastRawErrors);

    const updatedErrors = {
      [Date.now()]: errMsg,
      ...pastErrors
    };

    fs.writeFile('./data/errors.json', JSON.stringify(updatedErrors), 'utf8', (err, data) => {
      // fail to write to error lol, use telepathy at this point
      console.log(`failed to write error to file, ${JSON.stringify(err).substring(0, 24)}`); // this will be visible on server cli by pm2 logs
    });
  }
}

// accepts object
// coin id map key, quote inner object
// acces values eg. price, percent_change_1h, etc...
const updateLocalCryptoPrices = (currentCoinMarketCapCryptoPrices) => {
  // https://www.geeksforgeeks.org/node-js-fs-readfile-method/
  const localRawPrices = fs.readFileSync('./data/price_tracking.json', 'utf8', (err, data) => {
    if (data) {
      return data;
    } else {
      return false;
    }
  });

  if (!localRawPrices) {
    writeError('Failed to read local crypto prices');
  } else {
    const localPrices = JSON.parse(localRawPrices);
    const processTime = Date.now();

    Object.keys(currentCoinMarketCapCryptoPrices).map(coinMapId => {
      const coinPriceInfo = currentCoinMarketCapCryptoPrices[coinMapId];
      const { symbol } = coinPriceInfo;
      const coinQuote = coinPriceInfo.quote.USD;
      const { price, percent_change_1h, percent_change_24h, percent_change_7d } = coinQuote;

      localPrices[symbol].unshift({
        timestamp: processTime,
        price: price.toFixed(4), // not very precise
        percent_change_1h,
        percent_change_24h,
        percent_change_7d,
      })
    });

    fs.writeFile('./data/price_tracking.json', JSON.stringify(localPrices), 'utf8', (err, data) => {
      if (err) {
        writeError(`Failed to write new prices, ${JSON.stringify(err).substring(0, 24)}`);
      }
    });
  }
}

// https://docs.cloud.coinbase.com/exchange/reference/exchangerestapi_postorders
const createOrder = ({
  portfolio,
  currencySymbol,
  side,
  price,
  size
}) => {
  return new Promise((resolve, reject) => {
    // the whole process below to setup the request is from the docs
    // https://docs.pro.coinbase.com/#success
    const secret = portfolio.secret;
    const timestamp = Date.now() / 1000;
    const requestPath = `/orders`;
    const method = 'POST';

    const body = {
      profile_id: portfolio.id,
      type: 'limit',
      side, // 'buy'
      product_id: String(cbpProductIdMap[currencySymbol]),
      stp: 'dc',
      time_in_force: 'GTC',
      post_only: 'true',
      price: String(price), // string per crypto
      size: String(size), // unit of crypto
    };

    const what = timestamp + method + requestPath + JSON.stringify(body);
    const key = new Buffer.from(secret, 'base64');
    const hmac = crypto.createHmac('sha256', key);
    const sign = hmac.update(what).digest('base64');

    const options = {
      method: 'POST',
      url: `${process.env.CBP_API_BASE_URL}/orders`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'CB-ACCESS-KEY': portfolio.key,
        'CB-ACCESS-SIGN': sign,
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-ACCESS-PASSPHRASE': portfolio.passphrase
      },
      data: body,
    };

    axios.request(options)
      .then((response) => {
        console.log(response);
        resolve({
          data: response.data
        });
      })
      .catch((error) => {
        console.log(error);
        reject({error});
      });
  });
}

// does not work, balance isn't provided
const getPortfolioBalance = profileId => {
  return new Promise((resolve, reject) => {
    // the whole process below to setup the request is from the docs
    // https://docs.pro.coinbase.com/#success

    const portfolio = {
      key: process.env.CBP_PORTFOLIO_2_KEY,
      passphrase: process.env.CBP_PORTFOLIO_2_PASSPHRASE,
      secret: process.env.CBP_PORTFOLIO_2_SECRET
    }

    const secret = portfolio.secret;
    const timestamp = Date.now() / 1000;
    const requestPath = `/profiles/${profileId}`;
    const method = 'GET';
    const what = timestamp + method + requestPath;
    const key = new Buffer.from(secret, 'base64');
    const hmac = crypto.createHmac('sha256', key);
    const sign = hmac.update(what).digest('base64');
    

    axios.get(`${process.env.CBP_API_BASE_URL}/profiles/${profileId}`, {
      headers: {
        'CB-ACCESS-KEY': portfolio.key,
        'CB-ACCESS-SIGN': sign,
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-ACCESS-PASSPHRASE': portfolio.passphrase
      },
    })
      .then((response) => {
        console.log(response);
        resolve({
          data: response.data
        });
      })
      .catch((error) => {
        console.log(error);
        reject({error});
      });
  });
}

const getPortfolios = () => {
  return new Promise((resolve, reject) => {
    // the whole process below to setup the request is from the docs
    // https://docs.pro.coinbase.com/#success
    const portfolio = {
      key: process.env.CBP_PORTFOLIO_2_KEY,
      passphrase: process.env.CBP_PORTFOLIO_2_PASSPHRASE,
      secret: process.env.CBP_PORTFOLIO_2_SECRET
    }

    const secret = portfolio.secret;
    const timestamp = Date.now() / 1000;
    const requestPath = `/profiles`;
    const method = 'GET';
    const what = timestamp + method + requestPath;
    const key = new Buffer.from(secret, 'base64');
    const hmac = crypto.createHmac('sha256', key);
    const sign = hmac.update(what).digest('base64');

    axios.get(`${process.env.CBP_API_BASE_URL}/profiles`, {
      headers: {
        'CB-ACCESS-KEY': portfolio.key,
        'CB-ACCESS-SIGN': sign,
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-ACCESS-PASSPHRASE': portfolio.passphrase
      },
    })
      .then((response) => {
        console.log(response);
        resolve({
          data: response?.data.filter(profile => profile.active)
        });
      })
      .catch((error) => {
        console.log(error);
        reject({error});
      });
  });
}

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

const getAllChartData = (request, response) => {
  // this processing will get worse over time, every day will add 288 entries
  const localRawPrices = fs.readFileSync('./data/price_tracking.json', 'utf8', (err, data) => {
    if (data) {
      return data;
    } else {
      return false;
    }
  });

  if (!localRawPrices) {
    writeError('Failed to read local crypto prices');
    response.status('500').json({err: true});
  } else {
    const localPrices = JSON.parse(localRawPrices);

    // filter out by today's date
    // https://stackoverflow.com/a/30158617/2710227
    // tz https://stackoverflow.com/a/28149561/2710227
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const todaysDate = new Date(Date.now() - tzOffset).toISOString().split('T')[0];
    const todayStartingTimestamp = new Date(todaysDate).getTime();
    const todayEndingTimestamp = todayStartingTimestamp + (24 * 60 * 60 * 1000);

    // I almost did this a poor way but I thought for 2 seconds and use the timestamp route vs. date comparison

    response.status('200').json({
      data: Object.keys(localPrices).map(coinSymbol => ({
        [coinSymbol]: localPrices[coinSymbol].filter(price =>
          price.timestamp >= todayStartingTimestamp && price.timestamp <= todayEndingTimestamp
        )
      }))
    });
  }
}

module.exports = {
  getCoinMarketCapCryptoPrices,
  getCoinMarketCapCryptoMap,
  createOrder,
  getPortfolios,
  getPortfolioBalance,
  updateLocalCryptoPrices,
  buy,
  sell,
  getAllChartData
}
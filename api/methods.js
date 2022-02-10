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
  const pastErrors = fs.readFile('./data/errors.json', 'utf8', (err, data) => {
    if (err) {
      return false;
    } else {
      return JSON.parse(data);
    }
  });

  if (!pastErrors) { // doesn't make sense, errors failed to read not no errors
    const updatedErrors = {
      [Date.now()]: errMsg,
      ...pastErrors
    };

    fs.writeFile('./data/errors.json', JSON.stringify(updatedErrors), 'utf8', (err, data) => {
      // fail to write to error lol, use telepathy at this point
    });
  }
}

// accepts object
// coin id map key, quote inner object
// acces values eg. price, percent_change_1h, etc...
const updateLocalCryptoPrices = (currentCoinMarketCapCryptoPrices) => {
  // https://www.geeksforgeeks.org/node-js-fs-readfile-method/
  const localPrices = fs.readFile('./data/price_tracking.json', 'utf8', (err, data) => {
    if (data) {
      return JSON.parse(data);
    } else {
      return false;
    }
  });

  if (!localPrices) {
    writeError('failed to update crypto prices');
  } else {
    const processTime = Date.now();

    Object.keys(currentCoinMarketCapCryptoPrices).map(coinMapId => {
      const coinQuote = currentCoinMarketCapCryptoPrices[coinMapId];
      const { price, percent_change_1h, percent_change_24h, percent_change_7d } = coinQuote;

      localPrices[coinQuote.symbol].push({
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

module.exports = {
  getCoinMarketCapCryptoPrices,
  getCoinMarketCapCryptoMap,
  createOrder,
  getPortfolios,
  getPortfolioBalance,
  updateLocalCryptoPrices,
}
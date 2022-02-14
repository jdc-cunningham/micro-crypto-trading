const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const { cbpProductIdMap, portfolioCredentialsMap, tradingFee } = require('/home/pi/micro-crypto-trading/api/globals.js');

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
  const pastRawErrors = fs.readFileSync('/home/pi/micro-crypto-trading/api/data/errors.json', 'utf8', (err, data) => {
    if (err) {
      return false;
    } else {
      return data;
    }
  });

  if (pastRawErrors) { // doesn't make sense, errors failed to read not no errors
    const pastErrors = JSON.parse(pastRawErrors);

    const updatedErrors = {
      [Date.now()]: errMsg,
      ...pastErrors
    };

    fs.writeFile('/home/pi/micro-crypto-trading/api/data/errors.json', JSON.stringify(updatedErrors), 'utf8', (err, data) => {
      if (err) {
        // fail to write to error lol, use telepathy at this point
        console.log(`Failed to write error to file, ${JSON.stringify(err).substring(0, 24)}`); // this will be visible on server cli by pm2 logs
      }
    });
  } else {
    console.log('Failed to read error file');
  }
}

// accepts object
// coin id map key, quote inner object
// acces values eg. price, percent_change_1h, etc...
const updateLocalCryptoPrices = (currentCoinMarketCapCryptoPrices) => {
  // https://www.geeksforgeeks.org/node-js-fs-readfile-method/
  const localRawPrices = fs.readFileSync('/home/pi/micro-crypto-trading/api/data/price_tracking.json', 'utf8', (err, data) => {
    if (data) {
      return data;
    } else {
      return false;
    }
  });

  if (!localRawPrices) {
    writeError('Failed to read local crypto prices');
    return false;
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

    fs.writeFile('/home/pi/micro-crypto-trading/api/data/price_tracking.json', JSON.stringify(localPrices), 'utf8', (err, data) => {
      if (err) {
        writeError(`Failed to write new prices, ${JSON.stringify(err).substring(0, 24)}`);
        return false;
      }
    });
  }

  return true;
}

const updatePortfolioValues = (newPortfolioValues) => {
  fs.writeFile('/home/pi/micro-crypto-trading/api/data/portfolio_values.json', JSON.stringify(newPortfolioValues), 'utf8', (err, data) => {
    if (err) {
      console.log(`failed to update portfolio values`);
      return false;
    } else {
      return true;
    }
  });
}

const updateTxStatus = (coinSymbol, orderId, status) => {
  const localPortfolioValuesRaw = fs.readFileSync('/home/pi/micro-crypto-trading/api/data/portfolio_values.json', 'utf8', (err, data) => {
    if (data) {
      return data;
    } else {
      return false;
    }
  });

  if (!localPortfolioValuesRaw) {
    writeError(`Failed to update tx status for ${coinSymbol}`);
  } else {
    const portfolioValues = JSON.parse(localPortfolioValuesRaw);
    portfolioValues[coinSymbol].last_tx_complete = status === 'done' ? true : false; // should always done at this stage

    fs.writeFile('/home/pi/micro-crypto-trading/api/data/portfolio_values.json', JSON.stringify(portfolioValues), 'utf8', (err, data) => {
      if (err) {
        console.log(`failed to write to update tx status for ${coinSymbol}`);
      }
    });
  }
}

/**
 * 
 * @param {String} coinSymbol 
 * @param {String} orderId 
 * @returns {Object} status eg. open/filled or error
 */
const getOrderStatus = (coinSymbol, orderId) => {
  return new Promise((resolve, reject) => {
    const coinPortfolio = portfolioCredentialsMap[coinSymbol];
    const secret = coinPortfolio.secret;
    const timestamp = Date.now() / 1000;
    const requestPath = `/orders/${orderId}`;
    const method = 'GET';
    const what = timestamp + method + requestPath;
    const key = new Buffer.from(secret, 'base64');
    const hmac = crypto.createHmac('sha256', key);
    const sign = hmac.update(what).digest('base64');

    axios.get(`${process.env.CBP_API_BASE_URL}/orders/${orderId}`, {
      headers: {
        'CB-ACCESS-KEY': coinPortfolio.key,
        'CB-ACCESS-SIGN': sign,
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-ACCESS-PASSPHRASE': coinPortfolio.passphrase
      },
    })
      .then((response) => {
        const { status } = response.data;

        if (status === 'done') {
          updateTxStatus(coinSymbol, orderId, 'done');
        }

        resolve({
          status: response.data.status
        });
      })
      .catch((error) => {
        writeError(`Failed to get ${coinSymbol} order status`);
        reject(error);
      });
  });
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
      .then(response => {
        resolve({
          data: response.data
        });
      })
      .catch(error => {
        console.log(error.data);
        writeError(`Failed to create ${side} order for ${currencySymbol}`);
        reject(error);
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

const getPortfolioValues = () => {
  const localPortfolioValuesRaw = fs.readFileSync('/home/pi/micro-crypto-trading/api/data/portfolio_values.json', 'utf8', (err, data) => {
    if (data) {
      return data;
    } else {
      return false;
    }
  });

  if (!localPortfolioValuesRaw) {
    writeError(`Failed to read local portfolio values`);
  } else {
    return JSON.parse(localPortfolioValuesRaw);
  }
}

/**
 * if a transaction succeeds this updates the relevant coin's
 * local portfolio values to keep the state of the portfolios in check
 * in order to keep buying/selling
 *
 * @param {String} coinSymbol eg. DNT
 * @param {String} action buy/sell 
 * @param {Object} txInfo has info like amount and size
 */
const updateLocalPortfolioValues = (coinSymbol, action, txInfo) => {
  // txAmount can flex between units of a coin and USD depending on action
  const { txAmount, txSize, txPrice, txLoss, txGain, txId } = txInfo;

  const localPortfolioValuesRaw = fs.readFileSync('/home/pi/micro-crypto-trading/api/data/portfolio_values.json', 'utf8', (err, data) => {
    if (data) {
      return data;
    } else {
      return false;
    }
  });

  if (!localPortfolioValuesRaw) {
    writeError(`Failed to update local portfolio values for coin ${coinSymbol}`);
  } else {
    const localPortfolioValues = JSON.parse(localPortfolioValuesRaw);
    const updatedCoinPortfolioValues = localPortfolioValues[coinSymbol];
    updatedCoinPortfolioValues['last_tx_id'] = txId;
    updatedCoinPortfolioValues['last_tx_complete'] = false;

    if (action === 'buy') {
      updatedCoinPortfolioValues['prev_buy_price'] = txPrice;
      updatedCoinPortfolioValues['current_order_type'] = 'buy';
    } else {
      updatedCoinPortfolioValues['prev_sell_price'] = txPrice;
      updatedCoinPortfolioValues['current_order_type'] = 'sell';
    }

    const updatedLocalPortfolioValues = {
      ...localPortfolioValues,
      [coinSymbol]: updatedCoinPortfolioValues
    };

    fs.writeFile('/home/pi/micro-crypto-trading/api/data/portfolio_values.json', JSON.stringify(updatedLocalPortfolioValues), 'utf8', (err, data) => {
      if (err) {
        console.log(`failed to write to update local portfolio values`);
      }
    });
  }
}

/**
 * performs limit buy on CBP
 *
 * @param {String} coinSymbol eg. DNT
 * @param {Float} coinPrice 4 decimal place precision
 * @param {Float} coinPortfolioBalance USD
 *
 */
const buy = async (coinSymbol, coinPrice, coinPortfolioBalance) => {
  const coinPortfolio = portfolioCredentialsMap[coinSymbol];
  const balanceAvailable = coinPortfolioBalance - (coinPortfolioBalance * tradingFee); // limits amount used by 2x actual trading fee
  const size = (balanceAvailable / coinPrice).toFixed(0);

  const coinPurchased = await createOrder({
    portfolio: coinPortfolio,
    currencySymbol: coinSymbol,
    side: 'buy',
    price: coinPrice,
    size
  });

  if (!coinPurchased) {
    writeError(`failed to buy ${coinSymbol}`);
  } else {
    const { id, price, size } = coinPurchased.data;
    const rawTxAmount = parseFloat(price) * parseFloat(size);

    const txInfo = {
      txId: id,
      txPrice: price,
      txSize: size,
      txAmount: (rawTxAmount + (rawTxAmount * 0.005)).toFixed(2) // adds 0.5% actual trading fee
    };

    updateLocalPortfolioValues(coinSymbol, 'buy', txInfo);
  }
};

/**
 * performs limit sell on CBP
 *
 * @param {String} coinSymbol eg. DNT
 * @param {Float} coinSalePrice determined salePrice from algo
 * @param {Float} coinSaleSize size based on amount in portfolio
 *
 */
const sell = async (coinSymbol, coinSalePrice, coinSaleSize) => {
  const coinPortfolio = portfolioCredentialsMap[coinSymbol];

  const coinSold = await createOrder({
    portfolio: coinPortfolio,
    currencySymbol: coinSymbol,
    side: 'sell',
    price: coinSalePrice,
    size: coinSaleSize
  });

  if (!coinSold) {
    writeError(`failed to sell ${coinSymbol}`);
  } else {
    const { id, price, size } = coinSold.data;
    const rawTxAmount = parseFloat(price) * parseFloat(size);
    const portfolioValues = getPortfolioValues();
    const {amount, balance, prev_buy_price } = portfolioValues[coinSymbol];
    const prevWalletValue = parseFloat(balance) + (parseInt(amount) * parseFloat(prev_buy_price));
    const sellReturn = (rawTxAmount - (rawTxAmount * 0.005)).toFixed(2);

    let txGain;
    let txLoss;

    if (sellReturn > prevWalletValue) {
      txGain = (sellReturn - prevWalletValue).toFixed(2);
    } else {
      txLoss = (sellReturn - prevWalletValue).toFixed(2);
    }

    const txInfo = {
      txId: id,
      txPrice: price,
      txSize: size,
      txAmount: (rawTxAmount - (rawTxAmount * 0.005)).toFixed(2), // factors in 0.5% actual trading fee
      txGain,
      txLoss
    };

    updateLocalPortfolioValues(coinSymbol, 'sell', txInfo);
  }
};

// https://stackoverflow.com/a/17369245/2710227
const countDecimals = (someFloat) => {
  Number.prototype.countDecimals = function () {
    if (Math.floor(this.valueOf()) === this.valueOf()) return 0;

    var str = this.toString();
    if (str.indexOf(".") !== -1 && str.indexOf("-") !== -1) {
        return str.split("-")[1] || 0;
    } else if (str.indexOf(".") !== -1) {
        return str.split(".")[1].length || 0;
    }
    return str.split("-")[1] || 0;
  }

  return someFloat.countDecimals();
}


const truncatePriceUnit = (price, smallestPriceUnit) => {
  const priceParts = String(price).split('.');
  return parseFloat(priceParts[0] + '.' + priceParts[1].substring(0, countDecimals(smallestPriceUnit)));
}

const getAllChartData = (request, response) => {
  // this processing will get worse over time, every day will add 288 entries
  const localRawPrices = fs.readFileSync('/home/pi/micro-crypto-trading/api/data/price_tracking.json', 'utf8', (err, data) => {
    if (data) {
      return data;
    } else {
      return false;
    }
  });

  const portfolioValuesRaw = fs.readFileSync('/home/pi/micro-crypto-trading/api/data/portfolio_values.json', 'utf8', (err, data) => {
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
    const portfolioData = portfolioValuesRaw ? JSON.parse(portfolioValuesRaw) : {};

    // filter out by today's date
    // https://stackoverflow.com/a/30158617/2710227
    // tz https://stackoverflow.com/a/28149561/2710227
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const todaysDate = new Date(Date.now() - tzOffset).toISOString().split('T')[0];
    const todayStartingTimestamp = new Date(todaysDate).getTime() + (6 * 60 * 60 * 1000);
    const todayEndingTimestamp = todayStartingTimestamp + (24 * 60 * 60 * 1000);

    // I almost did this a poor way but I thought for 2 seconds and use the timestamp route vs. date comparison

    response.status('200').json({
      data: Object.keys(localPrices).map(coinSymbol => ({
        [coinSymbol]: {
          value: (portfolioData[coinSymbol].last_tx_complete && !portfolioData[coinSymbol].amount)
            ? `${parseFloat(portfolioData[coinSymbol].balance).toFixed(2)}`
            : `${parseInt((portfolioData[coinSymbol].amount) * parseFloat(localPrices[coinSymbol][0].price)).toFixed(2)}`,
          prices: localPrices[coinSymbol].filter(price =>
            price.timestamp >= todayStartingTimestamp && price.timestamp <= todayEndingTimestamp
          )
        }
      }))
    });
  }
}

const getErrors = (request, response) => {
  const errorsRaw = fs.readFileSync('/home/pi/micro-crypto-trading/api/data/errors.json', 'utf8', (err, data) => {
    if (data) {
      return data;
    } else {
      return false;
    }
  });

  if (!errorsRaw) {
    response.status('200').json({errors: null});
  } else {
    response.status('200').json({errors: JSON.parse(errorsRaw)});
  }
}

const delayNextIteration = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, 500);
  });
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
  getAllChartData,
  getErrors,
  getOrderStatus,
  getPortfolioValues,
  countDecimals,
  truncatePriceUnit,
  delayNextIteration,
  updatePortfolioValues
}
const crypto = require('crypto');
const axios = require('axios');

const getPrice = () => {
  return new Promise((resolve, reject) => {
    const portfolio = {
      key: process.env.CBP_PORTFOLIO_2_KEY,
      passphrase: process.env.CBP_PORTFOLIO_2_PASSPHRASE,
      secret: process.env.CBP_PORTFOLIO_2_SECRET
    }

    // the whole process below to setup the request is from the docs
    // https://docs.pro.coinbase.com/#success
    const secret = portfolio.secret;
    const timestamp = Date.now() / 1000;
    const requestPath = `/currencies/TRU`;
    const method = 'GET';
    const what = timestamp + method + requestPath;
    const key = new Buffer.from(secret, 'base64');
    const hmac = crypto.createHmac('sha256', key);
    const sign = hmac.update(what).digest('base64');

    axios.get(`${process.env.CBP_API_BASE_URL}/currencies/TRU`, {
      headers: {
        'CB-ACCESS-KEY': portfolio.key,
        'CB-ACCESS-SIGN': sign,
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-ACCESS-PASSPHRASE': portfolio.passphrase
      }
    })
      .then((response) => {
        resolve({
          data: response.data
        });
      })
      .catch((error) => {
        reject({error});
      });
    });
}

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
            'TRU', 'SPELL', 'XYO', 'AMP', 'MDT', 'LOOM', 'ANKR', 'DNT', 'IOTX', 'BLZ'
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

module.exports = {
  getPrice,
  getCoinMarketCapCryptoPrices,
  getCoinMarketCapCryptoMap
}
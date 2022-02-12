// have to call and parse the map url and it has close to 20,000 results
const localCoinMap = {
  'DNT': {
    id: 1856,
    name: 'district0x',
    slug: 'district0x',
  },
  'MDT': {
    id: 2348,
    name: 'Measurable Data Token',
    slug: 'measurable-data-token',
  },
  'BLZ': {
    id: 2505,
    name: 'Bluzelle',
    slug: 'bluzelle',
  },
  'LOOM': {
    id: 2588,
    name: 'Loom Network',
    slug: 'loom-network',
  },
  'XYO': {
    id: 2765,
    name: 'XYO',
    slug: 'xyo',
  },
  'IOTX': {
    id: 2777,
    name: 'IoTeX',
    slug: 'iotex',
  },
  'ANKR': {
    id: 3783,
    name: 'Ankr',
    slug: 'ankr',
  },
  'AMP': {
    id: 6945,
    name: 'Amp',
    slug: 'amp',
  },
  'SPELL': {
    id: 11289,
    name: 'Spell Token',
    slug: 'spell-token',
  }
};

const cbpProductIdMap = {
  'DNT': 'DNT-USD',
  'MDT': 'MDT-USD',
  'BLZ': 'BLZ-USD',
  'LOOM': 'LOOM-USD',
  'XYO': 'XYO-USD',
  'IOTX': 'IOTX-USD',
  'ANKR': 'ANKR-USD',
  'AMP': 'AMP-USD',
  'SPELL': 'SPELL-USD' 
};

const tradingFee = 0.01; // rounded up for safe math padding

const coinSymbolPortfolioMap = {
  'DNT': 3, // use array + 1 but oh well
  'MDT': 4,
  'BLZ': 5,
  'LOOM': 6,
  'XYO': 7,
  'IOTX': 8,
  'ANKR': 9,
  'AMP': 10,
  'SPELL': 11 
};

const portfolioCredentialsMap = {
  'DNT': {
    id: process.env.CBP_PORTFOLIO_2_ID,
    key: process.env.CBP_PORTFOLIO_2_KEY,
    passphrase: process.env.CBP_PORTFOLIO_2_PASSPHRASE,
    secret: process.env.CBP_PORTFOLIO_2_SECRET
  },
  'MDT': {
    id: process.env.CBP_PORTFOLIO_3_ID,
    key: process.env.CBP_PORTFOLIO_3_KEY,
    passphrase: process.env.CBP_PORTFOLIO_3_PASSPHRASE,
    secret: process.env.CBP_PORTFOLIO_3_SECRET
  },
  'BLZ': {
    id: process.env.CBP_PORTFOLIO_4_ID,
    key: process.env.CBP_PORTFOLIO_4_KEY,
    passphrase: process.env.CBP_PORTFOLIO_4_PASSPHRASE,
    secret: process.env.CBP_PORTFOLIO_4_SECRET
  },
  'LOOM': {
    id: process.env.CBP_PORTFOLIO_5_ID,
    key: process.env.CBP_PORTFOLIO_5_KEY,
    passphrase: process.env.CBP_PORTFOLIO_5_PASSPHRASE,
    secret: process.env.CBP_PORTFOLIO_5_SECRET
  },
  'XYO': {
    id: process.env.CBP_PORTFOLIO_6_ID,
    key: process.env.CBP_PORTFOLIO_6_KEY,
    passphrase: process.env.CBP_PORTFOLIO_6_PASSPHRASE,
    secret: process.env.CBP_PORTFOLIO_6_SECRET
  },
  'IOTX': {
    id: process.env.CBP_PORTFOLIO_7_ID,
    key: process.env.CBP_PORTFOLIO_7_KEY,
    passphrase: process.env.CBP_PORTFOLIO_7_PASSPHRASE,
    secret: process.env.CBP_PORTFOLIO_7_SECRET
  },
  'ANKR': {
    id: process.env.CBP_PORTFOLIO_8_ID,
    key: process.env.CBP_PORTFOLIO_8_KEY,
    passphrase: process.env.CBP_PORTFOLIO_8_PASSPHRASE,
    secret: process.env.CBP_PORTFOLIO_8_SECRET
  },
  'AMP': {
    id: process.env.CBP_PORTFOLIO_9_ID,
    key: process.env.CBP_PORTFOLIO_9_KEY,
    passphrase: process.env.CBP_PORTFOLIO_9_PASSPHRASE,
    secret: process.env.CBP_PORTFOLIO_9_SECRET
  },
  'SPELL': {
    id: process.env.CBP_PORTFOLIO_10_ID,
    key: process.env.CBP_PORTFOLIO_10_KEY,
    passphrase: process.env.CBP_PORTFOLIO_10_PASSPHRASE,
    secret: process.env.CBP_PORTFOLIO_10_SECRET
  }
};

module.exports = {
  localCoinMap,
  cbpProductIdMap,
  tradingFee,
  coinSymbolPortfolioMap,
  portfolioCredentialsMap
};
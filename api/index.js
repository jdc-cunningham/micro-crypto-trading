require('dotenv').config({ path: './.env' });
const { getPrice } = require('./methods');

const process = async () => {
  const truPrice = await getPrice();
  console.log(truPrice);
}

process();
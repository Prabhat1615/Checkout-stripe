const config = require('./env');
if (!config.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY is missing in .env');
}
const stripe = require('stripe')(config.STRIPE_SECRET_KEY);
module.exports = stripe;

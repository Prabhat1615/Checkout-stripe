const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { getUserById, getOrdersByEmail } = require('../ordersDb_mongo');

async function getOrders(req, res) {
  try {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (_) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    let email = payload.email;
    if (!email) {
      const user = await getUserById(payload.sub);
      email = user && user.email;
    }
    if (!email) return res.status(400).json({ error: 'Unable to resolve user email' });
    const orders = await getOrdersByEmail(email);
    res.json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { getOrders };

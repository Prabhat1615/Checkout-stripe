const { getAllProducts } = require('../ordersDb_mongo');

async function listProducts(req, res) {
  try {
    const list = await getAllProducts();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { listProducts };

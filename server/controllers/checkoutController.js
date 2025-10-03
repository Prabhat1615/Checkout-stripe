const stripe = require('../config/stripe');
const { CLIENT_BASE_URL } = require('../config/env');
const { getProductById, saveOrder } = require('../ordersDb_mongo');

async function createCheckoutSession(req, res) {
  const { items, email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });

  try {
    const built = await Promise.all(
      items.map(async (it) => {
        const product = await getProductById(it.id);
        if (!product) throw new Error('Invalid product in cart');
        const qty = it.quantity || 1;
        return {
          line_item: {
            price_data: {
              currency: 'usd',
              product_data: { name: product.name },
              unit_amount: product.price,
            },
            quantity: qty,
          },
          saved_item: {
            id: product.id,
            name: product.name,
            image: product.image || null,
            price: product.price,
            quantity: qty,
          },
        };
      })
    );

    const line_items = built.map((b) => b.line_item);
    const savedItems = built.map((b) => b.saved_item);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      payment_method_types: ['card'],
      line_items,
      success_url: `${CLIENT_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_BASE_URL}/cancel`,
    });

    const totalAmount = line_items.reduce((sum, li) => sum + li.price_data.unit_amount * (li.quantity || 1), 0);
    await saveOrder({
      sessionId: session.id,
      email,
      items: savedItems,
      amount: totalAmount,
      status: 'pending',
      paymentIntentId: null,
    });

    res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('Error creating checkout session', err);
    res.status(500).json({ error: err.message });
  }
}

async function sessionStatus(req, res) {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id.toString());
    res.json({ status: session.status, payment_status: session.payment_status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { createCheckoutSession, sessionStatus };

const stripe = require('../config/stripe');
const { STRIPE_WEBHOOK_SECRET } = require('../config/env');
const { saveOrder, updateOrderStatus } = require('../ordersDb_mongo');

async function handleWebhook(req, res) {
  let event = req.body;
  if (STRIPE_WEBHOOK_SECRET) {
    const sig = req.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        // Get line items for the order
        let items = [];
        let amount = 0;
        try {
          const list = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
          items = (list.data || []).map((li) => ({
            description: li.description,
            name: li.description,
            quantity: li.quantity,
            amount_subtotal: li.amount_subtotal,
            amount_total: li.amount_total,
            currency: li.currency,
            id: li.price?.id || null,
            price: li.price?.unit_amount || null,
            image: null,
          }));
          amount = items.reduce((s, li) => s + (li.amount_total || 0), 0);
        } catch (e) {
          console.warn('Failed to list line items for session', session.id, e.message);
        }
        
        // Create or update order
        await saveOrder({
          sessionId: session.id,
          email: (session.customer_details && session.customer_details.email) || session.customer_email || null,
          items,
          amount,
          status: 'succeeded',
          paymentIntentId: session.payment_intent || null,
        });
        break;
      }
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired': {
        const session = event.data.object;
        // Get line items for the order
        let items = [];
        let amount = 0;
        try {
          const list = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
          items = (list.data || []).map((li) => ({
            description: li.description,
            name: li.description,
            quantity: li.quantity,
            amount_subtotal: li.amount_subtotal,
            amount_total: li.amount_total,
            currency: li.currency,
            id: li.price?.id || null,
            price: li.price?.unit_amount || null,
            image: null,
          }));
          amount = items.reduce((s, li) => s + (li.amount_total || 0), 0);
        } catch (e) {
          console.warn('Failed to list line items for failed/expired session', session.id, e.message);
        }
        
        // Create or update order
        await saveOrder({
          sessionId: session.id,
          email: (session.customer_details && session.customer_details.email) || session.customer_email || null,
          items,
          amount,
          status: 'failed',
          paymentIntentId: session.payment_intent || null,
        });
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error('Error handling webhook', e);
  }

  res.json({ received: true });
}

module.exports = { handleWebhook };

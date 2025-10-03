// Express + Stripe backend for simple checkout
// Load .env from project root explicitly to avoid confusion with nested .env files
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { handleWebhook } = require('./controllers/webhookController');
const Stripe = require('stripe');
const stripe = Stripe('sk_test_51SE3d1IxKyOoK4NWCqb7mBqBt2FPJWPIyLSHYGWzlNmJOOsR7EiY1EGYED664p9qSBz93PNdfSKCtk5farZYvhD900MwICMdj4'); // Replace with your actual Stripe secret key

const {
  initDb,
  saveOrder,
  updateOrderStatus,
  // auth helpers
  createUser,
  getUserByEmail,
  getUserById,
  // product helpers
  upsertProducts,
  getAllProducts,
  getProductById,
// orders
  getOrdersByEmail,
} = require('./ordersDb_mongo');

const app = express();
const { SERVER_PORT } = require('./config/env');

app.use(cors());
app.use(express.json());

// Webhook route must come BEFORE express.json() middleware since it needs raw body
app.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

function hashPassword(password, salt) {
  // PBKDF2 with SHA-256
  return crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
}

function genSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// No random token generation needed; we issue JWTs.

function getTokenFromReq(req) {
  const hdr = req.headers['authorization'] || '';
  const parts = hdr.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') return parts[1];
  return null;
}

// --- Auth routes ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const existing = await getUserByEmail(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const salt = genSalt();
    const password_hash = hashPassword(password, salt);
    const user = await createUser({ email, password_hash, salt });

    const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
    res.json({ token, user });
  } catch (e) {
    console.error('Register error', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const u = await getUserByEmail(email);
    if (!u) return res.status(400).json({ error: 'Invalid credentials' });
    const computed = hashPassword(password, u.salt);
    if (computed !== u.password_hash) return res.status(400).json({ error: 'Invalid credentials' });

    const userId = (u._id && u._id.toString()) || u.id;
    const user = await getUserById(userId);
    const token = jwt.sign({ sub: userId, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
    res.json({ token, user });
  } catch (e) {
    console.error('Login error', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await getUserById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/logout', async (_req, res) => {
  // JWT logout is stateless; client should delete the token.
  res.json({ ok: true });
});

// --- Orders (requires auth) ---
app.get('/api/orders', async (req, res) => {
  try {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Prefer email from token; fallback to lookup by id
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
});

// --- Catalog sync from DummyJSON ---
async function syncElectronicsCatalog() {
  try {
    // Node 18+ has global fetch
    const urls = [
      'https://dummyjson.com/products/category/smartphones',
      'https://dummyjson.com/products/category/laptops',
    ];
    const responses = await Promise.all(urls.map((u) => fetch(u)));
    if (!responses.every((r) => r.ok)) throw new Error('Failed to fetch DummyJSON');
    const jsons = await Promise.all(responses.map((r) => r.json()));
    const products = jsons
      .flatMap((j) => j.products || [])
      .map((p) => ({
        id: `dj_${p.id}`,
        name: p.title,
        price: Math.round((p.price || 0) * 100),
        image: Array.isArray(p.images) && p.images.length ? p.images[0] : p.thumbnail || null,
        category: p.category || 'electronics',
      }));
    await upsertProducts(products);
  } catch (e) {
    console.warn('Catalog sync failed:', e.message);
  }
}

/**
 * List products
 */
app.get('/api/products', async (req, res) => {
  try {
    const list = await getAllProducts();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Create Stripe Checkout Session
 * Body: { email: string, items: [{ id: string, quantity: number }] }
 */
app.post('/api/create-checkout-session', async (req, res) => {
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
      success_url: `${process.env.CLIENT_BASE_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_BASE_URL || 'http://localhost:3000'}/cancel`,
    });

    // Save order with pending status. We'll update via webhook.
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
});

/**
 * Fetch a checkout session status
 * Query: session_id
 */
app.get('/api/session-status', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id is required' });
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id.toString());
    res.json({ status: session.status, payment_status: session.payment_status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

async function seedAdminIfNeeded() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  try {
    const existing = await getUserByEmail(email);
    if (existing) return;
    const salt = genSalt();
    const password_hash = hashPassword(password, salt);
    await createUser({ email, password_hash, salt, is_admin: true });
    console.log('Admin user created:', email);
  } catch (e) {
    console.warn('Admin seed failed:', e.message);
  }
}

initDb().then(async () => {
  // Ensure catalog is present
  try {
    const existing = await getAllProducts();
    if (!existing || existing.length === 0) {
      await syncElectronicsCatalog();
    }
  } catch (e) {
    console.warn('Initial catalog check failed:', e.message);
  }
  await seedAdminIfNeeded();
  app.listen(SERVER_PORT, () => console.log(`Server listening on http://localhost:${SERVER_PORT}`));
});

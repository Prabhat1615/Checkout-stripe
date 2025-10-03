const mongoose = require('mongoose');

// Read connection string from env
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://prabhatkumar958873_db_user:Prabhat9402@cluster0.gw4mwy0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// --- Schemas ---
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    password_hash: { type: String, required: true },
    salt: { type: String, required: true },
    is_admin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Use string provided IDs for products (e.g., 'dj_1')
const ProductSchema = new mongoose.Schema(
  {
    _id: { type: String }, // product id from upstream (use as primary key)
    name: { type: String, required: true },
    price: { type: Number, required: true }, // in cents
    image: { type: String },
    category: { type: String },
  },
  { timestamps: true, versionKey: false }
);

const OrderItemSchema = new mongoose.Schema(
  {
    description: String,
    name: String,
    quantity: Number,
    amount_subtotal: Number,
    amount_total: Number,
    currency: String,
    image: String,
    id: String,
    price: Number,
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    email: { type: String, index: true },
    items: { type: [OrderItemSchema], default: [] },
    amount: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
    paymentIntentId: { type: String },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

let User, Product, Order;

async function initDb() {
  if (mongoose.connection.readyState === 1) return;
  const opts = {
    dbName: process.env.DB_NAME || undefined,
    serverSelectionTimeoutMS: 10000,
    family: 4, // prefer IPv4 to avoid some DNS/IPv6 issues
  };
  // For direct mongodb:// URIs, enable directConnection to skip SRV discovery
  if (MONGODB_URI.startsWith('mongodb://')) {
    opts.directConnection = true;
  }
  await mongoose.connect(MONGODB_URI, opts);
  User = mongoose.models.User || mongoose.model('User', UserSchema);
  Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
  Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
}

// --- Auth helpers ---
async function createUser({ email, password_hash, salt, is_admin = false }) {
  const doc = await User.create({ email: email.toLowerCase(), password_hash, salt, is_admin });
  return { id: doc._id.toString(), email: doc.email, is_admin: doc.is_admin };
}

async function getUserByEmail(email) {
  const doc = await User.findOne({ email: (email || '').toLowerCase() }).lean();
  if (!doc) return null;
  return { id: doc._id.toString(), _id: doc._id, email: doc.email, salt: doc.salt, password_hash: doc.password_hash, is_admin: doc.is_admin };
}

async function getUserById(id) {
  const doc = await User.findById(id).lean();
  if (!doc) return null;
  return { id: doc._id.toString(), _id: doc._id, email: doc.email, is_admin: doc.is_admin };
}

// --- Product helpers ---
async function upsertProducts(products) {
  if (!Array.isArray(products) || products.length === 0) return;
  const ops = products.map((p) => ({
    updateOne: {
      filter: { _id: p.id },
      update: {
        $set: {
          name: p.name,
          price: p.price,
          image: p.image || null,
          category: p.category || null,
        },
      },
      upsert: true,
    },
  }));
  await Product.bulkWrite(ops, { ordered: false });
}

async function getAllProducts() {
  const docs = await Product.find({}).lean();
  return docs.map((d) => ({ id: d._id, name: d.name, price: d.price, image: d.image, category: d.category }));
}

async function getProductById(id) {
  const d = await Product.findById(id).lean();
  if (!d) return null;
  return { id: d._id, name: d.name, price: d.price, image: d.image, category: d.category };
}

// --- Orders ---
async function saveOrder({ sessionId, email, items, amount, status, paymentIntentId }) {
  const doc = await Order.findOneAndUpdate(
    { sessionId },
    { $set: { email, items: items || [], amount: amount || 0, status, paymentIntentId: paymentIntentId || null, created_at: new Date() } },
    { upsert: true, new: true }
  ).lean();
  return doc;
}

async function updateOrderStatus(sessionId, status, paymentIntentId) {
  await Order.updateOne({ sessionId }, { $set: { status, paymentIntentId } });
}

async function getOrdersByEmail(email) {
  const docs = await Order.find({ email: (email || '').toLowerCase() }).sort({ created_at: -1 }).lean();
  // Normalize fields for frontend
  return docs.map((o) => ({
    session_id: o.sessionId,
    email: o.email,
    items: o.items,
    amount: o.amount,
    status: o.status,
    created_at: o.created_at,
  }));
}

module.exports = {
  initDb,
  // auth
  createUser,
  getUserByEmail,
  getUserById,
  // products
  upsertProducts,
  getAllProducts,
  getProductById,
  // orders
  saveOrder,
  updateOrderStatus,
  getOrdersByEmail,
};

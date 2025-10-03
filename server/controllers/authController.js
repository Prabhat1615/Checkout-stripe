const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN, ADMIN_EMAIL, ADMIN_PASSWORD } = require('../config/env');
const { hashPassword, genSalt } = require('../utils/password');
const { createUser, getUserByEmail, getUserById } = require('../ordersDb_mongo');

async function register(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const existing = await getUserByEmail(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const salt = genSalt();
    const password_hash = hashPassword(password, salt);
    const user = await createUser({ email, password_hash, salt });

    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const u = await getUserByEmail(email);
    if (!u) return res.status(400).json({ error: 'Invalid credentials' });
    const computed = hashPassword(password, u.salt);
    if (computed !== u.password_hash) return res.status(400).json({ error: 'Invalid credentials' });

    const userId = (u._id && u._id.toString()) || u.id;
    const user = await getUserById(userId);
    const token = jwt.sign({ sub: userId, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function me(req, res) {
  try {
    const user = await getUserById(req.user.sub);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function logout(_req, res) {
  res.json({ ok: true });
}

module.exports = { register, login, me, logout };

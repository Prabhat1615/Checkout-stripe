const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

function getTokenFromReq(req) {
  const hdr = req.headers['authorization'] || '';
  const parts = hdr.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') return parts[1];
  return null;
}

function requireAuth(req, res, next) {
  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { getTokenFromReq, requireAuth };

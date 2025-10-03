const crypto = require('crypto');

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
}
function genSalt() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = { hashPassword, genSalt };

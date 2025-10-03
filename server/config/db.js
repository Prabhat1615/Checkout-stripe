const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

async function connectDb() {
  if (mongoose.connection.readyState === 1) return;
  const opts = {
    serverSelectionTimeoutMS: 10000,
    family: 4,
  };
  if (MONGODB_URI.startsWith('mongodb://')) opts.directConnection = true;
  await mongoose.connect(MONGODB_URI, opts);
}

module.exports = { connectDb };

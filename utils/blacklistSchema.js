const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  reason: { type: String, required: true },
  blacklistedBy: { type: String, required: true },
  blacklistedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Blacklist', blacklistSchema);
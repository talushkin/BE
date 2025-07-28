const mongoose = require('mongoose');

const spotifyTokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  tokenType: {
    type: String,
    default: 'Bearer'
  },
  expiresIn: {
    type: Number,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  scope: {
    type: String,
    required: true
  },
  spotifyUserId: {
    type: String,
    required: false
  },
  displayName: {
    type: String,
    required: false
  },
  email: {
    type: String,
    required: false
  },
  country: {
    type: String,
    required: false
  },
  profileImageUrl: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
spotifyTokenSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
spotifyTokenSchema.index({ userId: 1 });
spotifyTokenSchema.index({ spotifyUserId: 1 });

module.exports = mongoose.model('SpotifyToken', spotifyTokenSchema, 'spotit.tokens');

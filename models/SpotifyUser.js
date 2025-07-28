const mongoose = require("mongoose");

const spotifyUserSchema = new mongoose.Schema({
  spotifyUserId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  displayName: {
    type: String,
    required: true
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
  followers: {
    type: Number,
    default: 0
  },
  product: {
    type: String, // free, premium
    required: false
  },
  explicitContentEnabled: {
    type: Boolean,
    default: false
  },
  href: {
    type: String,
    required: false
  },
  uri: {
    type: String,
    required: false
  },
  externalUrls: {
    spotify: String
  },
  lastLoginAt: {
    type: Date,
    default: Date.now
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
spotifyUserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update the updatedAt field before updating
spotifyUserSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model("SpotifyUser", spotifyUserSchema, "spotit.users");

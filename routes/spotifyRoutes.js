const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const { 
  getSpotifyLoginUrl,
  getSpotifyAccessToken,
  getSpotifyProfile,
  searchSpotify,
  getStoredSpotifyTokens,
  handleSpotifyCallback
} = require("../controllers/spotifyController");

// Route for Spotify login URL generation
router.post("/login", auth, async (req, res) => {
  try {
    const loginData = await getSpotifyLoginUrl();
    res.status(200).json(loginData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error?.response?.data });
  }
});

// Debug endpoint to check environment variables
router.get("/debug", auth, async (req, res) => {
  try {
    res.status(200).json({
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? 'Present (' + process.env.SPOTIFY_CLIENT_ID.substring(0, 8) + '...)' : 'Missing',
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET ? 'Present' : 'Missing',
      SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI || 'Using default',
      NODE_ENV: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route for Spotify callback - handles complete authentication flow
router.post("/callback", auth, async (req, res) => {
  try {
    const { code, state, userId } = req.body;
    
    console.log('Spotify callback received:', {
      hasCode: !!code,
      hasState: !!state,
      hasUserId: !!userId
    });
    
    if (!code) {
      return res.status(400).json({ 
        error: "Authorization code is required",
        received: { code: !!code, state: !!state, userId: !!userId }
      });
    }
    
    if (!userId) {
      return res.status(400).json({ 
        error: "userId is required to save user data and tokens",
        received: { code: !!code, state: !!state, userId: !!userId }
      });
    }
    
    const result = await handleSpotifyCallback({ code, state, userId });
    res.status(200).json(result);
  } catch (error) {
    console.error('Spotify callback route error:', error);
    res.status(500).json({ 
      error: error.message || "Spotify authentication failed", 
      details: error.details || error?.response?.data 
    });
  }
});

// Route for Spotify token exchange (after callback)
router.post("/token", auth, async (req, res) => {
  try {
    const { code, verifier, userId } = req.body;
    
    console.log('Token exchange request received:', {
      hasCode: !!code,
      hasVerifier: !!verifier,
      hasUserId: !!userId,
      codeLength: code ? code.length : 0,
      verifierLength: verifier ? verifier.length : 0
    });
    
    if (!code || !verifier || !userId) {
      return res.status(400).json({ 
        error: "Code, verifier, and userId are required",
        received: {
          code: !!code,
          verifier: !!verifier,
          userId: !!userId
        }
      });
    }
    
    const tokenData = await getSpotifyAccessToken({ code, verifier, userId });
    res.status(200).json(tokenData);
  } catch (error) {
    console.error('Spotify token exchange route error:', error);
    res.status(500).json({ 
      error: error.message || "Internal Server Error", 
      details: error.details || error?.response?.data 
    });
  }
});

// Route for Spotify user profile
router.post("/profile", auth, async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: "Access token is required" });
    }
    const profile = await getSpotifyProfile({ accessToken });
    res.status(200).json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error?.response?.data });
  }
});

// Route for Spotify search
router.post("/search", auth, async (req, res) => {
  try {
    const { q, type = 'track', limit = 20, accessToken } = req.body;
    if (!q || !accessToken) {
      return res.status(400).json({ error: "Search query (q) and access token are required" });
    }
    const searchResults = await searchSpotify({ q, type, limit, accessToken });
    res.status(200).json(searchResults);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error?.response?.data });
  }
});

// Route to get stored Spotify tokens for a user
router.post("/tokens", auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    const tokens = await getStoredSpotifyTokens({ userId });
    res.status(200).json(tokens);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error?.response?.data });
  }
});

module.exports = router;

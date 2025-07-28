const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const { 
  getSongListFromYouTube, 
  getPlaylistFromYouTube, 
  getPlaylistFromYouTubePerID,
  getSong10Words
} = require("../controllers/youTubeController");

// Route for getting a song list by title, artist, or genre from YouTube
router.post("/get-song-list", auth, async (req, res) => {
  try {
    const { title, artist, genre } = req.body;
    const songs = await getSongListFromYouTube({ title, artist, genre });
    res.status(200).json(songs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error?.response?.data });
  }
});

// Route for fetching playlists from YouTube by query
router.post("/get-playlist-list", auth, async (req, res) => {
  try {
    const { q } = req.body;
    if (!q) {
      return res.status(400).json({ error: "Query (q) is required" });
    }
    const playlists = await getPlaylistFromYouTube({ q });
    res.status(200).json(playlists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error?.response?.data });
  }
});

// Route for fetching songs from a specific YouTube playlist by ID with pagination
router.post("/get-playlist-songs", auth, async (req, res) => {
  try {
    const { playlistId, skip = 0, limit = 10 } = req.body;
    if (!playlistId) {
      return res.status(400).json({ error: "playlistId is required" });
    }
    
    // Validate skip and limit
    const skipNum = Math.max(0, parseInt(skip) || 0);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit) || 10)); // Max 50 items
    
    const songs = await getPlaylistFromYouTubePerID({ 
      playlistId, 
      skip: skipNum, 
      limit: limitNum 
    });
    
    res.status(200).json({
      playlistId,
      skip: skipNum,
      limit: limitNum,
      count: songs.length,
      songs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error?.response?.data });
  }
});

// Route for fetching first 10 words of a song's lyrics
router.post("/get-song-10-words", auth, async (req, res) => {
  try {
    const { artist, title } = req.body;
    if (!artist || !title) {
      return res.status(400).json({ error: "Both artist and title are required" });
    }
    const result = await getSong10Words({ artist, title });
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error?.response?.data });
  }
});

module.exports = router;

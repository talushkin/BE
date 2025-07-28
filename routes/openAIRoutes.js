const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const { 
  translateDirectly, 
  createPictureFromText, 
  fillRecipe, 
  getSongListFromOpenAI, 
  getSongLyricsSRT, 
  getSongLyricsChords, 
  getReactQuestion
} = require("../controllers/openAIController");

const { 
  getSongListFromYouTube, 
  getPlaylistFromYouTube, 
  getPlaylistFromYouTubePerID,
  getSong10Words
} = require("../controllers/youTubeController");
// Route for fetching lyrics and chords for a song (OpenAI fallback)
router.post("/get-song-lyrics-chords", auth, async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title || !artist) {
      return res.status(400).json({ error: "Both title and artist are required" });
    }
    const lyricsChords = await getSongLyricsChords({ title, artist });
    res.status(200).json({ title, artist, lyricsChords });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error?.response?.data });
  }
});

// Route for text translation
router.post("/translate", auth, async (req, res) => {
  try {
    const { text, targetLanguage } = req.body; // Read from the request body
    if (!text) {
      return res.status(400).json({ error: "Text is required", text, targetLanguage });
    }
    const translatedText = await translateDirectly(text, targetLanguage);
    res.status(200).json({ text, targetLanguage, translatedText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error?.response?.data });
  }
});

// Route for image generation
router.post("/image", auth, async (req, res) => {
  try {
    const { text } = req.body; // Read from the request body
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    const { imageUrl, savedPath } = await createPictureFromText(text);
    res.status(200).json({ text, imageUrl, savedPath });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error?.response?.data });
  }
});

// New Route for generating ingredients and preparation
router.post("/fill-recipe", auth, async (req, res) => {
  try {
    const { title, recipeId, targetLanguage, categoryName } = req.body; // for example, the recipe title
    // fillRecipe should generate ingredients and preparation using OpenAI
    const recipeData = await fillRecipe({ recipeId, title, categoryName, targetLanguage });
    if (!recipeData) {
      return res.status(404).json({ error: "Recipe not created", recipeData });
    }
    res.status(200).json(recipeData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error?.response?.data });
  }
});

// Route for getting a song list by title, artist, or genre (OpenAI only)
router.post("/get-song-list", auth, async (req, res) => {
  try {
    const { title, artist, genre } = req.body;
    const songs = await getSongListFromOpenAI({ title, artist, genre });
    res.status(200).json(songs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error?.response?.data });
  }
});

// Route for getting a song list from YouTube by title, artist, or genre
router.post("/get-youtube-song-list", auth, async (req, res) => {
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

// Route for fetching SRT lyrics for a song
router.post("/get-song-lyrics-srt", auth, async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title || !artist) {
      return res.status(400).json({ error: "Both title and artist are required" });
    }
    const srt = await getSongLyricsSRT({ title, artist });
    res.status(200).json({ title, artist, srt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error?.response?.data });
  }
});

// Route for generating React multiple-choice questions (customizable)
router.post("/react-questionaire", auth, async (req, res) => {
  try {
    const { numberOfQuestions = 10, numberOfPossibleAnswers = 4 } = req.body || {};
    const questions = await getReactQuestion({ numberOfQuestions, numberOfPossibleAnswers });
    res.status(200).json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error.details || error?.response?.data });
  }
});

module.exports = router;
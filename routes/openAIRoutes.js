const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const { translateDirectly, createPictureFromText, fillRecipe } = require("../controllers/openAIController");

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
    const recipeData = await fillRecipe({ recipeId, title,categoryName, targetLanguage });
    if (!recipeData) {
      return res.status(404).json({ error: "Recipe not created" , recipeData});
    }
    res.status(200).json(recipeData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error", details: error?.response?.data });
  }
});

module.exports = router;
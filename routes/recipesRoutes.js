// routes/recipes.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const recipeController = require("../controllers/recipeController");

router.get("/", auth, recipeController.getAllRecipes);
router.post("/", auth, recipeController.createRecipe);
router.put("/:id", auth, recipeController.updateRecipe);
router.delete("/:id", auth, recipeController.deleteRecipe);

module.exports = router;

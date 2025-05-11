const express = require("express");
const router = express.Router();
const controller = require("../controllers/recipeController");

router.get("/", controller.getAllRecipes);
router.post("/", controller.createRecipe);
router.put("/:id", controller.updateRecipe);
router.delete("/:id", controller.deleteRecipe);

module.exports = router;

const Recipe = require("../models/Recipe");

exports.getAllRecipes = async (req, res) => {
    const recipes = await Recipe.find().populate("categoryId");
    res.json(recipes);
};

exports.createRecipe = async (req, res) => {
    const recipe = new Recipe(req.body);
    await recipe.save();
    res.status(201).json(recipe);
};

exports.updateRecipe = async (req, res) => {
    const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(recipe);
};

exports.deleteRecipe = async (req, res) => {
    await Recipe.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
};

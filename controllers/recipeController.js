const Recipe = require("../models/Recipe");

exports.getAllRecipes = async (req, res) => {
    const recipes = await Recipe.find().populate("categoryId");
    res.json(recipes);
};

exports.createRecipe = async (req, res) => {
    try {
        const recipe = new Recipe(req.body);
        await recipe.save();
        res.status(201).json(recipe);
    } catch (err) {
        if (err.name === "ValidationError") {
            const errors = Object.entries(err.errors).map(([field, error]) => ({
                field,
                message: error.message,
                expected: error.kind,
                got: typeof req.body[field]
            }));
            return res.status(400).json({
                error: "Validation failed",
                details: errors
            });
        }
        res.status(500).json({ error: "Server error" });
    }
};

exports.updateRecipe = async (req, res) => {
    try {
        const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        res.json(recipe);
    } catch (err) {
        if (err.name === "ValidationError") {
            const errors = Object.entries(err.errors).map(([field, error]) => ({
                field,
                message: error.message,
                expected: error.kind,
                got: typeof req.body[field]
            }));
            return res.status(400).json({
                error: "Validation failed",
                details: errors
            });
        }
        res.status(500).json({ error: "Server error" });
    }
};

exports.deleteRecipe = async (req, res) => {
    await Recipe.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
};

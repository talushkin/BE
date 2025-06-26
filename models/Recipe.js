const mongoose = require("mongoose");

const recipeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    ingredients: [String],
    preparation: String,
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    categoryName: { type: String},
    imageUrl: String,
    translated: { type: Boolean, default: false },
    language: { type: String, default: "en" },
    createdAt: { type: Date, default: Date.now },
    translatedTitle: [{ lang: { type: String, required: true }, value: { type: String, required: true } }],
    translatedIngredients: [{ lang: { type: String, required: true }, value: [{ type: String, required: true }] }],
    translatedPreparation: [{ lang: { type: String, required: true }, value: { type: String, required: true } }]
});

module.exports = mongoose.model("Recipe", recipeSchema);

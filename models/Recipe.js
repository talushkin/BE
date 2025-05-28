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
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Recipe", recipeSchema);

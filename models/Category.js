const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    category: { type: String, required: true },
    priority: { type: Number },
    imageUrl: String,
    translated: { type: Boolean, default: false },
    language: { type: String, default: "he" },
    createdAt: { type: Date, default: Date.now },
    description: String,
    translatedCategory: [{
        lang: { type: String, required: true },
        value: { type: String, required: true }
    }]
});

module.exports = mongoose.model("Category", categorySchema);

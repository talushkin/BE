const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    categoryName: { type: String, required: true },
    priority: { type: Number },
    imageUrl: String,
    translated: { type: Boolean, default: false },
    language: { type: String, default: "he" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Category", categorySchema);

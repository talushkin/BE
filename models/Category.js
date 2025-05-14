const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    priority: { type: Number },
    imageUrl: String,
    translated: { type: Boolean, default: false },
    language: { type: String, default: "he" },
    createdAt: { type: Date, default: Date.now },
    description: String
});

module.exports = mongoose.model("Category", categorySchema);

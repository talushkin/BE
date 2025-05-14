const Category = require("../models/Category");

exports.getAllCategories = async (req, res) => {
    const categories = await Category.find().sort({priority:1});
    res.json(categories);
};

exports.createCategory = async (req, res) => {
    try {
        const category = new Category(req.body);
        await category.save();
        res.status(201).json(category);
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

exports.updateCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true // חשוב כדי שהולידציה תקרה גם בעדכון
        });
        res.json(category);
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

exports.deleteCategory = async (req, res) => {
    await Category.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
};

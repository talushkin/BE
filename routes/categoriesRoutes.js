// routes/categories.js
const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const categoryController = require("../controllers/categoryController");

router.get("/", auth, categoryController.getAllCategories);
router.post("/", auth, categoryController.createCategory);
router.put("/:id", auth, categoryController.updateCategory);
router.delete("/:id", auth, categoryController.deleteCategory);

module.exports = router;

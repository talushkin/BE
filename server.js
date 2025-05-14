const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config({ path: "./config/.env" });

const categoryRoutes = require("./routes/categoriesRoutes");
const recipeRoutes = require("./routes/recipesRoutes");
const openAIRoutes = require("./routes/openAIRoutes");
const logger = require("./middlewares/logger"); // 👈 מוסיפים את ה-logger

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(logger); // 👈 מוסיפים אותו לפני הרואטרים

mongoose.connect("mongodb://127.0.0.1:27017/recipes", {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

app.get("/", (req, res) => res.status(200).send("BE Server Recipes Tal Arnon node is Running on port :"+PORT));
app.use("/api/recipes", recipeRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/ai", openAIRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

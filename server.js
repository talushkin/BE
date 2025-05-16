const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const categoryRoutes = require("./routes/categoriesRoutes");
const recipeRoutes = require("./routes/recipesRoutes");
const openAIRoutes = require("./routes/openAIRoutes");
const logger = require("./middlewares/logger"); // 👈 מוסיפים את ה-logger

const app = express();
const PORT = process.env.PORT || 5000;
const connectionString = process.env.MONGODB_CONNECTION_STRING || "mongodb://localhost:27017/recipes";
app.use(cors());
app.use(express.json());
app.use(logger); // 👈 מוסיפים אותו לפני הרואטרים

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

app.use("/api/recipes", recipeRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/ai", openAIRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

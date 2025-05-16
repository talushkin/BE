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

// New health-check endpoint to confirm server and DB connection
app.get("/", (req, res) => {
    // Remove any credentials from the connection string (e.g. mongodb://user:pass@...)
    const sanitizedConnectionString = connectionString.replace(/\/\/.*?:.*?@/, "//");
    res.status(200).json({
        message: "Server is running",
        mongoUrl: sanitizedConnectionString,
        recipeAPI: "/api/recipes",
        TOKEN: process.env.TOKEN,
        openAIAPI: process.env.OPENAI_API_URL    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

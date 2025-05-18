const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const swaggerUi = require("swagger-ui-express");
const swagger = require("./docs/index.js");

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


const swaggerUiOptions = {
  swaggerOptions: {
    authAction: {
      bearerAuth: {
        schema: {
          type: "http",
          in: "header",
          name: "Authorization",
          scheme: "bearer",
          bearerFormat: "JWT"
        },
        value: "1234"
      }
    }
  }
};

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swagger, swaggerUiOptions));
app.get("/", (req, res) => {
    // Remove credentials from the connection string (e.g. mongodb://user:pass@...)
    const sanitizedConnectionString = connectionString.replace(/\/\/.*?:.*?@/, "//");
    res.status(200).json({
        message: "Server is running",
        mongoUrl: sanitizedConnectionString,
        routes: {
            recipes: {
                list: "GET /api/recipes",
                create: "POST /api/recipes",
                update: "PUT /api/recipes/:id",
                delete: "DELETE /api/recipes/:id"
            },
            categories: {
                list: "GET /api/categories",
                create: "POST /api/categories",
                update: "PUT /api/categories/:id",
                delete: "DELETE /api/categories/:id"
            },
            openAI: {
                translate: "POST /api/ai/translate",
                image: "POST /api/ai/image",
                fillRecipe: "POST /api/ai/fill-recipe"
            }
        },
        TOKEN: process.env.TOKEN,
        openAIAPI: process.env.OPENAI_API_URL
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

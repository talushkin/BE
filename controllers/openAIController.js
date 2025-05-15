const fs = require("fs");
const path = require("path");
const axios = require("axios"); // Ensure you have axios installed
const dotenv = require("dotenv");
dotenv.config({ path: "../config/.env" });

const { uploadBufferToS3 } = require("../utils/uploadToS3");
const Recipe = require("../models/Recipe"); // Make sure this path is correct

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL;

exports.translateDirectly = async (text, targetLanguage = "en") => {
  try {
    const prompt = `Translate the following text to ${targetLanguage}:\n"${text}"`;
    const response = await axios.post(
      `${OPENAI_API_URL}/chat/completions`,
      {
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );
    let result = response.data.choices[0]?.message?.content?.trim() || text;
    if (result.startsWith('"') && result.endsWith('"')) {
      result = result.slice(1, -1);
    }
    return result;
  } catch (error) {
    console.error(error);
    throw new Error("Translation failed");
  }
};

exports.createPictureFromText = async (text) => {
  try {
    const prompt = `Create a plated image of \n"${text}" on a wooden table`;
    const response = await axios.post(
      `${OPENAI_API_URL}/images/generations`,
      {
        prompt: prompt,
        n: 1,
        size: "256x256",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );
    const imageUrl = response.data.data[0]?.url;
    if (!imageUrl) {
      throw new Error("Failed to generate image");
    }
    // Fetch the image data using axios
    const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
    if (imageResponse.status !== 200) {
      throw new Error("Failed to download the image");
    }
    const imageBuffer = Buffer.from(imageResponse.data);
    // Save the image locally to the /images folder
    const imagesFolder = path.join(__dirname, "../images");
    if (!fs.existsSync(imagesFolder)) {
      fs.mkdirSync(imagesFolder, { recursive: true });
    }
    // Replace text spaces or special characters to "-" on filename
    const sanitizedText = text.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `${sanitizedText}-generated-image.png`;
    const imagePath = path.join(imagesFolder, filename);
    fs.writeFileSync(imagePath, imageBuffer);
    // Upload the image buffer to S3 using the uploadBufferToS3 utility
    const s3Url = await uploadBufferToS3(imageBuffer, filename);
    console.log("S3 URL:", s3Url);
    return { imageUrl: s3Url, savedPath: imagePath };
  } catch (error) {
    console.error(error);
    throw new Error("Image generation and saving failed");
  }
};

// New function: fillRecipe
// This function accepts an object containing recipeId and title,
// generates ingredients and preparation steps using OpenAI,
// and then updates the recipe document in the database.
exports.fillRecipe = async ({ recipeId, title }) => {
  
  try {
    // Generate prompt for OpenAI to return JSON with "ingredients" and "preparation"
    const prompt = `Given the recipe title "${title}", generate a list of ingredients and detailed preparation steps for a delicious recipe. 
Return the result as JSON with two keys: "ingredients" (an array of strings) and "preparation" (a string).`;

    const response = await axios.post(
      `${OPENAI_API_URL}/chat/completions`,
      {
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    // Get the AI response text
    const aiText = response.data.choices[0]?.message?.content;
    if (!aiText) {
      throw new Error("Failed to generate recipe details");
    }

    // Try to parse the response as JSON
    let recipeDetails;
    console.log("AI Response:", aiText);
    try {
      recipeDetails = JSON.parse(aiText);
    } catch (parseError) {
      throw new Error("Failed to parse OpenAI response as JSON");
    }

    // Update the recipe in the database using the Recipe model
    const updatedRecipe = await Recipe.findByIdAndUpdate(
      recipeId,
      {
        ingredients: recipeDetails.ingredients,
        preparation: recipeDetails.preparation,
      },
      { new: true }
    );
    
    if (!updatedRecipe) {
      throw new Error("Recipe not found or update failed");
    }
    
    return updatedRecipe;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fill recipe details");
  }
};
//const fs = require("fs");
const path = require("path");
const axios = require("axios"); // Ensure you have axios installed
const dotenv = require("dotenv");
dotenv.config();

const { uploadBufferToS3 } = require("../utils/uploadToS3");
const Recipe = require("../models/Recipe"); // Make sure this path is correct
const Category = require("../models/Category");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL;
console.log("OPENAI_API_KEY", OPENAI_API_KEY);
exports.translateDirectly = async (text, targetLanguage = "en") => {
  try {
    const prompt = `translate the following text to ${targetLanguage}:"${text}" , return only the trimmed Translation in the selected language, do not return any other text or explanation.`;
    const response = await axios.post(
      `${OPENAI_API_URL}/chat/completions`,
      {
        model: "gpt-4o-mini",
        store: true,
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
    console.error("Translation error details:", error?.response?.data || error.message || error);
    throw new Error("Translation failed: " + (error?.response?.data?.error?.message || error.message));
  }
};

exports.createPictureFromText = async (text) => {
  try {
    const prompt = `Create a plated image of "${text}" on a wooden table`;
    const response = await axios.post(
      `${OPENAI_API_URL}/images/generations`,
      {
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024", // changed from 256x256 to supported value
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
      console.error("OpenAI image response:", response.data);
      throw new Error("Failed to generate image");
    }
    // Fetch the image data using axios
    const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
    if (imageResponse.status !== 200) {
      throw new Error("Failed to download the image");
    }
    const imageBuffer = Buffer.from(imageResponse.data);
    // Replace text spaces or special characters to "-" on filename
    const sanitizedText = text.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `${sanitizedText}-generated-image.png`;
    // Upload the image buffer to S3 using the uploadBufferToS3 utility
    const s3Url = await uploadBufferToS3(imageBuffer, filename);
    console.log("S3 URL:", s3Url);
    return { imageUrl: s3Url };
  } catch (error) {
    console.error("Image generation error:", error?.response?.data || error.message || error);
    throw new Error("Image generation and saving failed");
  }
};

// New function: fillRecipe
// This function accepts an object containing recipeId and title,
// generates ingredients and preparation steps using OpenAI,
exports.fillRecipe = async ({ recipeId, title, categoryName='Salads', targetLanguage='en' }) => {
  try {
    // Generate prompt for OpenAI to return JSON with "ingredients" and "preparation"
    const prompt = title ? `Given the recipe title: (translate to en from ${targetLanguage}) "${title}", generate a list of ingredients and detailed preparation steps for a delicious recipe. \nReturn the result in en as JSON with two keys: "ingredients" (an array of strings) and "preparation" (a string).`
      : `create recipe with title for category: (translate to en from ${targetLanguage}) "${categoryName}", generate title, and a list of ingredients and detailed preparation steps for a delicious recipe. \nReturn the result in en as JSON with two keys: "title" (a string) "ingredients" (an array of strings) and "preparation" (a string).`;

    const response = await axios.post(
      `${OPENAI_API_URL}/chat/completions`,
      {
        model: "gpt-4o-mini",
        store: true,
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
    // If the response is not a valid JSON, it will throw an error
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON object found in AI response");
      }
      recipeDetails = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      throw new Error("Failed to parse OpenAI response as JSON: " + parseError.message);
    }

    if (recipeId) {
      recipeDetails.recipeId = recipeId;
      const updatedRecipe = await Recipe.findByIdAndUpdate(
        recipeId,
        {
          ingredients: recipeDetails.ingredients,
          preparation: recipeDetails.preparation,
        },
        { new: true }
      );

      if (!updatedRecipe) {
        throw new Error(`RecipeId ${recipeId} not found or update failed`);
      }

      return updatedRecipe;
    }
    // If no recipeId, just return the filled recipe
    return recipeDetails;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to fill recipe details");
  }
};
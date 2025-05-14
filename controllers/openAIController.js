const fs = require("fs");
const path = require("path");
const axios = require("axios"); // Ensure you have axios installed
const dotenv = require("dotenv");
dotenv.config({ path: "../config/.env" });

// Instead of the default upload function, we now destructure 
// uploadBufferToS3 from the utils file.
const { uploadBufferToS3 } = require("../utils/uploadToS3");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL;

exports.translateDirectly = async (text, targetLanguage = "en") => {
  try {
    const prompt = `Translate the following text to ${targetLanguage}:\n"${text}"`;

    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    let result = data.choices[0]?.message?.content?.trim() || text;

    // Strip surrounding quotes if present
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
    const prompt = `Create a plated image of \n"${text}"`;

    // Make a POST request to OpenAI API using axios
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
    // Encode the text to create a URL-safe filename
    const encodedText = encodeURIComponent(text);
    const filename = `${encodedText}-generated-image.png`;
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
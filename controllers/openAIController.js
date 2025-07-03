// Get lyrics and chords for a song by title and artist using OpenAI (fallback if Ultimate Guitar scraping is not available)
exports.getSongLyricsChords = async ({ title, artist }) => {
  try {
    // Prompt OpenAI to return lyrics and chords in a readable format
    const prompt = `For the song '${title}' by '${artist}', return the full lyrics with guitar chords above the corresponding lines. Format as plain text, with chords in brackets above each lyric line. If chords are not available, return only the lyrics. Do not include any explanation, markdown, or extra text.`;
    const response = await axios.post(
      `${OPENAI_API_URL}/chat/completions`,
      {
        model: "gpt-4o-mini",
        store: true,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );
    const lyricsChords = response.data.choices[0]?.message?.content?.trim();
    if (!lyricsChords) throw new Error("No lyrics/chords returned");
    return lyricsChords;
  } catch (error) {
    console.error("Error fetching lyrics/chords from OpenAI:", error?.response?.data || error.message || error);
    throw new Error("Failed to fetch lyrics/chords");
  }
};
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
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = process.env.YOUTUBE_BASE_URL || 'https://www.youtube.com/watch?v=';
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

// Get a song list from OpenAI based on title, artist, or genre
exports.getSongListFromOpenAI = async ({ title, artist, genre }) => {
  try {
    let query = "Give me a JSON array of 15 popular songs";
    if (title || artist || genre) {
      query += " matching the following criteria:";
      if (title) query += ` title: '${title}',`;
      if (artist) query += ` artist: '${artist}',`;
      if (genre) query += ` genre: '${genre}',`;
    }
    query += " Each item should have: image (YouTube thumbnail), title, artist, url (YouTube), lyrics (first line), duration (mm:ss), createdAt (dd-mm-yyyy). Return only a valid JSON array, do not include markdown, code blocks, or any special characters before or after the JSON.";
    const response = await axios.post(
      `${OPENAI_API_URL}/chat/completions`,
      {
        model: "gpt-4o-mini",
        store: true,
        messages: [{ role: "user", content: query }],
        temperature: 0.3,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const songList = response.data.choices[0]?.message?.content;
    if (!songList) {
      throw new Error("Failed to generate song list");
    }
console.log("OpenAI song list response:", songList);
    // Try to parse the response as JSON
    let songs;
    try {
      songs = JSON.parse(songList);
    } catch (parseError) {
      throw new Error("Failed to parse OpenAI song list response as JSON: " + parseError.message);
    }

    return songs;
  } catch (error) {
    console.error("Error fetching song list from OpenAI:", error);
    throw new Error("Failed to fetch song list");
  }
};

// Get a song list from YouTube API based on title, artist, or genre
exports.getSongListFromYouTube = async ({ title, artist, genre }) => {
  console.log("Fetching song list from YouTube with params:", { title, artist, genre });
  try {
    if (!YOUTUBE_API_KEY) throw new Error('Missing YOUTUBE_API_KEY in .env');
    let q = '';
    if (title) q += title + ' ';
    if (artist) q += artist + ' ';
    if (genre) q += genre + ' ';
    q = q.trim() || 'popular music';
    const maxResults = 20;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(q)}&key=${YOUTUBE_API_KEY}`;
    const ytRes = await axios.get(url);
    const items = ytRes.data.items || [];
    // Get video IDs for duration lookup
    const videoIds = items.map(item => item.id.videoId).join(',');
    let durations = {};
    if (videoIds) {
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
      const detailsRes = await axios.get(detailsUrl);
      console.log("YouTube video details response:", detailsRes.data);
      (detailsRes.data.items || []).forEach(item => {
        durations[item.id] = item.contentDetails.duration;
      });
    }
    // Helper to convert ISO 8601 duration to mm:ss
    function isoToDuration(iso) {
      if (!iso) return '';
      // Support hours, minutes, seconds (e.g. PT1H2M3S)
      const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return '';
      const hr = match[1] ? parseInt(match[1]) : 0;
      const min = match[2] ? parseInt(match[2]) : 0;
      const sec = match[3] ? parseInt(match[3]) : 0;
      if (hr > 0) {
        return `${hr}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
      } else {
        return `${min}:${sec.toString().padStart(2, '0')}`;
      }
    }
    const now = new Date();
    const createdAt = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth()+1).padStart(2, '0')}-${now.getFullYear()}`;
    const songs = items.map(item => ({
      image: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      url: `${YOUTUBE_BASE_URL}${item.id.videoId}`,
      lyrics: '', // Not available from YouTube API
      duration: isoToDuration(durations[item.id.videoId]),
      createdAt
    }));
    return songs;
  } catch (error) {
    const errorString = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
    console.error('Error fetching song list from YouTube:', errorString);
    throw new Error('Failed to fetch song list from YouTube: ' + errorString);
  }
};

// Fetch lyrics and chords for a song by scraping CifraClub (cheerio/axios)
// Requires: npm install axios cheerio
const cheerio = require('cheerio');
exports.getSongLyricsSRT = async ({ title, artist }) => {
  function buildUrl(artist, song) {
    const artistSlug = artist.toLowerCase().replace(/\s+/g, '-');
    const songSlug = song.toLowerCase().replace(/\s+/g, '-');
    return `https://www.cifraclub.com.br/${artistSlug}/${songSlug}/letra`;
  }
  try {
    if (!title || !artist) throw new Error('Both title and artist are required');
    const url = buildUrl(artist, title);
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    // Try .letra-l first, then fallback to .letra
    let lyrics = '';
    let letraDiv = $('.letra-l');
    if (letraDiv.length) {
      // Each <p> is a paragraph, each <span class="l_row"><span>...</span></span> is a line
      letraDiv.find('p').each((i, p) => {
        const lines = [];
        $(p).find("span.l_row").each((j, row) => {
          const line = $(row).text().trim();
          if (line) lines.push(line);
        });
        if (lines.length) {
          lyrics += lines.join("\n") + "\n";
        }
      });
    }
    if (!lyrics) {
      // Fallback: extract from .letra (each <p> is a paragraph)
      letraDiv = $('.letra');
      if (letraDiv.length) {
        letraDiv.find('p').each((i, p) => {
          const paragraph = $(p).text().replace(/\s*<br\s*\/?>/gi, '\n').trim();
          if (paragraph) lyrics += paragraph + "\n";
        });
      }
    }
    lyrics = lyrics.trim();
    if (!lyrics) {
      throw new Error('Lyrics not found. The structure may have changed.');
    }
    return lyrics;
  } catch (error) {
    console.error('Error fetching from CifraClub:', error.message || error);
    throw new Error('Lyrics not found or error occurred.');
  }
};
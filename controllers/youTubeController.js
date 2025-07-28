const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = process.env.YOUTUBE_BASE_URL || 'https://www.youtube.com/watch?v=';

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
      (detailsRes.data.items || []).forEach(item => {
        durations[item.id] = item.contentDetails.duration;
      });
    }
    // Helper to convert ISO 8601 duration to mm:ss
    function isoToDuration(iso) {
      if (!iso) return '';
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
    // Fetch first 10 words for each song (async)
    const songs = await Promise.all(items.map(async item => {
      const songTitle = item.snippet.title;
      const songArtist = item.snippet.channelTitle;
      let first10Words = '';
      return {
        image: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        title: songTitle,
        artist: songArtist,
        url: `${YOUTUBE_BASE_URL}${item.id.videoId}`,
        lyrics: first10Words,
        duration: isoToDuration(durations[item.id.videoId]),
        createdAt
      };
    }));
    return songs;
  } catch (error) {
    const errorString = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
    console.error('Error fetching song list from YouTube:', errorString);
    throw new Error('Failed to fetch song list from YouTube: ' + errorString);
  }
};

// Get playlist list from YouTube API based on search query (q)
exports.getPlaylistFromYouTube = async ({ q }) => {
  console.log("Fetching playlists from YouTube with query:", q);
  try {
    if (!YOUTUBE_API_KEY) throw new Error('Missing YOUTUBE_API_KEY in .env');
    const maxResults = 20;
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=playlist&maxResults=${maxResults}&q=${encodeURIComponent(q || 'music')}&key=${YOUTUBE_API_KEY}`;
    const ytRes = await axios.get(searchUrl);
    const items = ytRes.data.items || [];
    const now = new Date();
    const createdAt = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth()+1).padStart(2, '0')}-${now.getFullYear()}`;
    // For each playlist, fetch its items (songs)
    const playlists = await Promise.all(items.map(async item => {
      const playlistId = item.id.playlistId;
      let songs = [];
      try {
        // Use the new function to get first 10 videos in the playlist
        songs = await exports.getPlaylistFromYouTubePerID({ playlistId, skip: 0, limit: 10 });
      } catch (err) {
        console.error(`Error fetching songs for playlist ${playlistId}:`, err.message);
        songs = [];
      }
      return {
        id: playlistId,
        title: item.snippet.title,
        description: item.snippet.description,
        image: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.channelTitle,
        url: `https://www.youtube.com/playlist?list=${playlistId}`,
        createdAt,
        songs
      };
    }));
    return playlists;
  } catch (error) {
    const errorString = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
    console.error('Error fetching playlists from YouTube:', errorString);
    throw new Error('Failed to fetch playlists from YouTube: ' + errorString);
  }
};

// Get songs from a specific YouTube playlist by ID with skip and limit
exports.getPlaylistFromYouTubePerID = async ({ playlistId, skip = 0, limit = 10 }) => {
  console.log("Fetching songs from YouTube playlist:", { playlistId, skip, limit });
  try {
    if (!YOUTUBE_API_KEY) throw new Error('Missing YOUTUBE_API_KEY in .env');
    if (!playlistId) throw new Error('playlistId is required');
    
    // Calculate YouTube API parameters
    const maxResults = Math.min(limit, 50); // YouTube API max is 50
    let pageToken = '';
    
    // If skip > 0, we need to paginate to get to the right starting point
    if (skip > 0) {
      let itemsToSkip = skip;
      while (itemsToSkip > 0) {
        const skipUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${Math.min(itemsToSkip, 50)}&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const skipRes = await axios.get(skipUrl);
        pageToken = skipRes.data.nextPageToken || '';
        itemsToSkip -= (skipRes.data.items || []).length;
        
        if (!pageToken && itemsToSkip > 0) {
          // No more items available
          return [];
        }
      }
    }
    
    // Now get the actual items we want
    const playlistItemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const playlistRes = await axios.get(playlistItemsUrl);
    const items = playlistRes.data.items || [];
    
    // Get video IDs for duration lookup
    const videoIds = items.map(item => item.snippet.resourceId.videoId).join(',');
    let durations = {};
    
    if (videoIds) {
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
      const detailsRes = await axios.get(detailsUrl);
      (detailsRes.data.items || []).forEach(item => {
        durations[item.id] = item.contentDetails.duration;
      });
    }
    
    // Helper to convert ISO 8601 duration to mm:ss
    function isoToDuration(iso) {
      if (!iso) return '';
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
    
    // Map items to song objects
    const songs = items.map(item => ({
      image: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      title: item.snippet.title,
      artist: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
      url: `${YOUTUBE_BASE_URL}${item.snippet.resourceId.videoId}`,
      videoId: item.snippet.resourceId.videoId,
      lyrics: '', // Could be populated with getFirst10Words if needed
      duration: isoToDuration(durations[item.snippet.resourceId.videoId]),
      createdAt,
      position: skip + items.indexOf(item) + 1
    }));
    
    return songs;
  } catch (error) {
    const errorString = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
    console.error('Error fetching playlist songs from YouTube:', errorString);
    throw new Error('Failed to fetch playlist songs from YouTube: ' + errorString);
  }
};

// Helper: Get first 10 words from lyrics
async function getFirst10Words({ artist, title }) {
  try {
    // Try lyrics.ovh first
    const res = await axios.get(`https://api.lyrics.ovh/v1/${artist}/${title}`);
    console.log("Lyrics response:", res.data);
    const lyrics = res.data.lyrics || '';
    const words = lyrics.split(/\s+/).filter(Boolean);
    return words.slice(0, 10).join(' ');
  } catch (error) {
    console.error('Error fetching lyrics for first 10 words:', error.message || error);
    return '';
  }
}

// Endpoint: /api/youtube/get-song-10-words
exports.getSong10Words = async ({ artist, title }) => {
  try {
    if (!artist || !title) throw new Error('Both artist and title are required');
    const first10 = await getFirst10Words({ artist, title });
    return { artist, title, first10Words: first10 };
  } catch (error) {
    console.error('Error in getSong10Words:', error.message || error);
    throw new Error('Failed to get first 10 words: ' + (error.message || error));
  }
};

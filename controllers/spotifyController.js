const axios = require("axios");
const crypto = require('crypto');
const SpotifyToken = require("../models/SpotifyToken");
const SpotifyUser = require("../models/SpotifyUser");

// Helper functions for PKCE
function generateCodeVerifier(length = 128) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function generateCodeChallenge(verifier) {
  return Buffer.from(crypto.createHash('sha256').update(verifier).digest())
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Complete Spotify authentication flow - handles callback from Spotify
exports.handleSpotifyCallback = async ({ code, state, userId }) => {
  try {
    console.log('🎵 Starting Spotify authentication flow...', {
      hasCode: !!code,
      hasState: !!state,
      hasUserId: !!userId
    });

    if (!code) {
      throw new Error('Authorization code is required');
    }

    if (!userId) {
      throw new Error('userId is required to store tokens and user data');
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/ai/spotify-callback';
    
    if (!clientId || !clientSecret) {
      throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env');
    }

    // For authorization code flow (without PKCE), we don't need code_verifier
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
    
    console.log('🔄 Exchanging authorization code for access token...');
    
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', params, {
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const tokenData = tokenResponse.data;
    console.log('✅ Successfully obtained access token');

    // Get user profile from Spotify
    console.log('👤 Fetching user profile from Spotify...');
    const profileResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: { 
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const profileData = profileResponse.data;
    console.log('✅ Successfully fetched user profile:', {
      spotifyUserId: profileData.id,
      displayName: profileData.display_name,
      email: profileData.email
    });

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Save user to spotit.users collection
    console.log('💾 Saving user to spotit.users collection...');
    const userData = {
      spotifyUserId: profileData.id,
      displayName: profileData.display_name || '',
      email: profileData.email || '',
      country: profileData.country || '',
      profileImageUrl: profileData.images?.[0]?.url || '',
      followers: profileData.followers?.total || 0,
      product: profileData.product || '',
      explicitContentEnabled: profileData.explicit_content?.filter_enabled || false,
      href: profileData.href || '',
      uri: profileData.uri || '',
      externalUrls: {
        spotify: profileData.external_urls?.spotify || ''
      },
      lastLoginAt: new Date(),
      updatedAt: new Date()
    };

    const userDoc = await SpotifyUser.findOneAndUpdate(
      { spotifyUserId: profileData.id },
      userData,
      { 
        upsert: true, 
        new: true 
      }
    );

    console.log('✅ User saved to spotit.users:', userDoc._id);

    // Save tokens to spotit.tokens collection
    console.log('🔐 Saving tokens to spotit.tokens collection...');
    const tokenDoc = await SpotifyToken.findOneAndUpdate(
      { userId: userId },
      {
        userId: userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresIn: tokenData.expires_in,
        expiresAt: expiresAt,
        scope: tokenData.scope,
        spotifyUserId: profileData.id,
        displayName: profileData.display_name || '',
        email: profileData.email || '',
        country: profileData.country || '',
        profileImageUrl: profileData.images?.[0]?.url || '',
        updatedAt: new Date()
      },
      { 
        upsert: true, 
        new: true 
      }
    );

    console.log('✅ Tokens saved to spotit.tokens:', tokenDoc._id);

    console.log('🎉 Spotify authentication flow completed successfully!');

    return {
      success: true,
      message: 'Spotify authentication completed successfully',
      user: {
        id: userDoc._id,
        spotifyUserId: profileData.id,
        displayName: profileData.display_name,
        email: profileData.email,
        profileImageUrl: profileData.images?.[0]?.url
      },
      tokens: {
        id: tokenDoc._id,
        expiresAt: expiresAt,
        scope: tokenData.scope
      }
    };

  } catch (error) {
    console.error('❌ Spotify authentication flow error:', error);
    
    if (error.response) {
      console.error('Spotify API error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
      
      const spotifyError = error.response.data;
      throw { 
        message: "Spotify authentication failed", 
        details: {
          error: spotifyError.error || 'unknown_error',
          error_description: spotifyError.error_description || 'No description provided',
          status: error.response.status
        }
      };
    } else {
      throw { 
        message: "Spotify authentication failed", 
        details: error.message || error
      };
    }
  }
};

// Get Spotify login URL - using standard authorization code flow
exports.getSpotifyLoginUrl = async () => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/ai/spotify-callback';
    
    if (!clientId) throw new Error('Missing SPOTIFY_CLIENT_ID in .env');
    
    // Generate a random state for security
    const state = crypto.randomBytes(16).toString('hex');
    
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'user-read-private user-read-email playlist-read-private user-top-read user-read-recently-played user-library-read',
      state: state,
      show_dialog: 'true' // Force user to see authorization dialog
    });
    
    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    
    console.log('🔗 Generated Spotify authorization URL:', {
      clientId: clientId.substring(0, 8) + '...',
      redirectUri,
      state
    });
    
    return { 
      authUrl, 
      state, // You'll need to store this temporarily to verify the callback
      redirectUri // Include this so client knows what redirect URI was used
    };
  } catch (error) {
    const errorDetails = error?.response?.data || error.message || error;
    console.error("Spotify login URL generation error:", errorDetails);
    throw { message: "Failed to generate Spotify login URL", details: errorDetails };
  }
};

// Exchange code for access token and store in MongoDB
exports.getSpotifyAccessToken = async ({ code, verifier, userId }) => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/ai/spotify-callback';
    
    console.log('Token exchange attempt:', {
      clientId: clientId ? 'Present' : 'Missing',
      clientSecret: clientSecret ? 'Present' : 'Missing',
      redirectUri,
      code: code ? 'Present' : 'Missing',
      verifier: verifier ? 'Present' : 'Missing',
      userId: userId ? 'Present' : 'Missing'
    });
    
    if (!clientId || !clientSecret) {
      throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env');
    }
    
    if (!code) {
      throw new Error('Authorization code is required');
    }
    
    if (!verifier) {
      throw new Error('Code verifier is required');
    }
    
    if (!userId) {
      throw new Error('userId is required to store tokens');
    }
    
    const params = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    });
    
    console.log('Making token request to Spotify with params:', {
      client_id: clientId,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier_length: verifier.length
    });
    
    const response = await axios.post('https://accounts.spotify.com/api/token', params, {
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      }
    });
    
    console.log('Spotify token response received:', {
      status: response.status,
      hasAccessToken: !!response.data?.access_token
    });
    
    const tokenData = response.data; // { access_token, token_type, expires_in, refresh_token, scope }
    
    // Get user profile to store additional data
    let profileData = {};
    try {
      const profileResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: { 
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      profileData = profileResponse.data;
    } catch (profileError) {
      console.warn('Could not fetch Spotify profile:', profileError.message);
    }
    
    // Calculate expiration date
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    
    // Save or update tokens in MongoDB
    const tokenDoc = await SpotifyToken.findOneAndUpdate(
      { userId: userId },
      {
        userId: userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresIn: tokenData.expires_in,
        expiresAt: expiresAt,
        scope: tokenData.scope,
        spotifyUserId: profileData.id || '',
        displayName: profileData.display_name || '',
        email: profileData.email || '',
        country: profileData.country || '',
        profileImageUrl: profileData.images?.[0]?.url || '',
        updatedAt: new Date()
      },
      { 
        upsert: true, 
        new: true 
      }
    );
    
    console.log(`Spotify tokens saved for user ${userId}:`, {
      spotifyUserId: profileData.id,
      displayName: profileData.display_name,
      expiresAt: expiresAt
    });
    
    return {
      ...tokenData,
      profile: profileData,
      expiresAt: expiresAt,
      saved: true,
      tokenId: tokenDoc._id
    };
  } catch (error) {
    console.error("Spotify token exchange full error:", error);
    
    if (error.response) {
      // Spotify API returned an error response
      console.error("Spotify API error response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
      
      const spotifyError = error.response.data;
      throw { 
        message: "Failed to exchange code for Spotify access token", 
        details: {
          error: spotifyError.error || 'unknown_error',
          error_description: spotifyError.error_description || 'No description provided',
          status: error.response.status
        }
      };
    } else if (error.request) {
      // Network error
      console.error("Network error during Spotify token exchange:", error.message);
      throw { 
        message: "Network error during Spotify token exchange", 
        details: error.message 
      };
    } else {
      // Other error
      const errorDetails = error.message || error;
      console.error("Other error during Spotify token exchange:", errorDetails);
      throw { 
        message: "Failed to exchange code for Spotify access token", 
        details: errorDetails 
      };
    }
  }
};

// Get Spotify user profile
exports.getSpotifyProfile = async ({ accessToken }) => {
  try {
    if (!accessToken) throw new Error('Access token is required');
    
    const response = await axios.get('https://api.spotify.com/v1/me', {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    const errorDetails = error?.response?.data || error.message || error;
    console.error("Spotify profile fetch error:", errorDetails);
    throw { message: "Failed to fetch Spotify profile", details: errorDetails };
  }
};

// Search Spotify (tracks, artists, albums, playlists)
exports.searchSpotify = async ({ q, type = 'track', limit = 20, accessToken }) => {
  try {
    if (!accessToken) throw new Error('Access token is required');
    if (!q) throw new Error('Search query (q) is required');
    
    const params = new URLSearchParams({
      q,
      type, // track, artist, album, playlist
      limit: limit.toString(),
      market: 'US'
    });
    
    const response = await axios.get(`https://api.spotify.com/v1/search?${params.toString()}`, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    const errorDetails = error?.response?.data || error.message || error;
    console.error("Spotify search error:", errorDetails);
    throw { message: "Failed to search Spotify", details: errorDetails };
  }
};

// Get stored Spotify tokens for a user
exports.getStoredSpotifyTokens = async ({ userId }) => {
  try {
    if (!userId) throw new Error('userId is required');
    
    const tokenDoc = await SpotifyToken.findOne({ userId: userId });
    if (!tokenDoc) {
      throw new Error('No Spotify tokens found for this user');
    }
    
    // Check if token is expired
    const now = new Date();
    if (now >= tokenDoc.expiresAt) {
      throw new Error('Spotify token has expired. Please re-authenticate.');
    }
    
    return {
      accessToken: tokenDoc.accessToken,
      refreshToken: tokenDoc.refreshToken,
      tokenType: tokenDoc.tokenType,
      expiresAt: tokenDoc.expiresAt,
      scope: tokenDoc.scope,
      spotifyProfile: {
        id: tokenDoc.spotifyUserId,
        display_name: tokenDoc.displayName,
        email: tokenDoc.email,
        country: tokenDoc.country,
        profileImageUrl: tokenDoc.profileImageUrl
      }
    };
  } catch (error) {
    const errorDetails = error?.response?.data || error.message || error;
    console.error("Get stored Spotify tokens error:", errorDetails);
    throw { message: "Failed to get stored Spotify tokens", details: errorDetails };
  }
};

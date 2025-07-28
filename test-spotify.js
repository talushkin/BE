// Test Spotify configuration and authentication flow
// Run this with: node test-spotify.js

require('dotenv').config();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

console.log('🔍 Spotify Configuration Test');
console.log('============================');

console.log('Environment Variables:');
console.log(`✅ SPOTIFY_CLIENT_ID: ${SPOTIFY_CLIENT_ID ? 'Present (' + SPOTIFY_CLIENT_ID.substring(0, 8) + '...)' : '❌ Missing'}`);
console.log(`✅ SPOTIFY_CLIENT_SECRET: ${SPOTIFY_CLIENT_SECRET ? 'Present (' + SPOTIFY_CLIENT_SECRET.substring(0, 8) + '...)' : '❌ Missing'}`);
console.log(`✅ SPOTIFY_REDIRECT_URI: ${SPOTIFY_REDIRECT_URI || 'Using default: http://localhost:5000/api/spotify/callback'}`);

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  console.log('\n❌ Missing required Spotify credentials!');
  console.log('Please add these to your .env file:');
  console.log('SPOTIFY_CLIENT_ID=your_client_id_here');
  console.log('SPOTIFY_CLIENT_SECRET=your_client_secret_here');
  console.log('SPOTIFY_REDIRECT_URI=http://localhost:5000/api/spotify/callback');
  process.exit(1);
}

console.log('\n✅ All Spotify credentials are present!');
console.log('\n📝 Common Spotify Authentication Issues:');
console.log('1. Make sure your redirect URI in Spotify Dashboard matches exactly');
console.log('2. Ensure your app is not in development mode restrictions');
console.log('3. Check that the authorization code hasn\'t expired (expires in 10 minutes)');
console.log('4. Verify the code_verifier matches the one used to generate the authorization URL');

console.log('\n🔗 Next Steps:');
console.log('1. Call GET /api/spotify/login to get the authorization URL');
console.log('2. Visit the URL and authorize your app');
console.log('3. Use the returned code and verifier to call POST /api/spotify/token');

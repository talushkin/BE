// Test Spotify redirect URI configuration
require('dotenv').config();

const redirectUriTest = () => {
  console.log('🔍 Spotify Redirect URI Test');
  console.log('=============================');
  
  const envRedirectUri = process.env.SPOTIFY_REDIRECT_URI;
  const defaultRedirectUri = 'http://localhost:5000/api/spotify/callback';
  
  console.log('Environment Variables:');
  console.log(`SPOTIFY_REDIRECT_URI from .env: ${envRedirectUri || 'Not set'}`);
  console.log(`Default fallback: ${defaultRedirectUri}`);
  console.log(`Actual redirect URI being used: ${envRedirectUri || defaultRedirectUri}`);
  
  console.log('\n📋 Spotify Dashboard Requirements:');
  console.log('In your Spotify Developer Dashboard, make sure you have EXACTLY this redirect URI:');
  console.log(`➡️  ${envRedirectUri || defaultRedirectUri}`);
  
  console.log('\n⚠️  Common Issues:');
  console.log('1. Case sensitivity - must match exactly');
  console.log('2. Protocol must match (http:// vs https://)');
  console.log('3. Port must match (5000)');
  console.log('4. Path must match exactly (/api/spotify/callback)');
  console.log('5. No trailing slashes');
  
  console.log('\n🔗 Steps to Fix:');
  console.log('1. Go to https://developer.spotify.com/dashboard');
  console.log('2. Click on your app');
  console.log('3. Click "Edit Settings"');
  console.log('4. In "Redirect URIs" section, add:');
  console.log(`   ${envRedirectUri || defaultRedirectUri}`);
  console.log('5. Click "Add" then "Save"');
};

redirectUriTest();

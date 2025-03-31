/**
 * Configuration settings for Smart City Application
 */
require('dotenv').config();

module.exports = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'smartcity-secret-token',
    expiresIn: process.env.JWT_EXPIRES || '7d'
  },
  // OAuth Configuration
  oauth: {
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    },
    facebook: {
      appID: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback',
    },
  },
  
  // Sitecore CMS Configuration
  sitecore: {
    apiUrl: process.env.SITECORE_API_URL,
    apiKey: process.env.SITECORE_API_KEY,
    username: process.env.SITECORE_USERNAME,
    password: process.env.SITECORE_PASSWORD,
  },
  
  // Map Services Configuration
  maps: {
    tileServer: process.env.MAP_TILE_SERVER || 'http://localhost:3001',
    routingServer: process.env.ROUTING_SERVER || 'http://localhost:3002',
    searchServer: process.env.SEARCH_SERVER || 'http://localhost:3003',
  },
  
  // Transportation API Configuration
  transportation: {
    prtApiUrl: process.env.PRT_API_URL,
    prtApiKey: process.env.PRT_API_KEY,
    busApiUrl: process.env.BUS_API_URL,
    busApiKey: process.env.BUS_API_KEY,
  },
  
  // Notification Configuration
  notifications: {
    fcmServerKey: process.env.FCM_SERVER_KEY,
  },
  
  // Available Languages
  languages: ['en'], // Initially only English, can be expanded
  
  // Supported Roles
  roles: ['user', 'admin', 'driver', 'content_manager'],
};

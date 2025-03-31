/**
 * Map service for Smart City Application
 * Handles routing, map data access, and spatial calculations
 */
const axios = require('axios');
const config = require('../config/config');
const { mysqlPool } = require('../config/db');

// Configuration for map services
const routingServer = config.maps.routingServer;
const searchServer = config.maps.searchServer;
const tileServer = config.maps.tileServer;

/**
 * Get route between two points
 * @param {Array} from - Origin coordinates [longitude, latitude]
 * @param {Array} to - Destination coordinates [longitude, latitude]
 * @param {String} mode - Transportation mode (walking, driving, cycling, transit)
 * @param {Boolean} alternatives - Whether to return alternative routes
 * @param {Boolean} avoidStairs - Whether to avoid routes with stairs (accessibility)
 * @returns {Object} Route data in GeoJSON format
 */
exports.getRoute = async (from, to, mode = 'walking', alternatives = false, avoidStairs = false) => {
  try {
    // Check if coordinates are valid
    if (!from || !to || !Array.isArray(from) || !Array.isArray(to) || from.length !== 2 || to.length !== 2) {
      throw new Error('Invalid coordinates');
    }

    // Build request parameters
    const params = {
      origin: from.join(','),
      destination: to.join(','),
      mode: mode,
      alternatives: alternatives,
      avoid: avoidStairs ? 'stairs' : undefined
    };

    // Make request to routing server
    const response = await axios.get(`${routingServer}/route`, { params });

    return response.data;
  } catch (error) {
    console.error('Get route error:', error.message);
    
    // If routing server is unavailable, provide a fallback simple route
    // This is a direct line between points - a real implementation would use proper routing
    return generateFallbackRoute(from, to);
  }
};

/**
 * Generate a fallback route when routing service is unavailable
 * @param {Array} from - Origin coordinates [longitude, latitude]
 * @param {Array} to - Destination coordinates [longitude, latitude]
 * @returns {Object} Simple route in GeoJSON format
 */
function generateFallbackRoute(from, to) {
  // Calculate approximate distance (in kilometers)
  const distance = calculateDistance(from[1], from[0], to[1], to[0]);
  
  // Estimate duration based on walking speed (5 km/h)
  const durationMinutes = Math.round((distance / 5) * 60);
  
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          distance: distance * 1000, // Convert to meters
          duration: durationMinutes * 60, // Convert to seconds
          mode: 'walking',
          fallback: true
        },
        geometry: {
          type: 'LineString',
          coordinates: [from, to]
        }
      }
    ],
    metadata: {
      query: {
        from: from,
        to: to
      },
      engine: 'fallback',
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Number} lat1 - Latitude of point 1
 * @param {Number} lon1 - Longitude of point 1
 * @param {Number} lat2 - Latitude of point 2
 * @param {Number} lon2 - Longitude of point 2
 * @returns {Number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
}

/**
 * Convert degrees to radians
 * @param {Number} deg - Degrees
 * @returns {Number} Radians
 */
function deg2rad(deg) {
  return deg * (Math.PI/180);
}

/**
 * Search for points of interest
 * @param {String} query - Search query
 * @param {Array} near - Coordinates to search near [longitude, latitude]
 * @param {Number} radius - Search radius in kilometers
 * @param {Array} categories - Categories to filter by
 * @returns {Array} Array of POI objects
 */
exports.searchPOI = async (query, near, radius = 2, categories = []) => {
  try {
    // Build request parameters
    const params = {
      q: query,
      limit: 20
    };

    if (near && Array.isArray(near) && near.length === 2) {
      params.lat = near[1];
      params.lon = near[0];
      params.radius = radius;
    }

    if (categories && categories.length > 0) {
      params.categories = categories.join(',');
    }

    // Make request to search server
    const response = await axios.get(`${searchServer}/search`, { params });

    return response.data;
  } catch (error) {
    console.error('Search POI error:', error.message);
    throw error;
  }
};

/**
 * Get map tile
 * @param {Number} z - Zoom level
 * @param {Number} x - X coordinate
 * @param {Number} y - Y coordinate
 * @param {String} layer - Map layer
 * @returns {Buffer} Tile image data
 */
exports.getMapTile = async (z, x, y, layer = 'standard') => {
  try {
    // Make request to tile server
    const response = await axios.get(`${tileServer}/tiles/${z}/${x}/${y}?layer=${layer}`, {
      responseType: 'arraybuffer'
    });

    return response.data;
  } catch (error) {
    console.error('Get map tile error:', error.message);
    throw error;
  }
};

/**
 * Get map layers
 * @returns {Array} Array of map layer objects
 */
exports.getMapLayers = async () => {
  try {
    // In a real implementation, this could be fetched from a database or config file
    return [
      {
        id: 'standard',
        name: 'Standard',
        description: 'Standard map with streets and buildings',
        type: 'base',
        tileUrl: '/api/maps/tiles/{z}/{x}/{y}?layer=standard'
      },
      {
        id: 'satellite',
        name: 'Satellite',
        description: 'Satellite imagery',
        type: 'base',
        tileUrl: '/api/maps/tiles/{z}/{x}/{y}?layer=satellite'
      },
      {
        id: 'transit',
        name: 'Transit',
        description: 'Public transportation routes and stops',
        type: 'overlay',
        tileUrl: '/api/maps/tiles/{z}/{x}/{y}?layer=transit'
      }
    ];
  } catch (error) {
    console.error('Get map layers error:', error.message);
    throw error;
  }
};

/**
 * Get offline map package
 * @param {String} id - Package ID
 * @returns {Object} Package metadata
 */
exports.getOfflinePackage = async (id) => {
  try {
    // In a real implementation, this would retrieve metadata from a database
    // For now, return static data for testing
    const packages = {
      'smart-city-core': {
        id: 'smart-city-core',
        name: 'Smart City Core',
        description: 'Downtown area and main attractions',
        size: 25600000, // Size in bytes (25MB)
        version: '1.0.0',
        bounds: {
          minLat: 40.7128,
          minLng: -74.006,
          maxLat: 40.7138,
          maxLng: -74.005
        },
        lastUpdated: '2023-07-15T00:00:00Z'
      },
      'smart-city-extended': {
        id: 'smart-city-extended',
        name: 'Smart City Extended',
        description: 'Complete city area including suburbs',
        size: 102400000, // Size in bytes (100MB)
        version: '1.0.0',
        bounds: {
          minLat: 40.7,
          minLng: -74.1,
          maxLat: 40.8,
          maxLng: -73.9
        },
        lastUpdated: '2023-07-15T00:00:00Z'
      }
    };

    return packages[id] || null;
  } catch (error) {
    console.error('Get offline package error:', error.message);
    throw error;
  }
};

/**
 * Find nearest transportation stops
 * @param {Array} coordinates - [longitude, latitude]
 * @param {Number} radius - Search radius in kilometers
 * @param {String} type - Transportation type (prt, bus, shuttle, courtesy)
 * @returns {Array} Array of nearby stops
 */
exports.findNearestStops = async (coordinates, radius = 0.5, type = null) => {
  try {
    const [longitude, latitude] = coordinates;
    
    // Convert radius to meters for SQL query
    const radiusMeters = radius * 1000;
    
    let query = `
      SELECT id, name, code, 
             ST_X(location) as longitude, 
             ST_Y(location) as latitude,
             ST_Distance_Sphere(
               location, 
               POINT(?, ?)
             ) as distance
      FROM transportation_stops
      WHERE ST_Distance_Sphere(
              location, 
              POINT(?, ?)
            ) <= ?
    `;
    
    const params = [longitude, latitude, longitude, latitude, radiusMeters];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY distance ASC LIMIT 10';
    
    // Execute query using MySQL pool
    const [rows] = await mysqlPool.execute(query, params);
    
    return rows;
  } catch (error) {
    console.error('Find nearest stops error:', error.message);
    throw error;
  }
};

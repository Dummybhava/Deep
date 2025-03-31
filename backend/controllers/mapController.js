/**
 * Map controller for Smart City Application
 * Handles map data, routes, and points of interest
 */
const mongoose = require('mongoose');
const Attraction = require('../models/Attraction');
const Event = require('../models/Event');
const {
  TransportationRoute,
  TransportationStop
} = require('../models/Transportation');
const mapService = require('../services/mapService');
const config = require('../config/config');
const path = require('path');
const fs = require('fs');

exports = module.exports
// Get map configuration and settings
exports.getMapConfig = async (req, res) => {
  try {
    // Send map configuration
    res.json({
      center: [0, 0], // Default center, should be set to Smart City coordinates
      zoom: 15, // Default zoom level
      minZoom: 10,
      maxZoom: 19,
      defaultLayer: 'standard',
      layers: [
        {
          id: 'standard',
          name: 'Standard',
          visible: true
        },
        {
          id: 'satellite',
          name: 'Satellite',
          visible: false
        },
        {
          id: 'transit',
          name: 'Transit',
          visible: false
        }
      ],
      features: [
        {
          id: 'attractions',
          name: 'Attractions',
          visible: true
        },
        {
          id: 'transportation',
          name: 'Transportation',
          visible: true
        },
        {
          id: 'events',
          name: 'Events',
          visible: true
        }
      ],
      tileServer: config.maps.tileServer,
      routingServer: config.maps.routingServer,
      searchServer: config.maps.searchServer,
      offlineSupport: true
    });
  } catch (err) {
    console.error('Get map config error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get map points of interest
exports.getPointsOfInterest = async (req, res) => {
  try {
    // Get bounds from query parameters
    const { minLat, maxLat, minLng, maxLng, types } = req.query;
    
    // Initialize query
    const query = { publishedStatus: 'published' };
    
    // Filter by types if provided
    if (types) {
      const typeArray = types.split(',');
      query.category = { $in: typeArray };
    }
    
    // Filter by bounds if provided
    if (minLat && maxLat && minLng && maxLng) {
      query.location = {
        $geoWithin: {
          $box: [
            [parseFloat(minLng), parseFloat(minLat)],
            [parseFloat(maxLng), parseFloat(maxLat)]
          ]
        }
      };
    }
    
    // Get attractions
    const attractions = await Attraction.find(query)
      .select('name shortDescription category type location images rating featured')
      .limit(200); // Limit for performance
    
    // Format attractions as GeoJSON features
    const features = attractions.map(attraction => ({
      type: 'Feature',
      geometry: {
        type: attraction.location.type,
        coordinates: attraction.location.coordinates
      },
      properties: {
        id: attraction._id,
        name: attraction.name,
        description: attraction.shortDescription,
        category: attraction.category,
        type: 'attraction',
        subType: attraction.type,
        rating: attraction.rating,
        featured: attraction.featured,
        image: attraction.images && attraction.images.length > 0 ? 
          attraction.images.find(img => img.isMain)?.url || attraction.images[0].url : 
          null
      }
    }));
    
    // Also get transportation stops if requested
    if (!types || types.includes('transportation')) {
      const stops = await TransportationStop.find({})
        .select('name code location routes')
        .limit(100);
      
      // Add stops to features
      stops.forEach(stop => {
        features.push({
          type: 'Feature',
          geometry: {
            type: stop.location.type,
            coordinates: stop.location.coordinates
          },
          properties: {
            id: stop._id,
            name: stop.name,
            code: stop.code,
            type: 'transportation',
            subType: 'stop'
          }
        });
      });
    }
    
    // Also get events if requested
    if (!types || types.includes('event')) {
      const events = await Event.find({
        publishedStatus: 'published',
        endDate: { $gte: new Date() },
        'location.type': 'coordinates'
      })
        .select('title shortDescription category startDate endDate location images featured')
        .limit(100);
      
      // Add events to features
      events.forEach(event => {
        if (event.location && event.location.coordinates) {
          features.push({
            type: 'Feature',
            geometry: {
              type: event.location.coordinates.type,
              coordinates: event.location.coordinates.coordinates
            },
            properties: {
              id: event._id,
              name: event.title,
              description: event.shortDescription,
              category: event.category,
              type: 'event',
              startDate: event.startDate,
              endDate: event.endDate,
              featured: event.featured,
              image: event.images && event.images.length > 0 ? 
                event.images.find(img => img.isMain)?.url || event.images[0].url : 
                null
            }
          });
        }
      });
    }
    
    // Return as GeoJSON
    res.json({
      type: 'FeatureCollection',
      features
    });
  } catch (err) {
    console.error('Get POIs error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search POIs by query string
exports.searchPOI = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Create text search query
    const searchQuery = { 
      $text: { $search: q },
      publishedStatus: 'published'
    };
    
    // Search attractions
    const attractions = await Attraction.find(searchQuery)
      .select('name shortDescription category location images')
      .limit(parseInt(limit))
      .sort({ score: { $meta: 'textScore' } });
    
    // Search events
    const events = await Event.find({
      $text: { $search: q },
      publishedStatus: 'published',
      endDate: { $gte: new Date() }
    })
      .select('title shortDescription category startDate endDate location images')
      .limit(parseInt(limit))
      .sort({ score: { $meta: 'textScore' } });
    
    // Search transportation stops
    const stops = await TransportationStop.find({
      $text: { $search: q }
    })
      .select('name code location')
      .limit(parseInt(limit))
      .sort({ score: { $meta: 'textScore' } });
    
    // Combine results
    const results = [
      ...attractions.map(a => ({
        id: a._id,
        name: a.name,
        description: a.shortDescription,
        category: a.category,
        type: 'attraction',
        location: a.location,
        image: a.images && a.images.length > 0 ? 
          a.images.find(img => img.isMain)?.url || a.images[0].url : 
          null
      })),
      ...events.map(e => ({
        id: e._id,
        name: e.title,
        description: e.shortDescription,
        category: e.category,
        type: 'event',
        startDate: e.startDate,
        endDate: e.endDate,
        location: e.location,
        image: e.images && e.images.length > 0 ? 
          e.images.find(img => img.isMain)?.url || e.images[0].url : 
          null
      })),
      ...stops.map(s => ({
        id: s._id,
        name: s.name,
        code: s.code,
        type: 'transportation',
        subType: 'stop',
        location: s.location
      }))
    ];
    
    // Sort by relevance (would need more sophisticated algorithm in production)
    const sortedResults = results.sort((a, b) => {
      // Exact matches first
      const aExact = a.name.toLowerCase().includes(q.toLowerCase());
      const bExact = b.name.toLowerCase().includes(q.toLowerCase());
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then by name length (shorter names first)
      return a.name.length - b.name.length;
    });
    
    res.json(sortedResults.slice(0, parseInt(limit)));
  } catch (err) {
    console.error('Search POI error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get routes between two points
exports.getRoute = async (req, res) => {
  try {
    const { 
      fromLat, 
      fromLng, 
      toLat, 
      toLng, 
      mode = 'walking',
      alternatives = 'false',
      avoidStairs = 'false'
    } = req.query;
    
    // Validate coordinates
    if (!fromLat || !fromLng || !toLat || !toLng) {
      return res.status(400).json({ 
        message: 'Origin and destination coordinates are required' 
      });
    }
    
    // Parse coordinates
    const from = [parseFloat(fromLng), parseFloat(fromLat)];
    const to = [parseFloat(toLng), parseFloat(toLat)];
    
    // Get route from map service
    const route = await mapService.getRoute(
      from, 
      to, 
      mode, 
      alternatives === 'true',
      avoidStairs === 'true'
    );
    
    res.json(route);
  } catch (err) {
    console.error('Get route error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get map tiles
exports.getMapTile = async (req, res) => {
  try {
    const { z, x, y } = req.params;
    const layer = req.query.layer || 'standard';
    
    // In a real implementation, this would fetch tiles from a tile server or file system
    // For this example, we'll generate a simple placeholder tile or retrieve it from cache
    
    // Check if tile exists in cache
    const tilePath = path.join(__dirname, '..', 'cache', 'tiles', layer, z, x, `${y}.png`);
    
    // If tile doesn't exist, generate it
    if (!fs.existsSync(tilePath)) {
      // In a real implementation, we would generate the tile
      // For now, return a 404
      return res.status(404).json({ message: 'Tile not found' });
    }
    
    // Send the tile
    res.sendFile(tilePath);
  } catch (err) {
    console.error('Get map tile error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get offline map package list
exports.getOfflinePackages = async (req, res) => {
  try {
    // In a real implementation, this would retrieve metadata about available
    // offline map packages from a database or file system
    
    // For this example, we'll return a static list
    res.json([
      {
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
      {
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
    ]);
  } catch (err) {
    console.error('Get offline packages error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get specific map region data for offline use
exports.getOfflineRegion = async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real implementation, this would retrieve the offline map package
    // from a storage system
    
    // Valid package IDs
    const validPackages = ['smart-city-core', 'smart-city-extended'];
    
    if (!validPackages.includes(id)) {
      return res.status(404).json({ message: 'Package not found' });
    }
    
    // In a real implementation, we would:
    // 1. Generate or retrieve the package data
    // 2. Send it as a downloadable file
    
    // For now, return a mock response
    res.json({
      id,
      status: 'ready',
      downloadUrl: `/api/maps/offline/download/${id}`
    });
  } catch (err) {
    console.error('Get offline region error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get specific map feature data
exports.getFeatureData = async (req, res) => {
  try {
    const { featureId } = req.params;
    const { type } = req.query;
    
    if (!featureId) {
      return res.status(400).json({ message: 'Feature ID is required' });
    }
    
    let feature;
    
    // Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(featureId)) {
      return res.status(400).json({ message: 'Invalid feature ID' });
    }
    
    // Determine feature type and fetch data
    if (type === 'attraction' || !type) {
      feature = await Attraction.findById(featureId);
      if (feature) {
        return res.json({
          type: 'attraction',
          data: feature
        });
      }
    }
    
    if (type === 'event' || !type) {
      feature = await Event.findById(featureId);
      if (feature) {
        return res.json({
          type: 'event',
          data: feature
        });
      }
    }
    
    if (type === 'transportation' || !type) {
      feature = await TransportationStop.findById(featureId);
      if (feature) {
        return res.json({
          type: 'transportation',
          data: feature
        });
      }
    }
    
    // If we reach here, feature wasn't found
    res.status(404).json({ message: 'Feature not found' });
  } catch (err) {
    console.error('Get feature data error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all available map layers
exports.getMapLayers = async (req, res) => {
  try {
    // Return map layers configuration
    res.json([
      {
        id: 'standard',
        name: 'Standard',
        description: 'Default map with streets and buildings',
        type: 'base',
        tileUrl: '/api/maps/tiles/{z}/{x}/{y}?layer=standard',
        minZoom: 10,
        maxZoom: 19
      },
      {
        id: 'satellite',
        name: 'Satellite',
        description: 'Satellite imagery',
        type: 'base',
        tileUrl: '/api/maps/tiles/{z}/{x}/{y}?layer=satellite',
        minZoom: 10,
        maxZoom: 19
      },
      {
        id: 'transit',
        name: 'Transit',
        description: 'Public transportation routes and stops',
        type: 'overlay',
        tileUrl: '/api/maps/tiles/{z}/{x}/{y}?layer=transit',
        minZoom: 10,
        maxZoom: 19
      },
      {
        id: 'attractions',
        name: 'Attractions',
        description: 'Points of interest and attractions',
        type: 'data',
        dataUrl: '/api/maps/poi?types=landmark,food,retail,recreation,entertainment,education',
        minZoom: 10,
        maxZoom: 19
      },
      {
        id: 'events',
        name: 'Events',
        description: 'Current and upcoming events',
        type: 'data',
        dataUrl: '/api/maps/poi?types=event',
        minZoom: 10,
        maxZoom: 19
      }
    ]);
  } catch (err) {
    console.error('Get map layers error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

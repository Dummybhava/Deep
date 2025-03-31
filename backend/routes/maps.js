/**
 * Maps routes for Smart City Application
 */
const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');

// Get map configuration and settings
router.get('/config', mapController.getMapConfig);

// Get map points of interest
router.get('/poi', mapController.getPointsOfInterest);

// Search POIs by query string
router.get('/search', mapController.searchPOI);

// Get routes between two points
router.get('/route', mapController.getRoute);

// Get map tiles
router.get('/tiles/:z/:x/:y', mapController.getMapTile);

// Get offline map package list
router.get('/offline/packages', mapController.getOfflinePackages);

// Get specific map region data for offline use
router.get('/offline/region/:id', mapController.getOfflineRegion);

// Get specific map feature data
router.get('/features/:featureId', mapController.getFeatureData);

// Get all available map layers
router.get('/layers', mapController.getMapLayers);

module.exports = router;

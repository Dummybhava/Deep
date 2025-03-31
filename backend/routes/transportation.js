/**
 * Transportation routes for Smart City Application
 */
const express = require('express');
const router = express.Router();
const transportationController = require('../controllers/transportationController');
const auth = require('../middlewares/auth');

// Get all transportation options
router.get('/', transportationController.getAllTransportation);

// Get PRT status and location data
router.get('/prt', transportationController.getPRTData);

// Get public bus routes and schedules
router.get('/bus', transportationController.getBusRoutes);

// Get all courtesy car and shuttle information
router.get('/courtesy', transportationController.getCourtesyCars);

// Request courtesy car
router.post('/courtesy/request', auth, transportationController.requestCourtesyCar);

// Get status of a courtesy car request
router.get('/courtesy/request/:id', auth, transportationController.getCourtesyCarRequestStatus);

// Cancel courtesy car request
router.delete('/courtesy/request/:id', auth, transportationController.cancelCourtesyCarRequest);

// Driver routes (for courtesy car/shuttle drivers)
router.get('/driver/requests', auth, transportationController.getDriverRequests);
router.put('/driver/request/:id/accept', auth, transportationController.acceptRequest);
router.put('/driver/request/:id/complete', auth, transportationController.completeRequest);
router.put('/driver/location', auth, transportationController.updateDriverLocation);

// Get transportation routes by type
router.get('/routes/:type', transportationController.getRoutesByType);

// Get transportation stops by route ID
router.get('/routes/:id/stops', transportationController.getStopsByRoute);

// Get estimated arrival time for a transportation option
router.get('/eta', transportationController.getEstimatedArrivalTime);

module.exports = router;

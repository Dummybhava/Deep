/**
 * Transportation controller for Smart City Application
 * Handles transportation-related endpoints including PRT, bus routes, and courtesy cars
 */
const {
  TransportationRoute,
  TransportationStop,
  TransportationVehicle,
  TransportationRequest
} = require('../models/Transportation');
const User = require('../models/User');
const { Notification } = require('../models/Notification');
const mongoose = require('mongoose');
const axios = require('axios');
const config = require('../config/config');
const { WebSocket } = require('ws');

exports = module.exports
// Get all transportation options
exports.getAllTransportation = async (req, res) => {
  try {
    // Get all active transportation routes
    const routes = await TransportationRoute.find({ active: true })
      .select('name description type color')
      .lean();
    
    // Group routes by type
    const transportation = {
      prt: routes.filter(route => route.type === 'prt'),
      bus: routes.filter(route => route.type === 'bus'),
      shuttle: routes.filter(route => route.type === 'shuttle'),
      courtesy: routes.filter(route => route.type === 'courtesy')
    };
    
    res.json(transportation);
  } catch (err) {
    console.error('Get all transportation error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get PRT (Personal Rapid Transit) data
exports.getPRTData = async (req, res) => {
  try {
    // Get PRT routes
    const routes = await TransportationRoute.find({ 
      type: 'prt',
      active: true
    }).populate('stops');
    
    // Get active PRT vehicles
    const vehicles = await TransportationVehicle.find({
      type: 'prt',
      status: 'active'
    }).select('name location route properties');
    
    // If external PRT API is configured, fetch real-time data
    if (config.transportation.prtApiUrl && config.transportation.prtApiKey) {
      try {
        const externalData = await axios.get(config.transportation.prtApiUrl, {
          headers: {
            'Authorization': `Bearer ${config.transportation.prtApiKey}`
          }
        });
        
        // Update vehicle locations from external API
        // This is where you would integrate with the actual PRT system
        
        res.json({
          routes,
          vehicles,
          lastUpdated: new Date()
        });
      } catch (apiErr) {
        console.error('External PRT API error:', apiErr.message);
        // Fall back to database data if API fails
        res.json({
          routes,
          vehicles,
          lastUpdated: new Date(),
          notice: 'Using cached data. Real-time updates unavailable.'
        });
      }
    } else {
      // No external API configured, return database data
      res.json({
        routes,
        vehicles,
        lastUpdated: new Date()
      });
    }
  } catch (err) {
    console.error('Get PRT data error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get public bus routes and schedules
exports.getBusRoutes = async (req, res) => {
  try {
    // Get bus routes
    const routes = await TransportationRoute.find({ 
      type: 'bus',
      active: true
    }).populate('stops');
    
    // Get active bus vehicles
    const vehicles = await TransportationVehicle.find({
      type: 'bus',
      status: 'active'
    }).select('name location route properties');
    
    // If external bus API is configured, fetch real-time data
    if (config.transportation.busApiUrl && config.transportation.busApiKey) {
      try {
        const externalData = await axios.get(config.transportation.busApiUrl, {
          headers: {
            'Authorization': `Bearer ${config.transportation.busApiKey}`
          }
        });
        
        // Update vehicle locations from external API
        // This is where you would integrate with the actual bus system
        
        res.json({
          routes,
          vehicles,
          lastUpdated: new Date()
        });
      } catch (apiErr) {
        console.error('External bus API error:', apiErr.message);
        // Fall back to database data if API fails
        res.json({
          routes,
          vehicles,
          lastUpdated: new Date(),
          notice: 'Using cached data. Real-time updates unavailable.'
        });
      }
    } else {
      // No external API configured, return database data
      res.json({
        routes,
        vehicles,
        lastUpdated: new Date()
      });
    }
  } catch (err) {
    console.error('Get bus routes error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all courtesy car and shuttle information
exports.getCourtesyCars = async (req, res) => {
  try {
    // Get courtesy car routes
    const routes = await TransportationRoute.find({ 
      type: { $in: ['courtesy', 'shuttle'] },
      active: true
    }).populate('stops');
    
    // Get active courtesy vehicles
    const vehicles = await TransportationVehicle.find({
      type: { $in: ['courtesy', 'shuttle'] },
      status: 'active'
    }).select('name location route status properties driver')
      .populate('driver', 'firstName lastName');
    
    res.json({
      routes,
      vehicles,
      lastUpdated: new Date()
    });
  } catch (err) {
    console.error('Get courtesy cars error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Request courtesy car
exports.requestCourtesyCar = async (req, res) => {
  try {
    const {
      pickupLocation,
      pickupAddress,
      pickupNotes,
      dropoffLocation,
      dropoffAddress,
      dropoffNotes,
      passengers,
      scheduledTime,
      requestedFeatures
    } = req.body;
    
    // Validate required fields
    if (!pickupLocation || !pickupLocation.coordinates ||
        !dropoffLocation || !dropoffLocation.coordinates) {
      return res.status(400).json({ 
        message: 'Pickup and dropoff locations are required' 
      });
    }
    
    // Create new request
    const request = new TransportationRequest({
      user: req.user.id,
      type: 'courtesy',
      pickup: {
        location: {
          type: 'Point',
          coordinates: pickupLocation.coordinates
        },
        address: pickupAddress,
        notes: pickupNotes,
        time: scheduledTime ? new Date(scheduledTime) : new Date()
      },
      dropoff: {
        location: {
          type: 'Point',
          coordinates: dropoffLocation.coordinates
        },
        address: dropoffAddress,
        notes: dropoffNotes
      },
      passengers: passengers || 1,
      requestedFeatures: requestedFeatures || [],
      scheduledTime: scheduledTime ? new Date(scheduledTime) : null
    });
    
    // Save request
    await request.save();
    
    // Find available drivers nearby
    const availableVehicles = await TransportationVehicle.find({
      type: 'courtesy',
      status: 'active',
      driver: { $ne: null },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: pickupLocation.coordinates
          },
          $maxDistance: 5000 // 5km
        }
      }
    }).populate('driver');
    
    // If no available vehicles, notify admins
    if (availableVehicles.length === 0) {
      // Create notification for admins
      const admins = await User.find({ roles: 'admin' });
      
      for (const admin of admins) {
        const notification = new Notification({
          recipient: admin._id,
          type: 'transportation',
          title: 'Courtesy Car Request - No Available Drivers',
          message: `A courtesy car request has been made but no drivers are available nearby.`,
          data: { requestId: request._id },
          priority: 'high'
        });
        
        await notification.save();
      }
    } else {
      // Notify available drivers through WebSocket
      // This will be implemented in the WebSocket service
    }
    
    res.status(201).json({
      request,
      message: 'Request submitted successfully',
      estimatedWait: availableVehicles.length > 0 ? '5-10 minutes' : '15-20 minutes'
    });
  } catch (err) {
    console.error('Request courtesy car error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get status of a courtesy car request
exports.getCourtesyCarRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find request
    const request = await TransportationRequest.findById(id)
      .populate('vehicle', 'name properties location')
      .populate('driver', 'firstName lastName');
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Check if this is the user's request
    if (request.user.toString() !== req.user.id && 
        !req.user.roles.includes('admin') && 
        !req.user.roles.includes('driver')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Calculate ETA if request is accepted and in progress
    let eta = null;
    if (request.status === 'accepted' || request.status === 'in_progress') {
      if (request.vehicle && request.vehicle.location) {
        // Simple distance-based ETA calculation
        // In a real application, you would use a routing service
        const pickup = request.pickup.location.coordinates;
        const vehicle = request.vehicle.location.coordinates;
        
        // Calculate distance in kilometers (straight line)
        const latDiff = pickup[1] - vehicle[1];
        const lngDiff = pickup[0] - vehicle[0];
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Rough conversion to km
        
        // Estimate 2 minutes per kilometer
        eta = Math.round(distance * 2);
      }
    }
    
    res.json({
      request,
      eta,
      lastUpdated: new Date()
    });
  } catch (err) {
    console.error('Get request status error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Cancel courtesy car request
exports.cancelCourtesyCarRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find request
    const request = await TransportationRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Check if this is the user's request
    if (request.user.toString() !== req.user.id && !req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Check if request can be cancelled
    if (request.status === 'completed' || request.status === 'cancelled') {
      return res.status(400).json({ 
        message: `Request already ${request.status}` 
      });
    }
    
    // Update request status
    request.status = 'cancelled';
    request.cancelledTime = Date.now();
    request.cancelReason = req.body.reason || 'Cancelled by user';
    
    await request.save();
    
    // Notify driver if request was accepted
    if (request.driver) {
      const notification = new Notification({
        recipient: request.driver,
        type: 'transportation',
        title: 'Ride Request Cancelled',
        message: `A ride request you accepted has been cancelled.`,
        data: { requestId: request._id },
        priority: 'high'
      });
      
      await notification.save();
    }
    
    res.json({ 
      message: 'Request cancelled successfully',
      request
    });
  } catch (err) {
    console.error('Cancel request error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get driver requests (for drivers)
exports.getDriverRequests = async (req, res) => {
  try {
    // Check if user is a driver
    if (!req.user.roles.includes('driver') && !req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Get driver's vehicle
    const vehicle = await TransportationVehicle.findOne({
      driver: req.user.id,
      status: 'active'
    });
    
    if (!req.user.roles.includes('admin') && !vehicle) {
      return res.status(400).json({ 
        message: 'No active vehicle assigned to this driver' 
      });
    }
    
    // Get nearby pending requests
    const pendingRequests = await TransportationRequest.find({
      status: 'pending',
      type: 'courtesy',
      // Filter by vehicle features if specific features were requested
      ...(vehicle && {
        $or: [
          { requestedFeatures: { $size: 0 } },
          { requestedFeatures: { $not: { $elemMatch: { $nin: vehicle.properties.features } } } }
        ]
      })
    })
      .populate('user', 'firstName lastName')
      .sort({ 'pickup.time': 1 });
    
    // Get driver's accepted/in-progress requests
    const activeRequests = await TransportationRequest.find({
      driver: req.user.id,
      status: { $in: ['accepted', 'in_progress'] }
    })
      .populate('user', 'firstName lastName')
      .sort({ acceptedTime: 1 });
    
    // Get driver's completed requests for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const completedRequests = await TransportationRequest.find({
      driver: req.user.id,
      status: 'completed',
      completedTime: { $gte: today }
    })
      .populate('user', 'firstName lastName')
      .sort({ completedTime: -1 });
    
    res.json({
      pendingRequests,
      activeRequests,
      completedRequests,
      lastUpdated: new Date()
    });
  } catch (err) {
    console.error('Get driver requests error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Accept request (for drivers)
exports.acceptRequest = async (req, res) => {
  try {
    // Check if user is a driver
    if (!req.user.roles.includes('driver')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { id } = req.params;
    
    // Find request
    const request = await TransportationRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Check if request is pending
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        message: `Request is already ${request.status}` 
      });
    }
    
    // Get driver's vehicle
    const vehicle = await TransportationVehicle.findOne({
      driver: req.user.id,
      status: 'active'
    });
    
    if (!vehicle) {
      return res.status(400).json({ 
        message: 'No active vehicle assigned to this driver' 
      });
    }
    
    // Check if vehicle meets requested features
    if (request.requestedFeatures && request.requestedFeatures.length > 0) {
      const hasAllFeatures = request.requestedFeatures.every(
        feature => vehicle.properties.features.includes(feature)
      );
      
      if (!hasAllFeatures) {
        return res.status(400).json({ 
          message: 'Vehicle does not meet requested features' 
        });
      }
    }
    
    // Update request
    request.status = 'accepted';
    request.driver = req.user.id;
    request.vehicle = vehicle._id;
    request.acceptedTime = Date.now();
    
    await request.save();
    
    // Notify user that request was accepted
    const notification = new Notification({
      recipient: request.user,
      type: 'transportation',
      title: 'Ride Request Accepted',
      message: `Your courtesy car request has been accepted and is on the way.`,
      data: { requestId: request._id },
      priority: 'high'
    });
    
    await notification.save();
    
    res.json({ 
      message: 'Request accepted successfully',
      request
    });
  } catch (err) {
    console.error('Accept request error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Complete request (for drivers)
exports.completeRequest = async (req, res) => {
  try {
    // Check if user is a driver
    if (!req.user.roles.includes('driver')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { id } = req.params;
    
    // Find request
    const request = await TransportationRequest.findById(id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    // Check if this driver is assigned to this request
    if (request.driver.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Check if request is accepted or in progress
    if (request.status !== 'accepted' && request.status !== 'in_progress') {
      return res.status(400).json({ 
        message: `Request must be accepted or in progress to complete` 
      });
    }
    
    // Update request
    request.status = 'completed';
    request.completedTime = Date.now();
    
    await request.save();
    
    // Notify user that ride is complete
    const notification = new Notification({
      recipient: request.user,
      type: 'transportation',
      title: 'Ride Completed',
      message: `Your courtesy car ride has been completed. Thank you for using Smart City transportation services.`,
      data: { requestId: request._id },
      priority: 'normal'
    });
    
    await notification.save();
    
    res.json({ 
      message: 'Request completed successfully',
      request
    });
  } catch (err) {
    console.error('Complete request error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update driver location (for drivers)
exports.updateDriverLocation = async (req, res) => {
  try {
    // Check if user is a driver
    if (!req.user.roles.includes('driver')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { coordinates, heading, speed } = req.body;
    
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ 
        message: 'Valid coordinates are required' 
      });
    }
    
    // Find driver's vehicle
    const vehicle = await TransportationVehicle.findOne({
      driver: req.user.id,
      status: 'active'
    });
    
    if (!vehicle) {
      return res.status(400).json({ 
        message: 'No active vehicle assigned to this driver' 
      });
    }
    
    // Update vehicle location
    vehicle.location = {
      type: 'Point',
      coordinates,
      heading: heading || 0,
      speed: speed || 0,
      updatedAt: Date.now()
    };
    
    await vehicle.save();
    
    // Find active requests for this driver
    const activeRequests = await TransportationRequest.find({
      driver: req.user.id,
      status: { $in: ['accepted', 'in_progress'] }
    });
    
    // Return active requests with the location update
    res.json({ 
      message: 'Location updated successfully',
      activeRequests
    });
  } catch (err) {
    console.error('Update driver location error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get transportation routes by type
exports.getRoutesByType = async (req, res) => {
  try {
    const { type } = req.params;
    
    // Validate route type
    if (!['prt', 'bus', 'shuttle', 'courtesy'].includes(type)) {
      return res.status(400).json({ message: 'Invalid route type' });
    }
    
    // Get routes
    const routes = await TransportationRoute.find({
      type,
      active: true
    }).select('name description color path');
    
    res.json(routes);
  } catch (err) {
    console.error('Get routes by type error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get transportation stops by route ID
exports.getStopsByRoute = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find route
    const route = await TransportationRoute.findById(id);
    
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    
    // Get stops
    const stops = await TransportationStop.find({
      _id: { $in: route.stops }
    }).select('name code location address amenities');
    
    res.json(stops);
  } catch (err) {
    console.error('Get stops by route error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get estimated arrival time for a transportation option
exports.getEstimatedArrivalTime = async (req, res) => {
  try {
    const { routeId, stopId } = req.query;
    
    if (!routeId || !stopId) {
      return res.status(400).json({ 
        message: 'Route ID and stop ID are required' 
      });
    }
    
    // Find route
    const route = await TransportationRoute.findById(routeId);
    
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }
    
    // Find stop
    const stop = await TransportationStop.findById(stopId);
    
    if (!stop) {
      return res.status(404).json({ message: 'Stop not found' });
    }
    
    // Find vehicles on this route
    const vehicles = await TransportationVehicle.find({
      route: routeId,
      status: 'active'
    }).select('location');
    
    if (vehicles.length === 0) {
      return res.json({
        message: 'No active vehicles on this route',
        estimatedArrival: null
      });
    }
    
    // Calculate estimated arrival time
    // This is a simplified calculation
    // In a real application, you would use a more sophisticated algorithm
    // based on vehicle speed, route shape, traffic, etc.
    
    const stopCoords = stop.location.coordinates;
    let closestVehicle = null;
    let shortestDistance = Infinity;
    
    // Find closest vehicle
    for (const vehicle of vehicles) {
      const vehicleCoords = vehicle.location.coordinates;
      
      // Calculate distance (simplified)
      const dx = stopCoords[0] - vehicleCoords[0];
      const dy = stopCoords[1] - vehicleCoords[1];
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < shortestDistance) {
        shortestDistance = distance;
        closestVehicle = vehicle;
      }
    }
    
    // Convert to kilometers (very rough approximation)
    const distanceKm = shortestDistance * 111;
    
    // Assume average speed of 30 km/h
    const timeMinutes = Math.round((distanceKm / 30) * 60);
    
    // Calculate arrival time
    const arrivalTime = new Date();
    arrivalTime.setMinutes(arrivalTime.getMinutes() + timeMinutes);
    
    res.json({
      route: route.name,
      stop: stop.name,
      estimatedArrival: {
        minutes: timeMinutes,
        time: arrivalTime
      }
    });
  } catch (err) {
    console.error('Get ETA error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

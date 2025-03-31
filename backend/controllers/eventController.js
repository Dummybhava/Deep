/**
 * Event controller for Smart City Application
 */
const Event = require('../models/Event');
const sitecoreService = require('../services/sitecoreService');
const notificationController = require('./notificationController');

exports = module.exports
// Get all events
exports.getAllEvents = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filtering
    const filter = { publishedStatus: 'published' };
    
    // Default to showing only non-past events
    if (req.query.showPast !== 'true') {
      filter.endDate = { $gte: new Date() };
    }
    
    if (req.query.featured === 'true') {
      filter.featured = true;
    }
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    // Sorting
    const sort = {};
    if (req.query.sort) {
      const sortFields = req.query.sort.split(',');
      sortFields.forEach(field => {
        if (field.startsWith('-')) {
          sort[field.substring(1)] = -1;
        } else {
          sort[field] = 1;
        }
      });
    } else {
      // Default sort by start date
      sort.startDate = 1;
    }
    
    // Execute query
    const events = await Event.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('title shortDescription category startDate endDate location images featured ticketInfo');
    
    // Get total count for pagination
    const total = await Event.countDocuments(filter);
    
    res.json({
      events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get all events error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get events by category
exports.getEventsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    // Validate category
    const validCategories = ['conference', 'exhibition', 'concert', 'festival', 'sport', 'workshop', 'community', 'other'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Execute query
    const events = await Event.find({ 
      category, 
      publishedStatus: 'published',
      endDate: { $gte: new Date() }
    })
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit)
      .select('title shortDescription category startDate endDate location images featured ticketInfo');
    
    // Get total count for pagination
    const total = await Event.countDocuments({ 
      category, 
      publishedStatus: 'published',
      endDate: { $gte: new Date() }
    });
    
    res.json({
      events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get events by category error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get upcoming events
exports.getUpcomingEvents = async (req, res) => {
  try {
    // Get events starting in the next X days
    const days = parseInt(req.query.days) || 7;
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    // Execute query
    const events = await Event.find({ 
      publishedStatus: 'published',
      startDate: { $gte: now, $lte: futureDate }
    })
      .sort({ startDate: 1 })
      .limit(20)
      .select('title shortDescription category startDate endDate location images featured ticketInfo');
    
    res.json(events);
  } catch (err) {
    console.error('Get upcoming events error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get events by date range
exports.getEventsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Start date and end date are required' 
      });
    }
    
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);
    
    // Execute query
    const events = await Event.find({ 
      publishedStatus: 'published',
      $or: [
        // Events that start within the range
        { startDate: { $gte: start, $lte: end } },
        // Events that end within the range
        { endDate: { $gte: start, $lte: end } },
        // Events that span the entire range
        { startDate: { $lte: start }, endDate: { $gte: end } }
      ]
    })
      .sort({ startDate: 1 })
      .select('title shortDescription category startDate endDate location images featured ticketInfo');
    
    res.json(events);
  } catch (err) {
    console.error('Get events by date range error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get featured events
exports.getFeaturedEvents = async (req, res) => {
  try {
    // Get current and future featured events
    const events = await Event.find({ 
      featured: true,
      publishedStatus: 'published',
      endDate: { $gte: new Date() }
    })
      .sort({ startDate: 1 })
      .limit(10)
      .select('title shortDescription category startDate endDate location images featured ticketInfo');
    
    res.json(events);
  } catch (err) {
    console.error('Get featured events error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get event by ID
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find event
    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if published or user is admin
    if (event.publishedStatus !== 'published' && 
        (!req.user || !req.user.roles.includes('admin'))) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.json(event);
  } catch (err) {
    console.error('Get event by ID error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add new event (admin only)
exports.addEvent = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin') && 
        !req.user.roles.includes('content_manager')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const {
      title,
      description,
      shortDescription,
      category,
      startDate,
      endDate,
      allDay,
      startTime,
      endTime,
      recurrence,
      location,
      virtualEventUrl,
      organizer,
      images,
      ticketInfo,
      capacity,
      accessibility,
      tags,
      featured,
      publishedStatus,
    } = req.body;
    
    // Create new event
    const event = new Event({
      title,
      description,
      shortDescription,
      category,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      allDay,
      startTime,
      endTime,
      recurrence,
      location,
      virtualEventUrl,
      organizer,
      images,
      ticketInfo,
      capacity,
      accessibility,
      tags,
      featured,
      publishedStatus: publishedStatus || 'published',
      createdBy: req.user.id
    });
    
    // Save to database
    await event.save();
    
    // If Sitecore integration is enabled, sync to Sitecore
    if (process.env.SITECORE_ENABLED === 'true') {
      try {
        const sitecoreId = await sitecoreService.createEvent(event);
        
        if (sitecoreId) {
          event.sitecoreId = sitecoreId;
          await event.save();
        }
      } catch (sitecoreErr) {
        console.error('Sitecore sync error:', sitecoreErr.message);
        // Continue even if Sitecore sync fails
      }
    }
    
    res.status(201).json(event);
  } catch (err) {
    console.error('Add event error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update event (admin only)
exports.updateEvent = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin') && 
        !req.user.roles.includes('content_manager')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { id } = req.params;
    
    // Find event
    let event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Update fields
    const updateFields = req.body;
    
    // Handle dates
    if (updateFields.startDate) {
      updateFields.startDate = new Date(updateFields.startDate);
    }
    if (updateFields.endDate) {
      updateFields.endDate = new Date(updateFields.endDate);
    }
    
    // Update event
    event = await Event.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    
    // If Sitecore integration is enabled, sync to Sitecore
    if (process.env.SITECORE_ENABLED === 'true' && event.sitecoreId) {
      try {
        await sitecoreService.updateEvent(event);
      } catch (sitecoreErr) {
        console.error('Sitecore sync error:', sitecoreErr.message);
        // Continue even if Sitecore sync fails
      }
    }
    
    res.json(event);
  } catch (err) {
    console.error('Update event error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete event (admin only)
exports.deleteEvent = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { id } = req.params;
    
    // Find event
    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Delete from Sitecore if integration is enabled
    if (process.env.SITECORE_ENABLED === 'true' && event.sitecoreId) {
      try {
        await sitecoreService.deleteEvent(event.sitecoreId);
      } catch (sitecoreErr) {
        console.error('Sitecore delete error:', sitecoreErr.message);
        // Continue even if Sitecore delete fails
      }
    }
    
    // Delete event
    await Event.findByIdAndDelete(id);
    
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('Delete event error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// RSVP to event
exports.rsvpToEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    if (!['attending', 'interested', 'declined'].includes(status)) {
      return res.status(400).json({ 
        message: 'Status must be attending, interested, or declined' 
      });
    }
    
    // Find event
    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if event is published
    if (event.publishedStatus !== 'published') {
      return res.status(400).json({ message: 'Cannot RSVP to unpublished event' });
    }
    
    // Check if event is in the past
    if (event.isPast()) {
      return res.status(400).json({ message: 'Cannot RSVP to past event' });
    }
    
    // Check if user already RSVPed
    const existingRsvpIndex = event.attendees.findIndex(
      attendee => attendee.user.toString() === req.user.id
    );
    
    if (existingRsvpIndex !== -1) {
      // Update existing RSVP
      event.attendees[existingRsvpIndex].status = status;
      event.attendees[existingRsvpIndex].dateResponded = Date.now();
    } else {
      // Add new RSVP
      event.attendees.push({
        user: req.user.id,
        status,
        dateResponded: Date.now()
      });
    }
    
    // Save changes
    await event.save();
    
    res.json({ 
      message: 'RSVP successful',
      attendeeCount: event.getAttendeeCount()
    });
  } catch (err) {
    console.error('RSVP error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get events near a location
exports.getNearbyEvents = async (req, res) => {
  try {
    const { longitude, latitude, distance = 5 } = req.query;
    
    // Validate coordinates
    if (!longitude || !latitude) {
      return res.status(400).json({ 
        message: 'Longitude and latitude are required' 
      });
    }
    
    // Convert string parameters to numbers
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    const dist = parseFloat(distance); // in kilometers
    
    if (isNaN(lng) || isNaN(lat) || isNaN(dist)) {
      return res.status(400).json({ 
        message: 'Invalid coordinates or distance' 
      });
    }
    
    // Find nearby events
    const events = await Event.find({
      publishedStatus: 'published',
      endDate: { $gte: new Date() },
      'location.type': 'coordinates',
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: dist * 1000 // convert km to meters
        }
      }
    })
      .limit(20)
      .select('title shortDescription category startDate endDate location images featured ticketInfo');
    
    res.json(events);
  } catch (err) {
    console.error('Get nearby events error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Feedback controller for Smart City Application
 * Handles user feedback and incident reports
 */
const { Feedback, Incident } = require('../models/Feedback');
const User = require('../models/User');
const { Notification } = require('../models/Notification');

exports = module.exports
// Submit general feedback
exports.submitFeedback = async (req, res) => {
  try {
    const { 
      type, 
      subject, 
      message, 
      rating, 
      relatedTo,
      appVersion,
      deviceInfo
    } = req.body;
    
    // Validate required fields
    if (!type || !subject || !message) {
      return res.status(400).json({ 
        message: 'Type, subject and message are required' 
      });
    }
    
    // Create new feedback
    const feedback = new Feedback({
      user: req.user.id,
      type,
      subject,
      message,
      rating,
      relatedTo,
      appVersion,
      deviceInfo
    });
    
    // Save feedback
    await feedback.save();
    
    // Notify admins about new feedback
    const admins = await User.find({ 
      roles: { $in: ['admin'] }
    }).select('_id');
    
    // Create notifications for admins
    const notifications = admins.map(admin => ({
      recipient: admin._id,
      type: 'feedback',
      title: 'New Feedback Received',
      message: `New feedback received: ${subject}`,
      data: {
        feedbackId: feedback._id,
        type: feedback.type
      }
    }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
    
    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback._id,
        type: feedback.type,
        subject: feedback.subject,
        status: feedback.status,
        createdAt: feedback.createdAt
      }
    });
  } catch (err) {
    console.error('Submit feedback error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all feedback (admin only)
exports.getAllFeedback = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filtering
    const filter = {};
    
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Execute query
    const feedback = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'firstName lastName email')
      .lean();
    
    // Get total count for pagination
    const total = await Feedback.countDocuments(filter);
    
    res.json({
      feedback,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get all feedback error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get feedback by ID
exports.getFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find feedback
    const feedback = await Feedback.findById(id)
      .populate('user', 'firstName lastName email')
      .populate('adminResponse.respondedBy', 'firstName lastName');
    
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    // Check if this is the user's feedback or user is admin
    if (feedback.user._id.toString() !== req.user.id && 
        !req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(feedback);
  } catch (err) {
    console.error('Get feedback by ID error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update feedback status (admin only)
exports.updateFeedbackStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { id } = req.params;
    const { status, adminMessage } = req.body;
    
    // Validate status
    if (!['submitted', 'in_review', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Find feedback
    const feedback = await Feedback.findById(id);
    
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    // Update feedback
    feedback.status = status;
    
    // If admin provided a response message
    if (adminMessage) {
      feedback.adminResponse = {
        message: adminMessage,
        respondedBy: req.user.id,
        respondedAt: Date.now()
      };
    }
    
    await feedback.save();
    
    // Notify user about status update
    const notification = new Notification({
      recipient: feedback.user,
      type: 'feedback',
      title: 'Feedback Status Update',
      message: `Your feedback "${feedback.subject}" has been updated to ${status}`,
      data: {
        feedbackId: feedback._id,
        status
      }
    });
    
    await notification.save();
    
    res.json({
      message: 'Feedback status updated successfully',
      feedback
    });
  } catch (err) {
    console.error('Update feedback status error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's submitted feedback
exports.getUserFeedback = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Find user's feedback
    const feedback = await Feedback.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Feedback.countDocuments({ user: req.user.id });
    
    res.json({
      feedback,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get user feedback error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete feedback (admin only)
exports.deleteFeedback = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { id } = req.params;
    
    // Find and delete feedback
    const feedback = await Feedback.findByIdAndDelete(id);
    
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    res.json({ message: 'Feedback deleted successfully' });
  } catch (err) {
    console.error('Delete feedback error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Submit incident report
exports.reportIncident = async (req, res) => {
  try {
    const { 
      incidentType, 
      title, 
      description, 
      location,
      incidentDate,
      images,
      contactRequested,
      deviceInfo
    } = req.body;
    
    // Validate required fields
    if (!incidentType || !title || !description || !location) {
      return res.status(400).json({ 
        message: 'Type, title, description and location are required' 
      });
    }
    
    // Create new incident
    const incident = new Incident({
      user: req.user.id,
      incidentType,
      title,
      description,
      location,
      incidentDate: incidentDate ? new Date(incidentDate) : Date.now(),
      images: images || [],
      contactRequested: contactRequested || false,
      deviceInfo
    });
    
    // Save incident
    await incident.save();
    
    // Determine priority based on incident type
    let priority = 'medium';
    if (['emergency', 'security'].includes(incidentType)) {
      priority = 'high';
    }
    
    // Notify admins about new incident
    const admins = await User.find({ 
      roles: { $in: ['admin'] }
    }).select('_id');
    
    // Create notifications for admins
    const notifications = admins.map(admin => ({
      recipient: admin._id,
      type: 'incident',
      title: 'New Incident Reported',
      message: `New ${incidentType} incident reported: ${title}`,
      data: {
        incidentId: incident._id,
        type: incident.incidentType,
        priority: incident.priority
      },
      priority: priority
    }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
    
    res.status(201).json({
      message: 'Incident reported successfully',
      incident: {
        id: incident._id,
        type: incident.incidentType,
        title: incident.title,
        status: incident.status,
        createdAt: incident.createdAt
      }
    });
  } catch (err) {
    console.error('Report incident error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all incident reports (admin only)
exports.getAllIncidents = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Filtering
    const filter = {};
    
    if (req.query.type) {
      filter.incidentType = req.query.type;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }
    
    // Execute query
    const incidents = await Incident.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'firstName lastName email')
      .lean();
    
    // Get total count for pagination
    const total = await Incident.countDocuments(filter);
    
    res.json({
      incidents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get all incidents error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get incident report by ID
exports.getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find incident
    const incident = await Incident.findById(id)
      .populate('user', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName')
      .populate('resolution.resolvedBy', 'firstName lastName');
    
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    
    // Check if this is the user's incident or user is admin
    if (incident.user._id.toString() !== req.user.id && 
        !req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(incident);
  } catch (err) {
    console.error('Get incident by ID error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update incident status (admin only)
exports.updateIncidentStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { id } = req.params;
    const { 
      status, 
      priority, 
      assignedTo, 
      resolution 
    } = req.body;
    
    // Validate status
    if (status && !['reported', 'under_investigation', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    // Find incident
    const incident = await Incident.findById(id);
    
    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    
    // Update incident fields
    if (status) incident.status = status;
    if (priority) incident.priority = priority;
    if (assignedTo) incident.assignedTo = assignedTo;
    
    // If resolution is provided and status is resolved or closed
    if (resolution && ['resolved', 'closed'].includes(status)) {
      incident.resolution = {
        action: resolution.action,
        resolvedBy: req.user.id,
        resolvedAt: Date.now(),
        notes: resolution.notes
      };
    }
    
    await incident.save();
    
    // Notify user about status update
    const notification = new Notification({
      recipient: incident.user,
      type: 'incident',
      title: 'Incident Status Update',
      message: status 
        ? `Your reported incident "${incident.title}" has been updated to ${status}`
        : `Your reported incident "${incident.title}" has been updated`,
      data: {
        incidentId: incident._id,
        status: incident.status,
        priority: incident.priority
      }
    });
    
    await notification.save();
    
    res.json({
      message: 'Incident updated successfully',
      incident
    });
  } catch (err) {
    console.error('Update incident status error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

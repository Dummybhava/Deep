/**
 * User controller for Smart City Application
 * Handles user management and profile operations
 */
const User = require('../models/User');
const { Notification } = require('../models/Notification');
const Attraction = require('../models/Attraction');
const Event = require('../models/Event');
const Tour = require('../models/Tour');

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
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
    
    if (req.query.role) {
      filter.roles = req.query.role;
    }
    
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex }
      ];
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
      // Default sort by created date
      sort.createdAt = -1;
    }
    
    // Execute query
    const users = await User.find(filter)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await User.countDocuments(filter);
    
    res.json({
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get all users error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID (admin only)
exports.getUserById = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { id } = req.params;
    
    // Find user
    const user = await User.findById(id).select('-password -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Get user by ID error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user (admin only)
exports.updateUser = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      isDisabled
    } = req.body;
    
    // Find user
    let user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (isDisabled !== undefined) user.isDisabled = isDisabled;
    
    // Save user
    await user.save();
    
    res.json({
      message: 'User updated successfully',
      user: user.getPublicProfile()
    });
  } catch (err) {
    console.error('Update user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { id } = req.params;
    
    // Find and delete user
    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete associated data (e.g., notifications)
    await Notification.deleteMany({ recipient: id });
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports = module.exports
// Update user role (admin only)
exports.updateUserRole = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { id } = req.params;
    const { roles } = req.body;
    
    if (!roles || !Array.isArray(roles)) {
      return res.status(400).json({ message: 'Roles must be an array' });
    }
    
    // Validate roles
    const validRoles = ['user', 'admin', 'driver', 'content_manager'];
    const invalidRoles = roles.filter(role => !validRoles.includes(role));
    
    if (invalidRoles.length > 0) {
      return res.status(400).json({ 
        message: `Invalid roles: ${invalidRoles.join(', ')}` 
      });
    }
    
    // Find user
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update roles
    user.roles = roles;
    
    // Save user
    await user.save();
    
    res.json({
      message: 'User roles updated successfully',
      user: user.getPublicProfile()
    });
  } catch (err) {
    console.error('Update user role error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    // Find user
    const user = await User.findById(req.user.id).select('-password -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.getPublicProfile());
  } catch (err) {
    console.error('Get profile error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      preferredLanguage
    } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;
    
    // Save user
    await user.save();
    
    res.json({
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update privacy settings
exports.updatePrivacySettings = async (req, res) => {
  try {
    const {
      shareProfile,
      shareActivity,
      locationTracking
    } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update privacy settings
    if (shareProfile !== undefined) user.privacySettings.shareProfile = shareProfile;
    if (shareActivity !== undefined) user.privacySettings.shareActivity = shareActivity;
    if (locationTracking !== undefined) user.privacySettings.locationTracking = locationTracking;
    
    // Save user
    await user.save();
    
    res.json({
      message: 'Privacy settings updated successfully',
      privacySettings: user.privacySettings
    });
  } catch (err) {
    console.error('Update privacy settings error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user avatar
exports.updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    
    if (!avatar) {
      return res.status(400).json({ message: 'Avatar URL is required' });
    }
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update avatar
    user.avatar = avatar;
    
    // Save user
    await user.save();
    
    res.json({
      message: 'Avatar updated successfully',
      avatar: user.avatar
    });
  } catch (err) {
    console.error('Update avatar error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user preferences
exports.updatePreferences = async (req, res) => {
  try {
    const { preferences } = req.body;
    
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ message: 'Valid preferences object is required' });
    }
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user preferences (this could be expanded based on app requirements)
    user.updatedAt = Date.now();
    
    // We'd need to add a preferences field to the user model for this
    // For now, just return success
    
    // Save user
    await user.save();
    
    res.json({
      message: 'Preferences updated successfully'
    });
  } catch (err) {
    console.error('Update preferences error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user activity
exports.getUserActivity = async (req, res) => {
  try {
    // This endpoint would retrieve user activity data
    // For now, return empty activity
    res.json({
      message: 'User activity retrieved',
      activity: []
    });
  } catch (err) {
    console.error('Get user activity error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get saved items
exports.getSavedItems = async (req, res) => {
  try {
    // Find user with populated saved items
    const user = await User.findById(req.user.id)
      .populate({
        path: 'savedItems.attractions',
        select: 'name category images location rating'
      })
      .populate({
        path: 'savedItems.events',
        select: 'title category startDate endDate location images'
      })
      .populate({
        path: 'savedItems.tours',
        select: 'title category estimatedDuration distance difficulty images'
      });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      savedItems: user.savedItems
    });
  } catch (err) {
    console.error('Get saved items error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Save item
exports.saveItem = async (req, res) => {
  try {
    const { itemType, itemId } = req.body;
    
    if (!itemType || !itemId) {
      return res.status(400).json({ 
        message: 'Item type and ID are required' 
      });
    }
    
    // Validate item type
    if (!['attraction', 'event', 'tour'].includes(itemType)) {
      return res.status(400).json({ message: 'Invalid item type' });
    }
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if item exists based on type
    let item;
    
    switch (itemType) {
      case 'attraction':
        item = await Attraction.findById(itemId);
        // Check if already saved
        if (user.savedItems.attractions.includes(itemId)) {
          return res.status(400).json({ message: 'Item already saved' });
        }
        // Add to saved attractions
        user.savedItems.attractions.push(itemId);
        break;
        
      case 'event':
        item = await Event.findById(itemId);
        // Check if already saved
        if (user.savedItems.events.includes(itemId)) {
          return res.status(400).json({ message: 'Item already saved' });
        }
        // Add to saved events
        user.savedItems.events.push(itemId);
        break;
        
      case 'tour':
        item = await Tour.findById(itemId);
        // Check if already saved
        if (user.savedItems.tours.includes(itemId)) {
          return res.status(400).json({ message: 'Item already saved' });
        }
        // Add to saved tours
        user.savedItems.tours.push(itemId);
        break;
    }
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Save user
    await user.save();
    
    res.json({
      message: 'Item saved successfully',
      savedItems: user.savedItems
    });
  } catch (err) {
    console.error('Save item error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove saved item
exports.removeSavedItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { itemType } = req.query;
    
    if (!itemType) {
      return res.status(400).json({ message: 'Item type is required' });
    }
    
    // Validate item type
    if (!['attraction', 'event', 'tour'].includes(itemType)) {
      return res.status(400).json({ message: 'Invalid item type' });
    }
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove item based on type
    switch (itemType) {
      case 'attraction':
        user.savedItems.attractions = user.savedItems.attractions.filter(
          id => id.toString() !== itemId
        );
        break;
        
      case 'event':
        user.savedItems.events = user.savedItems.events.filter(
          id => id.toString() !== itemId
        );
        break;
        
      case 'tour':
        user.savedItems.tours = user.savedItems.tours.filter(
          id => id.toString() !== itemId
        );
        break;
    }
    
    // Save user
    await user.save();
    
    res.json({
      message: 'Item removed successfully',
      savedItems: user.savedItems
    });
  } catch (err) {
    console.error('Remove saved item error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

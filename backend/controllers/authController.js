/**
 * Authentication controller for Smart City Application
 * Handles authentication flows including login, registration, OAuth, password reset etc.
 */
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/config');


// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      roles: user.roles 
    },
    config.jwt.secret, // Use from config instead of local variable
    { 
      expiresIn: config.jwt.expiresIn 
    }
  );
};

// Register new user
exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone
    } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Check if user already exists
    let user = await User.findOne({ email });
    
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    user = new User({
      firstName,
      lastName,
      email,
      password,
      phone: phone || '',
      roles: ['user'],
      privacySettings: {
        shareProfile: false,
        shareActivity: false,
        locationTracking: true
      },
      savedItems: {
        attractions: [],
        events: [],
        tours: []
      }
    });
    
    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    // Save user
    await user.save();
    
    // Generate token
    const token = generateToken(user);
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.getPublicProfile()
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if account is disabled
    if (user.isDisabled) {
      return res.status(403).json({ message: 'Account is disabled' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken(user);
    
    // Update last login timestamp
    user.lastLogin = Date.now();
    await user.save();
    
    res.header('x-auth-token', token).json({
      message: 'Login successful',
      token,
      user: user.getPublicProfile()
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current authenticated user
exports.getCurrentUser = async (req, res) => {
  try {
    // User is already available in req.user from auth middleware
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.getPublicProfile());
  } catch (err) {
    console.error('Get current user error:', err.message);
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

// Update user password
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Save user
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Update password error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Google OAuth
exports.googleAuth = (req, res) => {
  // This would normally redirect to Google OAuth
  res.json({ message: 'Google OAuth endpoint' });
};

// Google OAuth callback
exports.googleCallback = async (req, res) => {
  try {
    const { token } = req.body;
    
    // This would normally verify the token with Google
    // For now, simulate success with a mock user
    
    // Find or create user
    let user = await User.findOne({ email: 'googledemo@example.com' });
    
    if (!user) {
      user = new User({
        firstName: 'Google',
        lastName: 'User',
        email: 'googledemo@example.com',
        password: 'password', // This would normally be random
        roles: ['user'],
        authProvider: 'google',
        authProviderId: '123456789',
        privacySettings: {
          shareProfile: false,
          shareActivity: false,
          locationTracking: true
        }
      });
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
      
      await user.save();
    }
    
    // Generate token
    const jwtToken = generateToken(user);
    
    // Update last login timestamp
    user.lastLogin = Date.now();
    await user.save();
    
    res.json({
      message: 'Google login successful',
      token: jwtToken,
      user: user.getPublicProfile()
    });
  } catch (err) {
    console.error('Google callback error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Facebook OAuth
exports.facebookAuth = (req, res) => {
  // This would normally redirect to Facebook OAuth
  res.json({ message: 'Facebook OAuth endpoint' });
};

// Facebook OAuth callback
exports.facebookCallback = async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    // This would normally verify the token with Facebook
    // For now, simulate success with a mock user
    
    // Find or create user
    let user = await User.findOne({ email: 'facebookdemo@example.com' });
    
    if (!user) {
      user = new User({
        firstName: 'Facebook',
        lastName: 'User',
        email: 'facebookdemo@example.com',
        password: 'password', // This would normally be random
        roles: ['user'],
        authProvider: 'facebook',
        authProviderId: '123456789',
        privacySettings: {
          shareProfile: false,
          shareActivity: false,
          locationTracking: true
        }
      });
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
      
      await user.save();
    }
    
    // Generate token
    const jwtToken = generateToken(user);
    
    // Update last login timestamp
    user.lastLogin = Date.now();
    await user.save();
    
    res.json({
      message: 'Facebook login successful',
      token: jwtToken,
      user: user.getPublicProfile()
    });
  } catch (err) {
    console.error('Facebook callback error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    // In a stateless JWT system, we don't need to do anything server-side
    // The client should remove the token
    
    // If we want to invalidate tokens, we would need to track them in a blacklist
    // or implement a refresh token system
    
    res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error('Logout error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    // This would implement a refresh token system
    // For now, just return success
    res.json({ message: 'Token refresh endpoint' });
  } catch (err) {
    console.error('Refresh token error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Request password reset
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    
    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If the email exists, a reset link will be sent' });
    }
    
    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Set token expiration (1 hour)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    
    await user.save();
    
    // In a real app, send email with reset link
    // ...
    
    res.json({ message: 'If the email exists, a reset link will be sent' });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password with token
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    // Clear reset token
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
import axios from 'axios';
import { api } from '../services/api.js';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Login user with email and password
export const login = async (email, password) => {
  try {
    const res = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    if (res.data && res.data.token) {
      // Store token and user info in localStorage
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      return res.data;
    }
    
    throw new Error('Login failed');
  } catch (err) {
    throw err.response?.data?.message || 'Login failed. Please check your credentials.';
  }
};

// Register new user
export const register = async (userData) => {
  try {
    const res = await axios.post(`${API_URL}/auth/register`, userData);
    
    if (res.data && res.data.token) {
      // Store token and user info in localStorage
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      return res.data;
    }
    
    throw new Error('Registration failed');
  } catch (err) {
    throw err.response?.data?.message || 'Registration failed. Please try again.';
  }
};

// Login with Google
export const loginWithGoogle = async (googleToken) => {
  try {
    const res = await axios.post(`${API_URL}/auth/google/callback`, {
      token: googleToken
    });
    
    if (res.data && res.data.token) {
      // Store token and user info in localStorage
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      return res.data;
    }
    
    throw new Error('Google login failed');
  } catch (err) {
    throw err.response?.data?.message || 'Google login failed. Please try again.';
  }
};

// Login with Facebook
export const loginWithFacebook = async (accessToken) => {
  try {
    const res = await axios.post(`${API_URL}/auth/facebook/callback`, {
      accessToken
    });
    
    if (res.data && res.data.token) {
      // Store token and user info in localStorage
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      return res.data;
    }
    
    throw new Error('Facebook login failed');
  } catch (err) {
    throw err.response?.data?.message || 'Facebook login failed. Please try again.';
  }
};

// Logout user
export const logout = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (token) {
      // Notify server about logout
      await axios.post(
        `${API_URL}/auth/logout`, 
        {},
        {
          headers: {
            'x-auth-token': token
          }
        }
      );
    }
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    // Clear localStorage regardless of server response
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

// Get current authenticated user
export const getCurrentUser = async () => {
  try {

      return await api.get('/auth/me');
    // const token = localStorage.getItem('token');
    
    // if (!token) {
    //   return null;
    // }
    
    // const res = await axios.get(`${API_URL}/auth/me`, {
    //   headers: {
    //     'x-auth-token': token
    //   }
    // });
    
    // if (res.data) {
    //   // Update user info in localStorage
    //   localStorage.setItem('user', JSON.stringify(res.data));
    //   return res.data;
    // }
    
   // return null;
  } catch (err) {
    console.error('Get current user error:', err);
    // Clear invalid token
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // window.location.href = '/login';
    }
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return localStorage.getItem('token') !== null;
};

// Get user info from localStorage
export const getUserInfo = () => {
  const userString = localStorage.getItem('user');
  if (userString) {
    try {
      return JSON.parse(userString);
    } catch (e) {
      console.error('Error parsing user info from localStorage:', e);
      return null;
    }
  }
  return null;
};

// Update user password
export const updatePassword = async (currentPassword, newPassword) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const res = await axios.put(
      `${API_URL}/auth/password`,
      {
        currentPassword,
        newPassword
      },
      {
        headers: {
          'x-auth-token': token
        }
      }
    );
    
    return res.data;
  } catch (err) {
    throw err.response?.data?.message || 'Failed to update password. Please try again.';
  }
};

// Update user profile
export const updateProfile = async (profileData) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const res = await axios.put(
      `${API_URL}/auth/profile`,
      profileData,
      {
        headers: {
          'x-auth-token': token
        }
      }
    );
    
    if (res.data) {
      // Update user info in localStorage
      localStorage.setItem('user', JSON.stringify(res.data));
      return res.data;
    }
    
    throw new Error('Profile update failed');
  } catch (err) {
    throw err.response?.data?.message || 'Failed to update profile. Please try again.';
  }
};

// Request password reset
export const forgotPassword = async (email) => {
  try {
    const res = await axios.post(`${API_URL}/auth/forgot-password`, { email });
    return res.data;
  } catch (err) {
    throw err.response?.data?.message || 'Failed to request password reset. Please try again.';
  }
};

// Reset password with token
export const resetPassword = async (token, password) => {
  try {
    const res = await axios.post(`${API_URL}/auth/reset-password/${token}`, { password });
    return res.data;
  } catch (err) {
    throw err.response?.data?.message || 'Failed to reset password. Please try again.';
  }
};

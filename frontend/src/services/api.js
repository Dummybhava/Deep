import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to attach auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const { response } = error;
    
    // Handle unauthorized error (expired or invalid token)
    if (response && response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect to login if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(
      (response && response.data && response.data.message) || 
      'Something went wrong'
    );
  }
);

// Authentication APIs
export const loginUser = (credentials) => {
  return api.post('/auth/login', credentials);
};

export const registerUser = (userData) => {
  return api.post('/auth/register', userData);
};

export const googleAuth = (token) => {
  return api.post('/auth/google/callback', { token });
};

export const facebookAuth = (accessToken) => {
  return api.post('/auth/facebook/callback', { accessToken });
};

export const getCurrentUser = () => {
  return api.get('/auth/me');
};

export const updateProfile = (profileData) => {
  return api.put('/auth/profile', profileData);
};

export const updatePassword = (passwordData) => {
  return api.put('/auth/password', passwordData);
};

export const logoutUser = (deviceId) => {
  return api.post('/auth/logout', { deviceId });
};

// Attractions APIs
export const getAttractions = (params) => {
  return api.get('/attractions', { params });
};

export const getAttractionById = (id) => {
  return api.get(`/attractions/${id}`);
};

export const getFoodAttractions = (params) => {
  return api.get('/attractions/type/food', { params });
};

export const getRetailAttractions = (params) => {
  return api.get('/attractions/type/retail', { params });
};

export const getNearbyAttractions = (coords, radius) => {
  return api.get('/attractions/nearby', { 
    params: {
      longitude: coords[0],
      latitude: coords[1],
      distance: radius
    }
  });
};

export const submitAttractionReview = (id, reviewData) => {
  return api.post(`/attractions/${id}/reviews`, reviewData);
};

export const getAttractionReviews = (id) => {
  return api.get(`/attractions/${id}/reviews`);
};

export const addAttraction = (attractionData) => {
  return api.post('/attractions', attractionData);
};

export const updateAttraction = (id, attractionData) => {
  return api.put(`/attractions/${id}`, attractionData);
};

export const deleteAttraction = (id) => {
  return api.delete(`/attractions/${id}`);
};

// Events APIs
export const getEvents = (params) => {
  return api.get('/events', { params });
};

export const getEventById = (id) => {
  return api.get(`/events/${id}`);
};

export const getUpcomingEvents = (days = 7) => {
  return api.get('/events/upcoming', { params: { days } });
};

export const getEventsByDateRange = (startDate, endDate) => {
  return api.get('/events/date-range', { 
    params: { 
      startDate, 
      endDate 
    } 
  });
};

export const getFeaturedEvents = () => {
  return api.get('/events/featured');
};

export const getNearbyEvents = (coords, radius) => {
  return api.get('/events/nearby', { 
    params: {
      longitude: coords[0],
      latitude: coords[1],
      distance: radius
    }
  });
};

export const addEvent = (eventData) => {
  return api.post('/events', eventData);
};

export const updateEvent = (id, eventData) => {
  return api.put(`/events/${id}`, eventData);
};

export const deleteEvent = (id) => {
  return api.delete(`/events/${id}`);
};

export const rsvpToEvent = (id, status) => {
  return api.post(`/events/${id}/rsvp`, { status });
};

// Transportation APIs
export const getAllTransportation = () => {
  return api.get('/transportation');
};

export const getPRTData = () => {
  return api.get('/transportation/prt');
};

export const getBusRoutes = () => {
  return api.get('/transportation/bus');
};

export const getCourtesyCars = () => {
  return api.get('/transportation/courtesy');
};

export const requestCourtesyCar = (requestData) => {
  return api.post('/transportation/courtesy/request', requestData);
};

export const getCourtesyCarRequestStatus = (requestId) => {
  return api.get(`/transportation/courtesy/request/${requestId}`);
};

export const cancelCourtesyCarRequest = (requestId, reason) => {
  return api.delete(`/transportation/courtesy/request/${requestId}`, {
    data: { reason }
  });
};

export const getTransportationRoutesByType = (type) => {
  return api.get(`/transportation/routes/${type}`);
};

export const getTransportationStopsByRoute = (routeId) => {
  return api.get(`/transportation/routes/${routeId}/stops`);
};

export const getEstimatedArrivalTime = (routeId, stopId) => {
  return api.get('/transportation/eta', {
    params: { routeId, stopId }
  });
};

export const getDriverRequests = () => {
  return api.get('/transportation/driver/requests');
};

export const acceptDriverRequest = (requestId) => {
  return api.put(`/transportation/driver/request/${requestId}/accept`);
};

export const completeDriverRequest = (requestId) => {
  return api.put(`/transportation/driver/request/${requestId}/complete`);
};

export const updateDriverLocation = (coordinates, heading, speed) => {
  return api.put('/transportation/driver/location', {
    coordinates,
    heading,
    speed
  });
};

// Mock transportation status for dashboard
export const getTransportationStatus = () => {
  return api.get('/transportation').then(() => {
    // This is just a placeholder, in a real app this would come from the backend
    return {
      prt: {
        status: 'operational',
        waitTime: 5
      },
      bus: {
        status: 'operational'
      },
      courtesy: {
        availableCars: 4
      }
    };
  });
};

// Feedback APIs
export const submitFeedback = (feedbackData) => {
  return api.post('/feedback', feedbackData);
};

export const getAllFeedback = (params) => {
  return api.get('/feedback', { params });
};

export const getFeedbackById = (id) => {
  return api.get(`/feedback/${id}`);
};

export const updateFeedbackStatus = (id, statusData) => {
  return api.put(`/feedback/${id}/status`, statusData);
};

export const getUserFeedback = () => {
  return api.get('/feedback/user');
};

export const deleteFeedback = (id) => {
  return api.delete(`/feedback/${id}`);
};

export const reportIncident = (incidentData) => {
  return api.post('/feedback/incident', incidentData);
};

export const getAllIncidents = (params) => {
  return api.get('/feedback/incident', { params });
};

export const getIncidentById = (id) => {
  return api.get(`/feedback/incident/${id}`);
};

export const updateIncidentStatus = (id, statusData) => {
  return api.put(`/feedback/incident/${id}/status`, statusData);
};

// Maps APIs
export const getMapConfig = () => {
  return api.get('/maps/config');
};

export const getPointsOfInterest = (params) => {
  return api.get('/maps/poi', { params });
};

export const searchPOI = (query, limit = 10) => {
  return api.get('/maps/search', { 
    params: { 
      q: query,
      limit
    } 
  });
};

export const getRoute = (fromCoords, toCoords, mode = 'walking', alternatives = false, avoidStairs = false) => {
  return api.get('/maps/route', {
    params: {
      fromLat: fromCoords[1],
      fromLng: fromCoords[0],
      toLat: toCoords[1],
      toLng: toCoords[0],
      mode,
      alternatives,
      avoidStairs
    }
  });
};

export const getOfflinePackages = () => {
  return api.get('/maps/offline/packages');
};

export const getOfflineRegion = (id) => {
  return api.get(`/maps/offline/region/${id}`);
};

export const getMapLayers = () => {
  return api.get('/maps/layers');
};

// Notifications APIs
export const getNotifications = (params) => {
  return api.get('/notifications', { params });
};

export const markNotificationAsRead = (id) => {
  return api.put(`/notifications/${id}/read`);
};

export const deleteNotification = (id) => {
  return api.delete(`/notifications/${id}`);
};

export const markAllNotificationsAsRead = () => {
  return api.put('/notifications/read-all');
};

export const registerDevice = (deviceData) => {
  return api.post('/notifications/device', deviceData);
};

export const unregisterDevice = (deviceId) => {
  return api.delete(`/notifications/device/${deviceId}`);
};

export const updateNotificationPreferences = (preferencesData) => {
  return api.put('/notifications/preferences', preferencesData);
};

export const getNotificationPreferences = () => {
  return api.get('/notifications/preferences');
};

export const sendNotification = (notificationData) => {
  return api.post('/notifications/admin/send', notificationData);
};

export const broadcastNotification = (notificationData) => {
  return api.post('/notifications/admin/broadcast', notificationData);
};

// User Management APIs
export const getAllUsers = (params) => {
  return api.get('/users', { params });
};

export const getUserById = (id) => {
  return api.get(`/users/${id}`);
};

export const updateUser = (id, userData) => {
  return api.put(`/users/${id}`, userData);
};

export const deleteUser = (id) => {
  return api.delete(`/users/${id}`);
};

export const updateUserRole = (id, roles) => {
  return api.put(`/users/${id}/role`, { roles });
};

export const getProfile = () => {
  return api.get('/users/profile');
};

export const updateUserProfile = (profileData) => {
  return api.put('/users/profile', profileData);
};

export const updatePrivacySettings = (settingsData) => {
  return api.put('/users/profile/privacy', settingsData);
};

export const updateAvatar = (avatarUrl) => {
  return api.put('/users/profile/avatar', { avatar: avatarUrl });
};

export const updatePreferences = (preferencesData) => {
  return api.put('/users/profile/preferences', { preferences: preferencesData });
};

export const getUserActivity = () => {
  return api.get('/users/activity');
};

export const getSavedItems = () => {
  return api.get('/users/saved-items');
};

export const saveItem = (itemData) => {
  return api.post('/users/saved-items', itemData);
};

export const removeSavedItem = (itemId, itemType) => {
  return api.delete(`/users/saved-items/${itemId}?itemType=${itemType}`);
};

// Tours APIs
// services/api.js
export const getTours = (params) => {
  return api.get('/tours', { params });
};

export const getTourById = (id) => {
  return api.get(`/tours/${id}`);
};

export const startTour = (tourId) => {
  return api.post(`/tours/${tourId}/start`);
};

export const completeTour = (tourId, data) => {
  return api.post(`/tours/${tourId}/complete`, data);
};

export const submitTourReview = (tourId, data) => {
  return api.post(`/tours/${tourId}/review`, data);
};

// In your api.js
export const getToursList = async (params = {}) => {
  try {
    const response = await api.get('/tours', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching tours:', error);
    throw error.response?.data || { message: 'Failed to fetch tours' };
  }
};

export { api };
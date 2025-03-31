/**
 * Sitecore integration service for Smart City Application
 * Handles communication with Sitecore CMS
 */
const axios = require('axios');
const config = require('../config/config');

// Sitecore API base URL and credentials
const apiUrl = config.sitecore.apiUrl;
const apiKey = config.sitecore.apiKey;
const username = config.sitecore.username;
const password = config.sitecore.password;

// Authentication token cache
let authToken = null;
let tokenExpiry = null;

// Helper function to get authentication token
async function getAuthToken() {
  // Check if we have a valid token
  if (authToken && tokenExpiry && tokenExpiry > Date.now()) {
    return authToken;
  }
  
  try {
    // Authenticate with Sitecore
    const response = await axios.post(`${apiUrl}/auth/login`, {
      username,
      password
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      }
    });
    
    if (response.data && response.data.token) {
      authToken = response.data.token;
      // Set token expiry (typically 1 hour)
      tokenExpiry = Date.now() + (3600 * 1000);
      return authToken;
    } else {
      throw new Error('Invalid authentication response from Sitecore');
    }
  } catch (error) {
    console.error('Sitecore authentication error:', error.message);
    throw error;
  }
}

// Helper function to make authenticated API requests
async function makeRequest(method, endpoint, data = null) {
  try {
    const token = await getAuthToken();
    
    const config = {
      method,
      url: `${apiUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'Authorization': `Bearer ${token}`
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Sitecore API error (${method} ${endpoint}):`, error.message);
    throw error;
  }
}

// Create an attraction in Sitecore
exports.createAttraction = async (attraction) => {
  try {
    // Transform attraction to Sitecore format
    const sitecoreData = {
      template: 'attraction',
      name: attraction.name,
      fields: {
        title: attraction.name,
        description: attraction.description,
        shortDescription: attraction.shortDescription,
        category: attraction.category,
        location: JSON.stringify(attraction.location),
        address: JSON.stringify(attraction.address),
        contactInfo: JSON.stringify(attraction.contactInfo),
        images: JSON.stringify(attraction.images),
        hoursOfOperation: JSON.stringify(attraction.hoursOfOperation),
        amenities: JSON.stringify(attraction.amenities),
        featured: attraction.featured ? '1' : '0',
        rating: attraction.rating ? JSON.stringify(attraction.rating) : null,
        price: attraction.price ? JSON.stringify(attraction.price) : null,
        accessibility: JSON.stringify(attraction.accessibility),
        tags: attraction.tags ? attraction.tags.join(',') : '',
        publishedStatus: attraction.publishedStatus
      }
    };
    
    // Create item in Sitecore
    const result = await makeRequest('POST', '/items', sitecoreData);
    
    if (result && result.id) {
      return result.id;
    } else {
      throw new Error('Failed to create attraction in Sitecore');
    }
  } catch (error) {
    console.error('Create attraction in Sitecore error:', error.message);
    throw error;
  }
};

// Update an attraction in Sitecore
exports.updateAttraction = async (attraction) => {
  try {
    if (!attraction.sitecoreId) {
      throw new Error('No Sitecore ID provided for attraction');
    }
    
    // Transform attraction to Sitecore format
    const sitecoreData = {
      fields: {
        title: attraction.name,
        description: attraction.description,
        shortDescription: attraction.shortDescription,
        category: attraction.category,
        location: JSON.stringify(attraction.location),
        address: JSON.stringify(attraction.address),
        contactInfo: JSON.stringify(attraction.contactInfo),
        images: JSON.stringify(attraction.images),
        hoursOfOperation: JSON.stringify(attraction.hoursOfOperation),
        amenities: JSON.stringify(attraction.amenities),
        featured: attraction.featured ? '1' : '0',
        rating: attraction.rating ? JSON.stringify(attraction.rating) : null,
        price: attraction.price ? JSON.stringify(attraction.price) : null,
        accessibility: JSON.stringify(attraction.accessibility),
        tags: attraction.tags ? attraction.tags.join(',') : '',
        publishedStatus: attraction.publishedStatus
      }
    };
    
    // Update item in Sitecore
    const result = await makeRequest('PATCH', `/items/${attraction.sitecoreId}`, sitecoreData);
    
    if (result && result.id) {
      return result.id;
    } else {
      throw new Error('Failed to update attraction in Sitecore');
    }
  } catch (error) {
    console.error('Update attraction in Sitecore error:', error.message);
    throw error;
  }
};

// Delete an attraction from Sitecore
exports.deleteAttraction = async (sitecoreId) => {
  try {
    if (!sitecoreId) {
      throw new Error('No Sitecore ID provided');
    }
    
    // Delete item from Sitecore
    await makeRequest('DELETE', `/items/${sitecoreId}`);
    
    return true;
  } catch (error) {
    console.error('Delete attraction from Sitecore error:', error.message);
    throw error;
  }
};

// Create an event in Sitecore
exports.createEvent = async (event) => {
  try {
    // Transform event to Sitecore format
    const sitecoreData = {
      template: 'event',
      name: event.title,
      fields: {
        title: event.title,
        description: event.description,
        shortDescription: event.shortDescription,
        category: event.category,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        allDay: event.allDay ? '1' : '0',
        startTime: event.startTime,
        endTime: event.endTime,
        recurrence: JSON.stringify(event.recurrence),
        location: JSON.stringify(event.location),
        virtualEventUrl: event.virtualEventUrl,
        organizer: JSON.stringify(event.organizer),
        images: JSON.stringify(event.images),
        ticketInfo: JSON.stringify(event.ticketInfo),
        capacity: event.capacity ? event.capacity.toString() : null,
        accessibility: JSON.stringify(event.accessibility),
        tags: event.tags ? event.tags.join(',') : '',
        featured: event.featured ? '1' : '0',
        publishedStatus: event.publishedStatus
      }
    };
    
    // Create item in Sitecore
    const result = await makeRequest('POST', '/items', sitecoreData);
    
    if (result && result.id) {
      return result.id;
    } else {
      throw new Error('Failed to create event in Sitecore');
    }
  } catch (error) {
    console.error('Create event in Sitecore error:', error.message);
    throw error;
  }
};

// Update an event in Sitecore
exports.updateEvent = async (event) => {
  try {
    if (!event.sitecoreId) {
      throw new Error('No Sitecore ID provided for event');
    }
    
    // Transform event to Sitecore format
    const sitecoreData = {
      fields: {
        title: event.title,
        description: event.description,
        shortDescription: event.shortDescription,
        category: event.category,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        allDay: event.allDay ? '1' : '0',
        startTime: event.startTime,
        endTime: event.endTime,
        recurrence: JSON.stringify(event.recurrence),
        location: JSON.stringify(event.location),
        virtualEventUrl: event.virtualEventUrl,
        organizer: JSON.stringify(event.organizer),
        images: JSON.stringify(event.images),
        ticketInfo: JSON.stringify(event.ticketInfo),
        capacity: event.capacity ? event.capacity.toString() : null,
        accessibility: JSON.stringify(event.accessibility),
        tags: event.tags ? event.tags.join(',') : '',
        featured: event.featured ? '1' : '0',
        publishedStatus: event.publishedStatus
      }
    };
    
    // Update item in Sitecore
    const result = await makeRequest('PATCH', `/items/${event.sitecoreId}`, sitecoreData);
    
    if (result && result.id) {
      return result.id;
    } else {
      throw new Error('Failed to update event in Sitecore');
    }
  } catch (error) {
    console.error('Update event in Sitecore error:', error.message);
    throw error;
  }
};

// Delete an event from Sitecore
exports.deleteEvent = async (sitecoreId) => {
  try {
    if (!sitecoreId) {
      throw new Error('No Sitecore ID provided');
    }
    
    // Delete item from Sitecore
    await makeRequest('DELETE', `/items/${sitecoreId}`);
    
    return true;
  } catch (error) {
    console.error('Delete event from Sitecore error:', error.message);
    throw error;
  }
};

// Get content from Sitecore
exports.getContent = async (path, language = 'en') => {
  try {
    // Get content from Sitecore
    const result = await makeRequest('GET', `/content?path=${path}&language=${language}`);
    
    return result;
  } catch (error) {
    console.error('Get content from Sitecore error:', error.message);
    throw error;
  }
};

// Search content in Sitecore
exports.searchContent = async (query, template = null, limit = 10) => {
  try {
    let endpoint = `/search?query=${encodeURIComponent(query)}&limit=${limit}`;
    
    if (template) {
      endpoint += `&template=${template}`;
    }
    
    // Search content in Sitecore
    const result = await makeRequest('GET', endpoint);
    
    return result;
  } catch (error) {
    console.error('Search content in Sitecore error:', error.message);
    throw error;
  }
};

// Get media item from Sitecore
exports.getMedia = async (mediaId) => {
  try {
    if (!mediaId) {
      throw new Error('No media ID provided');
    }
    
    // Get media from Sitecore
    const result = await makeRequest('GET', `/media/${mediaId}`);
    
    return result;
  } catch (error) {
    console.error('Get media from Sitecore error:', error.message);
    throw error;
  }
};

// Upload media to Sitecore
exports.uploadMedia = async (file, folder = '/media/uploads') => {
  try {
    // This would require multipart/form-data handling
    // For simplicity, we'll assume file is already a URL or base64 string
    
    const mediaData = {
      folder,
      name: file.name,
      data: file.data
    };
    
    // Upload media to Sitecore
    const result = await makeRequest('POST', '/media', mediaData);
    
    if (result && result.id) {
      return result;
    } else {
      throw new Error('Failed to upload media to Sitecore');
    }
  } catch (error) {
    console.error('Upload media to Sitecore error:', error.message);
    throw error;
  }
};

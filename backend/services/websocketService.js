/**
 * WebSocket service for Smart City Application
 * Handles real-time communications
 */
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

// Initialize WebSocket server
exports.initializeWebSocketServer = (wss) => {
  // Store WebSocket server globally for access from other modules
  global.wss = wss;
  
  // Connection handler
  wss.on('connection', async (ws, req) => {
    console.log('WebSocket client connected');
    
    // Extract token from URL query params
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    
    // Authenticate user
    if (token) {
      try {
        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);
        
        // Set user ID on WebSocket connection
        ws.userId = decoded.user.id;
        ws.isAuthenticated = true;
        
        // Update user's last seen time
        await User.findByIdAndUpdate(
          ws.userId,
          { $set: { lastSeen: new Date() } }
        );
        
        // Send welcome message
        ws.send(JSON.stringify({
          type: 'connection',
          message: 'Connected to Smart City WebSocket server',
          authenticated: true
        }));
        
        // Add to active connections
        addActiveConnection(ws);
      } catch (err) {
        console.error('WebSocket authentication error:', err.message);
        
        // Send authentication failed message
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Authentication failed',
          authenticated: false
        }));
      }
    } else {
      // Allow unauthenticated connections for public data
      ws.isAuthenticated = false;
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        message: 'Connected to Smart City WebSocket server (unauthenticated)',
        authenticated: false
      }));
    }
    
    // Message handler
    ws.on('message', async (message) => {
      try {
        // Parse message
        const data = JSON.parse(message);
        
        // Handle different message types
        switch (data.type) {
          case 'ping':
            // Respond to ping
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }));
            break;
            
          case 'subscribe':
            // Subscribe to channels
            handleSubscribe(ws, data);
            break;
            
          case 'unsubscribe':
            // Unsubscribe from channels
            handleUnsubscribe(ws, data);
            break;
            
          case 'transportation_location':
            // Handle transportation location update
            // This requires authentication and driver role
            if (ws.isAuthenticated) {
              handleTransportationLocationUpdate(ws, data);
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Authentication required'
              }));
            }
            break;
            
          default:
            // Unknown message type
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type'
            }));
        }
      } catch (err) {
        console.error('WebSocket message handling error:', err.message);
        
        // Send error message
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    });
    
    // Close handler
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      removeActiveConnection(ws);
    });
    
    // Error handler
    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });
  });
  
  // Set up interval to clean inactive connections
  setInterval(() => {
    wss.clients.forEach(client => {
      // Send ping to check if client is still alive
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    });
  }, 30000); // Every 30 seconds
  
  console.log('WebSocket server initialized');
};

// Active connections map (userId -> WebSocket[])
const activeConnections = new Map();

// Add active connection
function addActiveConnection(ws) {
  if (!ws.userId) return;
  
  // Get existing connections for this user
  const connections = activeConnections.get(ws.userId) || [];
  
  // Add this connection
  connections.push(ws);
  
  // Store updated connections
  activeConnections.set(ws.userId, connections);
}

// Remove active connection
function removeActiveConnection(ws) {
  if (!ws.userId) return;
  
  // Get existing connections for this user
  const connections = activeConnections.get(ws.userId) || [];
  
  // Remove this connection
  const updatedConnections = connections.filter(conn => conn !== ws);
  
  // Update stored connections or remove if empty
  if (updatedConnections.length > 0) {
    activeConnections.set(ws.userId, updatedConnections);
  } else {
    activeConnections.delete(ws.userId);
  }
}

// Handle subscribe message
function handleSubscribe(ws, data) {
  // Store subscriptions on the WebSocket connection
  ws.subscriptions = ws.subscriptions || [];
  
  // Add new subscriptions
  if (data.channels && Array.isArray(data.channels)) {
    data.channels.forEach(channel => {
      if (!ws.subscriptions.includes(channel)) {
        ws.subscriptions.push(channel);
      }
    });
  }
  
  // Confirm subscription
  ws.send(JSON.stringify({
    type: 'subscribed',
    channels: ws.subscriptions
  }));
}

// Handle unsubscribe message
function handleUnsubscribe(ws, data) {
  // Check if user has subscriptions
  if (!ws.subscriptions) {
    return;
  }
  
  // Remove subscriptions
  if (data.channels && Array.isArray(data.channels)) {
    ws.subscriptions = ws.subscriptions.filter(
      channel => !data.channels.includes(channel)
    );
  }
  
  // Confirm unsubscription
  ws.send(JSON.stringify({
    type: 'unsubscribed',
    channels: ws.subscriptions
  }));
}

// Handle transportation location update
async function handleTransportationLocationUpdate(ws, data) {
  try {
    // This would be handled by the appropriate service in a real app
    // For now, we'll just echo back the data
    ws.send(JSON.stringify({
      type: 'transportation_location_update',
      received: data,
      timestamp: Date.now()
    }));
    
    // Broadcast to subscribers
    broadcastToChannel('transportation_updates', {
      type: 'transportation_update',
      data: data.location,
      vehicleId: data.vehicleId,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('Transportation location update error:', err.message);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to process location update'
    }));
  }
}

// Broadcast message to a channel
exports.broadcastToChannel = function(channel, message) {
  const wss = global.wss;
  
  if (!wss) {
    console.error('WebSocket server not initialized');
    return;
  }
  
  wss.clients.forEach(client => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.subscriptions &&
      client.subscriptions.includes(channel)
    ) {
      client.send(JSON.stringify(message));
    }
  });
};

// Send message to specific user
exports.sendToUser = function(userId, message) {
  const connections = activeConnections.get(userId) || [];
  
  connections.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
  
  return connections.length; // Return count of connections message was sent to
};

// Send message to all authenticated users
exports.broadcastToAuthenticated = function(message) {
  const wss = global.wss;
  
  if (!wss) {
    console.error('WebSocket server not initialized');
    return 0;
  }
  
  let count = 0;
  
  wss.clients.forEach(client => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.isAuthenticated
    ) {
      client.send(JSON.stringify(message));
      count++;
    }
  });
  
  return count; // Return count of clients message was sent to
};

// Send message to users with specific role
exports.broadcastToRole = async function(role, message) {
  try {
    // Find all users with the specified role
    const users = await User.find({ roles: role }).select('_id');
    
    // Send message to each user
    let count = 0;
    
    for (const user of users) {
      count += exports.sendToUser(user._id, message);
    }
    
    return count; // Return count of clients message was sent to
  } catch (err) {
    console.error('Broadcast to role error:', err.message);
    return 0;
  }
};

// Check if user is online
exports.isUserOnline = function(userId) {
  const connections = activeConnections.get(userId) || [];
  return connections.length > 0;
};

// Get online user count
exports.getOnlineUserCount = function() {
  return activeConnections.size;
};

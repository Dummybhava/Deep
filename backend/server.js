/**
 * Smart City Application Backend Server
 * Main entry point for the backend server that powers the Smart City mobile app and web portal
 */
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const morgan = require('morgan');
const path = require('path');
const { connectDB } = require('./config/db');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const attractionsRoutes = require('./routes/attractions');
const eventsRoutes = require('./routes/events');
const transportationRoutes = require('./routes/transportation');
const feedbackRoutes = require('./routes/feedback');
const notificationsRoutes = require('./routes/notifications');
const mapsRoutes = require('./routes/maps');
const usersRoutes = require('./routes/users');
const { initializeWebSocketServer } = require('./services/websocketService');
const tourRoutes = require('./routes/tourRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });
initializeWebSocketServer(wss);

// Connect to Database and start server
connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API Routes
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/attractions', attractionsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/transportation', transportationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/maps', mapsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tours', tourRoutes);

// Serve static files if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'build', 'index.html'));
  });
}

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Server Error',
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise rejection:', err);
});

module.exports = { app, server };
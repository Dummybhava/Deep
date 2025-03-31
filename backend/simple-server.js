const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const WebSocket = require('ws');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const PORT = 5000;

// Configure middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/ws-test', express.static(path.join(__dirname, '../frontend/public')));

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection
async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL database');
    
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS transportation (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        current_location JSONB,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database tables created successfully');
    client.release();
  } catch (err) {
    console.error('Database connection error:', err);
  }
}

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Store active WebSocket connections
const activeConnections = new Set();

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');
  activeConnections.add(ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to Smart City WebSocket server',
    timestamp: Date.now()
  }));
  
  // Message handler
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      
      // Echo back the message
      ws.send(JSON.stringify({
        type: 'echo',
        data: data,
        timestamp: Date.now()
      }));
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
          break;
          
        case 'location_update':
          if (data.transportId && data.coordinates) {
            // Update transportation location in database
            try {
              const client = await pool.connect();
              const result = await client.query(
                'UPDATE transportation SET current_location = $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
                [{ lat: data.coordinates.lat, lng: data.coordinates.lng }, data.transportId]
              );
              
              if (result.rows.length > 0) {
                // Broadcast location update to all connected clients
                broadcastMessage({
                  type: 'transportation_update',
                  transport: result.rows[0]
                });
              }
              
              client.release();
            } catch (dbError) {
              console.error('Database error:', dbError);
            }
          }
          break;
          
        case 'chat_message':
          if (data.userId && data.content) {
            // Store message in database
            try {
              const client = await pool.connect();
              const result = await client.query(
                'INSERT INTO messages (user_id, content) VALUES ($1, $2) RETURNING *',
                [data.userId, data.content]
              );
              
              if (result.rows.length > 0) {
                // Broadcast message to all connected clients
                broadcastMessage({
                  type: 'chat_message',
                  message: result.rows[0]
                });
              }
              
              client.release();
            } catch (dbError) {
              console.error('Database error:', dbError);
            }
          }
          break;
      }
      
    } catch (err) {
      console.error('Error handling message:', err);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }));
    }
  });
  
  // Error handler
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    activeConnections.delete(ws);
  });
  
  // Close handler
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    activeConnections.delete(ws);
  });
});

// Broadcast message to all connected clients
function broadcastMessage(message) {
  const messageStr = JSON.stringify(message);
  activeConnections.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// API routes
app.get('/api', (req, res) => {
  res.send('Smart City API is running');
});

// Serve the index.html for the root route
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, '../frontend/public') });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Database status endpoint
app.get('/db-status', async (req, res) => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    res.status(200).json({ status: 'ok', message: 'Database connection is healthy' });
  } catch (err) {
    console.error('Error checking database status:', err);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// User API endpoints
app.post('/api/users', async (req, res) => {
  try {
    const { username, email, password_hash } = req.body;
    
    if (!username || !email || !password_hash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, password_hash]
    );
    
    client.release();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    if (err.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT id, username, email, created_at FROM users ORDER BY created_at DESC'
    );
    
    client.release();
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Transportation API endpoints
app.post('/api/transportation', async (req, res) => {
  try {
    const { type, name, status, current_location } = req.body;
    
    if (!type || !name || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO transportation (type, name, status, current_location) VALUES ($1, $2, $3, $4) RETURNING *',
      [type, name, status, current_location || null]
    );
    
    client.release();
    
    // Notify connected clients about new transportation
    broadcastMessage({
      type: 'new_transportation',
      transport: result.rows[0]
    });
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating transportation:', err);
    res.status(500).json({ error: 'Failed to create transportation' });
  }
});

app.get('/api/transportation', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM transportation ORDER BY last_updated DESC'
    );
    
    client.release();
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching transportation:', err);
    res.status(500).json({ error: 'Failed to fetch transportation' });
  }
});

app.put('/api/transportation/:id/location', async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Missing location coordinates' });
    }
    
    const client = await pool.connect();
    const result = await client.query(
      'UPDATE transportation SET current_location = $1, last_updated = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [{ lat, lng }, id]
    );
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transportation not found' });
    }
    
    // Notify connected clients about location update
    broadcastMessage({
      type: 'transportation_update',
      transport: result.rows[0]
    });
    
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error updating transportation location:', err);
    res.status(500).json({ error: 'Failed to update transportation location' });
  }
});

// WebSocket testing endpoint
app.get('/ws-test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Smart City WebSocket Test</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        #log { height: 300px; overflow-y: scroll; background: #f4f4f4; padding: 10px; border: 1px solid #ddd; margin-bottom: 10px; }
        button { margin-right: 10px; padding: 8px 16px; }
        .panel { margin-top: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 4px; }
        h2 { margin-top: 0; }
        label { display: block; margin-bottom: 5px; }
        input, select { width: 100%; padding: 8px; margin-bottom: 10px; box-sizing: border-box; }
        .btn-group { margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Smart City WebSocket Test</h1>
        <div id="log"></div>
        <div>
          <button id="connect">Connect</button>
          <button id="ping">Send Ping</button>
          <button id="disconnect">Disconnect</button>
        </div>
        
        <div class="panel">
          <h2>Transportation Location Update</h2>
          <div>
            <label for="transportId">Transport ID:</label>
            <input type="number" id="transportId" placeholder="Enter transport ID">
            
            <label for="latitude">Latitude:</label>
            <input type="number" step="0.000001" id="latitude" placeholder="e.g. 37.7749">
            
            <label for="longitude">Longitude:</label>
            <input type="number" step="0.000001" id="longitude" placeholder="e.g. -122.4194">
            
            <div class="btn-group">
              <button id="sendLocation">Send Location Update</button>
            </div>
          </div>
        </div>
        
        <div class="panel">
          <h2>Chat Message</h2>
          <div>
            <label for="userId">User ID:</label>
            <input type="number" id="userId" placeholder="Enter user ID">
            
            <label for="messageContent">Message:</label>
            <input type="text" id="messageContent" placeholder="Type your message here">
            
            <div class="btn-group">
              <button id="sendMessage">Send Message</button>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        const logElement = document.getElementById('log');
        let socket = null;
        
        function log(message) {
          const entry = document.createElement('div');
          entry.textContent = message;
          logElement.appendChild(entry);
          logElement.scrollTop = logElement.scrollHeight;
        }
        
        document.getElementById('connect').addEventListener('click', () => {
          if (socket && socket.readyState !== WebSocket.CLOSED) {
            log('Already connected');
            return;
          }
          
          const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
          const wsUrl = \`\${protocol}//\${window.location.host}/ws\`;
          
          log(\`Connecting to \${wsUrl}...\`);
          socket = new WebSocket(wsUrl);
          
          socket.onopen = () => {
            log('Connection established');
          };
          
          socket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              log(\`Received: \${JSON.stringify(data, null, 2)}\`);
            } catch (err) {
              log(\`Received: \${event.data}\`);
            }
          };
          
          socket.onerror = (error) => {
            log(\`Error: \${error}\`);
          };
          
          socket.onclose = (event) => {
            log(\`Connection closed: \${event.code} \${event.reason}\`);
          };
        });
        
        document.getElementById('ping').addEventListener('click', () => {
          if (!socket || socket.readyState !== WebSocket.OPEN) {
            log('Not connected');
            return;
          }
          
          const message = {
            type: 'ping',
            timestamp: Date.now()
          };
          
          log(\`Sending: \${JSON.stringify(message)}\`);
          socket.send(JSON.stringify(message));
        });
        
        document.getElementById('sendLocation').addEventListener('click', () => {
          if (!socket || socket.readyState !== WebSocket.OPEN) {
            log('Not connected');
            return;
          }
          
          const transportId = document.getElementById('transportId').value;
          const lat = document.getElementById('latitude').value;
          const lng = document.getElementById('longitude').value;
          
          if (!transportId || !lat || !lng) {
            log('Please fill all location update fields');
            return;
          }
          
          const message = {
            type: 'location_update',
            transportId: parseInt(transportId),
            coordinates: {
              lat: parseFloat(lat),
              lng: parseFloat(lng)
            },
            timestamp: Date.now()
          };
          
          log(\`Sending: \${JSON.stringify(message)}\`);
          socket.send(JSON.stringify(message));
        });
        
        document.getElementById('sendMessage').addEventListener('click', () => {
          if (!socket || socket.readyState !== WebSocket.OPEN) {
            log('Not connected');
            return;
          }
          
          const userId = document.getElementById('userId').value;
          const content = document.getElementById('messageContent').value;
          
          if (!userId || !content) {
            log('Please fill all message fields');
            return;
          }
          
          const message = {
            type: 'chat_message',
            userId: parseInt(userId),
            content: content,
            timestamp: Date.now()
          };
          
          log(\`Sending: \${JSON.stringify(message)}\`);
          socket.send(JSON.stringify(message));
        });
        
        document.getElementById('disconnect').addEventListener('click', () => {
          if (!socket || socket.readyState === WebSocket.CLOSED) {
            log('Not connected');
            return;
          }
          
          log('Closing connection...');
          socket.close();
        });
      </script>
    </body>
    </html>
  `);
});

// Start the server
async function startServer() {
  // Test database connection and create tables
  await testDatabaseConnection();
  
  // Start HTTP server
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Simple server running on http://0.0.0.0:${PORT}`);
    console.log(`WebSocket server running at ws://0.0.0.0:${PORT}/ws`);
  });
}

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  testDatabaseConnection(); // <-- Call the function here!
});

startServer().catch(err => {
  console.error('Server startup error:', err);
});
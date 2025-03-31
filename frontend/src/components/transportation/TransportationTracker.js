import React, { useState, useEffect } from 'react';
import { initializeWebSocket, sendMessage } from '../../services/websocket';
import '../../cssStyles/transportation/TransportationTracker.css'

const TransportationTracker = () => {
  const [connected, setConnected] = useState(false);
  const [transportation, setTransportation] = useState([]);
  const [error, setError] = useState(null);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [newLocation, setNewLocation] = useState({ lat: '', lng: '' });
  
  useEffect(() => {
    // Fetch initial transportation data
    fetch('/api/transportation')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch transportation data');
        }
        return response.json();
      })
      .then(data => {
        setTransportation(data);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching transportation:', err);
        setError('Failed to load transportation data');
      });
    
    // Initialize WebSocket connection
    const token = localStorage.getItem('token') || 'anonymous';
    const socket = initializeWebSocket(token, {
      onOpen: () => {
        console.log('WebSocket connected');
        setConnected(true);
        setError(null);
      },
      onClose: () => {
        console.log('WebSocket disconnected');
        setConnected(false);
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
      },
      onMessage: (data) => {
        handleWebSocketMessage(data);
      }
    });
    
    // Cleanup function
    return () => {
      if (socket && socket.close) {
        socket.close();
      }
    };
  }, []);
  
  const handleWebSocketMessage = (data) => {
    // Handle incoming WebSocket messages
    switch (data.type) {
      case 'transportation_update':
        updateTransportationData(data.transport);
        break;
      case 'new_transportation':
        addNewTransportation(data.transport);
        break;
      default:
        // Ignore other message types
        break;
    }
  };
  
  const updateTransportationData = (updatedTransport) => {
    setTransportation(prev => 
      prev.map(item => 
        item.id === updatedTransport.id ? updatedTransport : item
      )
    );
  };
  
  const addNewTransportation = (newTransport) => {
    setTransportation(prev => [...prev, newTransport]);
  };
  
  const handleSelectTransport = (transport) => {
    setSelectedTransport(transport);
    setNewLocation({
      lat: transport.current_location ? transport.current_location.lat : '',
      lng: transport.current_location ? transport.current_location.lng : ''
    });
  };
  
  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setNewLocation(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleLocationUpdate = async () => {
    if (!selectedTransport || !newLocation.lat || !newLocation.lng) {
      setError('Please select a transport and provide valid coordinates');
      return;
    }
    
    try {
      // Send location update via REST API
      const response = await fetch(`/api/transportation/${selectedTransport.id}/location`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newLocation)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update location');
      }
      
      const updatedTransport = await response.json();
      updateTransportationData(updatedTransport);
      
      // Send location update via WebSocket for real-time updates
      sendMessage('location_update', {
        transportId: selectedTransport.id,
        coordinates: {
          lat: parseFloat(newLocation.lat),
          lng: parseFloat(newLocation.lng)
        }
      });
      
      setError(null);
    } catch (err) {
      console.error('Error updating location:', err);
      setError('Failed to update location');
    }
  };
  
  const handleCreateTransport = async () => {
    // Implementation for creating new transportation
    // To be added in future updates
  };
  
  return (
    <div className="transportation-tracker">
      <h2>Transportation Tracker</h2>
      
      <div className="connection-status">
        <span>WebSocket: </span>
        <span className={connected ? 'status-connected' : 'status-disconnected'}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="transportation-list">
        <h3>Available Transportation</h3>
        {transportation.length === 0 ? (
          <p>No transportation available</p>
        ) : (
          <ul>
            {transportation.map(item => (
              <li 
                key={item.id} 
                className={selectedTransport && selectedTransport.id === item.id ? 'selected' : ''}
                onClick={() => handleSelectTransport(item)}
              >
                <strong>{item.name}</strong> ({item.type})
                <div className="transport-status">Status: {item.status}</div>
                {item.current_location && (
                  <div className="transport-location">
                    Location: {item.current_location.lat.toFixed(4)}, {item.current_location.lng.toFixed(4)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {selectedTransport && (
        <div className="location-update-form">
          <h3>Update Location: {selectedTransport.name}</h3>
          <div className="form-group">
            <label htmlFor="lat">Latitude:</label>
            <input
              type="number"
              id="lat"
              name="lat"
              value={newLocation.lat}
              onChange={handleLocationChange}
              step="0.000001"
            />
          </div>
          <div className="form-group">
            <label htmlFor="lng">Longitude:</label>
            <input
              type="number"
              id="lng"
              name="lng"
              value={newLocation.lng}
              onChange={handleLocationChange}
              step="0.000001"
            />
          </div>
          <button onClick={handleLocationUpdate}>Update Location</button>
        </div>
      )}
    </div>
  );
};

export default TransportationTracker;
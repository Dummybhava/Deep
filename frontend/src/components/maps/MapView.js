import React, { useEffect, useRef, useState } from 'react';
import { getMapConfig, getPointsOfInterest } from '../../services/api';
import { initializeMap, addTileLayer, loadPointsOfInterest } from '../../services/map';
import '../../cssStyles/maps/mapview.css'

const MapView = () => {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [mapConfig, setMapConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeLayer, setActiveLayer] = useState('default');
  
  // Initialize map on component mount
  useEffect(() => {
    const setupMap = async () => {
      try {
        setLoading(true);
        
        // Fetch map configuration
        const config = await getMapConfig();
        setMapConfig(config);
        
        // Initialize map instance
        const mapInstance = await initializeMap('mapContainer', {
          center: config.defaultCenter || [39.6365, -79.9545], // Default to Morgantown, WV
          zoom: config.defaultZoom || 15,
          maxZoom: config.maxZoom || 19,
          minZoom: config.minZoom || 12
        });
        
        // Add default tile layer
        addTileLayer(mapInstance, activeLayer);
        
        // Set map instance
        setMap(mapInstance);
        
        // Load points of interest within initial viewport
        const bounds = mapInstance.getBounds();
        await loadPointsOfInterest(mapInstance, bounds);
        
        setLoading(false);
      } catch (err) {
        console.error('Error setting up map:', err);
        setError('Failed to load map. Please try again.');
        setLoading(false);
      }
    };
    
    setupMap();
    
    // Cleanup function
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);
  
  // Handle layer change
  const handleLayerChange = (layerId) => {
    if (map && layerId !== activeLayer) {
      // Remove current tile layer
      map.eachLayer(layer => {
        if (layer.options && layer.options.id !== 'base') {
          map.removeLayer(layer);
        }
      });
      
      // Add new tile layer
      addTileLayer(map, layerId);
      
      // Update active layer state
      setActiveLayer(layerId);
    }
  };
  
  // Render loading state
  if (loading && !map) {
    return (
      <div className="map-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading map...</span>
        </div>
        <p>Loading map...</p>
      </div>
    );
  }
  
  // Render error state
  if (error && !map) {
    return (
      <div className="alert alert-danger">
        <i className="fas fa-exclamation-circle me-2"></i>
        {error}
        <button 
          className="btn btn-outline-danger btn-sm ms-3"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="map-container">
      <div className="map-header">
        <h1>
          <i className="fas fa-map-marked-alt me-2"></i>
          City Map
        </h1>
        <p className="lead">Explore Smart City with interactive maps</p>
      </div>
      
      {/* Map Controls */}
      <div className="map-controls">
        <div className="layer-controls">
          <label>Map Layers:</label>
          <div className="btn-group" role="group">
            <button 
              type="button" 
              className={`btn btn-sm ${activeLayer === 'default' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleLayerChange('default')}
            >
              Default
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${activeLayer === 'satellite' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleLayerChange('satellite')}
            >
              Satellite
            </button>
            <button 
              type="button" 
              className={`btn btn-sm ${activeLayer === 'terrain' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleLayerChange('terrain')}
            >
              Terrain
            </button>
          </div>
        </div>
        
        <div className="map-legend">
          <button className="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#mapLegend">
            <i className="fas fa-info-circle me-1"></i> Legend
          </button>
          <div className="collapse" id="mapLegend">
            <div className="card card-body legend-card">
              <h5>Map Symbols</h5>
              <ul className="legend-list">
                <li><i className="fas fa-building text-primary"></i> Attractions</li>
                <li><i className="fas fa-utensils text-success"></i> Dining</li>
                <li><i className="fas fa-shopping-bag text-danger"></i> Shopping</li>
                <li><i className="fas fa-subway text-warning"></i> Transportation</li>
                <li><i className="fas fa-calendar-alt text-info"></i> Events</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Map */}
      <div id="mapContainer" ref={mapContainerRef} className="map-view"></div>
      
      {/* Offline Maps Notice */}
      <div className="offline-maps-notice">
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Offline Maps</h5>
            <p className="card-text">Download maps for offline use when you're on the go.</p>
            <button className="btn btn-primary">Download Maps</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
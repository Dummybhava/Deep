import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getPRTData, getTransportationRoutesByType, getEstimatedArrivalTime } from '../../services/api';
import { formatTime, formatRelativeTime } from '../../utils/helpers';
import { addEventHandler } from '../../services/websocket';
import L from 'leaflet';
import '../../cssStyles/transportation/PRTTracking.css'

const PRTTracking = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prtData, setPrtData] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState(null);
  const [arrivals, setArrivals] = useState({});

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const vehicleMarkersRef = useRef({});
  const routeLayersRef = useRef({});

  // Fetch PRT data on component mount
  useEffect(() => {
    const fetchPRTData = async () => {
      try {
        setLoading(true);
        
        // Get PRT data
        const data = await getPRTData();
        setPrtData(data);
        
        // Get PRT routes
        const routesData = await getTransportationRoutesByType('prt');
        setRoutes(routesData);
        
        // Set first route as selected by default if available
        if (routesData && routesData.length > 0) {
          setSelectedRoute(routesData[0]);
        }
      } catch (err) {
        console.error('Error fetching PRT data:', err);
        setError('Failed to load PRT data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPRTData();
    
    // Set up refresh interval
    const intervalId = setInterval(() => {
      fetchPRTData();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  // Initialize map once data is loaded
  useEffect(() => {
    if (!prtData || !mapRef.current || !routes.length) return;
    
    // Initialize map if it doesn't exist
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [40.7128, -74.006], // Default center - will be adjusted based on routes
        zoom: 14,
        zoomControl: false,
        attributionControl: true
      });
      
      // Add zoom control to bottom right
      L.control.zoom({
        position: 'bottomright'
      }).addTo(mapInstanceRef.current);
      
      // Add scale control
      L.control.scale({
        imperial: false,
        position: 'bottomleft'
      }).addTo(mapInstanceRef.current);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
    }
    
    // Draw routes on map
    drawRoutesOnMap();
    
    // Draw vehicles on map
    updateVehiclesOnMap();
    
    // Center map on route bounds if a route is selected
    if (selectedRoute) {
      centerMapOnRoute(selectedRoute);
    }
    // Otherwise center on all routes
    else if (routes.length > 0) {
      const bounds = getBoundsFromRoutes(routes);
      if (bounds) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
    
  }, [prtData, routes, selectedRoute]);

  // Set up WebSocket for real-time updates
  useEffect(() => {
    // Subscribe to PRT updates
    const unsubscribe = addEventHandler('transportation_update', handleTransportationUpdate);
    
    // Cleanup on unmount
    return unsubscribe;
  }, []);

  // Handle real-time transportation updates
  const handleTransportationUpdate = (data) => {
    if (!data || data.type !== 'prt') return;
    
    // Update PRT data with new vehicle positions
    setPrtData(prevData => {
      if (!prevData) return data.data;
      
      // Merge the new data with existing data
      return {
        ...prevData,
        vehicles: data.data.vehicles || prevData.vehicles,
        lastUpdated: new Date()
      };
    });
    
    // Update vehicle markers on map
    if (mapInstanceRef.current && data.data.vehicles) {
      updateVehicleMarkers(data.data.vehicles);
    }
  };

  // Handle route selection
  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    setSelectedStop(null);
    setEstimatedArrival(null);
    
    // Center map on selected route
    if (mapInstanceRef.current) {
      centerMapOnRoute(route);
    }
    
    // Highlight selected route on map
    highlightRouteOnMap(route._id);
  };

  // Handle stop selection
  const handleStopSelect = async (stop) => {
    setSelectedStop(stop);
    
    // Get estimated arrival time for selected stop
    if (selectedRoute) {
      try {
        const eta = await getEstimatedArrivalTime(selectedRoute._id, stop._id);
        setEstimatedArrival(eta);
      } catch (err) {
        console.error('Error fetching estimated arrival time:', err);
        setEstimatedArrival(null);
      }
    }
    
    // Pan map to selected stop
    if (mapInstanceRef.current) {
      const stopLatLng = L.latLng(stop.location.coordinates[1], stop.location.coordinates[0]);
      mapInstanceRef.current.panTo(stopLatLng);
      
      // Create popup for stop
      L.popup()
        .setLatLng(stopLatLng)
        .setContent(`<h5>${stop.name}</h5><p>Stop Code: ${stop.code}</p>`)
        .openOn(mapInstanceRef.current);
    }
  };

  // Draw routes on map
  const drawRoutesOnMap = () => {
    if (!mapInstanceRef.current || !routes.length) return;
    
    // Clear existing route layers
    Object.values(routeLayersRef.current).forEach(layer => {
      mapInstanceRef.current.removeLayer(layer);
    });
    routeLayersRef.current = {};
    
    // Draw each route
    routes.forEach(route => {
      if (!route.path || !route.path.coordinates) return;
      
      const routeCoordinates = route.path.coordinates.map(coord => [coord[1], coord[0]]);
      
      const routeLayer = L.polyline(routeCoordinates, {
        color: route.color || '#3388ff',
        weight: 5,
        opacity: 0.7
      }).addTo(mapInstanceRef.current);
      
      routeLayersRef.current[route._id] = routeLayer;
      
      // Add stops markers
      if (route.stops && route.stops.length > 0) {
        route.stops.forEach(stop => {
          if (!stop.location || !stop.location.coordinates) return;
          
          const stopLatLng = [stop.location.coordinates[1], stop.location.coordinates[0]];
          
          const stopMarker = L.marker(stopLatLng, {
            icon: L.divIcon({
              className: 'prt-stop-marker',
              html: `<div class="stop-marker" style="border-color: ${route.color || '#3388ff'}"></div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7]
            })
          }).addTo(mapInstanceRef.current);
          
          // Add click handler to stop marker
          stopMarker.on('click', () => {
            handleStopSelect(stop);
          });
          
          // Add popup
          stopMarker.bindPopup(`<h5>${stop.name}</h5><p>Stop Code: ${stop.code}</p>`);
        });
      }
    });
  };

  // Update vehicle markers on map
  const updateVehiclesOnMap = () => {
    if (!mapInstanceRef.current || !prtData || !prtData.vehicles) return;
    
    updateVehicleMarkers(prtData.vehicles);
  };

  // Update vehicle markers with new positions
  const updateVehicleMarkers = (vehicles) => {
    if (!mapInstanceRef.current) return;
    
    // Track current vehicle IDs to remove stale markers
    const currentVehicleIds = new Set();
    
    // Update or create markers for each vehicle
    vehicles.forEach(vehicle => {
      const vehicleId = vehicle._id;
      currentVehicleIds.add(vehicleId);
      
      if (!vehicle.location || !vehicle.location.coordinates) return;
      
      const vehicleLatLng = [vehicle.location.coordinates[1], vehicle.location.coordinates[0]];
      const heading = vehicle.location.heading || 0;
      
      // If marker already exists, update its position
      if (vehicleMarkersRef.current[vehicleId]) {
        const marker = vehicleMarkersRef.current[vehicleId];
        marker.setLatLng(vehicleLatLng);
        
        // Update marker rotation based on heading
        const icon = marker.getElement();
        if (icon) {
          icon.style.transform = `${icon.style.transform.replace(/rotate\([^)]+\)/, '')} rotate(${heading}deg)`;
        }
      } 
      // Otherwise create a new marker
      else {
        // Get route color for vehicle
        let routeColor = '#3388ff';
        if (vehicle.route) {
          const route = routes.find(r => r._id === vehicle.route);
          if (route) {
            routeColor = route.color || '#3388ff';
          }
        }
        
        const marker = L.marker(vehicleLatLng, {
          icon: L.divIcon({
            className: 'prt-vehicle-marker',
            html: `<div class="vehicle-marker" style="background-color: ${routeColor}">
                    <i class="fas fa-train"></i>
                   </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        }).addTo(mapInstanceRef.current);
        
        // Add rotation based on heading
        const icon = marker.getElement();
        if (icon) {
          icon.style.transform = `${icon.style.transform} rotate(${heading}deg)`;
        }
        
        // Add popup
        marker.bindPopup(`
          <h5>${vehicle.name}</h5>
          <p>Status: ${vehicle.status}</p>
          <p>Speed: ${vehicle.location.speed || 0} km/h</p>
          <p>Capacity: ${vehicle.occupancy || 0}/${vehicle.capacity || 1}</p>
        `);
        
        vehicleMarkersRef.current[vehicleId] = marker;
      }
    });
    
    // Remove stale markers
    Object.keys(vehicleMarkersRef.current).forEach(id => {
      if (!currentVehicleIds.has(id)) {
        mapInstanceRef.current.removeLayer(vehicleMarkersRef.current[id]);
        delete vehicleMarkersRef.current[id];
      }
    });
  };

  // Calculate bounds from an array of routes
  const getBoundsFromRoutes = (routes) => {
    let allCoordinates = [];
    
    routes.forEach(route => {
      if (route.path && route.path.coordinates && route.path.coordinates.length > 0) {
        allCoordinates = [
          ...allCoordinates,
          ...route.path.coordinates.map(coord => [coord[1], coord[0]])
        ];
      }
      
      if (route.stops && route.stops.length > 0) {
        route.stops.forEach(stop => {
          if (stop.location && stop.location.coordinates) {
            allCoordinates.push([
              stop.location.coordinates[1],
              stop.location.coordinates[0]
            ]);
          }
        });
      }
    });
    
    if (allCoordinates.length === 0) return null;
    
    return L.latLngBounds(allCoordinates);
  };

  // Center map on selected route
  const centerMapOnRoute = (route) => {
    if (!mapInstanceRef.current || !route || !route.path) return;
    
    // Calculate bounds from route path
    const routeCoordinates = route.path.coordinates.map(coord => [coord[1], coord[0]]);
    const bounds = L.latLngBounds(routeCoordinates);
    
    // Fit map to bounds
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  // Highlight selected route on map
  const highlightRouteOnMap = (routeId) => {
    if (!mapInstanceRef.current || !routeLayersRef.current) return;
    
    // Reset all routes to normal style
    Object.entries(routeLayersRef.current).forEach(([id, layer]) => {
      layer.setStyle({
        weight: 5,
        opacity: 0.7
      });
    });
    
    // Highlight selected route
    if (routeId && routeLayersRef.current[routeId]) {
      routeLayersRef.current[routeId].setStyle({
        weight: 8,
        opacity: 1
      });
      
      // Bring to front
      routeLayersRef.current[routeId].bringToFront();
    }
  };

  // Get active vehicles count
  const getActiveVehiclesCount = () => {
    if (!prtData || !prtData.vehicles) return 0;
    
    return prtData.vehicles.filter(v => v.status === 'active').length;
  };

  // Render loading state
  if (loading && !prtData) {
    return (
      <div className="prt-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading PRT data...</p>
      </div>
    );
  }

  return (
    <div className="prt-tracking-container">
      <div className="prt-header">
        <h1>
          <i className="fas fa-train me-2"></i>
          PRT Tracking
        </h1>
        <p className="lead">Track Personal Rapid Transit vehicles in real-time</p>
      </div>
      
      {error && (
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
      )}
      
      <div className="prt-content">
        <div className="row">
          <div className="col-md-4">
            <div className="prt-sidebar">
              {/* PRT Status */}
              <div className="card mb-3">
                <div className="card-body">
                  <h3 className="card-title">PRT Status</h3>
                  <div className="status-container">
                    <div className="status-item">
                      <div className="status-label">System Status</div>
                      <div className={`status-value ${getActiveVehiclesCount() > 0 ? 'text-success' : 'text-danger'}`}>
                        <i className={`fas fa-${getActiveVehiclesCount() > 0 ? 'check-circle' : 'exclamation-circle'} me-2`}></i>
                        {getActiveVehiclesCount() > 0 ? 'Operational' : 'Unavailable'}
                      </div>
                    </div>
                    
                    <div className="status-item">
                      <div className="status-label">Active Vehicles</div>
                      <div className="status-value">
                        {getActiveVehiclesCount()} / {prtData?.vehicles?.length || 0}
                      </div>
                    </div>
                    
                    {prtData?.lastUpdated && (
                      <div className="status-item">
                        <div className="status-label">Last Updated</div>
                        <div className="status-value">
                          {formatRelativeTime(new Date(prtData.lastUpdated))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Routes Selector */}
              <div className="card mb-3">
                <div className="card-body">
                  <h3 className="card-title">PRT Routes</h3>
                  <div className="routes-selector">
                    {routes.length > 0 ? (
                      <div className="list-group">
                        <button
                          className={`list-group-item list-group-item-action ${!selectedRoute ? 'active' : ''}`}
                          onClick={() => handleRouteSelect(null)}
                        >
                          <i className="fas fa-globe me-2"></i> All Routes
                        </button>
                        
                        {routes.map(route => (
                          <button
                            key={route._id}
                            className={`list-group-item list-group-item-action ${selectedRoute?._id === route._id ? 'active' : ''}`}
                            onClick={() => handleRouteSelect(route)}
                          >
                            <span className="route-color-indicator" style={{ backgroundColor: route.color }}></span>
                            {route.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="alert alert-info">
                        <i className="fas fa-info-circle me-2"></i>
                        No PRT routes available.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Stops for Selected Route */}
              {selectedRoute && (
                <div className="card mb-3">
                  <div className="card-body">
                    <h3 className="card-title">Stops</h3>
                    <div className="stops-list">
                      {selectedRoute.stops && selectedRoute.stops.length > 0 ? (
                        <div className="list-group">
                          {selectedRoute.stops.map(stop => (
                            <button
                              key={stop._id}
                              className={`list-group-item list-group-item-action ${selectedStop?._id === stop._id ? 'active' : ''}`}
                              onClick={() => handleStopSelect(stop)}
                            >
                              <div className="d-flex w-100 justify-content-between">
                                <h5 className="mb-1">{stop.name}</h5>
                                <small>{stop.code}</small>
                              </div>
                              
                              {arrivals[stop._id] && (
                                <div className="stop-arrivals">
                                  <small>Next arrival: {arrivals[stop._id].minutes} min</small>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="alert alert-info">
                          <i className="fas fa-info-circle me-2"></i>
                          No stops available for this route.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Estimated Arrival */}
              {selectedStop && estimatedArrival && (
                <div className="card">
                  <div className="card-body">
                    <h3 className="card-title">Estimated Arrival</h3>
                    <div className="arrival-info">
                      <div className="arrival-stop">
                        <i className="fas fa-map-marker-alt me-2"></i>
                        {selectedStop.name}
                      </div>
                      
                      <div className="arrival-time">
                        <div className="time-value">
                          {estimatedArrival.estimatedArrival?.minutes || 'N/A'} min
                        </div>
                        <div className="time-details">
                          {estimatedArrival.estimatedArrival?.time && (
                            <span>Arrives at {formatTime(new Date(estimatedArrival.estimatedArrival.time))}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="col-md-8">
            {/* Map Container */}
            <div className="map-container card">
              <div className="card-body p-0">
                <div id="prt-map" ref={mapRef} className="prt-map"></div>
                
                <div className="map-overlay">
                  <div className="map-legend">
                    <div className="legend-item">
                      <div className="legend-icon vehicle-icon">
                        <i className="fas fa-train"></i>
                      </div>
                      <div className="legend-label">Vehicle</div>
                    </div>
                    <div className="legend-item">
                      <div className="legend-icon stop-icon"></div>
                      <div className="legend-label">Stop</div>
                    </div>
                    {selectedRoute && (
                      <div className="legend-item">
                        <div className="legend-line" style={{ backgroundColor: selectedRoute.color }}></div>
                        <div className="legend-label">{selectedRoute.name}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {loading && (
                  <div className="map-loading-overlay">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading map...</span>
                    </div>
                    <p>Loading map data...</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Vehicle List */}
            <div className="card mt-3">
              <div className="card-body">
                <h3 className="card-title">Active Vehicles</h3>
                <div className="vehicle-list">
                  {prtData?.vehicles && prtData.vehicles.filter(v => v.status === 'active').length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Vehicle</th>
                            <th>Route</th>
                            <th>Status</th>
                            <th>Speed</th>
                            <th>Occupancy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prtData.vehicles
                            .filter(vehicle => vehicle.status === 'active')
                            .map(vehicle => {
                              // Find route name
                              let routeName = 'Unknown';
                              if (vehicle.route) {
                                const route = routes.find(r => r._id === vehicle.route);
                                if (route) {
                                  routeName = route.name;
                                }
                              }
                              
                              return (
                                <tr key={vehicle._id}>
                                  <td>{vehicle.name}</td>
                                  <td>{routeName}</td>
                                  <td>
                                    <span className="badge bg-success">Active</span>
                                  </td>
                                  <td>{vehicle.location?.speed || 0} km/h</td>
                                  <td>{vehicle.occupancy || 0}/{vehicle.capacity || 1}</td>
                                </tr>
                              );
                            })
                          }
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle me-2"></i>
                      No active vehicles at this time.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PRTTracking;

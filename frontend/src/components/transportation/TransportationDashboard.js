import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  getAllTransportation,
  getPRTData,
  getBusRoutes,
  getCourtesyCars
} from '../../services/api';
import { formatDate, formatTime } from '../../utils/helpers';
import { addEventHandler } from '../../services/websocket';
import TransportationTracker from './TransportationTracker';
import '../../cssStyles/transportation/TransportationDashboard.css'

const TransportationDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transportationData, setTransportationData] = useState({
    prt: null,
    bus: null,
    courtesy: null,
    shuttle: null
  });
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch transportation data on component mount
  useEffect(() => {
    const fetchTransportationData = async () => {
      try {
        setLoading(true);
        
        // Get all transportation options first to get a quick overview
        const allTransportation = await getAllTransportation();
        
        // Then fetch details for each type
        const prtData = await getPRTData();
        const busData = await getBusRoutes();
        const courtesyData = await getCourtesyCars();
        
        // Set complete data
        setTransportationData({
          prt: prtData,
          bus: busData,
          courtesy: courtesyData,
          shuttle: courtesyData // Shuttle data is included in the courtesy API response
        });
      } catch (err) {
        console.error('Error fetching transportation data:', err);
        setError('Failed to load transportation data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransportationData();
  }, []);

  // Set up real-time updates via WebSocket
  useEffect(() => {
    // Subscribe to transportation updates
    const unsubscribe = addEventHandler('transportation_update', handleTransportationUpdate);
    
    // Cleanup on unmount
    return unsubscribe;
  }, []);

  // Handle real-time transportation updates
  const handleTransportationUpdate = (data) => {
    if (!data || !data.type) return;
    
    // Update the relevant part of the transportation data
    setTransportationData(prev => ({
      ...prev,
      [data.type]: {
        ...prev[data.type],
        ...data.data,
        lastUpdated: new Date()
      }
    }));
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Calculate PRT status
  const getPRTStatus = () => {
    if (!transportationData.prt) return { status: 'unknown', message: 'Status unknown' };
    
    const vehicles = transportationData.prt.vehicles || [];
    const activeVehicles = vehicles.filter(v => v.status === 'active');
    
    if (activeVehicles.length === 0) {
      return { status: 'unavailable', message: 'No active vehicles' };
    }
    
    return { 
      status: 'operational', 
      message: `${activeVehicles.length} active vehicle${activeVehicles.length !== 1 ? 's' : ''}` 
    };
  };

  // Calculate bus status
  const getBusStatus = () => {
    if (!transportationData.bus) return { status: 'unknown', message: 'Status unknown' };
    
    const vehicles = transportationData.bus.vehicles || [];
    const activeVehicles = vehicles.filter(v => v.status === 'active');
    
    if (activeVehicles.length === 0) {
      return { status: 'unavailable', message: 'No active vehicles' };
    }
    
    return { 
      status: 'operational', 
      message: `${activeVehicles.length} active vehicle${activeVehicles.length !== 1 ? 's' : ''}` 
    };
  };

  // Calculate courtesy car status
  const getCourtesyStatus = () => {
    if (!transportationData.courtesy) return { status: 'unknown', message: 'Status unknown' };
    
    const vehicles = transportationData.courtesy.vehicles || [];
    const availableVehicles = vehicles.filter(v => v.status === 'active' && !v.driver);
    
    return { 
      status: availableVehicles.length > 0 ? 'available' : 'busy', 
      message: `${availableVehicles.length} available car${availableVehicles.length !== 1 ? 's' : ''}` 
    };
  };

  // Format a transportation status for display
  const formatStatus = (statusObj) => {
    if (!statusObj) return { color: 'secondary', text: 'Unknown' };
    
    switch (statusObj.status) {
      case 'operational':
        return { color: 'success', text: 'Operational' };
      case 'available':
        return { color: 'success', text: 'Available' };
      case 'busy':
        return { color: 'warning', text: 'Busy' };
      case 'unavailable':
        return { color: 'danger', text: 'Unavailable' };
      case 'disrupted':
        return { color: 'warning', text: 'Disrupted' };
      case 'maintenance':
        return { color: 'warning', text: 'Maintenance' };
      default:
        return { color: 'secondary', text: 'Unknown' };
    }
  };

  // Render loading state
  if (loading && !transportationData.prt && !transportationData.bus && !transportationData.courtesy) {
    return (
      <div className="transportation-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading transportation data...</p>
      </div>
    );
  }

  // Get formatted status for each transportation type
  const prtStatus = formatStatus(getPRTStatus());
  const busStatus = formatStatus(getBusStatus());
  const courtesyStatus = formatStatus(getCourtesyStatus());

  return (
    <div className="transportation-dashboard-container">
      <div className="transportation-header">
        <h1>
          <i className="fas fa-subway me-2"></i>
          Transportation
        </h1>
        <p className="lead">Access Smart City transportation options</p>
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
      
      {/* Transportation Overview */}
      <div className="transportation-overview">
        <div className="row row-cols-1 row-cols-md-3 g-4">
          {/* PRT Card */}
          <div className="col">
            <div className="card h-100">
              <div className="card-body">
                <div className="transportation-icon">
                  <i className="fas fa-train"></i>
                </div>
                <h3 className="card-title">Personal Rapid Transit</h3>
                <div className={`transportation-status status-${prtStatus.color}`}>
                  <i className={`fas fa-${prtStatus.color === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
                  <span className="status-text">{prtStatus.text}</span>
                </div>
                <p className="status-message">
                  {getPRTStatus().message}
                </p>
                <Link to="/transportation/prt" className="btn btn-primary">
                  View PRT Details
                </Link>
              </div>
            </div>
          </div>
          
          {/* Bus Card */}
          <div className="col">
            <div className="card h-100">
              <div className="card-body">
                <div className="transportation-icon">
                  <i className="fas fa-bus"></i>
                </div>
                <h3 className="card-title">Public Bus</h3>
                <div className={`transportation-status status-${busStatus.color}`}>
                  <i className={`fas fa-${busStatus.color === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
                  <span className="status-text">{busStatus.text}</span>
                </div>
                <p className="status-message">
                  {getBusStatus().message}
                </p>
                <Link to="/transportation/bus" className="btn btn-primary">
                  View Bus Routes
                </Link>
              </div>
            </div>
          </div>
          
          {/* Courtesy Car Card */}
          <div className="col">
            <div className="card h-100">
              <div className="card-body">
                <div className="transportation-icon">
                  <i className="fas fa-car"></i>
                </div>
                <h3 className="card-title">Courtesy Cars</h3>
                <div className={`transportation-status status-${courtesyStatus.color}`}>
                  <i className={`fas fa-${courtesyStatus.color === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
                  <span className="status-text">{courtesyStatus.text}</span>
                </div>
                <p className="status-message">
                  {getCourtesyStatus().message}
                </p>
                <Link to="/transportation/courtesy" className="btn btn-primary">
                  Request a Ride
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="transportation-tabs mt-4">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => handleTabChange('overview')}
            >
              <i className="fas fa-home me-2"></i>
              Overview
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'routes' ? 'active' : ''}`}
              onClick={() => handleTabChange('routes')}
            >
              <i className="fas fa-route me-2"></i>
              Routes
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => handleTabChange('schedule')}
            >
              <i className="fas fa-clock me-2"></i>
              Schedule
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'maps' ? 'active' : ''}`}
              onClick={() => handleTabChange('maps')}
            >
              <i className="fas fa-map-marked-alt me-2"></i>
              Maps
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'tracker' ? 'active' : ''}`}
              onClick={() => handleTabChange('tracker')}
            >
              <i className="fas fa-location-arrow me-2"></i>
              Tracker
            </button>
          </li>
        </ul>
      </div>
      
      {/* Tab Content */}
      <div className="transportation-tab-content mt-3">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="tab-pane active">
            <div className="card">
              <div className="card-body">
                <h3>Transportation Overview</h3>
                
                <div className="transportation-summary">
                  <p>
                    Smart City offers multiple transportation options to help you get around efficiently. 
                    Use this dashboard to check status, routes, schedules and request rides.
                  </p>
                  
                  <h4 className="mt-4">Quick Actions</h4>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="quick-action-card">
                        <div className="icon"><i className="fas fa-map-marker-alt"></i></div>
                        <h5>Find Nearest Stop</h5>
                        <Link to="/map?layer=transit" className="btn btn-sm btn-outline-primary">
                          Open Map
                        </Link>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="quick-action-card">
                        <div className="icon"><i className="fas fa-directions"></i></div>
                        <h5>Get Directions</h5>
                        <Link to="/map?mode=directions" className="btn btn-sm btn-outline-primary">
                          Plan Route
                        </Link>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="quick-action-card">
                        <div className="icon"><i className="fas fa-car"></i></div>
                        <h5>Request Courtesy Car</h5>
                        <Link to="/transportation/courtesy" className="btn btn-sm btn-outline-primary">
                          Request Ride
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Routes Tab */}
        {activeTab === 'routes' && (
          <div className="tab-pane active">
            <div className="card">
              <div className="card-body">
                <h3>Transportation Routes</h3>
                
                <div className="transportation-routes">
                  <div className="filter-controls mb-3">
                    <select className="form-select form-select-sm" defaultValue="all">
                      <option value="all">All Routes</option>
                      <option value="prt">PRT Only</option>
                      <option value="bus">Bus Only</option>
                      <option value="shuttle">Shuttle Only</option>
                    </select>
                  </div>
                  
                  <div className="routes-list">
                    {/* Show routes from the fetched data */}
                    {!loading && transportationData.prt && transportationData.prt.routes && (
                      <div className="route-category">
                        <h4>PRT Routes</h4>
                        <div className="list-group">
                          {transportationData.prt.routes.map(route => (
                            <div key={route._id} className="list-group-item list-group-item-action">
                              <div className="d-flex w-100 justify-content-between">
                                <h5 className="mb-1">
                                  <span className="route-line" style={{ backgroundColor: route.color }}></span>
                                  {route.name}
                                </h5>
                                <small>{route.stops ? route.stops.length : 0} stops</small>
                              </div>
                              <p className="mb-1">{route.description}</p>
                              <div className="d-flex">
                                <Link to={`/map?route=${route._id}`} className="btn btn-sm btn-outline-primary me-2">
                                  <i className="fas fa-map-marked-alt me-1"></i> Show on Map
                                </Link>
                                <button className="btn btn-sm btn-outline-secondary">
                                  <i className="fas fa-info-circle me-1"></i> Details
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {!loading && transportationData.bus && transportationData.bus.routes && (
                      <div className="route-category mt-4">
                        <h4>Bus Routes</h4>
                        <div className="list-group">
                          {transportationData.bus.routes.map(route => (
                            <div key={route._id} className="list-group-item list-group-item-action">
                              <div className="d-flex w-100 justify-content-between">
                                <h5 className="mb-1">
                                  <span className="route-line" style={{ backgroundColor: route.color }}></span>
                                  {route.name}
                                </h5>
                                <small>{route.stops ? route.stops.length : 0} stops</small>
                              </div>
                              <p className="mb-1">{route.description}</p>
                              <div className="d-flex">
                                <Link to={`/map?route=${route._id}`} className="btn btn-sm btn-outline-primary me-2">
                                  <i className="fas fa-map-marked-alt me-1"></i> Show on Map
                                </Link>
                                <button className="btn btn-sm btn-outline-secondary">
                                  <i className="fas fa-info-circle me-1"></i> Details
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {loading && (
                      <div className="text-center p-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading routes...</span>
                        </div>
                        <p className="mt-2">Loading routes data...</p>
                      </div>
                    )}
                    
                    {!loading && (!transportationData.prt?.routes?.length && !transportationData.bus?.routes?.length) && (
                      <div className="alert alert-info">
                        <i className="fas fa-info-circle me-2"></i>
                        No routes available at this time.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="tab-pane active">
            <div className="card">
              <div className="card-body">
                <h3>Transportation Schedule</h3>
                
                <div className="schedule-filters row mb-3">
                  <div className="col-md-4">
                    <select className="form-select" defaultValue="today">
                      <option value="today">Today</option>
                      <option value="tomorrow">Tomorrow</option>
                      <option value="week">This Week</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <select className="form-select" defaultValue="all">
                      <option value="all">All Types</option>
                      <option value="prt">PRT</option>
                      <option value="bus">Bus</option>
                      <option value="shuttle">Shuttle</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Search route or stop..."
                    />
                  </div>
                </div>
                
                <div className="schedule-table-container">
                  <table className="table table-striped table-hover schedule-table">
                    <thead>
                      <tr>
                        <th>Route</th>
                        <th>Type</th>
                        <th>Start Time</th>
                        <th>End Time</th>
                        <th>Frequency</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Combine routes from all transportation types */}
                      {!loading && [
                        ...(transportationData.prt?.routes || []).map(route => ({ ...route, type: 'prt' })),
                        ...(transportationData.bus?.routes || []).map(route => ({ ...route, type: 'bus' })),
                        ...(transportationData.courtesy?.routes || []).filter(r => r.type === 'shuttle').map(route => ({ ...route, type: 'shuttle' }))
                      ].map((route, index) => {
                        // Get today's schedule
                        const today = new Date();
                        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][today.getDay()];
                        const todaySchedule = route.schedule?.find(s => s.day === dayOfWeek);
                        
                        return (
                          <tr key={route._id || index}>
                            <td>
                              <span className="route-indicator" style={{ backgroundColor: route.color }}></span>
                              {route.name}
                            </td>
                            <td>
                              <span className={`badge bg-${getTransportTypeBadge(route.type)}`}>
                                {getTransportTypeLabel(route.type)}
                              </span>
                            </td>
                            <td>{todaySchedule?.startTime || 'N/A'}</td>
                            <td>{todaySchedule?.endTime || 'N/A'}</td>
                            <td>
                              {todaySchedule?.frequency ? `Every ${todaySchedule.frequency} min` : 'N/A'}
                            </td>
                            <td>
                              <span className={`badge bg-${route.active ? 'success' : 'danger'}`}>
                                {route.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      
                      {loading && (
                        <tr>
                          <td colSpan="6" className="text-center">
                            <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                              <span className="visually-hidden">Loading...</span>
                            </div>
                            Loading schedule data...
                          </td>
                        </tr>
                      )}
                      
                      {!loading && ![
                        ...(transportationData.prt?.routes || []),
                        ...(transportationData.bus?.routes || []),
                        ...(transportationData.courtesy?.routes || []).filter(r => r.type === 'shuttle')
                      ].length && (
                        <tr>
                          <td colSpan="6" className="text-center">
                            No schedule data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Maps Tab */}
        {activeTab === 'maps' && (
          <div className="tab-pane active">
            <div className="card">
              <div className="card-body">
                <h3>Transportation Maps</h3>
                
                <div className="transportation-maps">
                  <p>
                    View transportation routes and stops on interactive maps. You can 
                    find the nearest stops, plan your route, and track vehicles in real-time.
                  </p>
                  
                  <div className="row mt-4">
                    <div className="col-md-4">
                      <div className="map-card">
                        <div className="map-card-icon">
                          <i className="fas fa-map-marked-alt"></i>
                        </div>
                        <h4>Transit Map</h4>
                        <p>View all transportation routes and stops</p>
                        <Link to="/map?layer=transit" className="btn btn-primary">
                          Open Transit Map
                        </Link>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="map-card">
                        <div className="map-card-icon">
                          <i className="fas fa-car"></i>
                        </div>
                        <h4>Courtesy Cars</h4>
                        <p>See available courtesy cars and request a ride</p>
                        <Link to="/transportation/courtesy" className="btn btn-primary">
                          Open Courtesy Map
                        </Link>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="map-card">
                        <div className="map-card-icon">
                          <i className="fas fa-train"></i>
                        </div>
                        <h4>PRT Tracker</h4>
                        <p>Track PRT vehicles in real-time</p>
                        <Link to="/transportation/prt" className="btn btn-primary">
                          Open PRT Tracker
                        </Link>
                      </div>
                    </div>
                  </div>
                  
                  <div className="offline-maps-section mt-4">
                    <h4>Offline Maps</h4>
                    <p>
                      Download transportation maps for offline use when you don't have internet access.
                    </p>
                    <Link to="/map?offline=true" className="btn btn-outline-primary">
                      <i className="fas fa-download me-2"></i>
                      Manage Offline Maps
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Tracker Tab */}
      {activeTab === 'tracker' && (
        <div className="tab-pane active">
          <div className="card">
            <div className="card-body">
              <h3>Transportation Tracker</h3>
              <p className="lead">
                Real-time tracking and management of Smart City transportation assets.
              </p>
              
              <div className="transport-tracker-container mt-4">
                <TransportationTracker />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get transport type badge color
const getTransportTypeBadge = (type) => {
  switch (type) {
    case 'prt':
      return 'info';
    case 'bus':
      return 'success';
    case 'shuttle':
      return 'warning';
    case 'courtesy':
      return 'primary';
    default:
      return 'secondary';
  }
};

// Helper function to get transport type label
const getTransportTypeLabel = (type) => {
  switch (type) {
    case 'prt':
      return 'PRT';
    case 'bus':
      return 'Bus';
    case 'shuttle':
      return 'Shuttle';
    case 'courtesy':
      return 'Courtesy Car';
    default:
      return type;
  }
};

export default TransportationDashboard;

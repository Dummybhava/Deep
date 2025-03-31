import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  getAttractions, 
  getEvents, 
  getTransportationStatus,
  getToursList
} from '../../services/api';
import '../../cssStyles/dashboard/Dashboard.css'
import { formatDate, formatTime } from '../../utils/helpers';

const Dashboard = ({ wsConnected }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    attractions: [],
    events: [],
    transportation: null,
    tours: []
  });
  const [error, setError] = useState(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch attractions (featured only)
        const attractionsData = await getAttractions({ featured: true, limit: 3 });
        
        // Fetch upcoming events
        const eventsData = await getEvents({ upcoming: true, limit: 3 });
        
        // Fetch transportation status
        const transportationData = await getTransportationStatus();
        
        // Fetch tours
        const toursData = await getToursList({ featured: true, limit: 2 });
        
        setDashboardData({
          attractions: attractionsData.attractions || [],
          events: eventsData.events || [],
          transportation: transportationData || null,
          tours: toursData || []
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
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
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>
          <i className="fas fa-tachometer-alt me-2"></i>
          Dashboard
        </h1>
        <div className="dashboard-subtitle">
          Welcome back, {user.firstName}!
        </div>
      </div>
      
      {/* Connection Status */}
      <div className={`connection-status ${wsConnected ? 'connected' : 'disconnected'}`}>
        <i className={`fas fa-${wsConnected ? 'check-circle' : 'exclamation-circle'}`}></i>
        {wsConnected ? 'Connected to real-time updates' : 'Offline mode - real-time updates unavailable'}
      </div>
      
      {/* Quick Actions */}
      <div className="quick-actions-section">
        <div className="section-title">Quick Actions</div>
        <div className="row">
          <div className="col-md-3 col-sm-6">
            <Link to="/map" className="quick-action-card">
              <div className="quick-action-icon">
                <i className="fas fa-map-marked-alt"></i>
              </div>
              <div className="quick-action-text">Explore Map</div>
            </Link>
          </div>
          <div className="col-md-3 col-sm-6">
            <Link to="/transportation/courtesy" className="quick-action-card">
              <div className="quick-action-icon">
                <i className="fas fa-car"></i>
              </div>
              <div className="quick-action-text">Request Ride</div>
            </Link>
          </div>
          <div className="col-md-3 col-sm-6">
            <Link to="/events" className="quick-action-card">
              <div className="quick-action-icon">
                <i className="fas fa-calendar-alt"></i>
              </div>
              <div className="quick-action-text">View Events</div>
            </Link>
          </div>
          <div className="col-md-3 col-sm-6">
            <Link to="/feedback" className="quick-action-card">
              <div className="quick-action-icon">
                <i className="fas fa-comment-alt"></i>
              </div>
              <div className="quick-action-text">Send Feedback</div>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="row">
          {/* Featured Attractions */}
          <div className="col-lg-6">
            <div className="dashboard-card">
              <div className="card-header">
                <h2>Featured Attractions</h2>
                <Link to="/attractions" className="view-all-link">
                  View All <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
              <div className="card-body">
                {dashboardData.attractions.length > 0 ? (
                  <div className="attractions-list">
                    {dashboardData.attractions.map(attraction => (
                      <Link 
                        key={attraction._id} 
                        to={`/attractions/${attraction._id}`}
                        className="attraction-item"
                      >
                        <div className="attraction-image">
                          {attraction.images && attraction.images.length > 0 ? (
                            <img 
                              src={attraction.images[0].url} 
                              alt={attraction.name} 
                              className="img-fluid rounded"
                            />
                          ) : (
                            <div className="placeholder-image">
                              <i className="fas fa-image"></i>
                            </div>
                          )}
                          <div className="attraction-category">
                            <span className="badge bg-primary">
                              {attraction.category}
                            </span>
                          </div>
                        </div>
                        <div className="attraction-details">
                          <h3 className="attraction-name">{attraction.name}</h3>
                          <div className="attraction-rating">
                            <i className="fas fa-star text-warning"></i>
                            <span>{attraction.rating?.average || 'N/A'}</span>
                            <span className="text-muted">
                              ({attraction.rating?.count || 0} reviews)
                            </span>
                          </div>
                          <p className="attraction-description">
                            {attraction.shortDescription}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <i className="fas fa-map-marker-alt"></i>
                    <p>No featured attractions available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Upcoming Events */}
          <div className="col-lg-6">
            <div className="dashboard-card">
              <div className="card-header">
                <h2>Upcoming Events</h2>
                <Link to="/events" className="view-all-link">
                  View All <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
              <div className="card-body">
                {dashboardData.events.length > 0 ? (
                  <div className="events-list">
                    {dashboardData.events.map(event => (
                      <Link 
                        key={event._id} 
                        to={`/events/${event._id}`}
                        className="event-item"
                      >
                        <div className="event-date">
                          <div className="date-box">
                            <span className="month">
                              {formatDate(new Date(event.startDate), 'MMM')}
                            </span>
                            <span className="day">
                              {formatDate(new Date(event.startDate), 'DD')}
                            </span>
                          </div>
                          <div className="time">
                            {event.allDay ? 'All day' : formatTime(new Date(event.startDate))}
                          </div>
                        </div>
                        <div className="event-details">
                          <h3 className="event-title">{event.title}</h3>
                          <div className="event-meta">
                            <span className="event-category">
                              <i className="fas fa-tag"></i> {event.category}
                            </span>
                            <span className="event-location">
                              <i className="fas fa-map-marker-alt"></i> 
                              {event.location?.venueName || 'Location TBD'}
                            </span>
                          </div>
                          <p className="event-description">
                            {event.shortDescription}
                          </p>
                        </div>
                        {event.featured && (
                          <div className="event-featured">
                            <span className="badge bg-warning">Featured</span>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <i className="fas fa-calendar-alt"></i>
                    <p>No upcoming events</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Transportation Status */}
          <div className="col-lg-6">
            <div className="dashboard-card">
              <div className="card-header">
                <h2>Transportation</h2>
                <Link to="/transportation" className="view-all-link">
                  View Details <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
              <div className="card-body">
                {dashboardData.transportation ? (
                  <div className="transportation-status">
                    <div className="row">
                      <div className="col-md-4">
                        <div className="transport-type-card">
                          <div className="transport-icon">
                            <i className="fas fa-train"></i>
                          </div>
                          <div className="transport-name">PRT</div>
                          <div className={`transport-status ${dashboardData.transportation.prt.status === 'operational' ? 'operational' : 'disrupted'}`}>
                            <i className={`fas fa-${dashboardData.transportation.prt.status === 'operational' ? 'check-circle' : 'exclamation-triangle'}`}></i>
                            {dashboardData.transportation.prt.status === 'operational' ? 'Operational' : 'Disrupted'}
                          </div>
                          <div className="wait-time">
                            <span>Wait time: </span>
                            <strong>{dashboardData.transportation.prt.waitTime} min</strong>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="transport-type-card">
                          <div className="transport-icon">
                            <i className="fas fa-bus"></i>
                          </div>
                          <div className="transport-name">Bus</div>
                          <div className={`transport-status ${dashboardData.transportation.bus.status === 'operational' ? 'operational' : 'disrupted'}`}>
                            <i className={`fas fa-${dashboardData.transportation.bus.status === 'operational' ? 'check-circle' : 'exclamation-triangle'}`}></i>
                            {dashboardData.transportation.bus.status === 'operational' ? 'Operational' : 'Disrupted'}
                          </div>
                          <Link to="/transportation/bus" className="btn btn-sm btn-outline-primary mt-2">
                            View Schedule
                          </Link>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="transport-type-card">
                          <div className="transport-icon">
                            <i className="fas fa-car"></i>
                          </div>
                          <div className="transport-name">Courtesy Cars</div>
                          <div className="transport-status operational">
                            <i className="fas fa-check-circle"></i>
                            {dashboardData.transportation.courtesy.availableCars} Available
                          </div>
                          <Link to="/transportation/courtesy" className="btn btn-sm btn-primary mt-2">
                            Request Ride
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <i className="fas fa-subway"></i>
                    <p>Transportation information unavailable</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Self-Guided Tours */}
          <div className="col-lg-6">
            <div className="dashboard-card">
              <div className="card-header">
                <h2>Self-Guided Tours</h2>
                <Link to="/tours" className="view-all-link">
                  View All <i className="fas fa-arrow-right"></i>
                </Link>
              </div>
              <div className="card-body">
                {dashboardData.tours.length > 0 ? (
                  <div className="tours-list">
                    {dashboardData.tours.map(tour => (
                      <Link 
                        key={tour._id} 
                        to={`/tours/${tour._id}`}
                        className="tour-item"
                      >
                        <div className="tour-image">
                          {tour.images && tour.images.length > 0 ? (
                            <img 
                              src={tour.images[0].url} 
                              alt={tour.title} 
                              className="img-fluid rounded"
                            />
                          ) : (
                            <div className="placeholder-image">
                              <i className="fas fa-route"></i>
                            </div>
                          )}
                        </div>
                        <div className="tour-details">
                          <h3 className="tour-title">{tour.title}</h3>
                          <div className="tour-meta">
                            <span className="tour-duration">
                              <i className="fas fa-clock"></i> {Math.round(tour.estimatedDuration / 60)} hrs
                            </span>
                            <span className="tour-distance">
                              <i className="fas fa-route"></i> {tour.distance.toFixed(1)} km
                            </span>
                            <span className="tour-difficulty">
                              <i className="fas fa-mountain"></i> {tour.difficulty}
                            </span>
                          </div>
                          <p className="tour-description">
                            {tour.shortDescription}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <i className="fas fa-route"></i>
                    <p>No tours available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

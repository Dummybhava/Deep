import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../../services/api';
import { formatDate, formatTime } from '../../utils/helpers';
// import { Calendar } from 'react-feather';
import '../../cssStyles/event/EventsList.css'

const EventsList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [filters, setFilters] = useState({
    category: '',
    featured: false,
    showPast: false,
    sort: 'startDate',
    dateRange: 'upcoming'
  });
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Fetch events on component mount and when filters or pagination changes
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        
        // Build query parameters
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          showPast: filters.showPast,
          ...filters
        };
        
        // Add date range if specified
        if (filters.dateRange === 'custom' && dateRange.startDate && dateRange.endDate) {
          params.startDate = dateRange.startDate;
          params.endDate = dateRange.endDate;
        }
        
        const response = await getEvents(params);
        
        setEvents(response.events || []);
        setPagination({
          ...pagination,
          total: response.pagination?.total || 0,
          pages: response.pagination?.pages || 1
        });
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, [pagination.page, pagination.limit, filters, dateRange]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Reset to first page when filters change
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  // Handle date range changes
  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
    
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper function to format event time display
  const formatEventTime = (event) => {
    if (event.allDay) {
      return 'All day';
    }
    
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    // Same day event
    if (startDate.toDateString() === endDate.toDateString()) {
      return `${formatTime(startDate)} - ${formatTime(endDate)}`;
    }
    
    // Multi-day event
    return `${formatDate(startDate, 'short')} - ${formatDate(endDate, 'short')}`;
  };

  // Render loading state
  if (loading && events.length === 0) {
    return (
      <div className="events-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading events...</p>
      </div>
    );
  }

  // Render error state
  if (error && events.length === 0) {
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
    <div className="events-container">
      <div className="events-header">
        <h1>
          <i className="fas fa-calendar-alt me-2"></i>
          Events
        </h1>
        <p className="lead">Discover exciting events happening in Smart City</p>
      </div>
      
      {/* Filters */}
      <div className="filters-container">
        <div className="row g-3">
          <div className="col-md-3">
            <label htmlFor="category" className="form-label">Category</label>
            <select 
              id="category" 
              name="category" 
              className="form-select"
              value={filters.category}
              onChange={handleFilterChange}
            >
              <option value="">All Categories</option>
              <option value="conference">Conferences</option>
              <option value="exhibition">Exhibitions</option>
              <option value="concert">Concerts</option>
              <option value="festival">Festivals</option>
              <option value="sport">Sports</option>
              <option value="workshop">Workshops</option>
              <option value="community">Community</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="col-md-3">
            <label htmlFor="dateRange" className="form-label">Date Range</label>
            <select 
              id="dateRange" 
              name="dateRange" 
              className="form-select"
              value={filters.dateRange}
              onChange={handleFilterChange}
            >
              <option value="upcoming">Upcoming</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="thisWeek">This Week</option>
              <option value="thisWeekend">This Weekend</option>
              <option value="nextWeek">Next Week</option>
              <option value="thisMonth">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          {filters.dateRange === 'custom' && (
            <div className="col-md-6">
              <div className="row g-2">
                <div className="col-md-6">
                  <label htmlFor="startDate" className="form-label">Start Date</label>
                  <input 
                    type="date" 
                    id="startDate" 
                    name="startDate"
                    className="form-control"
                    value={dateRange.startDate}
                    onChange={handleDateRangeChange}
                  />
                </div>
                <div className="col-md-6">
                  <label htmlFor="endDate" className="form-label">End Date</label>
                  <input 
                    type="date" 
                    id="endDate" 
                    name="endDate"
                    className="form-control"
                    value={dateRange.endDate}
                    onChange={handleDateRangeChange}
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="col-md-2">
            <label htmlFor="sort" className="form-label">Sort By</label>
            <select 
              id="sort" 
              name="sort" 
              className="form-select"
              value={filters.sort}
              onChange={handleFilterChange}
            >
              <option value="startDate">Date (Nearest)</option>
              <option value="-startDate">Date (Furthest)</option>
              <option value="title">Name (A-Z)</option>
              <option value="-title">Name (Z-A)</option>
            </select>
          </div>
          
          <div className="col-md-2 d-flex align-items-end">
            <div className="form-check">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="featured" 
                name="featured"
                checked={filters.featured}
                onChange={handleFilterChange}
              />
              <label className="form-check-label" htmlFor="featured">
                Featured Only
              </label>
            </div>
          </div>
          
          <div className="col-md-2 d-flex align-items-end">
            <div className="form-check">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="showPast" 
                name="showPast"
                checked={filters.showPast}
                onChange={handleFilterChange}
              />
              <label className="form-check-label" htmlFor="showPast">
                Include Past Events
              </label>
            </div>
          </div>
        </div>
      </div>
      
      {/* Events List */}
      {events.length > 0 ? (
        <div className="events-list-container">
          <div className="events-count mb-3">
            <span className="text-muted">
              Showing {events.length} of {pagination.total} events
            </span>
          </div>
          
          <div className="events-list">
            {events.map(event => (
              <div key={event._id} className="event-card">
                <div className="event-date-box">
                  <div className="event-month">
                    {formatDate(new Date(event.startDate), 'MMM')}
                  </div>
                  <div className="event-day">
                    {formatDate(new Date(event.startDate), 'DD')}
                  </div>
                  <div className="event-time">
                    {event.allDay ? 'All day' : formatTime(new Date(event.startDate))}
                  </div>
                </div>
                
                <div className="event-content">
                  <div className="event-image">
                    {event.images && event.images.length > 0 ? (
                      <img 
                        src={event.images[0].url} 
                        alt={event.title} 
                        className="img-fluid rounded"
                      />
                    ) : (
                      <div className="placeholder-image">
                        <i className="fas fa-calendar-alt"></i>
                      </div>
                    )}
                    
                    {event.featured && (
                      <div className="featured-badge">
                        <i className="fas fa-star"></i> Featured
                      </div>
                    )}
                  </div>
                  
                  <div className="event-details">
                    <h3 className="event-title">
                      <Link to={`/events/${event._id}`}>{event.title}</Link>
                    </h3>
                    
                    <div className="event-meta">
                      <span className="event-category">
                        <i className="fas fa-tag"></i> {getCategoryLabel(event.category)}
                      </span>
                      
                      <span className="event-location">
                        <i className="fas fa-map-marker-alt"></i> 
                        {formatLocation(event.location)}
                      </span>
                      
                      <span className="event-datetime">
                        <i className="fas fa-clock"></i> {formatEventTime(event)}
                      </span>
                    </div>
                    
                    <p className="event-description">
                      {event.shortDescription}
                    </p>
                    
                    <div className="event-footer">
                      <Link to={`/events/${event._id}`} className="btn btn-outline-primary">
                        View Details
                      </Link>
                      {renderTicketInfo(event.ticketInfo)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="pagination-container">
              <nav aria-label="Events pagination">
                <ul className="pagination justify-content-center">
                  {/* Previous page button */}
                  <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                  </li>
                  
                  {/* Page numbers */}
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, and pages around current page
                      return page === 1 || 
                             page === pagination.pages || 
                             (page >= pagination.page - 1 && page <= pagination.page + 1);
                    })
                    .map((page, index, array) => {
                      // Add ellipsis between non-consecutive pages
                      const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;
                      const showEllipsisAfter = index < array.length - 1 && array[index + 1] !== page + 1;
                      
                      return (
                        <React.Fragment key={page}>
                          {showEllipsisBefore && (
                            <li className="page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                          )}
                          
                          <li className={`page-item ${pagination.page === page ? 'active' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </button>
                          </li>
                          
                          {showEllipsisAfter && (
                            <li className="page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                          )}
                        </React.Fragment>
                      );
                    })
                  }
                  
                  {/* Next page button */}
                  <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state mt-5">
          <div className="empty-state-icon">
            {/* <Calender size={48}/> */}
          </div>
          <h3>No events found</h3>
          <p>No events match your current filters</p>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setFilters({
                category: '',
                featured: false,
                showPast: false,
                sort: 'startDate',
                dateRange: 'upcoming'
              });
              setDateRange({
                startDate: '',
                endDate: ''
              });
            }}
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

// Helper function to get category label
const getCategoryLabel = (category) => {
  const labels = {
    conference: 'Conference',
    exhibition: 'Exhibition',
    concert: 'Concert',
    festival: 'Festival',
    sport: 'Sport',
    workshop: 'Workshop',
    community: 'Community',
    other: 'Other'
  };
  
  return labels[category] || category;
};

// Helper function to format location
const formatLocation = (location) => {
  if (!location) {
    return 'Location TBD';
  }
  
  if (location.type === 'venue' && location.venueName) {
    return location.venueName;
  }
  
  if (location.type === 'attraction' && location.attractionId) {
    return 'At attraction'; // In a real app, you'd fetch the attraction name
  }
  
  if (location.type === 'online') {
    return 'Online event';
  }
  
  if (location.address && location.address.city) {
    return location.address.city;
  }
  
  return 'Location TBD';
};

// Helper function to render ticket info
const renderTicketInfo = (ticketInfo) => {
  if (!ticketInfo) {
    return null;
  }
  
  if (ticketInfo.isFree) {
    return (
      <span className="event-price free">
        <i className="fas fa-ticket-alt"></i> Free
      </span>
    );
  }
  
  if (ticketInfo.price) {
    return (
      <span className="event-price">
        <i className="fas fa-ticket-alt"></i> {ticketInfo.price} {ticketInfo.currency}
      </span>
    );
  }
  
  if (ticketInfo.registrationRequired) {
    return (
      <span className="event-registration">
        <i className="fas fa-user-plus"></i> Registration required
      </span>
    );
  }
  
  return null;
};

export default EventsList;

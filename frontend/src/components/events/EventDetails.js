import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getEventById, rsvpToEvent, saveItem } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatTime, formatRelativeTime } from '../../utils/helpers';
import '../../cssStyles/event/EventDetails.css'

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [rsvpStatus, setRsvpStatus] = useState(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [showRsvpModal, setShowRsvpModal] = useState(false);
  const [modalRsvpStatus, setModalRsvpStatus] = useState('attending');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch event details
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const data = await getEventById(id);
        setEvent(data);
        
        // Check if user is already RSVP'd to this event
        if (data.attendees && user) {
          const userAttendee = data.attendees.find(attendee => attendee.user === user.id);
          if (userAttendee) {
            setRsvpStatus(userAttendee.status);
          }
        }
        
        // Check if this event is saved by the user
        if (user && user.savedItems && user.savedItems.events) {
          setSaved(user.savedItems.events.includes(id));
        }
      } catch (err) {
        console.error('Error fetching event details:', err);
        setError('Failed to load event details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchEvent();
    }
  }, [id, user]);

  // Handle image navigation
  const handleImageNav = (index) => {
    setActiveImageIndex(index);
  };

  // Handle RSVP submit
  const handleRsvpSubmit = async () => {
    if (!user) {
      // Redirect to login if user is not authenticated
      navigate('/login', { state: { from: { pathname: `/events/${id}` } } });
      return;
    }
    
    try {
      setRsvpLoading(true);
      
      await rsvpToEvent(id, modalRsvpStatus);
      
      // Update event with new RSVP status
      setRsvpStatus(modalRsvpStatus);
      
      // Close modal
      setShowRsvpModal(false);
      
      // Show success toast
      // In a real application, you would use a toast component
      alert(`Successfully RSVP'd to event as ${modalRsvpStatus}!`);
    } catch (err) {
      console.error('Error submitting RSVP:', err);
      alert('Failed to RSVP. Please try again.');
    } finally {
      setRsvpLoading(false);
    }
  };

  // Handle saving event
  const handleSaveEvent = async () => {
    if (!user) {
      // Redirect to login if user is not authenticated
      navigate('/login', { state: { from: { pathname: `/events/${id}` } } });
      return;
    }
    
    try {
      setSaveLoading(true);
      
      if (saved) {
        // Unsave functionality would be implemented here
        setSaved(false);
      } else {
        await saveItem({
          itemType: 'event',
          itemId: id
        });
        setSaved(true);
      }
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Failed to save event. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Format event date display
  const formatEventDate = (event) => {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    // Same day event
    if (startDate.toDateString() === endDate.toDateString()) {
      return `${formatDate(startDate, 'weekday')}`;
    }
    
    // Multi-day event
    return `${formatDate(startDate, 'weekday')} - ${formatDate(endDate, 'weekday')}`;
  };

  // Format event time display
  const formatEventTime = (event) => {
    if (event.allDay) {
      return 'All day';
    }
    
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    return `${formatTime(startDate)} - ${formatTime(endDate)}`;
  };

  // Check if event is in the past
  const isEventPast = (event) => {
    const now = new Date();
    const endDate = new Date(event.endDate);
    
    return endDate < now;
  };

  // Render loading state
  if (loading) {
    return (
      <div className="event-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading event details...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="alert alert-danger">
        <i className="fas fa-exclamation-circle me-2"></i>
        {error}
        <div className="mt-3">
          <button 
            className="btn btn-outline-danger me-2"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!event) {
    return (
      <div className="empty-state">
        <i className="fas fa-calendar-alt"></i>
        <p>Event not found</p>
        <Link to="/events" className="btn btn-primary">
          Browse Events
        </Link>
      </div>
    );
  }

  return (
    <div className="event-details-container">
      <div className="event-details-header">
        <div className="back-button">
          <button 
            className="btn btn-outline-primary"
            onClick={() => navigate(-1)}
          >
            <i className="fas fa-arrow-left me-2"></i>
            Back
          </button>
        </div>
        
        <h1 className="event-title">{event.title}</h1>
        
        <div className="event-meta">
          <div className="event-category">
            <span className="badge bg-primary">
              {getCategoryLabel(event.category)}
            </span>
          </div>
          
          <div className="event-status">
            {isEventPast(event) ? (
              <span className="badge bg-secondary">Past Event</span>
            ) : (
              <span className="badge bg-success">Upcoming</span>
            )}
            
            {event.featured && (
              <span className="badge bg-warning ms-2">Featured</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="row">
        <div className="col-lg-8">
          {/* Image Gallery */}
          <div className="event-gallery">
            <div className="main-image">
              {event.images && event.images.length > 0 ? (
                <img 
                  src={event.images[activeImageIndex].url} 
                  alt={event.images[activeImageIndex].caption || event.title} 
                  className="img-fluid rounded"
                />
              ) : (
                <div className="placeholder-image">
                  <i className="fas fa-calendar-alt"></i>
                  <p>No images available</p>
                </div>
              )}
            </div>
            
            {event.images && event.images.length > 1 && (
              <div className="thumbnail-carousel">
                {event.images.map((image, index) => (
                  <div 
                    key={index} 
                    className={`thumbnail ${index === activeImageIndex ? 'active' : ''}`}
                    onClick={() => handleImageNav(index)}
                  >
                    <img 
                      src={image.url} 
                      alt={image.caption || `${event.title} ${index + 1}`} 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Description */}
          <div className="event-description card mt-4">
            <div className="card-body">
              <h2 className="card-title">About this Event</h2>
              <p>{event.description}</p>
              
              {/* Event Schedule */}
              {event.schedule && event.schedule.length > 0 && (
                <div className="event-schedule mt-4">
                  <h3>Schedule</h3>
                  <ul className="schedule-list">
                    {event.schedule.map((item, index) => (
                      <li key={index} className="schedule-item">
                        <div className="schedule-time">{item.time}</div>
                        <div className="schedule-content">
                          <div className="schedule-title">{item.title}</div>
                          <div className="schedule-description">{item.description}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Accessibility */}
              {event.accessibility && (
                <div className="event-accessibility mt-4">
                  <h3>Accessibility</h3>
                  <ul className="accessibility-list">
                    {event.accessibility.wheelchairAccessible && (
                      <li>
                        <i className="fas fa-wheelchair"></i> Wheelchair Accessible
                      </li>
                    )}
                    {event.accessibility.signLanguageInterpreter && (
                      <li>
                        <i className="fas fa-sign-language"></i> Sign Language Interpreter
                      </li>
                    )}
                    {event.accessibility.assistiveTechnology && (
                      <li>
                        <i className="fas fa-assistive-listening-systems"></i> Assistive Technology
                      </li>
                    )}
                    {event.accessibility.accessibilityNotes && (
                      <li>
                        <i className="fas fa-info-circle"></i> {event.accessibility.accessibilityNotes}
                      </li>
                    )}
                  </ul>
                </div>
              )}
              
              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div className="event-tags mt-4">
                  <h3>Tags</h3>
                  <div className="tags-list">
                    {event.tags.map((tag, index) => (
                      <span key={index} className="tag-badge">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="event-attendees card mt-4">
              <div className="card-body">
                <h2 className="card-title">Attendees</h2>
                <div className="attendees-count">
                  {event.attendees.filter(a => a.status === 'attending').length} people are attending
                </div>
                
                <div className="attendees-list">
                  {/* This would be implemented with actual attendee data from the API */}
                  <div className="attendee-avatars">
                    {Array.from({ length: Math.min(5, event.attendees.length) }).map((_, index) => (
                      <div key={index} className="attendee-avatar">
                        <div className="avatar-placeholder">
                          <i className="fas fa-user"></i>
                        </div>
                      </div>
                    ))}
                    
                    {event.attendees.length > 5 && (
                      <div className="attendee-avatar more">
                        +{event.attendees.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="col-lg-4">
          {/* Event Information Card */}
          <div className="event-info-card card sticky-top">
            <div className="card-body">
              <div className="event-date-time">
                <div className="event-date">
                  <i className="fas fa-calendar me-2"></i>
                  {formatEventDate(event)}
                </div>
                <div className="event-time">
                  <i className="fas fa-clock me-2"></i>
                  {formatEventTime(event)}
                </div>
              </div>
              
              <div className="event-location mt-3">
                <i className="fas fa-map-marker-alt me-2"></i>
                {renderEventLocation(event.location)}
              </div>
              
              {/* Ticket Information */}
              {event.ticketInfo && (
                <div className="event-ticket-info mt-3">
                  <h4>Ticket Information</h4>
                  <div className="ticket-details">
                    {event.ticketInfo.isFree ? (
                      <div className="ticket-price free">
                        <i className="fas fa-ticket-alt me-2"></i>
                        Free
                      </div>
                    ) : (
                      <div className="ticket-price">
                        <i className="fas fa-ticket-alt me-2"></i>
                        {event.ticketInfo.price} {event.ticketInfo.currency}
                      </div>
                    )}
                    
                    {event.ticketInfo.availableTickets !== undefined && (
                      <div className="ticket-availability">
                        {event.ticketInfo.availableTickets > 0 ? (
                          <span className="text-success">
                            <i className="fas fa-check-circle me-1"></i>
                            {event.ticketInfo.availableTickets} tickets available
                          </span>
                        ) : (
                          <span className="text-danger">
                            <i className="fas fa-times-circle me-1"></i>
                            Sold out
                          </span>
                        )}
                      </div>
                    )}
                    
                    {event.ticketInfo.ticketUrl && (
                      <a 
                        href={event.ticketInfo.ticketUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-primary w-100 mt-2"
                      >
                        <i className="fas fa-external-link-alt me-2"></i>
                        Buy Tickets
                      </a>
                    )}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="event-actions mt-4">
                {/* RSVP Button */}
                {!isEventPast(event) && (
                  <button 
                    className={`btn btn-primary w-100 mb-3 ${rsvpStatus ? 'rsvped' : ''}`}
                    onClick={() => setShowRsvpModal(true)}
                  >
                    <i className={`fas fa-${rsvpStatus ? 'check-circle' : 'calendar-plus'} me-2`}></i>
                    {rsvpStatus ? `You're ${rsvpStatus}` : 'RSVP'}
                  </button>
                )}
                
                {/* Save Button */}
                <button 
                  className={`btn btn-outline-primary w-100 mb-3 ${saved ? 'saved' : ''}`}
                  onClick={handleSaveEvent}
                  disabled={saveLoading}
                >
                  {saveLoading ? (
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  ) : (
                    <i className={`${saved ? 'fas' : 'far'} fa-bookmark me-2`}></i>
                  )}
                  {saved ? 'Saved' : 'Save'}
                </button>
                
                {/* Map Button */}
                <Link 
                  to={`/map?event=${event._id}`} 
                  className="btn btn-outline-secondary w-100 mb-3"
                >
                  <i className="fas fa-map-marked-alt me-2"></i>
                  View on Map
                </Link>
                
                {/* Share Button */}
                <button 
                  className="btn btn-outline-secondary w-100"
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: event.title,
                        text: event.shortDescription,
                        url: window.location.href
                      });
                    } else {
                      // Fallback - copy to clipboard
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copied to clipboard!');
                    }
                  }}
                >
                  <i className="fas fa-share-alt me-2"></i>
                  Share
                </button>
              </div>
              
              {/* Organizer Information */}
              {event.organizer && (
                <div className="event-organizer mt-4">
                  <h4>Organizer</h4>
                  <div className="organizer-name">
                    <i className="fas fa-user-tie me-2"></i>
                    {event.organizer.name}
                  </div>
                  {event.organizer.email && (
                    <div className="organizer-email">
                      <i className="fas fa-envelope me-2"></i>
                      <a href={`mailto:${event.organizer.email}`}>
                        {event.organizer.email}
                      </a>
                    </div>
                  )}
                  {event.organizer.phone && (
                    <div className="organizer-phone">
                      <i className="fas fa-phone me-2"></i>
                      <a href={`tel:${event.organizer.phone}`}>
                        {event.organizer.phone}
                      </a>
                    </div>
                  )}
                  {event.organizer.website && (
                    <div className="organizer-website">
                      <i className="fas fa-globe me-2"></i>
                      <a 
                        href={event.organizer.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {formatWebsiteUrl(event.organizer.website)}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* RSVP Modal */}
      {showRsvpModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>RSVP to {event.title}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowRsvpModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <p>Let the organizer know if you're attending this event.</p>
              
              <div className="rsvp-options">
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="radio" 
                    name="rsvpStatus" 
                    id="rsvp-attending" 
                    value="attending"
                    checked={modalRsvpStatus === 'attending'}
                    onChange={() => setModalRsvpStatus('attending')}
                  />
                  <label className="form-check-label" htmlFor="rsvp-attending">
                    <i className="fas fa-check-circle text-success me-2"></i>
                    Attending
                  </label>
                </div>
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="radio" 
                    name="rsvpStatus" 
                    id="rsvp-interested" 
                    value="interested"
                    checked={modalRsvpStatus === 'interested'}
                    onChange={() => setModalRsvpStatus('interested')}
                  />
                  <label className="form-check-label" htmlFor="rsvp-interested">
                    <i className="fas fa-star text-warning me-2"></i>
                    Interested
                  </label>
                </div>
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="radio" 
                    name="rsvpStatus" 
                    id="rsvp-declined" 
                    value="declined"
                    checked={modalRsvpStatus === 'declined'}
                    onChange={() => setModalRsvpStatus('declined')}
                  />
                  <label className="form-check-label" htmlFor="rsvp-declined">
                    <i className="fas fa-times-circle text-danger me-2"></i>
                    Not attending
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowRsvpModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleRsvpSubmit}
                disabled={rsvpLoading}
              >
                {rsvpLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Submitting...
                  </>
                ) : 'Submit'}
              </button>
            </div>
          </div>
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

// Helper function to render event location
const renderEventLocation = (location) => {
  if (!location) {
    return <span>Location TBD</span>;
  }
  
  // Online event
  if (location.type === 'online') {
    return (
      <div className="event-location-online">
        <span className="location-label">Online Event</span>
        {location.virtualEventUrl && (
          <div>
            <a 
              href={location.virtualEventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline-primary mt-2"
            >
              Join Event
            </a>
          </div>
        )}
      </div>
    );
  }
  
  // Physical venue
  let locationText = '';
  
  if (location.type === 'venue' && location.venueName) {
    locationText = location.venueName;
  } else if (location.type === 'attraction' && location.attractionId) {
    locationText = 'At attraction'; // In a real app, you'd fetch the attraction name
  }
  
  // Format address
  let addressText = '';
  if (location.address) {
    const { street, city, state, postalCode, country } = location.address;
    const addressParts = [];
    
    if (street) addressParts.push(street);
    if (city) addressParts.push(city);
    if (state) addressParts.push(state);
    if (postalCode) addressParts.push(postalCode);
    if (country) addressParts.push(country);
    
    addressText = addressParts.join(', ');
  }
  
  return (
    <div className="event-location-physical">
      <div className="location-name">{locationText || 'Event Location'}</div>
      {addressText && <div className="location-address">{addressText}</div>}
      <div className="location-actions mt-2">
        <Link 
          to={`/directions?to=${location.coordinates?.coordinates?.[0]},${location.coordinates?.coordinates?.[1]}`}
          className="btn btn-sm btn-outline-primary"
        >
          <i className="fas fa-directions me-1"></i>
          Get Directions
        </Link>
      </div>
    </div>
  );
};

// Helper function to format website URL for display
const formatWebsiteUrl = (url) => {
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
};

export default EventDetails;

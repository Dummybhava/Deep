import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTourById, getToursList, startTour, completeTour, submitTourReview } from '../../services/api';
import { initializeMap, addTileLayer, getRouteColor } from '../../services/map';
import { formatDuration, formatDistance } from '../../utils/helpers';
import '../../cssStyles/tours/SelfGuidedTour.css'

const SelfGuidedTour = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tours, setTours] = useState([]);
  const [selectedTour, setSelectedTour] = useState(null);
  const [activeTour, setActiveTour] = useState(null);
  const [tourProgress, setTourProgress] = useState(0);
  const [currentStop, setCurrentStop] = useState(0);
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationWatchId, setLocationWatchId] = useState(null);
  const [reviewData, setReviewData] = useState({
    rating: 0,
    comment: ''
  });
  
  // Load tours or specific tour on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (id) {
          // Load specific tour
          const tour = await getTourById(id);
          setSelectedTour(tour);
        } else {
          // Load all tours
          const toursData = await getToursList();
          setTours(toursData || []);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading tour data:', err);
        setError('Failed to load tour data. Please try again.');
        setLoading(false);
      }
    };
    
    loadData();
    
    // Initialize map
    setupMap();
    
    // Start watching user location for tour progress tracking
    startLocationTracking();
    
    // Clean up on unmount
    return () => {
      // Stop watching user location
      if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
      }
      
      // Clear map
      if (map) {
        map.remove();
      }
    };
  }, [id]);
  
  // Set up map
  const setupMap = async () => {
    try {
      // Initialize map instance
      const mapInstance = await initializeMap('tourMapContainer', {
        center: [39.6365, -79.9545], // Default to Morgantown, WV
        zoom: 15,
        maxZoom: 19,
        minZoom: 12
      });
      
      // Add default tile layer
      addTileLayer(mapInstance, 'default');
      
      // Set map instance
      setMap(mapInstance);
    } catch (err) {
      console.error('Error setting up map:', err);
      setError('Failed to load map. Please try again.');
    }
  };
  
  // Start location tracking
  const startLocationTracking = () => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        position => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          
          // Update map with user location marker
          if (map) {
            // Remove existing user marker if any
            map.eachLayer(layer => {
              if (layer.options && layer.options.isUserMarker) {
                map.removeLayer(layer);
              }
            });
            
            // Add user marker
            const userMarker = L.marker([latitude, longitude], {
              icon: L.divIcon({
                html: '<div class="user-location-marker"><div class="pulse"></div></div>',
                className: '',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              }),
              isUserMarker: true
            }).addTo(map);
            
            // Update tour progress if active tour
            if (activeTour) {
              updateTourProgress([latitude, longitude]);
            }
          }
        },
        error => {
          console.warn('Error getting location:', error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 10000
        }
      );
      
      setLocationWatchId(watchId);
    }
  };
  
  // Update tour progress based on user location
  const updateTourProgress = (userCoords) => {
    if (!activeTour || !activeTour.stops || activeTour.stops.length === 0) return;
    
    // Calculate distance to current stop
    const currentStopCoords = activeTour.stops[currentStop].location.coordinates;
    const [stopLng, stopLat] = currentStopCoords;
    const [userLat, userLng] = userCoords;
    
    // Convert to radians
    const lat1 = stopLat * Math.PI / 180;
    const lon1 = stopLng * Math.PI / 180;
    const lat2 = userLat * Math.PI / 180;
    const lon2 = userLng * Math.PI / 180;
    
    // Haversine formula
    const dlon = lon2 - lon1;
    const dlat = lat2 - lat1;
    const a = Math.sin(dlat/2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon/2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    const r = 6371; // Radius of earth in kilometers
    const distance = c * r * 1000; // Distance in meters
    
    // Check if user is within 20 meters of the stop
    if (distance <= 20) {
      // Mark current stop as visited
      const updatedActiveTour = { ...activeTour };
      updatedActiveTour.stops[currentStop].visited = true;
      
      // Move to next stop if not at the end
      if (currentStop < activeTour.stops.length - 1) {
        setCurrentStop(currentStop + 1);
      }
      
      // Update active tour
      setActiveTour(updatedActiveTour);
      
      // Calculate overall progress
      const visitedStops = updatedActiveTour.stops.filter(stop => stop.visited).length;
      const progress = Math.round((visitedStops / updatedActiveTour.stops.length) * 100);
      setTourProgress(progress);
      
      // Show notification for reached stop
      showStopNotification(updatedActiveTour.stops[currentStop]);
      
      // If all stops visited, show completion modal
      if (visitedStops === updatedActiveTour.stops.length) {
        handleTourCompletion();
      }
    }
  };
  
  // Select a tour
  const handleSelectTour = async (tourId) => {
    try {
      const tour = await getTourById(tourId);
      setSelectedTour(tour);
      
      // Update map with tour route and stops
      if (map && tour) {
        updateMapWithTourData(tour);
      }
    } catch (err) {
      console.error('Error loading tour:', err);
      setError('Failed to load tour details. Please try again.');
    }
  };
  
  // Start tour
  const handleStartTour = async () => {
    try {
      if (!selectedTour) return;
      
      // Call API to start tour
      await startTour(selectedTour._id);
      
      // Set active tour
      setActiveTour({
        ...selectedTour,
        stops: selectedTour.stops.map(stop => ({ ...stop, visited: false }))
      });
      
      // Reset current stop and progress
      setCurrentStop(0);
      setTourProgress(0);
      
      // Update map with tour route and stops
      if (map) {
        updateMapWithTourData(selectedTour, true);
      }
      
      // Center map on first stop
      if (map && selectedTour.stops && selectedTour.stops.length > 0) {
        const [lng, lat] = selectedTour.stops[0].location.coordinates;
        map.setView([lat, lng], 16);
      }
    } catch (err) {
      console.error('Error starting tour:', err);
      setError('Failed to start tour. Please try again.');
    }
  };
  
  // Complete tour
  const handleTourCompletion = () => {
    // Show completion modal
    document.getElementById('tourCompletionModal').classList.add('show');
    document.getElementById('tourCompletionModal').style.display = 'block';
  };
  
  // Submit tour completion and review
  const handleSubmitCompletion = async () => {
    try {
      if (!activeTour) return;
      
      // Call API to complete tour with feedback
      await completeTour(activeTour._id, {
        rating: reviewData.rating,
        comment: reviewData.comment
      });
      
      // Reset active tour
      setActiveTour(null);
      setCurrentStop(0);
      setTourProgress(0);
      
      // Close modal
      document.getElementById('tourCompletionModal').classList.remove('show');
      document.getElementById('tourCompletionModal').style.display = 'none';
      
      // Navigate back to tours list
      navigate('/tours');
    } catch (err) {
      console.error('Error completing tour:', err);
      setError('Failed to submit tour feedback. Please try again.');
    }
  };
  
  // Update map with tour data
  const updateMapWithTourData = (tour, isActive = false) => {
    if (!map || !tour || !tour.stops || tour.stops.length === 0) return;
    
    // Clear existing layers
    map.eachLayer(layer => {
      if (layer.options && (layer.options.isTourStop || layer.options.isTourRoute)) {
        map.removeLayer(layer);
      }
    });
    
    // Create points array for route
    const points = tour.stops.map(stop => {
      const [lng, lat] = stop.location.coordinates;
      return [lat, lng];
    });
    
    // Add route line
    const routeLine = L.polyline(points, {
      color: '#4285F4',
      weight: 4,
      opacity: 0.7,
      isTourRoute: true
    }).addTo(map);
    
    // Add stop markers
    tour.stops.forEach((stop, index) => {
      const [lng, lat] = stop.location.coordinates;
      
      // Determine marker style based on status
      let markerHtml = '';
      if (isActive) {
        if (index < currentStop) {
          // Visited stop
          markerHtml = `<div class="tour-stop-marker visited">${index + 1}</div>`;
        } else if (index === currentStop) {
          // Current stop
          markerHtml = `<div class="tour-stop-marker current">${index + 1}</div>`;
        } else {
          // Upcoming stop
          markerHtml = `<div class="tour-stop-marker">${index + 1}</div>`;
        }
      } else {
        // Default marker for inactive tour
        markerHtml = `<div class="tour-stop-marker">${index + 1}</div>`;
      }
      
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          html: markerHtml,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        }),
        isTourStop: true,
        stopIndex: index
      }).addTo(map);
      
      // Add popup with stop information
      marker.bindPopup(`
        <div class="tour-stop-popup">
          <h5>${stop.name}</h5>
          <p>${stop.description}</p>
          ${stop.image ? `<img src="${stop.image}" alt="${stop.name}" class="popup-image">` : ''}
        </div>
      `);
    });
    
    // Fit map to route bounds
    const bounds = routeLine.getBounds();
    map.fitBounds(bounds, { padding: [50, 50] });
  };
  
  // Show notification when reaching a stop
  const showStopNotification = (stop) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'tour-stop-notification';
    notification.innerHTML = `
      <div class="tour-stop-notification-content">
        <h5>You've reached: ${stop.name}</h5>
        <p>${stop.description.substring(0, 100)}...</p>
        <button class="btn btn-sm btn-primary">View Details</button>
      </div>
    `;
    
    // Append to body
    document.body.appendChild(notification);
    
    // Add show class after a short delay for animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 5000);
  };
  
  // Handle rating change
  const handleRatingChange = (rating) => {
    setReviewData(prev => ({ ...prev, rating }));
  };
  
  // Handle comment change
  const handleCommentChange = (e) => {
    setReviewData(prev => ({ ...prev, comment: e.target.value }));
  };
  
  // Render loading state
  if (loading && !id) {
    return (
      <div className="tour-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading tours...</span>
        </div>
        <p>Loading self-guided tours...</p>
      </div>
    );
  }
  
  // Render error state
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
    <div className="self-guided-tour-container">
      <div className="tour-header">
        <h1>
          <i className="fas fa-route me-2"></i>
          Self-Guided Tours
        </h1>
        <p className="lead">Explore the city at your own pace with our curated tours</p>
      </div>
      
      {/* Tour selection or active tour interface */}
      <div className="tour-content">
        {activeTour ? (
          <div className="active-tour">
            <div className="tour-info">
              <h2>{activeTour.name}</h2>
              <div className="tour-progress">
                <div className="progress">
                  <div 
                    className="progress-bar" 
                    role="progressbar" 
                    style={{ width: `${tourProgress}%` }}
                    aria-valuenow={tourProgress} 
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  >
                    {tourProgress}%
                  </div>
                </div>
                <p>{`Stop ${currentStop + 1} of ${activeTour.stops.length}`}</p>
              </div>
              
              <div className="current-stop">
                <h3>Next Stop: {activeTour.stops[currentStop].name}</h3>
                <p>{activeTour.stops[currentStop].description}</p>
                
                {userLocation && (
                  <div className="distance-info">
                    <i className="fas fa-map-marker-alt"></i>
                    {/* Display distance to next stop */}
                  </div>
                )}
              </div>
              
              <button className="btn btn-danger mt-3" onClick={handleTourCompletion}>
                End Tour
              </button>
            </div>
          </div>
        ) : (
          <div className="tour-selection">
            {selectedTour ? (
              <div className="tour-details">
                <div className="row">
                  <div className="col-md-6">
                    <div className="tour-info-card">
                      <h2>{selectedTour.name}</h2>
                      <div className="tour-meta">
                        <span className="tour-duration">
                          <i className="fas fa-clock me-1"></i>
                          {formatDuration(selectedTour.duration)}
                        </span>
                        <span className="tour-distance">
                          <i className="fas fa-route me-1"></i>
                          {formatDistance(selectedTour.distance)}
                        </span>
                        <span className="tour-stops">
                          <i className="fas fa-map-marker-alt me-1"></i>
                          {selectedTour.stops.length} Stops
                        </span>
                      </div>
                      
                      <div className="tour-description">
                        <p>{selectedTour.description}</p>
                      </div>
                      
                      <div className="tour-difficulty">
                        <h5>Difficulty</h5>
                        <div className={`difficulty-badge difficulty-${selectedTour.difficulty.toLowerCase()}`}>
                          {selectedTour.difficulty}
                        </div>
                        <p>{getDifficultyDescription(selectedTour.difficulty)}</p>
                      </div>
                      
                      <div className="tour-themes">
                        <h5>Themes</h5>
                        <div className="theme-tags">
                          {selectedTour.themes.map(theme => (
                            <span key={theme} className="theme-tag">{theme}</span>
                          ))}
                        </div>
                      </div>
                      
                      <button 
                        className="btn btn-primary btn-lg mt-4"
                        onClick={handleStartTour}
                      >
                        Start Tour
                      </button>
                      
                      <button 
                        className="btn btn-outline-secondary mt-4 ms-2"
                        onClick={() => {
                          setSelectedTour(null);
                          navigate('/tours');
                        }}
                      >
                        Back to Tours
                      </button>
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <div className="tour-stops-list">
                      <h3>Tour Stops</h3>
                      <div className="stops-container">
                        {selectedTour.stops.map((stop, index) => (
                          <div key={stop._id} className="stop-item">
                            <div className="stop-number">{index + 1}</div>
                            <div className="stop-content">
                              <h4>{stop.name}</h4>
                              <p>{stop.description.substring(0, 100)}...</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="tours-list">
                <div className="row">
                  {tours.map(tour => (
                    <div key={tour._id} className="col-md-4 mb-4">
                      <div className="tour-card">
                        <div className="tour-image">
                          {tour.image ? (
                            <img src={tour.image} alt={tour.name} />
                          ) : (
                            <div className="placeholder-image">
                              <i className="fas fa-route fa-4x"></i>
                            </div>
                          )}
                        </div>
                        <div className="tour-card-content">
                          <h3>{tour.name}</h3>
                          <div className="tour-stats">
                            <span className="duration">
                              <i className="fas fa-clock me-1"></i>
                              {formatDuration(tour.duration)}
                            </span>
                            <span className="distance">
                              <i className="fas fa-route me-1"></i>
                              {formatDistance(tour.distance)}
                            </span>
                            <span className="stops">
                              <i className="fas fa-map-marker-alt me-1"></i>
                              {tour.stops.length} Stops
                            </span>
                          </div>
                          <p className="tour-excerpt">{tour.description.substring(0, 100)}...</p>
                          <div className={`difficulty-badge difficulty-${tour.difficulty.toLowerCase()}`}>
                            {tour.difficulty}
                          </div>
                          <button 
                            className="btn btn-primary mt-3"
                            onClick={() => handleSelectTour(tour._id)}
                          >
                            View Tour
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Map */}
      <div id="tourMapContainer" ref={mapContainerRef} className="tour-map"></div>
      
      {/* Tour Completion Modal */}
      <div className="modal fade" id="tourCompletionModal" tabIndex="-1" aria-labelledby="tourCompletionModalLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="tourCompletionModalLabel">Tour Completed!</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <div className="tour-completion-content">
                <div className="completion-icon">
                  <i className="fas fa-trophy fa-4x text-success"></i>
                </div>
                <h3>Congratulations!</h3>
                <p>You've completed the "{activeTour?.name}" tour.</p>
                
                <div className="rating-form mt-4">
                  <h4>How would you rate this tour?</h4>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span 
                        key={star}
                        className={`star ${reviewData.rating >= star ? 'active' : ''}`}
                        onClick={() => handleRatingChange(star)}
                      >
                        <i className="fas fa-star"></i>
                      </span>
                    ))}
                  </div>
                  
                  <div className="form-group mt-3">
                    <label htmlFor="tourComment">Comments (optional)</label>
                    <textarea 
                      className="form-control" 
                      id="tourComment"
                      rows="3"
                      placeholder="Share your experience..."
                      value={reviewData.comment}
                      onChange={handleCommentChange}
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSubmitCompletion}>Submit</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for difficulty descriptions
const getDifficultyDescription = (difficulty) => {
  const descriptions = {
    Easy: 'Suitable for all ages and fitness levels. Mostly flat terrain with minimal stairs.',
    Moderate: 'Some hills and stairs. Recommended for visitors with average fitness.',
    Challenging: 'Steep hills and multiple flights of stairs. Recommended for active visitors.',
    default: 'Suitable for most visitors.'
  };
  
  return descriptions[difficulty] || descriptions.default;
};

export default SelfGuidedTour;
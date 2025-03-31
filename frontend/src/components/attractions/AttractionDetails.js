import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAttractionById, submitAttractionReview, saveItem } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/helpers';
import '../../cssStyles/attractions/AttractionDetails.css'

const AttractionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [attraction, setAttraction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [reviewFormVisible, setReviewFormVisible] = useState(false);
  const [reviewFormData, setReviewFormData] = useState({
    rating: 5,
    comment: ''
  });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch attraction details
  useEffect(() => {
    const fetchAttraction = async () => {
      try {
        setLoading(true);
        const data = await getAttractionById(id);
        setAttraction(data);
        
        // Check if user already reviewed this attraction
        if (data.reviews && user) {
          const userReview = data.reviews.find(review => review.user === user.id);
          if (userReview) {
            setReviewFormData({
              rating: userReview.rating,
              comment: userReview.comment
            });
          }
        }
        
        // Check if this attraction is saved by the user
        if (user && user.savedItems && user.savedItems.attractions) {
          setSaved(user.savedItems.attractions.includes(id));
        }
      } catch (err) {
        console.error('Error fetching attraction details:', err);
        setError('Failed to load attraction details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchAttraction();
    }
  }, [id, user]);

  // Handle image navigation
  const handleImageNav = (index) => {
    setActiveImageIndex(index);
  };

  // Handle review form toggle
  const toggleReviewForm = () => {
    setReviewFormVisible(!reviewFormVisible);
  };

  // Handle review form changes
  const handleReviewChange = (e) => {
    const { name, value } = e.target;
    setReviewFormData(prev => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value) : value
    }));
  };

  // Handle review submission
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewError(null);
    
    if (!reviewFormData.rating) {
      setReviewError('Please select a rating');
      return;
    }
    
    try {
      setReviewLoading(true);
      const response = await submitAttractionReview(id, reviewFormData);
      
      // Update attraction with new review data
      setAttraction(prev => ({
        ...prev,
        rating: response.rating
      }));
      
      // Hide review form after successful submission
      setReviewFormVisible(false);
      
      // Show success toast
      // In a real application, you would use a toast component
      alert('Review submitted successfully!');
    } catch (err) {
      console.error('Error submitting review:', err);
      setReviewError('Failed to submit review. Please try again.');
    } finally {
      setReviewLoading(false);
    }
  };

  // Handle saving attraction
  const handleSaveAttraction = async () => {
    try {
      setSaveLoading(true);
      
      if (saved) {
        // Unsave functionality would be implemented here
        setSaved(false);
      } else {
        await saveItem({
          itemType: 'attraction',
          itemId: id
        });
        setSaved(true);
      }
    } catch (err) {
      console.error('Error saving attraction:', err);
      alert('Failed to save attraction. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="attraction-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading attraction details...</p>
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
  if (!attraction) {
    return (
      <div className="empty-state">
        <i className="fas fa-map-marker-alt"></i>
        <p>Attraction not found</p>
        <Link to="/attractions" className="btn btn-primary">
          Browse Attractions
        </Link>
      </div>
    );
  }

  return (
    <div className="attraction-details-container">
      <div className="attraction-details-header">
        <div className="back-button">
          <button 
            className="btn btn-outline-primary"
            onClick={() => navigate(-1)}
          >
            <i className="fas fa-arrow-left me-2"></i>
            Back
          </button>
        </div>
        
        <h1 className="attraction-title">{attraction.name}</h1>
        
        <div className="attraction-meta">
          <div className="attraction-category">
            <span className="badge bg-primary">
              {getCategoryLabel(attraction.category)}
            </span>
            {attraction.subCategory && (
              <span className="badge bg-secondary ms-2">
                {attraction.subCategory}
              </span>
            )}
          </div>
          
          <div className="attraction-rating">
            <div className="stars">
              {renderStarRating(attraction.rating?.average || 0)}
            </div>
            <span className="rating-number">
              {attraction.rating?.average?.toFixed(1) || 'N/A'}
            </span>
            <span className="review-count">
              ({attraction.rating?.count || 0} reviews)
            </span>
          </div>
          
          {attraction.price && (
            <div className="attraction-price">
              <span className="price-level">
                {renderPriceLevel(attraction.price.level)}
              </span>
              {attraction.price.description && (
                <span className="price-description ms-2">
                  {attraction.price.description}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="row">
        <div className="col-lg-8">
          {/* Image Gallery */}
          <div className="attraction-gallery">
            <div className="main-image">
              {attraction.images && attraction.images.length > 0 ? (
                <img 
                  src={attraction.images[activeImageIndex].url} 
                  alt={attraction.images[activeImageIndex].caption || attraction.name} 
                  className="img-fluid rounded"
                />
              ) : (
                <div className="placeholder-image">
                  <i className="fas fa-image"></i>
                  <p>No images available</p>
                </div>
              )}
            </div>
            
            {attraction.images && attraction.images.length > 1 && (
              <div className="thumbnail-carousel">
                {attraction.images.map((image, index) => (
                  <div 
                    key={index} 
                    className={`thumbnail ${index === activeImageIndex ? 'active' : ''}`}
                    onClick={() => handleImageNav(index)}
                  >
                    <img 
                      src={image.url} 
                      alt={image.caption || `${attraction.name} ${index + 1}`} 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Description */}
          <div className="attraction-description card mt-4">
            <div className="card-body">
              <h2 className="card-title">About</h2>
              <p>{attraction.description}</p>
              
              {/* Amenities */}
              {attraction.amenities && attraction.amenities.length > 0 && (
                <div className="attraction-amenities mt-4">
                  <h3>Amenities</h3>
                  <div className="amenities-list">
                    {attraction.amenities.map((amenity, index) => (
                      <span key={index} className="amenity-badge">
                        <i className={`fas ${getAmenityIcon(amenity)}`}></i> {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Accessibility */}
              {attraction.accessibility && (
                <div className="attraction-accessibility mt-4">
                  <h3>Accessibility</h3>
                  <ul className="accessibility-list">
                    {attraction.accessibility.wheelchairAccessible && (
                      <li>
                        <i className="fas fa-wheelchair"></i> Wheelchair Accessible
                      </li>
                    )}
                    {attraction.accessibility.brailleSignage && (
                      <li>
                        <i className="fas fa-braille"></i> Braille Signage
                      </li>
                    )}
                    {attraction.accessibility.audioGuides && (
                      <li>
                        <i className="fas fa-headphones"></i> Audio Guides
                      </li>
                    )}
                    {attraction.accessibility.serviceAnimalsAllowed && (
                      <li>
                        <i className="fas fa-dog"></i> Service Animals Allowed
                      </li>
                    )}
                    {attraction.accessibility.accessibilityRating && (
                      <li>
                        <i className="fas fa-star"></i> Accessibility Rating: {attraction.accessibility.accessibilityRating}/5
                      </li>
                    )}
                  </ul>
                </div>
              )}
              
              {/* Tags */}
              {attraction.tags && attraction.tags.length > 0 && (
                <div className="attraction-tags mt-4">
                  <h3>Tags</h3>
                  <div className="tags-list">
                    {attraction.tags.map((tag, index) => (
                      <span key={index} className="tag-badge">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Reviews */}
          <div className="attraction-reviews card mt-4">
            <div className="card-body">
              <div className="reviews-header">
                <h2 className="card-title">Reviews</h2>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={toggleReviewForm}
                >
                  <i className="fas fa-star me-1"></i>
                  Write a Review
                </button>
              </div>
              
              {/* Review Form */}
              {reviewFormVisible && (
                <div className="review-form-container mt-3">
                  <form onSubmit={handleReviewSubmit}>
                    {reviewError && (
                      <div className="alert alert-danger">
                        {reviewError}
                      </div>
                    )}
                    
                    <div className="mb-3">
                      <label htmlFor="rating" className="form-label">Your Rating</label>
                      <div className="rating-input">
                        {[5, 4, 3, 2, 1].map(value => (
                          <div key={value} className="form-check form-check-inline">
                            <input 
                              className="form-check-input" 
                              type="radio" 
                              name="rating" 
                              id={`rating-${value}`} 
                              value={value}
                              checked={reviewFormData.rating === value}
                              onChange={handleReviewChange}
                            />
                            <label className="form-check-label" htmlFor={`rating-${value}`}>
                              {value} <i className="fas fa-star text-warning"></i>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="comment" className="form-label">Your Review</label>
                      <textarea 
                        className="form-control" 
                        id="comment" 
                        name="comment"
                        rows="4"
                        value={reviewFormData.comment}
                        onChange={handleReviewChange}
                        placeholder="Share your experience with this attraction"
                      ></textarea>
                    </div>
                    
                    <div className="d-flex justify-content-end">
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary me-2"
                        onClick={toggleReviewForm}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={reviewLoading}
                      >
                        {reviewLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Submitting...
                          </>
                        ) : 'Submit Review'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
              
              {/* Reviews List */}
              {attraction.reviews && attraction.reviews.length > 0 ? (
                <div className="reviews-list mt-4">
                  {attraction.reviews.map((review, index) => (
                    <div key={index} className="review-item">
                      <div className="review-header">
                        <div className="reviewer-info">
                          <div className="reviewer-avatar">
                            {review.user.avatar ? (
                              <img 
                                src={review.user.avatar} 
                                alt={`${review.user.firstName} ${review.user.lastName}`} 
                                className="rounded-circle"
                              />
                            ) : (
                              <div className="avatar-placeholder">
                                {review.user.firstName.charAt(0)}{review.user.lastName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="reviewer-details">
                            <div className="reviewer-name">
                              {review.user.firstName} {review.user.lastName}
                            </div>
                            <div className="review-date">
                              {formatDate(new Date(review.date))}
                            </div>
                          </div>
                        </div>
                        <div className="review-rating">
                          {Array.from({ length: review.rating }, (_, i) => (
                            <i key={i} className="fas fa-star text-warning"></i>
                          ))}
                        </div>
                      </div>
                      <div className="review-content">
                        <p>{review.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-reviews mt-4">
                  <p>No reviews yet. Be the first to share your experience!</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="col-lg-4">
          {/* Action Buttons */}
          <div className="action-buttons">
            <Link 
              to={`/map?attraction=${attraction._id}`} 
              className="btn btn-primary btn-lg w-100 mb-3"
            >
              <i className="fas fa-map-marker-alt me-2"></i>
              View on Map
            </Link>
            
            <button 
              className={`btn btn-outline-primary btn-lg w-100 mb-3 ${saved ? 'saved' : ''}`}
              onClick={handleSaveAttraction}
              disabled={saveLoading}
            >
              {saveLoading ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              ) : (
                <i className={`${saved ? 'fas' : 'far'} fa-bookmark me-2`}></i>
              )}
              {saved ? 'Saved' : 'Save'}
            </button>
            
            <Link 
              to={`/directions?to=${attraction._id}&type=attraction`} 
              className="btn btn-outline-secondary btn-lg w-100"
            >
              <i className="fas fa-directions me-2"></i>
              Get Directions
            </Link>
          </div>
          
          {/* Info Card */}
          <div className="info-card card mt-4">
            <div className="card-body">
              <h3 className="card-title">Information</h3>
              
              {/* Address */}
              {attraction.address && (
                <div className="info-item">
                  <div className="info-icon">
                    <i className="fas fa-map-marker-alt"></i>
                  </div>
                  <div className="info-content">
                    <div className="info-label">Address</div>
                    <div className="info-value">
                      {attraction.address.street}<br />
                      {attraction.address.city}, {attraction.address.state} {attraction.address.postalCode}<br />
                      {attraction.address.country}
                    </div>
                    <a 
                      href={`https://maps.google.com/maps?q=${encodeURIComponent(
                        `${attraction.address.street}, ${attraction.address.city}, ${attraction.address.state} ${attraction.address.postalCode}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary small"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              )}
              
              {/* Contact Info */}
              {attraction.contactInfo && (
                <>
                  {attraction.contactInfo.phone && (
                    <div className="info-item">
                      <div className="info-icon">
                        <i className="fas fa-phone"></i>
                      </div>
                      <div className="info-content">
                        <div className="info-label">Phone</div>
                        <div className="info-value">
                          <a href={`tel:${attraction.contactInfo.phone}`}>
                            {attraction.contactInfo.phone}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {attraction.contactInfo.email && (
                    <div className="info-item">
                      <div className="info-icon">
                        <i className="fas fa-envelope"></i>
                      </div>
                      <div className="info-content">
                        <div className="info-label">Email</div>
                        <div className="info-value">
                          <a href={`mailto:${attraction.contactInfo.email}`}>
                            {attraction.contactInfo.email}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {attraction.contactInfo.website && (
                    <div className="info-item">
                      <div className="info-icon">
                        <i className="fas fa-globe"></i>
                      </div>
                      <div className="info-content">
                        <div className="info-label">Website</div>
                        <div className="info-value">
                          <a 
                            href={attraction.contactInfo.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {formatWebsiteUrl(attraction.contactInfo.website)}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Hours of Operation */}
              {attraction.hoursOfOperation && attraction.hoursOfOperation.length > 0 && (
                <div className="info-item">
                  <div className="info-icon">
                    <i className="fas fa-clock"></i>
                  </div>
                  <div className="info-content">
                    <div className="info-label">Hours</div>
                    <div className="hours-list">
                      {attraction.hoursOfOperation.map((hours, index) => (
                        <div key={index} className="hours-item">
                          <span className="day">{capitalizeFirstLetter(hours.day)}</span>
                          <span className="hours">
                            {hours.isClosed ? (
                              <span className="text-danger">Closed</span>
                            ) : (
                              `${hours.open} - ${hours.close}`
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Specific Info for Food & Beverage */}
              {attraction.category === 'food' && attraction.foodOptions && (
                <>
                  {attraction.foodOptions.cuisine && attraction.foodOptions.cuisine.length > 0 && (
                    <div className="info-item">
                      <div className="info-icon">
                        <i className="fas fa-utensils"></i>
                      </div>
                      <div className="info-content">
                        <div className="info-label">Cuisine</div>
                        <div className="info-value">
                          {attraction.foodOptions.cuisine.join(', ')}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {attraction.foodOptions.dietaryOptions && attraction.foodOptions.dietaryOptions.length > 0 && (
                    <div className="info-item">
                      <div className="info-icon">
                        <i className="fas fa-leaf"></i>
                      </div>
                      <div className="info-content">
                        <div className="info-label">Dietary Options</div>
                        <div className="info-value">
                          {attraction.foodOptions.dietaryOptions.join(', ')}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="info-item">
                    <div className="info-icon">
                      <i className="fas fa-info-circle"></i>
                    </div>
                    <div className="info-content">
                      <div className="info-label">Services</div>
                      <div className="info-value services-list">
                        <span className={`service-tag ${attraction.foodOptions.takeout ? 'available' : 'unavailable'}`}>
                          <i className={`fas fa-${attraction.foodOptions.takeout ? 'check-circle' : 'times-circle'}`}></i> Takeout
                        </span>
                        <span className={`service-tag ${attraction.foodOptions.delivery ? 'available' : 'unavailable'}`}>
                          <i className={`fas fa-${attraction.foodOptions.delivery ? 'check-circle' : 'times-circle'}`}></i> Delivery
                        </span>
                        <span className={`service-tag ${attraction.foodOptions.reservations ? 'available' : 'unavailable'}`}>
                          <i className={`fas fa-${attraction.foodOptions.reservations ? 'check-circle' : 'times-circle'}`}></i> Reservations
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {/* Specific Info for Retail */}
              {attraction.category === 'retail' && attraction.retailInfo && (
                <>
                  {attraction.retailInfo.brands && attraction.retailInfo.brands.length > 0 && (
                    <div className="info-item">
                      <div className="info-icon">
                        <i className="fas fa-tags"></i>
                      </div>
                      <div className="info-content">
                        <div className="info-label">Brands</div>
                        <div className="info-value">
                          {attraction.retailInfo.brands.join(', ')}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {attraction.retailInfo.paymentMethods && attraction.retailInfo.paymentMethods.length > 0 && (
                    <div className="info-item">
                      <div className="info-icon">
                        <i className="fas fa-credit-card"></i>
                      </div>
                      <div className="info-content">
                        <div className="info-label">Payment Methods</div>
                        <div className="info-value">
                          {attraction.retailInfo.paymentMethods.join(', ')}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Nearby Attractions */}
          <div className="nearby-attractions card mt-4">
            <div className="card-body">
              <h3 className="card-title">Nearby Attractions</h3>
              <p className="text-center text-muted small">
                This feature will display nearby attractions based on location.
              </p>
              <Link to="/attractions" className="btn btn-outline-primary btn-sm w-100">
                Browse All Attractions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get category label
const getCategoryLabel = (category) => {
  const labels = {
    landmark: 'Landmark',
    food: 'Food & Dining',
    retail: 'Shopping',
    recreation: 'Recreation',
    entertainment: 'Entertainment',
    education: 'Education',
    service: 'Service',
    other: 'Other'
  };
  
  return labels[category] || category;
};

// Helper function to render star rating
const renderStarRating = (rating) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  
  // Full stars
  for (let i = 0; i < fullStars; i++) {
    stars.push(<i key={`full-${i}`} className="fas fa-star"></i>);
  }
  
  // Half star
  if (halfStar) {
    stars.push(<i key="half" className="fas fa-star-half-alt"></i>);
  }
  
  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<i key={`empty-${i}`} className="far fa-star"></i>);
  }
  
  return stars;
};

// Helper function to render price level
const renderPriceLevel = (level) => {
  const levels = {
    0: 'Free',
    1: '$',
    2: '$$',
    3: '$$$',
    4: '$$$$'
  };
  
  return levels[level] || '';
};

// Helper function to get amenity icon
const getAmenityIcon = (amenity) => {
  const icons = {
    'Wi-Fi': 'fa-wifi',
    'Parking': 'fa-parking',
    'Restrooms': 'fa-toilet',
    'Air Conditioning': 'fa-snowflake',
    'ATM': 'fa-money-bill-wave',
    'Baby Changing': 'fa-baby',
    'Pet Friendly': 'fa-paw',
    'Smoking Area': 'fa-smoking',
    'Gift Shop': 'fa-gift',
    'Coat Check': 'fa-tshirt'
  };
  
  return icons[amenity] || 'fa-check-circle';
};

// Helper function to format website URL for display
const formatWebsiteUrl = (url) => {
  return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
};

// Helper function to capitalize first letter
const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export default AttractionDetails;

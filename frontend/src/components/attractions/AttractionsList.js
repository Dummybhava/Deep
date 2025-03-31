import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAttractions } from '../../services/api';
import '../../cssStyles/attractions/AttractionsList.css'

const AttractionsList = () => {
  const [attractions, setAttractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 1
  });
  const [filters, setFilters] = useState({
    category: '',
    featured: false,
    sort: 'name'
  });

  // Fetch attractions on component mount and when filters or pagination changes
  useEffect(() => {
    const fetchAttractions = async () => {
      try {
        setLoading(true);
        
        // Build query parameters
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          ...filters
        };
        
        const response = await getAttractions(params);
        
        setAttractions(response.attractions || []);
        setPagination({
          ...pagination,
          total: response.pagination?.total || 0,
          pages: response.pagination?.pages || 1
        });
      } catch (err) {
        console.error('Error fetching attractions:', err);
        setError('Failed to load attractions. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAttractions();
  }, [pagination.page, pagination.limit, filters]);

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

  // Handle page change
  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
    
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render loading state
  if (loading && attractions.length === 0) {
    return (
      <div className="attractions-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading attractions...</p>
      </div>
    );
  }

  // Render error state
  if (error && attractions.length === 0) {
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
    <div className="attractions-container">
      <div className="attractions-header">
        <h1>
          <i className="fas fa-map-marker-alt me-2"></i>
          Attractions
        </h1>
        <p className="lead">Discover amazing places in Smart City</p>
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
              <option value="landmark">Landmarks</option>
              <option value="food">Food & Dining</option>
              <option value="retail">Shopping</option>
              <option value="recreation">Recreation</option>
              <option value="entertainment">Entertainment</option>
              <option value="education">Education</option>
              <option value="service">Services</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="col-md-3">
            <label htmlFor="sort" className="form-label">Sort By</label>
            <select 
              id="sort" 
              name="sort" 
              className="form-select"
              value={filters.sort}
              onChange={handleFilterChange}
            >
              <option value="name">Name (A-Z)</option>
              <option value="-name">Name (Z-A)</option>
              <option value="-rating.average">Rating (High to Low)</option>
              <option value="rating.average">Rating (Low to High)</option>
            </select>
          </div>
          
          <div className="col-md-3 d-flex align-items-end">
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
          
          <div className="col-md-3 d-flex align-items-end justify-content-end">
            <span className="text-muted">
              Showing {attractions.length} of {pagination.total} attractions
            </span>
          </div>
        </div>
      </div>
      
      {/* Attractions Grid */}
      {attractions.length > 0 ? (
        <div className="attractions-grid">
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {attractions.map(attraction => (
              <div key={attraction._id} className="col">
                <div className="attraction-card">
                  <Link to={`/attractions/${attraction._id}`} className="attraction-image">
                    {attraction.images && attraction.images.length > 0 ? (
                      <img 
                        src={attraction.images[0].url} 
                        alt={attraction.name} 
                        className="card-img-top"
                      />
                    ) : (
                      <div className="placeholder-image">
                        <i className="fas fa-image"></i>
                      </div>
                    )}
                    
                    {attraction.featured && (
                      <div className="featured-badge">
                        <i className="fas fa-star"></i> Featured
                      </div>
                    )}
                    
                    <div className="attraction-category">
                      <span className="badge bg-primary">
                        {getCategoryLabel(attraction.category)}
                      </span>
                    </div>
                  </Link>
                  
                  <div className="card-body">
                    <h3 className="attraction-name">
                      <Link to={`/attractions/${attraction._id}`}>
                        {attraction.name}
                      </Link>
                    </h3>
                    
                    <div className="attraction-rating">
                      <div className="stars">
                        {renderStarRating(attraction.rating?.average || 0)}
                      </div>
                      <span className="rating-number">
                        {attraction.rating?.average?.toFixed(1) || 'N/A'}
                      </span>
                      <span className="text-muted">
                        ({attraction.rating?.count || 0} reviews)
                      </span>
                    </div>
                    
                    {attraction.price && (
                      <div className="attraction-price">
                        <span className="price-level">
                          {renderPriceLevel(attraction.price.level)}
                        </span>
                        <span className="price-description">
                          {attraction.price.description}
                        </span>
                      </div>
                    )}
                    
                    <p className="attraction-description">
                      {attraction.shortDescription}
                    </p>
                    
                    <div className="attraction-footer">
                      <Link to={`/attractions/${attraction._id}`} className="btn btn-outline-primary">
                        View Details
                      </Link>
                      <Link to={`/map?attraction=${attraction._id}`} className="btn btn-outline-secondary">
                        <i className="fas fa-map-marker-alt"></i> Map
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state mt-5">
          <i className="fas fa-search"></i>
          <p>No attractions found matching your filters</p>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setFilters({
                category: '',
                featured: false,
                sort: 'name'
              });
            }}
          >
            Clear Filters
          </button>
        </div>
      )}
      
      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination-container">
          <nav aria-label="Attractions pagination">
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

export default AttractionsList;

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { searchPOI, getNearbyAttractions } from '../../services/api';
import { initializeMap, addTileLayer, addPOIMarker } from '../../services/map';
import { debounce } from '../../utils/helpers';
import '../../cssStyles/maps/POISearch.css'

const POISearch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchQuery = new URLSearchParams(location.search).get('q') || '';
  
  const mapContainerRef = useRef(null);
  const resultsContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [userLocation, setUserLocation] = useState(null);
  const [filters, setFilters] = useState({
    category: 'all',
    sortBy: 'relevance',
    maxDistance: 5 // kilometers
  });
  
  // Initialize map on component mount
  useEffect(() => {
    const setupMap = async () => {
      try {
        // Get user location if available
        navigator.geolocation.getCurrentPosition(
          position => {
            setUserLocation([position.coords.latitude, position.coords.longitude]);
          },
          error => {
            console.warn('Error getting location:', error);
            // Default to Morgantown, WV
            setUserLocation([39.6365, -79.9545]);
          }
        );
        
        // Initialize map instance
        const mapInstance = await initializeMap('searchMapContainer', {
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
    
    setupMap();
    
    // Initial search if query parameter exists
    if (searchQuery) {
      performSearch(searchQuery);
    }
    
    // Cleanup function
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [searchQuery]);
  
  // Debounced search function
  const debouncedSearch = debounce((term) => {
    if (term.length >= 2) {
      performSearch(term);
      // Update URL with search query
      navigate(`/search?q=${encodeURIComponent(term)}`, { replace: true });
    } else if (term.length === 0) {
      setSearchResults([]);
      navigate('/search', { replace: true });
    }
  }, 300);
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    debouncedSearch(e.target.value);
  };
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Re-run search with new filters
    if (searchTerm.length >= 2) {
      performSearch(searchTerm);
    }
  };
  
  // Perform search
  const performSearch = async (term) => {
    try {
      setLoading(true);
      setError(null);
      
      // Search for points of interest
      const results = await searchPOI(term, { ...filters, limit: 20 });
      
      setSearchResults(results || []);
      
      // Update map with markers
      if (map && results && results.length > 0) {
        // Clear existing markers
        map.eachLayer(layer => {
          if (layer._icon) {
            map.removeLayer(layer);
          }
        });
        
        // Create marker group
        const markers = L.layerGroup();
        
        // Add markers for each result
        results.forEach(poi => {
          if (poi.location && poi.location.coordinates) {
            const marker = addPOIMarker(poi, markers);
            
            // Set popup content
            marker.bindPopup(`
              <div class="poi-popup">
                <h5>${poi.name}</h5>
                <p>${poi.category} ${poi.subCategory ? `- ${poi.subCategory}` : ''}</p>
                ${poi.description ? `<p>${poi.description.substring(0, 100)}...</p>` : ''}
                <a href="/attractions/${poi._id}" class="btn btn-sm btn-primary">View Details</a>
              </div>
            `);
          }
        });
        
        // Add marker group to map
        markers.addTo(map);
        
        // Fit map to marker bounds if there are markers
        if (markers.getLayers().length > 0) {
          const group = L.featureGroup(markers.getLayers());
          map.fitBounds(group.getBounds().pad(0.1));
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error performing search:', err);
      setError('Failed to perform search. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle result item click
  const handleResultClick = (poi) => {
    // Pan map to POI location
    if (map && poi.location && poi.location.coordinates) {
      const [lng, lat] = poi.location.coordinates;
      map.setView([lat, lng], 17);
      
      // Find marker and open popup
      map.eachLayer(layer => {
        if (layer._icon && layer.options.poiId === poi._id) {
          layer.openPopup();
        }
      });
    }
    
    // Scroll to top of results list
    if (resultsContainerRef.current) {
      resultsContainerRef.current.scrollTop = 0;
    }
  };
  
  return (
    <div className="poi-search-container">
      <div className="search-header">
        <h1>
          <i className="fas fa-search me-2"></i>
          Point of Interest Search
        </h1>
        <p className="lead">Find attractions, dining, shopping, and more</p>
      </div>
      
      <div className="search-form">
        <div className="input-group mb-3">
          <span className="input-group-text">
            <i className="fas fa-search"></i>
          </span>
          <input 
            type="text" 
            className="form-control form-control-lg"
            placeholder="Search for attractions, restaurants, shops, etc."
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {searchTerm && (
            <button 
              className="btn btn-outline-secondary" 
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSearchResults([]);
                navigate('/search', { replace: true });
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
        
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <label htmlFor="category" className="form-label">Category</label>
            <select 
              id="category" 
              name="category" 
              className="form-select"
              value={filters.category}
              onChange={handleFilterChange}
            >
              <option value="all">All Categories</option>
              <option value="attraction">Attractions</option>
              <option value="dining">Dining</option>
              <option value="shopping">Shopping</option>
              <option value="transportation">Transportation</option>
              <option value="services">Services</option>
            </select>
          </div>
          
          <div className="col-md-4">
            <label htmlFor="sortBy" className="form-label">Sort By</label>
            <select 
              id="sortBy" 
              name="sortBy" 
              className="form-select"
              value={filters.sortBy}
              onChange={handleFilterChange}
            >
              <option value="relevance">Relevance</option>
              <option value="distance">Distance</option>
              <option value="name">Name (A-Z)</option>
              <option value="rating">Rating (High to Low)</option>
            </select>
          </div>
          
          <div className="col-md-4">
            <label htmlFor="maxDistance" className="form-label">Max Distance (km)</label>
            <select 
              id="maxDistance" 
              name="maxDistance" 
              className="form-select"
              value={filters.maxDistance}
              onChange={handleFilterChange}
            >
              <option value="1">1 km</option>
              <option value="2">2 km</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
              <option value="20">20 km</option>
              <option value="50">50 km</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="search-content">
        <div className="row">
          <div className="col-md-4">
            <div className="search-results" ref={resultsContainerRef}>
              {loading && (
                <div className="search-loading">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Searching...</span>
                  </div>
                  <p>Searching...</p>
                </div>
              )}
              
              {error && (
                <div className="alert alert-danger">
                  <i className="fas fa-exclamation-circle me-2"></i>
                  {error}
                </div>
              )}
              
              {!loading && !error && searchResults.length === 0 && searchTerm && (
                <div className="no-results">
                  <i className="fas fa-search fa-3x mb-3"></i>
                  <h3>No results found</h3>
                  <p>Try different keywords or filters</p>
                </div>
              )}
              
              {!loading && !error && searchResults.length === 0 && !searchTerm && (
                <div className="search-instructions">
                  <i className="fas fa-info-circle fa-3x mb-3"></i>
                  <h3>Start searching</h3>
                  <p>Enter keywords above to search for points of interest</p>
                  <p>You can search by name, category, or description</p>
                </div>
              )}
              
              {!loading && !error && searchResults.length > 0 && (
                <>
                  <div className="results-count mb-3">
                    Found {searchResults.length} results for "{searchTerm}"
                  </div>
                  <div className="results-list">
                    {searchResults.map(poi => (
                      <div 
                        key={poi._id} 
                        className="result-item"
                        onClick={() => handleResultClick(poi)}
                      >
                        <div className="result-icon">
                          <i className={getCategoryIcon(poi.category)}></i>
                        </div>
                        <div className="result-content">
                          <h3 className="result-title">{poi.name}</h3>
                          <div className="result-meta">
                            <span className="result-category">
                              {poi.category} {poi.subCategory ? `- ${poi.subCategory}` : ''}
                            </span>
                            {poi.distance && (
                              <span className="result-distance">
                                {formatDistance(poi.distance)}
                              </span>
                            )}
                          </div>
                          {poi.description && (
                            <p className="result-description">
                              {poi.description.substring(0, 100)}...
                            </p>
                          )}
                          <div className="result-actions">
                            <a href={`/attractions/${poi._id}`} className="btn btn-sm btn-outline-primary">View Details</a>
                            <button className="btn btn-sm btn-outline-secondary">
                              <i className="fas fa-map-marker-alt"></i> Show on Map
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="col-md-8">
            <div id="searchMapContainer" className="search-map"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get category icon
const getCategoryIcon = (category) => {
  const icons = {
    attraction: 'fas fa-building',
    dining: 'fas fa-utensils',
    shopping: 'fas fa-shopping-bag',
    transportation: 'fas fa-subway',
    services: 'fas fa-concierge-bell',
    default: 'fas fa-map-marker-alt'
  };
  
  return icons[category.toLowerCase()] || icons.default;
};

// Helper function to format distance
const formatDistance = (distance) => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  }
  return `${distance.toFixed(1)} km`;
};

export default POISearch;
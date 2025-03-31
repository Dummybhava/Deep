import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../cssStyles/admin/ContentManagement.css';
import { addAttraction, updateAttraction, deleteAttraction, addEvent, updateEvent, deleteEvent } from '../../services/api';

const ContentManagement = () => {
  const [activeTab, setActiveTab] = useState('attractions');
  const [attractions, setAttractions] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    subCategory: '',
    image: '',
    location: {
      coordinates: [0, 0],
      address: ''
    },
    // Attraction specific fields
    hours: '',
    phone: '',
    website: '',
    accessibility: {
      wheelchairAccessible: false,
      hearingAccessible: false,
      visualAccessible: false
    },
    // Event specific fields
    startDate: '',
    endDate: '',
    venue: '',
    ticketPrice: '',
    organizer: '',
    status: 'upcoming'
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  
  // Load attractions and events on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch attractions
        const attractionsResponse = await axios.get('/api/attractions', { params: { limit: 100 } });
        setAttractions(attractionsResponse.data || []);
        
        // Fetch events
        const eventsResponse = await axios.get('/api/events', { params: { limit: 100 } });
        setEvents(eventsResponse.data || []);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching content:', err);
        setError('Failed to load content. Please try again.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Set form data when selected item changes
  useEffect(() => {
    if (selectedItem) {
      if (activeTab === 'attractions') {
        setFormData({
          name: selectedItem.name || '',
          description: selectedItem.description || '',
          category: selectedItem.category || '',
          subCategory: selectedItem.subCategory || '',
          image: selectedItem.image || '',
          location: {
            coordinates: selectedItem.location?.coordinates || [0, 0],
            address: selectedItem.location?.address || ''
          },
          hours: selectedItem.hours || '',
          phone: selectedItem.phone || '',
          website: selectedItem.website || '',
          accessibility: {
            wheelchairAccessible: selectedItem.accessibility?.wheelchairAccessible || false,
            hearingAccessible: selectedItem.accessibility?.hearingAccessible || false,
            visualAccessible: selectedItem.accessibility?.visualAccessible || false
          }
        });
      } else if (activeTab === 'events') {
        setFormData({
          name: selectedItem.name || '',
          description: selectedItem.description || '',
          category: selectedItem.category || '',
          subCategory: selectedItem.subCategory || '',
          image: selectedItem.image || '',
          location: {
            coordinates: selectedItem.location?.coordinates || [0, 0],
            address: selectedItem.location?.address || ''
          },
          startDate: selectedItem.startDate ? new Date(selectedItem.startDate).toISOString().slice(0, 16) : '',
          endDate: selectedItem.endDate ? new Date(selectedItem.endDate).toISOString().slice(0, 16) : '',
          venue: selectedItem.venue || '',
          ticketPrice: selectedItem.ticketPrice || '',
          organizer: selectedItem.organizer || '',
          status: selectedItem.status || 'upcoming'
        });
      }
      
      setImagePreview(selectedItem.image || '');
    }
  }, [selectedItem, activeTab]);
  
  // Clear selection and form when changing tabs
  useEffect(() => {
    setSelectedItem(null);
    setEditMode(false);
    resetForm();
  }, [activeTab]);
  
  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      subCategory: '',
      image: '',
      location: {
        coordinates: [0, 0],
        address: ''
      },
      // Attraction specific fields
      hours: '',
      phone: '',
      website: '',
      accessibility: {
        wheelchairAccessible: false,
        hearingAccessible: false,
        visualAccessible: false
      },
      // Event specific fields
      startDate: '',
      endDate: '',
      venue: '',
      ticketPrice: '',
      organizer: '',
      status: 'upcoming'
    });
    setImageFile(null);
    setImagePreview('');
  };
  
  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilterText('');
  };
  
  // Handle filter input change
  const handleFilterChange = (e) => {
    setFilterText(e.target.value);
  };
  
  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      // Handle nested properties
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle location input
  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'address') {
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          address: value
        }
      }));
    } else if (name === 'latitude' || name === 'longitude') {
      const coords = [...formData.location.coordinates];
      const index = name === 'latitude' ? 1 : 0; // GeoJSON uses [lng, lat] format
      coords[index] = parseFloat(value) || 0;
      
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          coordinates: coords
        }
      }));
    }
  };
  
  // Handle item selection
  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setEditMode(false);
  };
  
  // Handle new item button
  const handleNewItem = () => {
    setSelectedItem(null);
    setEditMode(true);
    resetForm();
  };
  
  // Handle edit button
  const handleEditItem = () => {
    if (!selectedItem) return;
    setEditMode(true);
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditMode(false);
    
    if (selectedItem) {
      // Reset form to selected item
      if (activeTab === 'attractions') {
        setFormData({
          name: selectedItem.name || '',
          description: selectedItem.description || '',
          category: selectedItem.category || '',
          subCategory: selectedItem.subCategory || '',
          image: selectedItem.image || '',
          location: {
            coordinates: selectedItem.location?.coordinates || [0, 0],
            address: selectedItem.location?.address || ''
          },
          hours: selectedItem.hours || '',
          phone: selectedItem.phone || '',
          website: selectedItem.website || '',
          accessibility: {
            wheelchairAccessible: selectedItem.accessibility?.wheelchairAccessible || false,
            hearingAccessible: selectedItem.accessibility?.hearingAccessible || false,
            visualAccessible: selectedItem.accessibility?.visualAccessible || false
          }
        });
      } else if (activeTab === 'events') {
        setFormData({
          name: selectedItem.name || '',
          description: selectedItem.description || '',
          category: selectedItem.category || '',
          subCategory: selectedItem.subCategory || '',
          image: selectedItem.image || '',
          location: {
            coordinates: selectedItem.location?.coordinates || [0, 0],
            address: selectedItem.location?.address || ''
          },
          startDate: selectedItem.startDate ? new Date(selectedItem.startDate).toISOString().slice(0, 16) : '',
          endDate: selectedItem.endDate ? new Date(selectedItem.endDate).toISOString().slice(0, 16) : '',
          venue: selectedItem.venue || '',
          ticketPrice: selectedItem.ticketPrice || '',
          organizer: selectedItem.organizer || '',
          status: selectedItem.status || 'upcoming'
        });
      }
      
      setImagePreview(selectedItem.image || '');
      setImageFile(null);
    } else {
      resetForm();
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      let imageUrl = formData.image;
      
      // Upload image if a new file was selected
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        // Upload image to server
        const uploadResponse = await axios.post('/api/uploads/image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        imageUrl = uploadResponse.data.url;
      }
      
      // Prepare data for submission
      const submissionData = {
        ...formData,
        image: imageUrl
      };
      
      if (activeTab === 'attractions') {
        if (selectedItem) {
          // Update existing attraction
          const updated = await updateAttraction(selectedItem._id, submissionData);
          
          // Update attractions list
          setAttractions(prev => prev.map(item => 
            item._id === selectedItem._id ? updated : item
          ));
          
          // Update selected item
          setSelectedItem(updated);
        } else {
          // Create new attraction
          const created = await addAttraction(submissionData);
          
          // Add to attractions list
          setAttractions(prev => [...prev, created]);
          
          // Select the new item
          setSelectedItem(created);
        }
      } else if (activeTab === 'events') {
        if (selectedItem) {
          // Update existing event
          const updated = await updateEvent(selectedItem._id, submissionData);
          
          // Update events list
          setEvents(prev => prev.map(item => 
            item._id === selectedItem._id ? updated : item
          ));
          
          // Update selected item
          setSelectedItem(updated);
        } else {
          // Create new event
          const created = await addEvent(submissionData);
          
          // Add to events list
          setEvents(prev => [...prev, created]);
          
          // Select the new item
          setSelectedItem(created);
        }
      }
      
      // Exit edit mode
      setEditMode(false);
    } catch (err) {
      console.error('Error saving content:', err);
      setError('Failed to save content. Please try again.');
    }
  };
  
  // Handle delete
  const handleDelete = async () => {
    if (!selectedItem || !window.confirm(`Are you sure you want to delete ${selectedItem.name}?`)) {
      return;
    }
    
    try {
      if (activeTab === 'attractions') {
        // Delete attraction
        await deleteAttraction(selectedItem._id);
        
        // Remove from attractions list
        setAttractions(prev => prev.filter(item => item._id !== selectedItem._id));
      } else if (activeTab === 'events') {
        // Delete event
        await deleteEvent(selectedItem._id);
        
        // Remove from events list
        setEvents(prev => prev.filter(item => item._id !== selectedItem._id));
      }
      
      // Clear selected item
      setSelectedItem(null);
      resetForm();
    } catch (err) {
      console.error('Error deleting content:', err);
      setError('Failed to delete content. Please try again.');
    }
  };
  
  // Filter content based on filter text
  const filteredContent = () => {
    const items = activeTab === 'attractions' ? attractions : events;
    
    if (!filterText) {
      return items;
    }
    
    const lowerFilter = filterText.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(lowerFilter) ||
      item.category?.toLowerCase().includes(lowerFilter) ||
      item.description?.toLowerCase().includes(lowerFilter)
    );
  };
  
  // Render loading state
  if (loading && attractions.length === 0 && events.length === 0) {
    return (
      <div className="content-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading content...</span>
        </div>
        <p>Loading content management...</p>
      </div>
    );
  }
  
  return (
    <div className="content-management-container">
      <div className="content-management-header">
        <h1>
          <i className="fas fa-edit me-2"></i>
          Content Management
        </h1>
        <p className="lead">Manage attractions, events, and other content</p>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
          <button 
            className="btn-close float-end"
            onClick={() => setError(null)}
            aria-label="Close"
          ></button>
        </div>
      )}
      
      {/* Content tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'attractions' ? 'active' : ''}`}
            onClick={() => handleTabChange('attractions')}
          >
            <i className="fas fa-building me-1"></i>
            Attractions
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => handleTabChange('events')}
          >
            <i className="fas fa-calendar-alt me-1"></i>
            Events
          </button>
        </li>
      </ul>
      
      <div className="row">
        <div className="col-md-5">
          {/* Content list */}
          <div className="card mb-4">
            <div className="card-header bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  {activeTab === 'attractions' ? 'Attractions' : 'Events'}
                </h4>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={handleNewItem}
                >
                  <i className="fas fa-plus me-1"></i>
                  Add New
                </button>
              </div>
            </div>
            <div className="card-body">
              {/* Filter */}
              <div className="input-group mb-3">
                <span className="input-group-text">
                  <i className="fas fa-search"></i>
                </span>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder={`Search ${activeTab}...`}
                  value={filterText}
                  onChange={handleFilterChange}
                />
                {filterText && (
                  <button 
                    className="btn btn-outline-secondary" 
                    type="button"
                    onClick={() => setFilterText('')}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
              
              {/* Content list */}
              <div className="content-list">
                {filteredContent().length === 0 ? (
                  <div className="text-center py-4">
                    {filterText ? (
                      <>
                        <i className="fas fa-search fa-2x mb-3 text-muted"></i>
                        <p>No {activeTab} found matching "{filterText}"</p>
                        <button 
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setFilterText('')}
                        >
                          Clear search
                        </button>
                      </>
                    ) : (
                      <>
                        <i className={`fas fa-${activeTab === 'attractions' ? 'building' : 'calendar-alt'} fa-2x mb-3 text-muted`}></i>
                        <p>No {activeTab} found</p>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={handleNewItem}
                        >
                          <i className="fas fa-plus me-1"></i>
                          Add {activeTab === 'attractions' ? 'Attraction' : 'Event'}
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  filteredContent().map(item => (
                    <div 
                      key={item._id} 
                      className={`content-item ${selectedItem && selectedItem._id === item._id ? 'active' : ''}`}
                      onClick={() => handleSelectItem(item)}
                    >
                      <div className="content-item-image">
                        {item.image ? (
                          <img src={item.image} alt={item.name} />
                        ) : (
                          <div className="placeholder-image">
                            <i className={`fas fa-${activeTab === 'attractions' ? 'building' : 'calendar-alt'}`}></i>
                          </div>
                        )}
                      </div>
                      <div className="content-item-details">
                        <h5>{item.name}</h5>
                        <span className="category-badge">{item.category}</span>
                        {activeTab === 'events' && (
                          <div className="event-dates">
                            <i className="far fa-clock me-1"></i>
                            {formatDate(item.startDate)} {item.endDate && ` - ${formatDate(item.endDate)}`}
                          </div>
                        )}
                        <p className="excerpt">{item.description?.substring(0, 60)}...</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-7">
          {/* Content editor */}
          <div className="card">
            <div className="card-header bg-light">
              <h4 className="mb-0">
                {!selectedItem && !editMode ? (
                  <>
                    <i className="fas fa-info-circle me-2"></i>
                    Content Details
                  </>
                ) : editMode ? (
                  <>
                    <i className="fas fa-edit me-2"></i>
                    {selectedItem ? `Edit ${selectedItem.name}` : `New ${activeTab === 'attractions' ? 'Attraction' : 'Event'}`}
                  </>
                ) : (
                  <>
                    <i className={`fas fa-${activeTab === 'attractions' ? 'building' : 'calendar-alt'} me-2`}></i>
                    {selectedItem.name}
                  </>
                )}
              </h4>
            </div>
            <div className="card-body">
              {!selectedItem && !editMode ? (
                <div className="no-content-selected">
                  <i className={`fas fa-${activeTab === 'attractions' ? 'building' : 'calendar-alt'} fa-4x mb-3 text-muted`}></i>
                  <h5>No {activeTab === 'attractions' ? 'Attraction' : 'Event'} Selected</h5>
                  <p>Select an item from the list to view or edit its details, or create a new one</p>
                  <button 
                    className="btn btn-primary mt-3"
                    onClick={handleNewItem}
                  >
                    <i className="fas fa-plus me-1"></i>
                    Create New {activeTab === 'attractions' ? 'Attraction' : 'Event'}
                  </button>
                </div>
              ) : editMode ? (
                <form onSubmit={handleSubmit} className="content-form">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="name" className="form-label">Name *</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          id="name" 
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="category" className="form-label">Category *</label>
                        <select 
                          className="form-select" 
                          id="category" 
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select a category</option>
                          {activeTab === 'attractions' ? (
                            <>
                              <option value="dining">Dining</option>
                              <option value="shopping">Shopping</option>
                              <option value="entertainment">Entertainment</option>
                              <option value="education">Education</option>
                              <option value="outdoors">Outdoors</option>
                              <option value="culture">Culture</option>
                              <option value="services">Services</option>
                            </>
                          ) : (
                            <>
                              <option value="concert">Concert</option>
                              <option value="festival">Festival</option>
                              <option value="sports">Sports</option>
                              <option value="art">Art</option>
                              <option value="education">Education</option>
                              <option value="community">Community</option>
                              <option value="special">Special</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="subCategory" className="form-label">Sub-category</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="subCategory" 
                      name="subCategory"
                      value={formData.subCategory}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="description" className="form-label">Description *</label>
                    <textarea 
                      className="form-control" 
                      id="description" 
                      name="description"
                      rows="4"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                    ></textarea>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label htmlFor="image" className="form-label">Image</label>
                        <input 
                          type="file" 
                          className="form-control" 
                          id="image"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </div>
                      {imagePreview && (
                        <div className="image-preview mb-3">
                          <img src={imagePreview} alt="Preview" className="img-thumbnail" />
                        </div>
                      )}
                    </div>
                    
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Location</label>
                        <div className="input-group mb-2">
                          <span className="input-group-text">Lat</span>
                          <input 
                            type="number" 
                            step="0.000001"
                            className="form-control" 
                            name="latitude"
                            value={formData.location.coordinates[1] || 0}
                            onChange={handleLocationChange}
                          />
                        </div>
                        <div className="input-group mb-2">
                          <span className="input-group-text">Lng</span>
                          <input 
                            type="number" 
                            step="0.000001"
                            className="form-control" 
                            name="longitude"
                            value={formData.location.coordinates[0] || 0}
                            onChange={handleLocationChange}
                          />
                        </div>
                        <div className="input-group">
                          <span className="input-group-text">Address</span>
                          <input 
                            type="text" 
                            className="form-control" 
                            name="address"
                            value={formData.location.address}
                            onChange={handleLocationChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Attraction specific fields */}
                  {activeTab === 'attractions' && (
                    <>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="hours" className="form-label">Hours</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              id="hours" 
                              name="hours"
                              placeholder="e.g. Mon-Fri: 9am-5pm"
                              value={formData.hours}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="phone" className="form-label">Phone</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              id="phone" 
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <label htmlFor="website" className="form-label">Website</label>
                        <input 
                          type="url" 
                          className="form-control" 
                          id="website" 
                          name="website"
                          value={formData.website}
                          onChange={handleInputChange}
                        />
                      </div>
                      
                      <div className="mb-3">
                        <label className="form-label">Accessibility</label>
                        <div className="accessibility-options">
                          <div className="form-check">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              id="wheelchairAccessible"
                              name="accessibility.wheelchairAccessible"
                              checked={formData.accessibility.wheelchairAccessible}
                              onChange={handleInputChange}
                            />
                            <label className="form-check-label" htmlFor="wheelchairAccessible">
                              Wheelchair Accessible
                            </label>
                          </div>
                          <div className="form-check">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              id="hearingAccessible"
                              name="accessibility.hearingAccessible"
                              checked={formData.accessibility.hearingAccessible}
                              onChange={handleInputChange}
                            />
                            <label className="form-check-label" htmlFor="hearingAccessible">
                              Hearing Accessible
                            </label>
                          </div>
                          <div className="form-check">
                            <input 
                              className="form-check-input" 
                              type="checkbox" 
                              id="visualAccessible"
                              name="accessibility.visualAccessible"
                              checked={formData.accessibility.visualAccessible}
                              onChange={handleInputChange}
                            />
                            <label className="form-check-label" htmlFor="visualAccessible">
                              Visual Accessible
                            </label>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Event specific fields */}
                  {activeTab === 'events' && (
                    <>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="startDate" className="form-label">Start Date/Time *</label>
                            <input 
                              type="datetime-local" 
                              className="form-control" 
                              id="startDate" 
                              name="startDate"
                              value={formData.startDate}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="endDate" className="form-label">End Date/Time</label>
                            <input 
                              type="datetime-local" 
                              className="form-control" 
                              id="endDate" 
                              name="endDate"
                              value={formData.endDate}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="venue" className="form-label">Venue *</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              id="venue" 
                              name="venue"
                              value={formData.venue}
                              onChange={handleInputChange}
                              required
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="ticketPrice" className="form-label">Ticket Price</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              id="ticketPrice" 
                              name="ticketPrice"
                              placeholder="e.g. $10-25 or Free"
                              value={formData.ticketPrice}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="organizer" className="form-label">Organizer</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              id="organizer" 
                              name="organizer"
                              value={formData.organizer}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label htmlFor="status" className="form-label">Status</label>
                            <select 
                              className="form-select" 
                              id="status" 
                              name="status"
                              value={formData.status}
                              onChange={handleInputChange}
                            >
                              <option value="upcoming">Upcoming</option>
                              <option value="active">Active</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="button-group mt-4">
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save me-1"></i>
                      Save
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-secondary ms-2"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="content-details">
                  {/* Display details for selected content */}
                  <div className="content-header">
                    <div className="content-image">
                      {selectedItem.image ? (
                        <img src={selectedItem.image} alt={selectedItem.name} className="img-fluid rounded" />
                      ) : (
                        <div className="placeholder-image large">
                          <i className={`fas fa-${activeTab === 'attractions' ? 'building' : 'calendar-alt'} fa-3x`}></i>
                        </div>
                      )}
                    </div>
                    <div className="content-info">
                      <h3>{selectedItem.name}</h3>
                      <div className="content-meta">
                        <span className="category-badge">{selectedItem.category}</span>
                        {selectedItem.subCategory && (
                          <span className="subcategory-badge">{selectedItem.subCategory}</span>
                        )}
                      </div>
                      
                      {activeTab === 'events' && (
                        <div className="event-dates mt-2">
                          <i className="far fa-calendar-alt me-1"></i>
                          <strong>Date:</strong> {formatDate(selectedItem.startDate)} 
                          {selectedItem.endDate && ` - ${formatDate(selectedItem.endDate)}`}
                          
                          <div className="event-time mt-1">
                            <i className="far fa-clock me-1"></i>
                            <strong>Time:</strong> {formatTime(selectedItem.startDate)}
                            {selectedItem.endDate && ` - ${formatTime(selectedItem.endDate)}`}
                          </div>
                          
                          <div className={`event-status mt-1 status-${selectedItem.status}`}>
                            <i className="fas fa-circle me-1"></i>
                            {capitalizeFirstLetter(selectedItem.status)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="content-body mt-4">
                    <div className="row">
                      <div className="col-md-8">
                        <div className="content-description">
                          <h4>Description</h4>
                          <p>{selectedItem.description}</p>
                        </div>
                        
                        {activeTab === 'attractions' && (
                          <div className="attraction-details mt-4">
                            <h4>Details</h4>
                            <table className="table">
                              <tbody>
                                {selectedItem.hours && (
                                  <tr>
                                    <th><i className="far fa-clock me-1"></i> Hours</th>
                                    <td>{selectedItem.hours}</td>
                                  </tr>
                                )}
                                {selectedItem.phone && (
                                  <tr>
                                    <th><i className="fas fa-phone-alt me-1"></i> Phone</th>
                                    <td>{selectedItem.phone}</td>
                                  </tr>
                                )}
                                {selectedItem.website && (
                                  <tr>
                                    <th><i className="fas fa-globe me-1"></i> Website</th>
                                    <td>
                                      <a href={selectedItem.website} target="_blank" rel="noopener noreferrer">
                                        {selectedItem.website}
                                      </a>
                                    </td>
                                  </tr>
                                )}
                                {selectedItem.location?.address && (
                                  <tr>
                                    <th><i className="fas fa-map-marker-alt me-1"></i> Address</th>
                                    <td>{selectedItem.location.address}</td>
                                  </tr>
                                )}
                                <tr>
                                  <th><i className="fas fa-map-pin me-1"></i> Coordinates</th>
                                  <td>
                                    {selectedItem.location && selectedItem.location.coordinates ? (
                                      <>
                                        Lat: {selectedItem.location.coordinates[1]}, 
                                        Lng: {selectedItem.location.coordinates[0]}
                                      </>
                                    ) : (
                                      'Not specified'
                                    )}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {activeTab === 'events' && (
                          <div className="event-details mt-4">
                            <h4>Event Details</h4>
                            <table className="table">
                              <tbody>
                                <tr>
                                  <th><i className="fas fa-map-marker-alt me-1"></i> Venue</th>
                                  <td>{selectedItem.venue || 'Not specified'}</td>
                                </tr>
                                {selectedItem.location?.address && (
                                  <tr>
                                    <th><i className="fas fa-map-marked-alt me-1"></i> Address</th>
                                    <td>{selectedItem.location.address}</td>
                                  </tr>
                                )}
                                {selectedItem.organizer && (
                                  <tr>
                                    <th><i className="fas fa-user-tie me-1"></i> Organizer</th>
                                    <td>{selectedItem.organizer}</td>
                                  </tr>
                                )}
                                {selectedItem.ticketPrice && (
                                  <tr>
                                    <th><i className="fas fa-ticket-alt me-1"></i> Ticket Price</th>
                                    <td>{selectedItem.ticketPrice}</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                      
                      <div className="col-md-4">
                        {activeTab === 'attractions' && (
                          <div className="accessibility-info">
                            <h4>Accessibility</h4>
                            <ul className="accessibility-list">
                              <li className={selectedItem.accessibility?.wheelchairAccessible ? 'available' : 'unavailable'}>
                                <i className={`fas fa-wheelchair ${selectedItem.accessibility?.wheelchairAccessible ? 'text-success' : 'text-muted'}`}></i>
                                <span>Wheelchair Accessible</span>
                              </li>
                              <li className={selectedItem.accessibility?.hearingAccessible ? 'available' : 'unavailable'}>
                                <i className={`fas fa-assistive-listening-systems ${selectedItem.accessibility?.hearingAccessible ? 'text-success' : 'text-muted'}`}></i>
                                <span>Hearing Accessible</span>
                              </li>
                              <li className={selectedItem.accessibility?.visualAccessible ? 'available' : 'unavailable'}>
                                <i className={`fas fa-eye ${selectedItem.accessibility?.visualAccessible ? 'text-success' : 'text-muted'}`}></i>
                                <span>Visual Accessible</span>
                              </li>
                            </ul>
                          </div>
                        )}
                        
                        <div className="content-actions mt-4">
                          <h4>Actions</h4>
                          <div className="btn-group-vertical w-100">
                            <button 
                              className="btn btn-primary mb-2"
                              onClick={handleEditItem}
                            >
                              <i className="fas fa-edit me-1"></i>
                              Edit
                            </button>
                            <button 
                              className="btn btn-danger mb-2"
                              onClick={handleDelete}
                            >
                              <i className="fas fa-trash me-1"></i>
                              Delete
                            </button>
                            <button 
                              className="btn btn-outline-secondary mb-2"
                              onClick={() => {}}
                            >
                              <i className="fas fa-eye me-1"></i>
                              Preview
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const formatDate = (date) => {
  if (!date) return 'TBD';
  return new Date(date).toLocaleDateString();
};

const formatTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export default ContentManagement;
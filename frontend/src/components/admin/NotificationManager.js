import React, { useState, useEffect } from 'react';
import { getNotifications, sendNotification, broadcastNotification, deleteNotification } from '../../services/api';
import { formatRelativeTime } from '../../utils/helpers';
import '../../cssStyles/admin/NotificationManager.css'

const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    audience: 'all',
    userIds: [],
    additionalData: {},
    expiresAt: null,
    urgent: false,
  });
  const [previewMode, setPreviewMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Load notifications on component mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await getNotifications({ 
          role: 'admin',
          limit: 100,
          sent: true
        });
        setNotifications(response || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        setError('Failed to load notifications. Please try again.');
        setLoading(false);
      }
    };
    
    fetchNotifications();
  }, []);
  
  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle additional data input
  const handleAdditionalDataChange = (e, key) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      additionalData: {
        ...prev.additionalData,
        [key]: value
      }
    }));
  };
  
  // Add additional data field
  const handleAddDataField = () => {
    const fieldName = prompt('Enter field name:');
    if (fieldName && fieldName.trim()) {
      setFormData(prev => ({
        ...prev,
        additionalData: {
          ...prev.additionalData,
          [fieldName.trim()]: ''
        }
      }));
    }
  };
  
  // Remove additional data field
  const handleRemoveDataField = (key) => {
    setFormData(prev => {
      const newData = { ...prev.additionalData };
      delete newData[key];
      return {
        ...prev,
        additionalData: newData
      };
    });
  };
  
  // Handle filter change
  const handleFilterChange = (type) => {
    setFilterType(type);
  };
  
  // Handle sort change
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };
  
  // Handle notification selection
  const handleSelectNotification = (notification) => {
    setSelectedNotification(notification);
    setPreviewMode(false);
  };
  
  // Create new notification
  const handleCreateNew = () => {
    setSelectedNotification(null);
    setFormData({
      title: '',
      message: '',
      type: 'info',
      audience: 'all',
      userIds: [],
      additionalData: {},
      expiresAt: '',
      urgent: false,
    });
    setPreviewMode(false);
  };
  
  // Toggle preview mode
  const handleTogglePreview = () => {
    setPreviewMode(!previewMode);
  };
  
  // Handle send notification
  const handleSendNotification = async () => {
    if (!formData.title || !formData.message) {
      alert('Title and message are required');
      return;
    }
    
    try {
      let response;
      
      // Prepare data for sending
      const notificationData = {
        ...formData,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null
      };
      
      if (formData.audience === 'specific') {
        // Send to specific users
        response = await sendNotification(notificationData);
      } else {
        // Broadcast to all users or a specific audience
        response = await broadcastNotification(notificationData);
      }
      
      // Add new notification to list
      setNotifications(prev => [response, ...prev]);
      
      // Clear form
      setFormData({
        title: '',
        message: '',
        type: 'info',
        audience: 'all',
        userIds: [],
        additionalData: {},
        expiresAt: '',
        urgent: false,
      });
      
      // Show success message
      alert('Notification sent successfully');
    } catch (err) {
      console.error('Error sending notification:', err);
      setError('Failed to send notification. Please try again.');
    }
  };
  
  // Handle delete notification
  const handleDeleteNotification = async (id) => {
    if (!id || !window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }
    
    try {
      await deleteNotification(id);
      
      // Remove from notifications list
      setNotifications(prev => prev.filter(n => n._id !== id));
      
      // Clear selection if deleted
      if (selectedNotification && selectedNotification._id === id) {
        setSelectedNotification(null);
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError('Failed to delete notification. Please try again.');
    }
  };
  
  // Filter notifications based on type and search term
  const filteredNotifications = notifications.filter(notification => {
    // Apply type filter
    if (filterType !== 'all' && notification.type !== filterType) {
      return false;
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        notification.title.toLowerCase().includes(term) ||
        notification.message.toLowerCase().includes(term)
      );
    }
    
    return true;
  });
  
  // Sort notifications
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    switch (sortBy) {
      case 'date_asc':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'date_desc':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'title_asc':
        return a.title.localeCompare(b.title);
      case 'title_desc':
        return b.title.localeCompare(a.title);
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });
  
  // Render loading state
  if (loading && notifications.length === 0) {
    return (
      <div className="notifications-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading notifications...</span>
        </div>
        <p>Loading notification manager...</p>
      </div>
    );
  }
  
  return (
    <div className="notification-manager-container">
      <div className="notification-manager-header">
        <h1>
          <i className="fas fa-bell me-2"></i>
          Notification Manager
        </h1>
        <p className="lead">Send and manage notifications to users</p>
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
      
      <div className="row">
        <div className="col-md-4">
          {/* Notifications list panel */}
          <div className="card mb-4">
            <div className="card-header bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">Sent Notifications</h4>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={handleCreateNew}
                >
                  <i className="fas fa-plus me-1"></i>
                  New
                </button>
              </div>
            </div>
            <div className="card-body">
              {/* Search and filters */}
              <div className="notification-filters mb-3">
                <div className="input-group mb-2">
                  <span className="input-group-text">
                    <i className="fas fa-search"></i>
                  </span>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button 
                      className="btn btn-outline-secondary" 
                      type="button"
                      onClick={() => setSearchTerm('')}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
                
                <div className="d-flex justify-content-between">
                  <div className="btn-group btn-group-sm type-filter">
                    <button 
                      className={`btn ${filterType === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleFilterChange('all')}
                    >
                      All
                    </button>
                    <button 
                      className={`btn ${filterType === 'info' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleFilterChange('info')}
                    >
                      Info
                    </button>
                    <button 
                      className={`btn ${filterType === 'success' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleFilterChange('success')}
                    >
                      Success
                    </button>
                    <button 
                      className={`btn ${filterType === 'warning' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleFilterChange('warning')}
                    >
                      Warning
                    </button>
                    <button 
                      className={`btn ${filterType === 'error' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleFilterChange('error')}
                    >
                      Error
                    </button>
                  </div>
                  
                  <select 
                    className="form-select form-select-sm sort-selector"
                    style={{ width: 'auto' }}
                    value={sortBy}
                    onChange={handleSortChange}
                  >
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                    <option value="title_asc">Title (A-Z)</option>
                    <option value="title_desc">Title (Z-A)</option>
                  </select>
                </div>
              </div>
              
              {/* Notifications list */}
              <div className="notifications-list">
                {sortedNotifications.length === 0 ? (
                  <div className="text-center py-4">
                    {searchTerm || filterType !== 'all' ? (
                      <>
                        <i className="fas fa-filter fa-2x mb-3 text-muted"></i>
                        <p>No notifications match your filters</p>
                        <button 
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => {
                            setSearchTerm('');
                            setFilterType('all');
                          }}
                        >
                          Clear Filters
                        </button>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-bell-slash fa-2x mb-3 text-muted"></i>
                        <p>No notifications have been sent yet</p>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={handleCreateNew}
                        >
                          <i className="fas fa-plus me-1"></i>
                          Create Notification
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  sortedNotifications.map(notification => (
                    <div 
                      key={notification._id} 
                      className={`notification-item ${selectedNotification && selectedNotification._id === notification._id ? 'active' : ''}`}
                      onClick={() => handleSelectNotification(notification)}
                    >
                      <div className={`notification-icon ${notification.type}`}>
                        <i className={getNotificationIcon(notification.type)}></i>
                      </div>
                      <div className="notification-content">
                        <h5 className="notification-title">
                          {notification.title}
                          {notification.urgent && (
                            <span className="badge bg-danger ms-2">Urgent</span>
                          )}
                        </h5>
                        <p className="notification-time">
                          <i className="far fa-clock me-1"></i>
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                        <p className="notification-excerpt">
                          {notification.message.substring(0, 80)}...
                        </p>
                        <div className="notification-audience">
                          <i className="fas fa-users me-1"></i>
                          {getAudienceLabel(notification.audience)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-8">
          {/* Notification composer or details */}
          <div className="card">
            <div className="card-header bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  {selectedNotification ? (
                    <>
                      <i className="fas fa-bell me-2"></i>
                      Notification Details
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane me-2"></i>
                      Compose Notification
                    </>
                  )}
                </h4>
                {selectedNotification && (
                  <div className="btn-group btn-group-sm">
                    <button 
                      className={`btn ${previewMode ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={handleTogglePreview}
                    >
                      <i className={`fas fa-${previewMode ? 'edit' : 'eye'} me-1`}></i>
                      {previewMode ? 'Edit' : 'Preview'}
                    </button>
                    <button 
                      className="btn btn-outline-danger"
                      onClick={() => handleDeleteNotification(selectedNotification._id)}
                    >
                      <i className="fas fa-trash me-1"></i>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="card-body">
              {selectedNotification ? (
                previewMode ? (
                  // Preview existing notification
                  <div className="notification-preview">
                    <div className={`notification-preview-card ${selectedNotification.type}`}>
                      <div className="notification-preview-header">
                        <div className="notification-preview-icon">
                          <i className={getNotificationIcon(selectedNotification.type)}></i>
                        </div>
                        <div className="notification-preview-title">
                          {selectedNotification.title}
                          {selectedNotification.urgent && (
                            <span className="badge bg-danger ms-2">Urgent</span>
                          )}
                        </div>
                      </div>
                      <div className="notification-preview-body">
                        <p>{selectedNotification.message}</p>
                      </div>
                      <div className="notification-preview-footer">
                        <div className="notification-time">
                          <i className="far fa-clock me-1"></i>
                          {formatRelativeTime(selectedNotification.createdAt)}
                        </div>
                        <button className="btn btn-sm btn-outline-secondary">
                          Dismiss
                        </button>
                      </div>
                    </div>
                    
                    <div className="notification-details mt-4">
                      <h5>Notification Details</h5>
                      <table className="table">
                        <tbody>
                          <tr>
                            <th>ID</th>
                            <td><code>{selectedNotification._id}</code></td>
                          </tr>
                          <tr>
                            <th>Sent</th>
                            <td>{new Date(selectedNotification.createdAt).toLocaleString()}</td>
                          </tr>
                          <tr>
                            <th>Type</th>
                            <td>
                              <span className={`badge bg-${getNotificationBadgeColor(selectedNotification.type)}`}>
                                {selectedNotification.type}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <th>Audience</th>
                            <td>{getAudienceLabel(selectedNotification.audience)}</td>
                          </tr>
                          {selectedNotification.audience === 'specific' && (
                            <tr>
                              <th>Recipients</th>
                              <td>
                                {selectedNotification.userIds && selectedNotification.userIds.length > 0 ? (
                                  <code>{selectedNotification.userIds.join(', ')}</code>
                                ) : (
                                  'No specific recipients'
                                )}
                              </td>
                            </tr>
                          )}
                          {selectedNotification.expiresAt && (
                            <tr>
                              <th>Expires</th>
                              <td>{new Date(selectedNotification.expiresAt).toLocaleString()}</td>
                            </tr>
                          )}
                          {selectedNotification.additionalData && Object.keys(selectedNotification.additionalData).length > 0 && (
                            <tr>
                              <th>Additional Data</th>
                              <td>
                                <pre className="notification-data">
                                  {JSON.stringify(selectedNotification.additionalData, null, 2)}
                                </pre>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  // Show notification details in raw form
                  <div className="notification-raw-view">
                    <div className="mb-3">
                      <label className="form-label">Title</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={selectedNotification.title}
                        readOnly
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Message</label>
                      <textarea 
                        className="form-control" 
                        rows="4"
                        value={selectedNotification.message}
                        readOnly
                      ></textarea>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Type</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={selectedNotification.type}
                          readOnly
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Audience</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={getAudienceLabel(selectedNotification.audience)}
                          readOnly
                        />
                      </div>
                    </div>
                    
                    {selectedNotification.additionalData && Object.keys(selectedNotification.additionalData).length > 0 && (
                      <div className="mb-3">
                        <label className="form-label">Additional Data</label>
                        <div className="additional-data-fields">
                          {Object.entries(selectedNotification.additionalData).map(([key, value]) => (
                            <div className="row mb-2" key={key}>
                              <div className="col-md-5">
                                <input 
                                  type="text" 
                                  className="form-control" 
                                  value={key}
                                  readOnly
                                />
                              </div>
                              <div className="col-md-7">
                                <input 
                                  type="text" 
                                  className="form-control" 
                                  value={value}
                                  readOnly
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Created At</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={new Date(selectedNotification.createdAt).toLocaleString()}
                          readOnly
                        />
                      </div>
                      {selectedNotification.expiresAt && (
                        <div className="col-md-6">
                          <label className="form-label">Expires At</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={new Date(selectedNotification.expiresAt).toLocaleString()}
                            readOnly
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="form-check mb-3">
                      <input 
                        type="checkbox" 
                        className="form-check-input" 
                        checked={selectedNotification.urgent}
                        readOnly
                        disabled
                      />
                      <label className="form-check-label">Urgent</label>
                    </div>
                  </div>
                )
              ) : (
                // Compose new notification
                <div className="notification-composer">
                  <form>
                    <div className="mb-3">
                      <label htmlFor="title" className="form-label">Title *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="title" 
                        name="title"
                        placeholder="Notification title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="message" className="form-label">Message *</label>
                      <textarea 
                        className="form-control" 
                        id="message" 
                        name="message"
                        rows="4"
                        placeholder="Notification message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                      ></textarea>
                    </div>
                    
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label htmlFor="type" className="form-label">Type</label>
                        <select 
                          className="form-select" 
                          id="type" 
                          name="type"
                          value={formData.type}
                          onChange={handleInputChange}
                        >
                          <option value="info">Information</option>
                          <option value="success">Success</option>
                          <option value="warning">Warning</option>
                          <option value="error">Error</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="audience" className="form-label">Audience</label>
                        <select 
                          className="form-select" 
                          id="audience" 
                          name="audience"
                          value={formData.audience}
                          onChange={handleInputChange}
                        >
                          <option value="all">All Users</option>
                          <option value="specific">Specific Users</option>
                          <option value="visitors">Visitors</option>
                          <option value="students">Students</option>
                          <option value="residents">Residents</option>
                          <option value="drivers">Drivers</option>
                          <option value="staff">Staff</option>
                        </select>
                      </div>
                    </div>
                    
                    {formData.audience === 'specific' && (
                      <div className="mb-3">
                        <label htmlFor="userIds" className="form-label">User IDs (comma-separated)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          id="userIds" 
                          name="userIds"
                          placeholder="e.g. 60d5f8c72d9f3d2c8879a2b1, 60d5f8c72d9f3d2c8879a2b2"
                          value={formData.userIds.join(', ')}
                          onChange={(e) => {
                            const ids = e.target.value.split(',').map(id => id.trim()).filter(Boolean);
                            setFormData(prev => ({ ...prev, userIds: ids }));
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="mb-3">
                      <label htmlFor="expiresAt" className="form-label">Expires At (optional)</label>
                      <input 
                        type="datetime-local" 
                        className="form-control" 
                        id="expiresAt" 
                        name="expiresAt"
                        value={formData.expiresAt || ''}
                        onChange={handleInputChange}
                      />
                      <div className="form-text">
                        If set, notification will auto-expire at this time
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label d-flex justify-content-between">
                        <span>Additional Data (optional)</span>
                        <button 
                          type="button" 
                          className="btn btn-sm btn-outline-secondary"
                          onClick={handleAddDataField}
                        >
                          <i className="fas fa-plus me-1"></i>
                          Add Field
                        </button>
                      </label>
                      <div className="additional-data-fields">
                        {Object.entries(formData.additionalData).map(([key, value]) => (
                          <div className="row mb-2" key={key}>
                            <div className="col-md-5">
                              <input 
                                type="text" 
                                className="form-control" 
                                value={key}
                                readOnly
                              />
                            </div>
                            <div className="col-md-6">
                              <input 
                                type="text" 
                                className="form-control" 
                                value={value}
                                onChange={(e) => handleAdditionalDataChange(e, key)}
                              />
                            </div>
                            <div className="col-md-1">
                              <button 
                                type="button" 
                                className="btn btn-outline-danger"
                                onClick={() => handleRemoveDataField(key)}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="form-text">
                        Use additional data for deep linking or custom actions
                      </div>
                    </div>
                    
                    <div className="form-check mb-3">
                      <input 
                        type="checkbox" 
                        className="form-check-input" 
                        id="urgent" 
                        name="urgent"
                        checked={formData.urgent}
                        onChange={handleInputChange}
                      />
                      <label className="form-check-label" htmlFor="urgent">
                        Urgent (high priority notification)
                      </label>
                    </div>
                    
                    <div className="notification-preview mb-4">
                      <h5>Preview</h5>
                      {formData.title && formData.message ? (
                        <div className={`notification-preview-card ${formData.type}`}>
                          <div className="notification-preview-header">
                            <div className="notification-preview-icon">
                              <i className={getNotificationIcon(formData.type)}></i>
                            </div>
                            <div className="notification-preview-title">
                              {formData.title}
                              {formData.urgent && (
                                <span className="badge bg-danger ms-2">Urgent</span>
                              )}
                            </div>
                          </div>
                          <div className="notification-preview-body">
                            <p>{formData.message}</p>
                          </div>
                          <div className="notification-preview-footer">
                            <div className="notification-time">
                              <i className="far fa-clock me-1"></i>
                              Just now
                            </div>
                            <button className="btn btn-sm btn-outline-secondary" type="button">
                              Dismiss
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="alert alert-light">
                          <i className="fas fa-info-circle me-2"></i>
                          Add a title and message to see the preview
                        </div>
                      )}
                    </div>
                    
                    <div className="d-flex justify-content-between">
                      <button 
                        type="button" 
                        className="btn btn-primary"
                        onClick={handleSendNotification}
                      >
                        <i className="fas fa-paper-plane me-1"></i>
                        Send Notification
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary"
                        onClick={handleCreateNew}
                      >
                        <i className="fas fa-times me-1"></i>
                        Clear Form
                      </button>
                    </div>
                  </form>
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
const getNotificationIcon = (type) => {
  const icons = {
    info: 'fas fa-info-circle',
    success: 'fas fa-check-circle',
    warning: 'fas fa-exclamation-triangle',
    error: 'fas fa-exclamation-circle',
    default: 'fas fa-bell'
  };
  
  return icons[type] || icons.default;
};

const getNotificationBadgeColor = (type) => {
  const colors = {
    info: 'info',
    success: 'success',
    warning: 'warning',
    error: 'danger',
    default: 'secondary'
  };
  
  return colors[type] || colors.default;
};

const getAudienceLabel = (audience) => {
  const labels = {
    all: 'All Users',
    specific: 'Specific Users',
    visitors: 'Visitors',
    students: 'Students',
    residents: 'Residents',
    drivers: 'Drivers',
    staff: 'Staff',
    default: 'Unknown'
  };
  
  return labels[audience] || labels.default;
};

export default NotificationManager;
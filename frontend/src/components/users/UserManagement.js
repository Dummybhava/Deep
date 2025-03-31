import React, { useState, useEffect } from 'react';
import { getAllUsers, updateUser, deleteUser, updateUserRole } from '../../services/api';
import '../../cssStyles/users/UserManagement.css'

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [sortOption, setSortOption] = useState('name_asc');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  
  // Form data for editing user
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roles: [],
    status: 'active',
    preferences: {
      language: 'en',
      notifications: true,
      theme: 'light'
    }
  });
  
  // Fetch users on component mount and when pagination changes
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          sort: sortOption,
          search: filterText || undefined
        };
        
        const response = await getAllUsers(params);
        setUsers(response.users || []);
        setPagination(prev => ({
          ...prev,
          total: response.total || 0
        }));
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users. Please try again.');
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, [pagination.page, pagination.limit, sortOption, filterText]);
  
  // Set form data when selected user changes
  useEffect(() => {
    if (selectedUser) {
      setFormData({
        name: selectedUser.name || '',
        email: selectedUser.email || '',
        roles: selectedUser.roles || [],
        status: selectedUser.status || 'active',
        preferences: {
          language: selectedUser.preferences?.language || 'en',
          notifications: selectedUser.preferences?.notifications !== false,
          theme: selectedUser.preferences?.theme || 'light'
        }
      });
    }
  }, [selectedUser]);
  
  // Handle filter input change
  const handleFilterChange = (e) => {
    setFilterText(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on filter change
  };
  
  // Handle sort option change
  const handleSortChange = (e) => {
    setSortOption(e.target.value);
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
  
  // Handle role checkbox change
  const handleRoleChange = (role) => {
    setFormData(prev => {
      const newRoles = [...prev.roles];
      
      if (newRoles.includes(role)) {
        // Remove role
        return {
          ...prev,
          roles: newRoles.filter(r => r !== role)
        };
      } else {
        // Add role
        return {
          ...prev,
          roles: [...newRoles, role]
        };
      }
    });
  };
  
  // Handle user selection
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setEditMode(false);
  };
  
  // Handle edit button click
  const handleEditClick = () => {
    setEditMode(true);
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditMode(false);
    
    // Reset form data to selected user
    if (selectedUser) {
      setFormData({
        name: selectedUser.name || '',
        email: selectedUser.email || '',
        roles: selectedUser.roles || [],
        status: selectedUser.status || 'active',
        preferences: {
          language: selectedUser.preferences?.language || 'en',
          notifications: selectedUser.preferences?.notifications !== false,
          theme: selectedUser.preferences?.theme || 'light'
        }
      });
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) return;
    
    try {
      // Update user
      await updateUser(selectedUser._id, formData);
      
      // Update roles if changed
      if (JSON.stringify(selectedUser.roles) !== JSON.stringify(formData.roles)) {
        await updateUserRole(selectedUser._id, formData.roles);
      }
      
      // Update user in list
      setUsers(prev => prev.map(user => 
        user._id === selectedUser._id 
          ? { ...user, ...formData }
          : user
      ));
      
      // Update selected user
      setSelectedUser(prev => ({ ...prev, ...formData }));
      
      // Exit edit mode
      setEditMode(false);
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user. Please try again.');
    }
  };
  
  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser || !window.confirm(`Are you sure you want to delete user ${selectedUser.name}?`)) {
      return;
    }
    
    try {
      // Delete user
      await deleteUser(selectedUser._id);
      
      // Remove user from list
      setUsers(prev => prev.filter(user => user._id !== selectedUser._id));
      
      // Clear selected user
      setSelectedUser(null);
      
      // Update pagination if needed
      if (users.length === 1 && pagination.page > 1) {
        setPagination(prev => ({ ...prev, page: prev.page - 1 }));
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user. Please try again.');
    }
  };
  
  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };
  
  // Handle limit change
  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value);
    setPagination(prev => ({ 
      ...prev, 
      limit: newLimit,
      page: 1 // Reset to first page when changing limit
    }));
  };
  
  // Get total pages
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  
  // Render loading state
  if (loading && users.length === 0) {
    return (
      <div className="users-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading users...</span>
        </div>
        <p>Loading users...</p>
      </div>
    );
  }
  
  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <h1>
          <i className="fas fa-users-cog me-2"></i>
          User Management
        </h1>
        <p className="lead">Manage user accounts, roles, and permissions</p>
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
        <div className="col-md-8">
          {/* User list panel */}
          <div className="card mb-4">
            <div className="card-header bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">User Accounts</h4>
                <div className="btn-group">
                  <button className="btn btn-sm btn-outline-primary">
                    <i className="fas fa-download me-1"></i>
                    Export
                  </button>
                  <button className="btn btn-sm btn-outline-secondary">
                    <i className="fas fa-sync-alt me-1"></i>
                    Refresh
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body">
              {/* Filters and sorting */}
              <div className="filters-container mb-3">
                <div className="row g-2">
                  <div className="col-md-6">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fas fa-search"></i>
                      </span>
                      <input 
                        type="text" 
                        className="form-control"
                        placeholder="Search users..."
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
                  </div>
                  <div className="col-md-3">
                    <select 
                      className="form-select" 
                      value={sortOption}
                      onChange={handleSortChange}
                    >
                      <option value="name_asc">Name (A-Z)</option>
                      <option value="name_desc">Name (Z-A)</option>
                      <option value="email_asc">Email (A-Z)</option>
                      <option value="email_desc">Email (Z-A)</option>
                      <option value="created_asc">Created (Oldest)</option>
                      <option value="created_desc">Created (Newest)</option>
                      <option value="last_login_desc">Last Login (Recent)</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <select 
                      className="form-select" 
                      value={pagination.limit}
                      onChange={handleLimitChange}
                    >
                      <option value="10">10 per page</option>
                      <option value="25">25 per page</option>
                      <option value="50">50 per page</option>
                      <option value="100">100 per page</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* User table */}
              <div className="table-responsive">
                <table className="table table-hover table-striped">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4">
                          {filterText ? (
                            <>
                              <i className="fas fa-search fa-2x mb-3 text-muted"></i>
                              <p>No users found matching "{filterText}"</p>
                              <button 
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setFilterText('')}
                              >
                                Clear search
                              </button>
                            </>
                          ) : (
                            <>
                              <i className="fas fa-users fa-2x mb-3 text-muted"></i>
                              <p>No users found</p>
                            </>
                          )}
                        </td>
                      </tr>
                    ) : (
                      users.map(user => (
                        <tr 
                          key={user._id} 
                          className={selectedUser && selectedUser._id === user._id ? 'table-primary' : ''}
                          onClick={() => handleSelectUser(user)}
                        >
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="user-avatar me-2">
                                {user.avatar ? (
                                  <img src={user.avatar} alt={user.name} className="avatar-img" />
                                ) : (
                                  <div className="avatar-placeholder">
                                    {getInitials(user.name)}
                                  </div>
                                )}
                              </div>
                              <div>{user.name}</div>
                            </div>
                          </td>
                          <td>{user.email}</td>
                          <td>
                            {user.roles && user.roles.map(role => (
                              <span 
                                key={role} 
                                className={`badge ${getRoleBadgeClass(role)} me-1`}
                              >
                                {role}
                              </span>
                            ))}
                          </td>
                          <td>
                            <span className={`status-indicator status-${user.status?.toLowerCase() || 'active'}`}>
                              {user.status || 'Active'}
                            </span>
                          </td>
                          <td>{formatDate(user.lastLogin)}</td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button 
                                className="btn btn-outline-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectUser(user);
                                  handleEditClick();
                                }}
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button 
                                className="btn btn-outline-danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectUser(user);
                                  handleDeleteUser();
                                }}
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {users.length > 0 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div className="pagination-info">
                    Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                  </div>
                  <nav aria-label="Page navigation">
                    <ul className="pagination">
                      <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handlePageChange(pagination.page - 1)}
                          disabled={pagination.page === 1}
                        >
                          Previous
                        </button>
                      </li>
                      
                      {[...Array(totalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        
                        // Only show a window of pages around the current page
                        if (
                          pageNumber === 1 ||
                          pageNumber === totalPages ||
                          (pageNumber >= pagination.page - 1 && pageNumber <= pagination.page + 1)
                        ) {
                          return (
                            <li 
                              key={pageNumber} 
                              className={`page-item ${pagination.page === pageNumber ? 'active' : ''}`}
                            >
                              <button 
                                className="page-link"
                                onClick={() => handlePageChange(pageNumber)}
                              >
                                {pageNumber}
                              </button>
                            </li>
                          );
                        }
                        
                        // Add ellipsis if needed
                        if (
                          (pageNumber === 2 && pagination.page > 3) ||
                          (pageNumber === totalPages - 1 && pagination.page < totalPages - 2)
                        ) {
                          return (
                            <li key={pageNumber} className="page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                          );
                        }
                        
                        return null;
                      })}
                      
                      <li className={`page-item ${pagination.page === totalPages ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handlePageChange(pagination.page + 1)}
                          disabled={pagination.page === totalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          {/* User details panel */}
          <div className="card">
            <div className="card-header bg-light">
              <h4 className="mb-0">
                {selectedUser ? (
                  <>
                    <i className="fas fa-user me-2"></i>
                    {editMode ? 'Edit User' : 'User Details'}
                  </>
                ) : (
                  <>
                    <i className="fas fa-info-circle me-2"></i>
                    User Information
                  </>
                )}
              </h4>
            </div>
            <div className="card-body">
              {!selectedUser ? (
                <div className="no-user-selected">
                  <i className="fas fa-user-circle fa-4x mb-3 text-muted"></i>
                  <h5>No User Selected</h5>
                  <p>Select a user from the list to view or edit their details</p>
                </div>
              ) : editMode ? (
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label">Name</label>
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
                  
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input 
                      type="email" 
                      className="form-control" 
                      id="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="status" className="form-label">Status</label>
                    <select 
                      className="form-select" 
                      id="status" 
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Roles</label>
                    <div className="role-checkboxes">
                      {['user', 'admin', 'moderator', 'support', 'driver'].map(role => (
                        <div className="form-check" key={role}>
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id={`role-${role}`}
                            checked={formData.roles.includes(role)}
                            onChange={() => handleRoleChange(role)}
                          />
                          <label className="form-check-label" htmlFor={`role-${role}`}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Preferences</label>
                    <div className="card">
                      <div className="card-body">
                        <div className="mb-2">
                          <label htmlFor="preferences.language" className="form-label">Language</label>
                          <select 
                            className="form-select form-select-sm" 
                            id="preferences.language" 
                            name="preferences.language"
                            value={formData.preferences.language}
                            onChange={handleInputChange}
                          >
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                            <option value="zh">Chinese</option>
                          </select>
                        </div>
                        
                        <div className="mb-2">
                          <label htmlFor="preferences.theme" className="form-label">Theme</label>
                          <select 
                            className="form-select form-select-sm" 
                            id="preferences.theme" 
                            name="preferences.theme"
                            value={formData.preferences.theme}
                            onChange={handleInputChange}
                          >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System Default</option>
                          </select>
                        </div>
                        
                        <div className="form-check form-switch">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="preferences.notifications" 
                            name="preferences.notifications"
                            checked={formData.preferences.notifications}
                            onChange={handleInputChange}
                          />
                          <label className="form-check-label" htmlFor="preferences.notifications">
                            Enable Notifications
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="button-group mt-4">
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save me-1"></i>
                      Save Changes
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
                <div className="user-details">
                  <div className="user-profile-header">
                    <div className="user-avatar large">
                      {selectedUser.avatar ? (
                        <img src={selectedUser.avatar} alt={selectedUser.name} className="avatar-img" />
                      ) : (
                        <div className="avatar-placeholder large">
                          {getInitials(selectedUser.name)}
                        </div>
                      )}
                    </div>
                    <div className="user-profile-info">
                      <h3>{selectedUser.name}</h3>
                      <p className="user-email">{selectedUser.email}</p>
                      <div className="user-role-badges">
                        {selectedUser.roles && selectedUser.roles.map(role => (
                          <span 
                            key={role} 
                            className={`badge ${getRoleBadgeClass(role)} me-1`}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="user-details-section">
                    <h5>Account Information</h5>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <th>Status</th>
                          <td>
                            <span className={`status-indicator status-${selectedUser.status?.toLowerCase() || 'active'}`}>
                              {selectedUser.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <th>User ID</th>
                          <td><code>{selectedUser._id}</code></td>
                        </tr>
                        <tr>
                          <th>Created</th>
                          <td>{formatDate(selectedUser.createdAt, 'full')}</td>
                        </tr>
                        <tr>
                          <th>Last Login</th>
                          <td>{formatDate(selectedUser.lastLogin, 'full')}</td>
                        </tr>
                        <tr>
                          <th>Preferences</th>
                          <td>
                            <div className="preferences-list">
                              <div className="preference-item">
                                <span className="preference-label">Language:</span>
                                <span className="preference-value">
                                  {getLanguageName(selectedUser.preferences?.language || 'en')}
                                </span>
                              </div>
                              <div className="preference-item">
                                <span className="preference-label">Theme:</span>
                                <span className="preference-value">
                                  {selectedUser.preferences?.theme?.charAt(0).toUpperCase() + selectedUser.preferences?.theme?.slice(1) || 'Light'}
                                </span>
                              </div>
                              <div className="preference-item">
                                <span className="preference-label">Notifications:</span>
                                <span className="preference-value">
                                  {selectedUser.preferences?.notifications !== false ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="button-group mt-4">
                    <button 
                      className="btn btn-primary"
                      onClick={handleEditClick}
                    >
                      <i className="fas fa-edit me-1"></i>
                      Edit User
                    </button>
                    <button 
                      className="btn btn-outline-danger ms-2"
                      onClick={handleDeleteUser}
                    >
                      <i className="fas fa-trash me-1"></i>
                      Delete
                    </button>
                  </div>
                  
                  <div className="additional-actions mt-4">
                    <button className="btn btn-sm btn-outline-secondary me-2">
                      <i className="fas fa-key me-1"></i>
                      Reset Password
                    </button>
                    <button className="btn btn-sm btn-outline-secondary me-2">
                      <i className="fas fa-envelope me-1"></i>
                      Send Email
                    </button>
                    <button className="btn btn-sm btn-outline-secondary">
                      <i className="fas fa-history me-1"></i>
                      View Activity
                    </button>
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
const getInitials = (name) => {
  if (!name) return '??';
  
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

const getRoleBadgeClass = (role) => {
  const badges = {
    admin: 'bg-danger',
    moderator: 'bg-warning',
    user: 'bg-info',
    support: 'bg-success',
    driver: 'bg-primary',
    default: 'bg-secondary'
  };
  
  return badges[role] || badges.default;
};

const formatDate = (date, format = 'short') => {
  if (!date) return 'Never';
  
  const dateObj = new Date(date);
  
  if (format === 'short') {
    return dateObj.toLocaleDateString();
  }
  
  if (format === 'full') {
    return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString()}`;
  }
  
  return dateObj.toISOString();
};

const getLanguageName = (code) => {
  const languages = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    zh: 'Chinese'
  };
  
  return languages[code] || 'Unknown';
};

export default UserManagement;
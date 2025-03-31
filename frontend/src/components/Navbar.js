import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatRelativeTime } from '../utils/helpers';
import '../cssStyles/Navbar.css';

const Navbar = ({ 
  toggleSidebar, 
  notifications = [], 
  unreadCount = 0, 
  notificationsLoading = false,
  onMarkAsRead,
  onRefreshNotifications 
}) => {
  const { user, logout } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Handle toggling notifications dropdown
  const toggleNotifications = () => {
    if (!notificationsOpen && onRefreshNotifications) {
      onRefreshNotifications();
    }
    setNotificationsOpen(!notificationsOpen);
    setUserMenuOpen(false);
  };

  // Handle toggling user menu dropdown
  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
    setNotificationsOpen(false);
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (onMarkAsRead && !notification.status.read) {
      onMarkAsRead(notification._id);
    }

    // Handle navigation based on notification type
    if (notification.relatedTo) {
      const { type, id } = notification.relatedTo;
      
      switch (type) {
        case 'Event':
          navigate(`/events/${id}`);
          break;
        case 'Attraction':
          navigate(`/attractions/${id}`);
          break;
        case 'Tour':
          navigate(`/tours/${id}`);
          break;
        case 'Feedback':
          navigate(`/feedback`);
          break;
        case 'Incident':
          navigate(`/feedback`);
          break;
        case 'TransportationRequest':
          navigate(`/transportation/courtesy`);
          break;
        default:
          break;
      }
    }

    setNotificationsOpen(false);
  };

  // Handle user logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <button 
          className="navbar-toggler sidebar-toggler" 
          type="button" 
          onClick={toggleSidebar}
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <Link className="navbar-brand" to="/dashboard">
          <i className="fas fa-city me-2"></i>
          Smart City
        </Link>
        
        <div className="ms-auto d-flex">
          {user && (
            <>
              {/* Notifications */}
              <div className="nav-item dropdown me-3 position-relative">
                <button 
                  className="btn btn-link nav-link py-2 px-0 px-lg-2 dropdown-toggle d-flex align-items-center"
                  id="bd-theme"
                  aria-expanded={notificationsOpen}
                  onClick={toggleNotifications}
                >
                  <i className="fas fa-bell fs-5"></i>
                  {unreadCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                      {unreadCount}
                      <span className="visually-hidden">unread notifications</span>
                    </span>
                  )}
                </button>
                
                <div className={`dropdown-menu dropdown-menu-end notifications-dropdown ${notificationsOpen ? 'show' : ''}`}>
                  <div className="dropdown-header d-flex justify-content-between align-items-center">
                    <span>Notifications</span>
                    <button 
                      className="btn btn-sm btn-outline-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefreshNotifications();
                      }}
                    >
                      <i className="fas fa-sync-alt"></i>
                    </button>
                  </div>
                  
                  <div className="notifications-container">
                    {notificationsLoading ? (
                      <div className="text-center p-3">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mb-0 mt-2">Loading notifications...</p>
                      </div>
                    ) : notifications.length > 0 ? (
                      notifications.map(notification => (
                        <button
                          key={notification._id}
                          className={`dropdown-item notification-item ${!notification.status.read ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="notification-icon">
                            <i className={`fas ${getNotificationIcon(notification.type)}`}></i>
                          </div>
                          <div className="notification-content">
                            <div className="notification-title">{notification.title}</div>
                            <div className="notification-message">{notification.message}</div>
                            <div className="notification-time">
                              {formatRelativeTime(new Date(notification.createdAt))}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center p-3">
                        <p className="mb-0">No notifications</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="dropdown-divider"></div>
                  <Link className="dropdown-item text-center" to="/notifications">
                    View all notifications
                  </Link>
                </div>
              </div>
              
              {/* User Menu */}
              <div className="nav-item dropdown">
                <button 
                  className="btn btn-link nav-link py-2 px-0 px-lg-2 dropdown-toggle d-flex align-items-center"
                  id="user-dropdown"
                  aria-expanded={userMenuOpen}
                  onClick={toggleUserMenu}
                >
                  <span className="d-none d-lg-inline-block me-2">{user.firstName}</span>
                  <div className="user-avatar">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={`${user.firstName} ${user.lastName}`} 
                        className="rounded-circle"
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </div>
                    )}
                  </div>
                </button>
                
                <div className={`dropdown-menu dropdown-menu-end ${userMenuOpen ? 'show' : ''}`}>
                  <div className="dropdown-header d-flex flex-column align-items-center">
                    <div className="user-avatar-large mb-2">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={`${user.firstName} ${user.lastName}`} 
                          className="rounded-circle"
                        />
                      ) : (
                        <div className="avatar-placeholder">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="user-info text-center">
                      <div className="user-name">{user.firstName} {user.lastName}</div>
                      <div className="user-email">{user.email}</div>
                      <div className="user-role badge bg-info mt-1">
                        {user.roles?.[0] || 'User'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="dropdown-divider"></div>
                  
                  <Link className="dropdown-item" to="/profile">
                    <i className="fas fa-user me-2"></i> Profile
                  </Link>
                  <Link className="dropdown-item" to="/settings">
                    <i className="fas fa-cog me-2"></i> Settings
                  </Link>
                  
                  <div className="dropdown-divider"></div>
                  
                  <button className="dropdown-item" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt me-2"></i> Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// Helper function to get icon based on notification type
function getNotificationIcon(type) {
  switch (type) {
    case 'event':
      return 'fa-calendar-alt';
    case 'transportation':
      return 'fa-bus';
    case 'news':
      return 'fa-newspaper';
    case 'feedback':
      return 'fa-comment-alt';
    case 'incident':
      return 'fa-exclamation-triangle';
    case 'account':
      return 'fa-user-circle';
    case 'tour':
      return 'fa-map-marked-alt';
    default:
      return 'fa-bell';
  }
}

export default Navbar;

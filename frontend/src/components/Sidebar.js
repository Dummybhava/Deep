import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
//import '../cssStyles/Sidebar.css';

const Sidebar = ({ isOpen, userRole }) => {
  const { user } = useAuth();
  
  // Get all allowed menu items based on user role
  const menuItems = getMenuItems(userRole);
  
  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="user-info">
          <div className="user-avatar">
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={`${user.firstName} ${user.lastName}`} 
                className="rounded-circle"
              />
            ) : (
              <div className="avatar-placeholder">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
            )}
          </div>
          <div className="user-details">
            <div className="user-name">{user?.firstName} {user?.lastName}</div>
            <div className="user-role">{userRole}</div>
          </div>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="nav flex-column">
          {menuItems.map((item, index) => (
            <React.Fragment key={item.path || index}>
              {item.header && (
                <li className="nav-header">{item.header}</li>
              )}
              
              {item.path && (
                <li className="nav-item">
                  <NavLink 
                    to={item.path} 
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    <i className={`nav-icon ${item.icon}`}></i>
                    <span className="nav-text">{item.label}</span>
                  </NavLink>
                </li>
              )}
              
              {item.divider && (
                <li className="nav-divider"></li>
              )}
            </React.Fragment>
          ))}
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <div className="app-version">Smart City v1.0.0</div>
      </div>
    </aside>
  );
};

// Helper function to get menu items based on user role
const getMenuItems = (userRole) => {
  // Common menu items for all users
  const commonItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: 'fas fa-tachometer-alt'
    },
    {
      path: '/attractions',
      label: 'Attractions',
      icon: 'fas fa-map-marker-alt'
    },
    {
      path: '/events',
      label: 'Events',
      icon: 'fas fa-calendar-alt'
    },
    {
      header: 'Navigation'
    },
    {
      path: '/map',
      label: 'Interactive Map',
      icon: 'fas fa-map'
    },
    {
      path: '/search',
      label: 'Search POIs',
      icon: 'fas fa-search'
    },
    {
      path: '/tours',
      label: 'Self-Guided Tours',
      icon: 'fas fa-route'
    },
    {
      header: 'Transportation'
    },
    {
      path: '/transportation',
      label: 'Transport Overview',
      icon: 'fas fa-subway'
    },
    {
      path: '/transportation/prt',
      label: 'PRT Tracking',
      icon: 'fas fa-train'
    },
    {
      path: '/transportation/courtesy',
      label: 'Courtesy Cars',
      icon: 'fas fa-car'
    },
    {
      divider: true
    },
    {
      path: '/feedback',
      label: 'Feedback & Support',
      icon: 'fas fa-comment-alt'
    }
  ];
  
  // Admin-specific menu items
  const adminItems = [
    {
      divider: true
    },
    {
      header: 'Administration'
    },
    {
      path: '/admin/users',
      label: 'User Management',
      icon: 'fas fa-users-cog'
    },
    {
      path: '/admin/content',
      label: 'Content Management',
      icon: 'fas fa-cubes'
    },
    {
      path: '/admin/notifications',
      label: 'Notifications',
      icon: 'fas fa-bell'
    }
  ];
  
  // Driver-specific menu items
  const driverItems = [
    {
      divider: true
    },
    {
      header: 'Driver Tools'
    },
    {
      path: '/driver/requests',
      label: 'Ride Requests',
      icon: 'fas fa-list-alt'
    },
    {
      path: '/driver/status',
      label: 'Driver Status',
      icon: 'fas fa-toggle-on'
    }
  ];
  
  // Content manager-specific menu items
  const contentManagerItems = [
    {
      divider: true
    },
    {
      header: 'Content Management'
    },
    {
      path: '/admin/content',
      label: 'Manage Content',
      icon: 'fas fa-cubes'
    },
    {
      path: '/admin/events',
      label: 'Manage Events',
      icon: 'fas fa-calendar-edit'
    }
  ];
  
  // Return items based on user role
  switch (userRole) {
    case 'admin':
      return [...commonItems, ...adminItems];
    case 'driver':
      return [...commonItems, ...driverItems];
    case 'content_manager':
      return [...commonItems, ...contentManagerItems];
    default:
      return commonItems;
  }
};

export default Sidebar;

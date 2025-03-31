import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { submitFeedback, reportIncident, getUserFeedback } from '../../services/api';
import '../../cssStyles/feeback/FeedbackForm.css'

const FeedbackForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [formType, setFormType] = useState('feedback'); // 'feedback' or 'incident'
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userFeedbacks, setUserFeedbacks] = useState([]);
  
  // Form data state
  const [feedbackData, setFeedbackData] = useState({
    category: '',
    subject: '',
    description: '',
    rating: 0,
    anonymous: false
  });
  
  const [incidentData, setIncidentData] = useState({
    type: '',
    location: '',
    description: '',
    urgency: 'medium',
    anonymous: false,
    contactInfo: {
      phone: '',
      email: ''
    }
  });
  
  // Load user's previous feedback submissions
  useEffect(() => {
    const loadUserFeedback = async () => {
      try {
        setLoading(true);
        const feedbacks = await getUserFeedback();
        setUserFeedbacks(feedbacks || []);
        setLoading(false);
      } catch (err) {
        console.error('Error loading user feedback:', err);
        setLoading(false);
      }
    };
    
    loadUserFeedback();
    
    // Check if this is an incident report from a specific location
    const params = new URLSearchParams(location.search);
    if (params.get('type') === 'incident') {
      setFormType('incident');
      
      // Pre-fill location if provided
      const locationParam = params.get('location');
      if (locationParam) {
        setIncidentData(prev => ({
          ...prev,
          location: locationParam
        }));
      }
    }
  }, [location]);
  
  // Handle feedback form input change
  const handleFeedbackChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFeedbackData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle incident form input change
  const handleIncidentChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle nested contactInfo fields
    if (name.startsWith('contact')) {
      const field = name.split('.')[1];
      setIncidentData(prev => ({
        ...prev,
        contactInfo: {
          ...prev.contactInfo,
          [field]: value
        }
      }));
    } else {
      setIncidentData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };
  
  // Handle rating selection
  const handleRatingChange = (rating) => {
    setFeedbackData(prev => ({ ...prev, rating }));
  };
  
  // Submit feedback form
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!feedbackData.category) {
      setError('Please select a category');
      return;
    }
    
    if (!feedbackData.subject) {
      setError('Please enter a subject');
      return;
    }
    
    if (!feedbackData.description || feedbackData.description.length < 10) {
      setError('Please provide a detailed description (at least 10 characters)');
      return;
    }
    
    try {
      setError(null);
      setSubmitting(true);
      
      // Submit feedback
      await submitFeedback({
        category: feedbackData.category,
        subject: feedbackData.subject,
        description: feedbackData.description,
        rating: feedbackData.rating,
        anonymous: feedbackData.anonymous
      });
      
      // Reset form
      setFeedbackData({
        category: '',
        subject: '',
        description: '',
        rating: 0,
        anonymous: false
      });
      
      // Show success message
      setSuccess('Thank you for your feedback! Your submission has been received.');
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
      // Reload user feedback
      const feedbacks = await getUserFeedback();
      setUserFeedbacks(feedbacks || []);
      
      setSubmitting(false);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
      setSubmitting(false);
    }
  };
  
  // Submit incident report
  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!incidentData.type) {
      setError('Please select an incident type');
      return;
    }
    
    if (!incidentData.location) {
      setError('Please provide the incident location');
      return;
    }
    
    if (!incidentData.description || incidentData.description.length < 10) {
      setError('Please provide a detailed description (at least 10 characters)');
      return;
    }
    
    try {
      setError(null);
      setSubmitting(true);
      
      // Submit incident report
      await reportIncident({
        type: incidentData.type,
        location: incidentData.location,
        description: incidentData.description,
        urgency: incidentData.urgency,
        anonymous: incidentData.anonymous,
        contactInfo: incidentData.anonymous ? null : incidentData.contactInfo
      });
      
      // Reset form
      setIncidentData({
        type: '',
        location: '',
        description: '',
        urgency: 'medium',
        anonymous: false,
        contactInfo: {
          phone: '',
          email: ''
        }
      });
      
      // Show success message
      setSuccess('Thank you for reporting this incident! Your report has been submitted for review.');
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
      setSubmitting(false);
    } catch (err) {
      console.error('Error submitting incident report:', err);
      setError('Failed to submit incident report. Please try again.');
      setSubmitting(false);
    }
  };
  
  return (
    <div className="feedback-container">
      <div className="feedback-header">
        <h1>
          <i className="fas fa-comment-alt me-2"></i>
          Feedback & Reporting
        </h1>
        <p className="lead">Share your experience and help us improve Smart City</p>
      </div>
      
      {/* Form Type Selector */}
      <div className="form-type-selector mb-4">
        <div className="btn-group" role="group">
          <button 
            type="button" 
            className={`btn ${formType === 'feedback' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFormType('feedback')}
          >
            <i className="fas fa-comment me-2"></i>
            Provide Feedback
          </button>
          <button 
            type="button" 
            className={`btn ${formType === 'incident' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFormType('incident')}
          >
            <i className="fas fa-exclamation-triangle me-2"></i>
            Report an Incident
          </button>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="alert alert-danger">
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </div>
      )}
      
      {/* Success Message */}
      {success && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle me-2"></i>
          {success}
        </div>
      )}
      
      <div className="row">
        <div className="col-md-8">
          {/* Feedback Form */}
          {formType === 'feedback' && (
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h3 className="mb-0">
                  <i className="fas fa-comment me-2"></i>
                  Feedback Form
                </h3>
              </div>
              <div className="card-body">
                <form onSubmit={handleFeedbackSubmit}>
                  <div className="mb-3">
                    <label htmlFor="category" className="form-label">Category *</label>
                    <select 
                      id="category" 
                      name="category" 
                      className="form-select"
                      value={feedbackData.category}
                      onChange={handleFeedbackChange}
                      required
                    >
                      <option value="">Select a category</option>
                      <option value="app">Mobile App</option>
                      <option value="web">Web Portal</option>
                      <option value="feature">Feature Request</option>
                      <option value="attraction">Attraction</option>
                      <option value="transportation">Transportation</option>
                      <option value="event">Event</option>
                      <option value="accessibility">Accessibility</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="subject" className="form-label">Subject *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="subject" 
                      name="subject"
                      placeholder="Brief subject of your feedback"
                      value={feedbackData.subject}
                      onChange={handleFeedbackChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="description" className="form-label">Description *</label>
                    <textarea 
                      className="form-control" 
                      id="description" 
                      name="description"
                      rows="5"
                      placeholder="Please provide detailed feedback..."
                      value={feedbackData.description}
                      onChange={handleFeedbackChange}
                      required
                    ></textarea>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Rating</label>
                    <div className="star-rating">
                      {[1, 2, 3, 4, 5].map(star => (
                        <span 
                          key={star}
                          className={`star ${feedbackData.rating >= star ? 'active' : ''}`}
                          onClick={() => handleRatingChange(star)}
                        >
                          <i className="fas fa-star"></i>
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-4 form-check">
                    <input 
                      type="checkbox" 
                      className="form-check-input" 
                      id="anonymous" 
                      name="anonymous"
                      checked={feedbackData.anonymous}
                      onChange={handleFeedbackChange}
                    />
                    <label className="form-check-label" htmlFor="anonymous">
                      Submit anonymously (your name will not be associated with this feedback)
                    </label>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-2"></i>
                        Submit Feedback
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
          
          {/* Incident Report Form */}
          {formType === 'incident' && (
            <div className="card">
              <div className="card-header bg-warning text-dark">
                <h3 className="mb-0">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Incident Report
                </h3>
              </div>
              <div className="card-body">
                <form onSubmit={handleIncidentSubmit}>
                  <div className="mb-3">
                    <label htmlFor="type" className="form-label">Incident Type *</label>
                    <select 
                      id="type" 
                      name="type" 
                      className="form-select"
                      value={incidentData.type}
                      onChange={handleIncidentChange}
                      required
                    >
                      <option value="">Select incident type</option>
                      <option value="safety">Safety Concern</option>
                      <option value="maintenance">Maintenance Issue</option>
                      <option value="accessibility">Accessibility Problem</option>
                      <option value="damage">Property Damage</option>
                      <option value="cleanliness">Cleanliness Issue</option>
                      <option value="behavior">Disruptive Behavior</option>
                      <option value="transportation">Transportation Problem</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="location" className="form-label">Location *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="location" 
                      name="location"
                      placeholder="Where did this incident occur?"
                      value={incidentData.location}
                      onChange={handleIncidentChange}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="description" className="form-label">Description *</label>
                    <textarea 
                      className="form-control" 
                      id="description" 
                      name="description"
                      rows="5"
                      placeholder="Please provide detailed information about the incident..."
                      value={incidentData.description}
                      onChange={handleIncidentChange}
                      required
                    ></textarea>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="urgency" className="form-label">Urgency</label>
                    <select 
                      id="urgency" 
                      name="urgency" 
                      className="form-select"
                      value={incidentData.urgency}
                      onChange={handleIncidentChange}
                    >
                      <option value="low">Low - Not time-sensitive</option>
                      <option value="medium">Medium - Should be addressed soon</option>
                      <option value="high">High - Requires prompt attention</option>
                      <option value="critical">Critical - Immediate response needed</option>
                    </select>
                  </div>
                  
                  <div className="mb-4 form-check">
                    <input 
                      type="checkbox" 
                      className="form-check-input" 
                      id="anonymous" 
                      name="anonymous"
                      checked={incidentData.anonymous}
                      onChange={handleIncidentChange}
                    />
                    <label className="form-check-label" htmlFor="anonymous">
                      Submit anonymously (your name will not be associated with this report)
                    </label>
                  </div>
                  
                  {!incidentData.anonymous && (
                    <div className="contact-info mb-4">
                      <h5>Contact Information for Follow-up</h5>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label htmlFor="contact.phone" className="form-label">Phone (Optional)</label>
                          <input 
                            type="tel" 
                            className="form-control" 
                            id="contact.phone" 
                            name="contact.phone"
                            placeholder="Your phone number"
                            value={incidentData.contactInfo.phone}
                            onChange={handleIncidentChange}
                          />
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="contact.email" className="form-label">Email (Optional)</label>
                          <input 
                            type="email" 
                            className="form-control" 
                            id="contact.email" 
                            name="contact.email"
                            placeholder="Your email address"
                            value={incidentData.contactInfo.email}
                            onChange={handleIncidentChange}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <button 
                    type="submit" 
                    className="btn btn-warning"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-2"></i>
                        Submit Report
                      </>
                    )}
                  </button>
                </form>
              </div>
              <div className="card-footer">
                <div className="emergency-notice">
                  <i className="fas fa-phone-alt me-2 text-danger"></i>
                  <strong>For emergencies, please call 911 immediately.</strong> This form is not monitored 24/7.
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="col-md-4">
          {/* Previous Submissions */}
          <div className="card">
            <div className="card-header bg-light">
              <h4 className="mb-0">Your Previous Submissions</h4>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="text-center py-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : userFeedbacks.length === 0 ? (
                <div className="no-feedback">
                  <i className="fas fa-comment-slash fa-3x mb-3 text-muted"></i>
                  <p>You haven't submitted any feedback or incident reports yet.</p>
                </div>
              ) : (
                <div className="feedback-list">
                  {userFeedbacks.map(item => (
                    <div key={item._id} className="feedback-item">
                      <div className="feedback-header">
                        <h5>{item.subject || item.type}</h5>
                        <span className={`badge ${item.category ? 'bg-primary' : 'bg-warning'}`}>
                          {item.category || item.type}
                        </span>
                      </div>
                      <p className="feedback-date">
                        <i className="far fa-calendar-alt me-1"></i>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                      <p className="feedback-excerpt">
                        {item.description.substring(0, 100)}...
                      </p>
                      <div className="feedback-status">
                        <span className={`status-badge status-${item.status.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Help Information */}
          <div className="card mt-4">
            <div className="card-header bg-info text-white">
              <h4 className="mb-0">
                <i className="fas fa-info-circle me-2"></i>
                Information
              </h4>
            </div>
            <div className="card-body">
              <h5>When to Submit Feedback</h5>
              <ul>
                <li>Share your experience with Smart City app</li>
                <li>Suggest new features or improvements</li>
                <li>Rate attractions, events, or services</li>
                <li>Provide general comments or suggestions</li>
              </ul>
              
              <h5>When to Report an Incident</h5>
              <ul>
                <li>Safety concerns in public areas</li>
                <li>Damaged infrastructure or facilities</li>
                <li>Accessibility issues encountered</li>
                <li>Transportation service disruptions</li>
                <li>Technical problems with city services</li>
              </ul>
              
              <div className="contact-info mt-4">
                <h5>Need Immediate Assistance?</h5>
                <p>
                  <i className="fas fa-phone me-2"></i>
                  Customer Support: (304) 555-1234
                </p>
                <p>
                  <i className="fas fa-envelope me-2"></i>
                  Email: support@smartcity.com
                </p>
                <p>
                  <i className="fas fa-clock me-2"></i>
                  Hours: 8am - 8pm, Monday - Saturday
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackForm;
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../cssStyles/auth/Register.css'

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const { register, loginWithGoogle, loginWithFacebook } = useAuth();
  const navigate = useNavigate();

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Calculate password strength if password field is changed
    if (name === 'password') {
      calculatePasswordStrength(value);
    }
  };

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  };

  // Get password strength class and text
  const getStrengthClass = () => {
    if (passwordStrength === 0) return { className: 'bg-danger', text: 'Weak' };
    if (passwordStrength === 1) return { className: 'bg-danger', text: 'Weak' };
    if (passwordStrength === 2) return { className: 'bg-warning', text: 'Fair' };
    if (passwordStrength === 3) return { className: 'bg-info', text: 'Good' };
    if (passwordStrength === 4) return { className: 'bg-success', text: 'Strong' };
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('All fields marked with * are required');
      return;
    }
    
    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Validate password strength
    if (passwordStrength < 3) {
      setError('Please use a stronger password');
      return;
    }
    
    try {
      setLoading(true);
      await register(formData);
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google registration
  const handleGoogleRegister = async () => {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      console.error('Google registration error:', err);
      setError(err.message || 'Google registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Facebook registration
  const handleFacebookRegister = async () => {
    try {
      setLoading(true);
      setError('');
      await loginWithFacebook();
      navigate('/dashboard');
    } catch (err) {
      console.error('Facebook registration error:', err);
      setError(err.message || 'Facebook registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const strengthInfo = getStrengthClass();

  return (
    <div className="auth-container">
      <div className="auth-card register-card">
        <div className="auth-header">
          <div className="logo">
            <i className="fas fa-city"></i>
          </div>
          <h1>Smart City</h1>
          <p>Create a new account</p>
        </div>
        
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="firstName" className="form-label">First Name *</label>
              <input
                type="text"
                className="form-control"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="lastName" className="form-label">Last Name *</label>
              <input
                type="text"
                className="form-control"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email address *</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-envelope"></i></span>
              <input
                type="email"
                className="form-control"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                required
              />
            </div>
          </div>
          
          <div className="mb-3">
            <label htmlFor="phone" className="form-label">Phone Number</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-phone"></i></span>
              <input
                type="tel"
                className="form-control"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(optional)"
              />
            </div>
          </div>
          
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password *</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-lock"></i></span>
              <input
                type="password"
                className="form-control"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                required
              />
            </div>
            {formData.password && (
              <div className="mt-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="progress flex-grow-1 me-2" style={{ height: '5px' }}>
                    <div 
                      className={`progress-bar ${strengthInfo.className}`} 
                      role="progressbar" 
                      style={{ width: `${(passwordStrength / 4) * 100}%` }}
                      aria-valuenow={passwordStrength} 
                      aria-valuemin="0" 
                      aria-valuemax="4"
                    ></div>
                  </div>
                  <span className="password-strength-text small">{strengthInfo.text}</span>
                </div>
                <ul className="password-requirements small text-muted">
                  <li className={formData.password.length >= 8 ? 'text-success' : ''}>
                    <i className={`fas ${formData.password.length >= 8 ? 'fa-check' : 'fa-times'} me-1`}></i>
                    At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(formData.password) ? 'text-success' : ''}>
                    <i className={`fas ${/[A-Z]/.test(formData.password) ? 'fa-check' : 'fa-times'} me-1`}></i>
                    At least one uppercase letter
                  </li>
                  <li className={/[0-9]/.test(formData.password) ? 'text-success' : ''}>
                    <i className={`fas ${/[0-9]/.test(formData.password) ? 'fa-check' : 'fa-times'} me-1`}></i>
                    At least one number
                  </li>
                  <li className={/[^A-Za-z0-9]/.test(formData.password) ? 'text-success' : ''}>
                    <i className={`fas ${/[^A-Za-z0-9]/.test(formData.password) ? 'fa-check' : 'fa-times'} me-1`}></i>
                    At least one special character
                  </li>
                </ul>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password *</label>
            <div className="input-group">
              <span className="input-group-text"><i className="fas fa-lock"></i></span>
              <input
                type="password"
                className="form-control"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                required
              />
            </div>
            {formData.password && formData.confirmPassword && 
             formData.password !== formData.confirmPassword && (
              <div className="text-danger small mt-1">
                <i className="fas fa-exclamation-circle me-1"></i>
                Passwords do not match
              </div>
            )}
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-100" 
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating account...
              </>
            ) : 'Create Account'}
          </button>
        </form>
        
        <div className="auth-divider">
          <span>OR</span>
        </div>
        
        <div className="social-login">
          <button 
            type="button" 
            className="btn btn-outline-secondary w-100 mb-2"
            onClick={handleGoogleRegister}
            disabled={loading}
          >
            <i className="fab fa-google me-2"></i> Sign up with Google
          </button>
          
          <button 
            type="button" 
            className="btn btn-outline-secondary w-100"
            onClick={handleFacebookRegister}
            disabled={loading}
          >
            <i className="fab fa-facebook-f me-2"></i> Sign up with Facebook
          </button>
        </div>
        
        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
        
        <div className="terms-text">
          <small className="text-muted">
            By signing up, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.
          </small>
        </div>
      </div>
    </div>
  );
};

export default Register;

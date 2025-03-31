import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  getCourtesyCars, 
  requestCourtesyCar, 
  getCourtesyCarRequestStatus,
  cancelCourtesyCarRequest
} from '../../services/api';
import { addEventHandler } from '../../services/websocket';
import { getUserLocation, formatRelativeTime } from '../../utils/helpers';
import L from 'leaflet';
import '../../cssStyles/transportation/CourtesyCars.css'

const CourtesyCars = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courtesyData, setCourtesyData] = useState(null);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    pickupLocation: null,
    pickupAddress: '',
    pickupNotes: '',
    dropoffLocation: null,
    dropoffAddress: '',
    dropoffNotes: '',
    passengers: 1,
    scheduledTime: '',
    requestedFeatures: []
  });
  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [trackingInterval, setTrackingInterval] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const vehicleMarkersRef = useRef({});
  const routeLayerRef = useRef(null);
  const driverMarkerRef = useRef(null);

  // Fetch courtesy car data on component mount
  useEffect(() => {
    const fetchCourtesyData = async () => {
      try {
        setLoading(true);
        
        // Get courtesy car data
        const data = await getCourtesyCars();
        setCourtesyData(data);
        
        // Check for active requests
        checkForActiveRequests();
      } catch (err) {
        console.error('Error fetching courtesy car data:', err);
        setError('Failed to load courtesy car data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourtesyData();
    
    // Set up refresh interval
    const intervalId = setInterval(() => {
      fetchCourtesyData();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  // Set up WebSocket for real-time updates
  useEffect(() => {
    // Subscribe to courtesy car updates
    const unsubscribe = addEventHandler('transportation_update', handleTransportationUpdate);
    
    // Cleanup on unmount
    return unsubscribe;
  }, []);

  // Initialize map once data is loaded
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Initialize map if it doesn't exist
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [40.7128, -74.006], // Default center - will be adjusted
        zoom: 15,
        zoomControl: false,
        attributionControl: true
      });
      
      // Add zoom control to bottom right
      L.control.zoom({
        position: 'bottomright'
      }).addTo(mapInstanceRef.current);
      
      // Add scale control
      L.control.scale({
        imperial: false,
        position: 'bottomleft'
      }).addTo(mapInstanceRef.current);
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);
      
      // Try to get user's current location
      getUserLocation()
        .then(location => {
          mapInstanceRef.current.setView([location.lat, location.lng], 16);
          
          // If we're in request mode, set the pickup location
          if (showRequestForm) {
            handleMapClick({ latlng: L.latLng(location.lat, location.lng) });
          }
        })
        .catch(err => {
          console.error('Error getting user location:', err);
          // Use default location if user's location is unavailable
        });
      
      // Add click handler for setting pickup/dropoff locations
      mapInstanceRef.current.on('click', handleMapClick);
    }
    
    // Update vehicle markers if data is loaded
    if (courtesyData && courtesyData.vehicles) {
      updateVehicleMarkers(courtesyData.vehicles);
    }
    
    // Update driver marker if tracking a request
    if (driverLocation) {
      updateDriverMarker(driverLocation);
    }
    
    // If we have a route and are tracking a request, draw the route
    if (requestStatus && requestStatus.route && requestStatus.route.path) {
      drawRouteOnMap(requestStatus.route.path);
    }
    
  }, [courtesyData, showRequestForm, driverLocation, requestStatus]);

  // Track request status if there's an active request
  useEffect(() => {
    // Clear any existing interval
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }
    
    // Set up interval to track request status
    if (currentRequest) {
      const fetchRequestStatus = async () => {
        try {
          const status = await getCourtesyCarRequestStatus(currentRequest._id);
          setRequestStatus(status);
          
          // If the driver's location is included, update it
          if (status.request && status.request.driver && status.request.vehicle) {
            setDriverLocation({
              coordinates: status.request.vehicle.location.coordinates,
              heading: status.request.vehicle.location.heading,
              speed: status.request.vehicle.location.speed
            });
          }
        } catch (err) {
          console.error('Error fetching request status:', err);
        }
      };
      
      // Fetch immediately
      fetchRequestStatus();
      
      // Then set up interval
      const intervalId = setInterval(fetchRequestStatus, 10000); // Every 10 seconds
      setTrackingInterval(intervalId);
      
      return () => clearInterval(intervalId);
    }
  }, [currentRequest]);

  // Handle real-time transportation updates
  const handleTransportationUpdate = (data) => {
    if (!data || data.type !== 'courtesy') return;
    
    // Update courtesy car data with new vehicle positions
    setCourtesyData(prevData => {
      if (!prevData) return data.data;
      
      // Merge the new data with existing data
      return {
        ...prevData,
        vehicles: data.data.vehicles || prevData.vehicles,
        lastUpdated: new Date()
      };
    });
    
    // If we're tracking a driver, update their location
    if (currentRequest && data.data.vehicles) {
      // Find the vehicle assigned to our request
      if (requestStatus && requestStatus.request && requestStatus.request.vehicle) {
        const vehicle = data.data.vehicles.find(
          v => v._id === requestStatus.request.vehicle._id
        );
        
        if (vehicle && vehicle.location) {
          setDriverLocation({
            coordinates: vehicle.location.coordinates,
            heading: vehicle.location.heading,
            speed: vehicle.location.speed
          });
        }
      }
    }
    
    // Update vehicle markers on map
    if (mapInstanceRef.current && data.data.vehicles && !currentRequest) {
      updateVehicleMarkers(data.data.vehicles);
    }
  };

  // Check for any active requests in the local storage
  const checkForActiveRequests = async () => {
    const requestId = localStorage.getItem('courtesyRequestId');
    
    if (requestId) {
      try {
        const status = await getCourtesyCarRequestStatus(requestId);
        
        // Only set as current if the request is still active
        if (
          status && 
          status.request && 
          ['pending', 'accepted', 'in_progress'].includes(status.request.status)
        ) {
          setCurrentRequest(status.request);
          setRequestStatus(status);
          
          // If the driver's location is included, update it
          if (status.request.driver && status.request.vehicle) {
            setDriverLocation({
              coordinates: status.request.vehicle.location.coordinates,
              heading: status.request.vehicle.location.heading,
              speed: status.request.vehicle.location.speed
            });
          }
        } else {
          // If request is complete or cancelled, clear it
          localStorage.removeItem('courtesyRequestId');
        }
      } catch (err) {
        console.error('Error checking active request:', err);
        localStorage.removeItem('courtesyRequestId');
      }
    }
  };

  // Handle map click for setting pickup/dropoff locations
  const handleMapClick = (e) => {
    if (!showRequestForm) return;
    
    const { lat, lng } = e.latlng;
    
    // Handle based on the current step
    if (step === 1) {
      // Set pickup location
      setRequestFormData(prev => ({
        ...prev,
        pickupLocation: {
          coordinates: [lng, lat]
        }
      }));
      
      // Update pickup marker
      updatePickupMarker([lat, lng]);
      
      // Try to reverse geocode to get address
      reverseGeocode([lng, lat])
        .then(address => {
          setRequestFormData(prev => ({
            ...prev,
            pickupAddress: address
          }));
        })
        .catch(err => console.error('Error geocoding:', err));
    } else if (step === 2) {
      // Set dropoff location
      setRequestFormData(prev => ({
        ...prev,
        dropoffLocation: {
          coordinates: [lng, lat]
        }
      }));
      
      // Update dropoff marker
      updateDropoffMarker([lat, lng]);
      
      // Try to reverse geocode to get address
      reverseGeocode([lng, lat])
        .then(address => {
          setRequestFormData(prev => ({
            ...prev,
            dropoffAddress: address
          }));
        })
        .catch(err => console.error('Error geocoding:', err));
    }
  };

  // Update pickup marker on map
  const updatePickupMarker = (coords) => {
    if (!mapInstanceRef.current) return;
    
    // Remove existing marker if it exists
    if (pickupMarkerRef.current) {
      mapInstanceRef.current.removeLayer(pickupMarkerRef.current);
    }
    
    // Create new marker
    pickupMarkerRef.current = L.marker(coords, {
      icon: L.divIcon({
        className: 'pickup-marker',
        html: '<div class="marker-icon pickup"><i class="fas fa-map-marker-alt"></i></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      }),
      draggable: true
    }).addTo(mapInstanceRef.current);
    
    // Add drag end handler
    pickupMarkerRef.current.on('dragend', function(e) {
      const marker = e.target;
      const position = marker.getLatLng();
      
      setRequestFormData(prev => ({
        ...prev,
        pickupLocation: {
          coordinates: [position.lng, position.lat]
        }
      }));
      
      // Try to reverse geocode to get address
      reverseGeocode([position.lng, position.lat])
        .then(address => {
          setRequestFormData(prev => ({
            ...prev,
            pickupAddress: address
          }));
        })
        .catch(err => console.error('Error geocoding:', err));
    });
    
    // Add popup
    pickupMarkerRef.current.bindPopup('Pickup Location');
    
    // If both markers exist, try to fit them in view
    if (pickupMarkerRef.current && dropoffMarkerRef.current) {
      const bounds = L.latLngBounds([
        pickupMarkerRef.current.getLatLng(),
        dropoffMarkerRef.current.getLatLng()
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else {
      // Otherwise just center on this marker
      mapInstanceRef.current.setView(coords, 16);
    }
  };

  // Update dropoff marker on map
  const updateDropoffMarker = (coords) => {
    if (!mapInstanceRef.current) return;
    
    // Remove existing marker if it exists
    if (dropoffMarkerRef.current) {
      mapInstanceRef.current.removeLayer(dropoffMarkerRef.current);
    }
    
    // Create new marker
    dropoffMarkerRef.current = L.marker(coords, {
      icon: L.divIcon({
        className: 'dropoff-marker',
        html: '<div class="marker-icon dropoff"><i class="fas fa-flag-checkered"></i></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 40]
      }),
      draggable: true
    }).addTo(mapInstanceRef.current);
    
    // Add drag end handler
    dropoffMarkerRef.current.on('dragend', function(e) {
      const marker = e.target;
      const position = marker.getLatLng();
      
      setRequestFormData(prev => ({
        ...prev,
        dropoffLocation: {
          coordinates: [position.lng, position.lat]
        }
      }));
      
      // Try to reverse geocode to get address
      reverseGeocode([position.lng, position.lat])
        .then(address => {
          setRequestFormData(prev => ({
            ...prev,
            dropoffAddress: address
          }));
        })
        .catch(err => console.error('Error geocoding:', err));
    });
    
    // Add popup
    dropoffMarkerRef.current.bindPopup('Dropoff Location');
    
    // If both markers exist, try to fit them in view
    if (pickupMarkerRef.current && dropoffMarkerRef.current) {
      const bounds = L.latLngBounds([
        pickupMarkerRef.current.getLatLng(),
        dropoffMarkerRef.current.getLatLng()
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else {
      // Otherwise just center on this marker
      mapInstanceRef.current.setView(coords, 16);
    }
  };

  // Update vehicle markers on map
  const updateVehicleMarkers = (vehicles) => {
    if (!mapInstanceRef.current) return;
    
    // Track current vehicle IDs to remove stale markers
    const currentVehicleIds = new Set();
    
    // Update or create markers for each vehicle
    vehicles.forEach(vehicle => {
      // Only show available vehicles
      if (vehicle.status !== 'active') return;
      
      const vehicleId = vehicle._id;
      currentVehicleIds.add(vehicleId);
      
      if (!vehicle.location || !vehicle.location.coordinates) return;
      
      const vehicleLatLng = [vehicle.location.coordinates[1], vehicle.location.coordinates[0]];
      const heading = vehicle.location.heading || 0;
      
      // If marker already exists, update its position
      if (vehicleMarkersRef.current[vehicleId]) {
        const marker = vehicleMarkersRef.current[vehicleId];
        marker.setLatLng(vehicleLatLng);
        
        // Update marker rotation based on heading
        const icon = marker.getElement();
        if (icon) {
          icon.style.transform = `${icon.style.transform.replace(/rotate\([^)]+\)/, '')} rotate(${heading}deg)`;
        }
      } 
      // Otherwise create a new marker
      else {
        const marker = L.marker(vehicleLatLng, {
          icon: L.divIcon({
            className: 'courtesy-vehicle-marker',
            html: `<div class="vehicle-marker">
                    <i class="fas fa-car"></i>
                   </div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        }).addTo(mapInstanceRef.current);
        
        // Add rotation based on heading
        const icon = marker.getElement();
        if (icon) {
          icon.style.transform = `${icon.style.transform} rotate(${heading}deg)`;
        }
        
        // Add popup
        marker.bindPopup(`
          <h5>${vehicle.name}</h5>
          <p>Status: ${vehicle.status}</p>
          <p>Driver: ${vehicle.driver ? `${vehicle.driver.firstName} ${vehicle.driver.lastName}` : 'Unassigned'}</p>
          <p>Capacity: ${vehicle.capacity || 4} passengers</p>
        `);
        
        vehicleMarkersRef.current[vehicleId] = marker;
      }
    });
    
    // Remove stale markers
    Object.keys(vehicleMarkersRef.current).forEach(id => {
      if (!currentVehicleIds.has(id)) {
        mapInstanceRef.current.removeLayer(vehicleMarkersRef.current[id]);
        delete vehicleMarkersRef.current[id];
      }
    });
  };

  // Update driver marker on map when tracking a request
  const updateDriverMarker = (locationData) => {
    if (!mapInstanceRef.current || !locationData || !locationData.coordinates) return;
    
    const driverLatLng = [locationData.coordinates[1], locationData.coordinates[0]];
    const heading = locationData.heading || 0;
    
    // If marker already exists, update its position
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng(driverLatLng);
      
      // Update marker rotation based on heading
      const icon = driverMarkerRef.current.getElement();
      if (icon) {
        icon.style.transform = `${icon.style.transform.replace(/rotate\([^)]+\)/, '')} rotate(${heading}deg)`;
      }
    } 
    // Otherwise create a new marker
    else {
      driverMarkerRef.current = L.marker(driverLatLng, {
        icon: L.divIcon({
          className: 'driver-vehicle-marker',
          html: `<div class="vehicle-marker driver">
                  <i class="fas fa-car"></i>
                 </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        })
      }).addTo(mapInstanceRef.current);
      
      // Add rotation based on heading
      const icon = driverMarkerRef.current.getElement();
      if (icon) {
        icon.style.transform = `${icon.style.transform} rotate(${heading}deg)`;
      }
      
      // Add popup
      driverMarkerRef.current.bindPopup(`
        <h5>Your Driver</h5>
        <p>ETA: ${requestStatus?.eta || 'Calculating...'} min</p>
      `);
    }
    
    // If we have pickup and dropoff markers, fit them all in view
    if (pickupMarkerRef.current && dropoffMarkerRef.current) {
      const bounds = L.latLngBounds([
        pickupMarkerRef.current.getLatLng(),
        dropoffMarkerRef.current.getLatLng(),
        driverMarkerRef.current.getLatLng()
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else {
      // Otherwise just center on driver
      mapInstanceRef.current.setView(driverLatLng, 16);
    }
  };

  // Draw route on map
  const drawRouteOnMap = (routePath) => {
    if (!mapInstanceRef.current || !routePath) return;
    
    // Clear existing route layer
    if (routeLayerRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current);
    }
    
    // Create path coordinates
    const routeCoordinates = routePath.map(coord => [coord[1], coord[0]]);
    
    // Create route layer
    routeLayerRef.current = L.polyline(routeCoordinates, {
      color: '#4285F4',
      weight: 5,
      opacity: 0.7
    }).addTo(mapInstanceRef.current);
    
    // Fit map to route bounds
    mapInstanceRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = async (coordinates) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates[1]}&lon=${coordinates[0]}`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      return data.display_name;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return 'Unknown location';
    }
  };

  // Start new ride request
  const startNewRequest = () => {
    setShowRequestForm(true);
    setStep(1);
    setFormError(null);
    
    // Clear any existing markers
    if (mapInstanceRef.current) {
      if (pickupMarkerRef.current) {
        mapInstanceRef.current.removeLayer(pickupMarkerRef.current);
        pickupMarkerRef.current = null;
      }
      
      if (dropoffMarkerRef.current) {
        mapInstanceRef.current.removeLayer(dropoffMarkerRef.current);
        dropoffMarkerRef.current = null;
      }
      
      // Hide vehicle markers during request process
      Object.values(vehicleMarkersRef.current).forEach(marker => {
        mapInstanceRef.current.removeLayer(marker);
      });
      vehicleMarkersRef.current = {};
    }
    
    // Reset form data
    setRequestFormData({
      pickupLocation: null,
      pickupAddress: '',
      pickupNotes: '',
      dropoffLocation: null,
      dropoffAddress: '',
      dropoffNotes: '',
      passengers: 1,
      scheduledTime: '',
      requestedFeatures: []
    });
    
    // Try to get user's current location for pickup
    getUserLocation()
      .then(location => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([location.lat, location.lng], 16);
          handleMapClick({ latlng: L.latLng(location.lat, location.lng) });
        }
      })
      .catch(err => {
        console.error('Error getting user location:', err);
      });
  };

  // Cancel ride request form
  const cancelRequestForm = () => {
    setShowRequestForm(false);
    setStep(1);
    setFormError(null);
    
    // Clear any existing markers
    if (mapInstanceRef.current) {
      if (pickupMarkerRef.current) {
        mapInstanceRef.current.removeLayer(pickupMarkerRef.current);
        pickupMarkerRef.current = null;
      }
      
      if (dropoffMarkerRef.current) {
        mapInstanceRef.current.removeLayer(dropoffMarkerRef.current);
        dropoffMarkerRef.current = null;
      }
      
      // Restore vehicle markers
      if (courtesyData && courtesyData.vehicles) {
        updateVehicleMarkers(courtesyData.vehicles);
      }
    }
  };

  // Move to next step in request form
  const nextStep = () => {
    // Validate current step
    if (step === 1) {
      if (!requestFormData.pickupLocation) {
        setFormError('Please select a pickup location');
        return;
      }
    } else if (step === 2) {
      if (!requestFormData.dropoffLocation) {
        setFormError('Please select a dropoff location');
        return;
      }
    }
    
    setFormError(null);
    setStep(prevStep => prevStep + 1);
  };

  // Move to previous step in request form
  const prevStep = () => {
    setStep(prevStep => Math.max(1, prevStep - 1));
    setFormError(null);
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      // Handle feature checkboxes
      if (name === 'feature') {
        setRequestFormData(prev => {
          const features = [...prev.requestedFeatures];
          
          if (checked) {
            features.push(value);
          } else {
            const index = features.indexOf(value);
            if (index !== -1) {
              features.splice(index, 1);
            }
          }
          
          return {
            ...prev,
            requestedFeatures: features
          };
        });
      }
    } else {
      setRequestFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Submit ride request
  const submitRequest = async () => {
    setFormError(null);
    
    // Final validation
    if (!requestFormData.pickupLocation || !requestFormData.dropoffLocation) {
      setFormError('Both pickup and dropoff locations are required');
      return;
    }
    
    try {
      setRequestLoading(true);
      
      // Submit request to API
      const response = await requestCourtesyCar(requestFormData);
      
      // Store request ID in local storage for persistence
      localStorage.setItem('courtesyRequestId', response.request._id);
      
      // Update state with new request
      setCurrentRequest(response.request);
      setRequestStatus({
        request: response.request,
        eta: response.estimatedWait,
        lastUpdated: new Date()
      });
      
      // Reset request form
      setShowRequestForm(false);
      setStep(1);
      
      // Setup markers for the active request
      if (mapInstanceRef.current) {
        // Clear existing markers
        if (pickupMarkerRef.current) {
          mapInstanceRef.current.removeLayer(pickupMarkerRef.current);
        }
        
        if (dropoffMarkerRef.current) {
          mapInstanceRef.current.removeLayer(dropoffMarkerRef.current);
        }
        
        // Create new pickup marker
        const pickupCoords = [
          requestFormData.pickupLocation.coordinates[1],
          requestFormData.pickupLocation.coordinates[0]
        ];
        updatePickupMarker(pickupCoords);
        
        // Create new dropoff marker
        const dropoffCoords = [
          requestFormData.dropoffLocation.coordinates[1],
          requestFormData.dropoffLocation.coordinates[0]
        ];
        updateDropoffMarker(dropoffCoords);
        
        // Fit both markers in view
        const bounds = L.latLngBounds([pickupCoords, dropoffCoords]);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (err) {
      console.error('Error submitting ride request:', err);
      setFormError('Failed to submit request. Please try again.');
    } finally {
      setRequestLoading(false);
    }
  };

  // Cancel an active request
  const cancelRequest = async () => {
    if (!currentRequest) return;
    
    try {
      await cancelCourtesyCarRequest(currentRequest._id, 'Cancelled by user');
      
      // Remove request ID from local storage
      localStorage.removeItem('courtesyRequestId');
      
      // Reset state
      setCurrentRequest(null);
      setRequestStatus(null);
      setDriverLocation(null);
      
      // Clear driver marker if it exists
      if (mapInstanceRef.current && driverMarkerRef.current) {
        mapInstanceRef.current.removeLayer(driverMarkerRef.current);
        driverMarkerRef.current = null;
      }
      
      // Clear route layer if it exists
      if (mapInstanceRef.current && routeLayerRef.current) {
        mapInstanceRef.current.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
      
      // Restore vehicle markers
      if (courtesyData && courtesyData.vehicles) {
        updateVehicleMarkers(courtesyData.vehicles);
      }
    } catch (err) {
      console.error('Error cancelling request:', err);
      alert('Failed to cancel request. Please try again.');
    }
  };

  // Get available cars count
  const getAvailableCarsCount = () => {
    if (!courtesyData || !courtesyData.vehicles) return 0;
    
    return courtesyData.vehicles.filter(v => v.status === 'active').length;
  };

  // Render loading state
  if (loading && !courtesyData) {
    return (
      <div className="courtesy-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading courtesy car data...</p>
      </div>
    );
  }

  return (
    <div className="courtesy-cars-container">
      <div className="courtesy-header">
        <h1>
          <i className="fas fa-car me-2"></i>
          Courtesy Cars
        </h1>
        <p className="lead">Request a ride around Smart City</p>
      </div>
      
      {error && (
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
      )}
      
      <div className="courtesy-content">
        <div className="row">
          <div className="col-md-4">
            <div className="courtesy-sidebar">
              {/* Sidebar content based on state */}
              {!currentRequest && !showRequestForm && (
                <div className="courtesy-status card mb-3">
                  <div className="card-body">
                    <h3 className="card-title">Courtesy Car Status</h3>
                    <div className="status-container">
                      <div className="status-item">
                        <div className="status-label">Available Cars</div>
                        <div className={`status-value ${getAvailableCarsCount() > 0 ? 'text-success' : 'text-danger'}`}>
                          <i className={`fas fa-${getAvailableCarsCount() > 0 ? 'check-circle' : 'exclamation-circle'} me-2`}></i>
                          {getAvailableCarsCount()} / {courtesyData?.vehicles?.length || 0}
                        </div>
                      </div>
                      
                      {courtesyData?.lastUpdated && (
                        <div className="status-item">
                          <div className="status-label">Last Updated</div>
                          <div className="status-value">
                            {formatRelativeTime(new Date(courtesyData.lastUpdated))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3">
                      <button 
                        className="btn btn-primary w-100"
                        onClick={startNewRequest}
                        disabled={getAvailableCarsCount() === 0}
                      >
                        <i className="fas fa-plus-circle me-2"></i>
                        Request a Ride
                      </button>
                      {getAvailableCarsCount() === 0 && (
                        <div className="text-danger small mt-2">
                          <i className="fas fa-exclamation-circle me-1"></i>
                          No cars available at this time
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Request Form */}
              {showRequestForm && (
                <div className="request-form card mb-3">
                  <div className="card-body">
                    <h3 className="card-title">Request a Ride</h3>
                    <div className="form-progress mb-3">
                      <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
                        <div className="step-number">1</div>
                        <div className="step-label">Pickup</div>
                      </div>
                      <div className="progress-line"></div>
                      <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
                        <div className="step-number">2</div>
                        <div className="step-label">Dropoff</div>
                      </div>
                      <div className="progress-line"></div>
                      <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
                        <div className="step-number">3</div>
                        <div className="step-label">Details</div>
                      </div>
                    </div>
                    
                    {formError && (
                      <div className="alert alert-danger">
                        <i className="fas fa-exclamation-circle me-2"></i>
                        {formError}
                      </div>
                    )}
                    
                    {/* Step 1: Pickup Location */}
                    {step === 1 && (
                      <div className="step-content">
                        <h4>Select Pickup Location</h4>
                        <p className="text-muted">Click on the map to set your pickup location</p>
                        
                        <div className="mb-3">
                          <label htmlFor="pickupAddress" className="form-label">Pickup Address</label>
                          <input
                            type="text"
                            className="form-control"
                            id="pickupAddress"
                            name="pickupAddress"
                            value={requestFormData.pickupAddress}
                            onChange={handleFormChange}
                            placeholder="Address will be set from map"
                          />
                        </div>
                        
                        <div className="mb-3">
                          <label htmlFor="pickupNotes" className="form-label">Pickup Notes (Optional)</label>
                          <textarea
                            className="form-control"
                            id="pickupNotes"
                            name="pickupNotes"
                            value={requestFormData.pickupNotes}
                            onChange={handleFormChange}
                            placeholder="E.g., I'm at the north entrance"
                            rows="2"
                          ></textarea>
                        </div>
                        
                        <div className="step-actions mt-4 d-flex justify-content-between">
                          <button 
                            className="btn btn-outline-secondary"
                            onClick={cancelRequestForm}
                          >
                            Cancel
                          </button>
                          <button 
                            className="btn btn-primary"
                            onClick={nextStep}
                            disabled={!requestFormData.pickupLocation}
                          >
                            Next <i className="fas fa-arrow-right ms-1"></i>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 2: Dropoff Location */}
                    {step === 2 && (
                      <div className="step-content">
                        <h4>Select Dropoff Location</h4>
                        <p className="text-muted">Click on the map to set your destination</p>
                        
                        <div className="mb-3">
                          <label htmlFor="dropoffAddress" className="form-label">Dropoff Address</label>
                          <input
                            type="text"
                            className="form-control"
                            id="dropoffAddress"
                            name="dropoffAddress"
                            value={requestFormData.dropoffAddress}
                            onChange={handleFormChange}
                            placeholder="Address will be set from map"
                          />
                        </div>
                        
                        <div className="mb-3">
                          <label htmlFor="dropoffNotes" className="form-label">Dropoff Notes (Optional)</label>
                          <textarea
                            className="form-control"
                            id="dropoffNotes"
                            name="dropoffNotes"
                            value={requestFormData.dropoffNotes}
                            onChange={handleFormChange}
                            placeholder="E.g., Drop me off at the hotel entrance"
                            rows="2"
                          ></textarea>
                        </div>
                        
                        <div className="step-actions mt-4 d-flex justify-content-between">
                          <button 
                            className="btn btn-outline-secondary"
                            onClick={prevStep}
                          >
                            <i className="fas fa-arrow-left me-1"></i> Back
                          </button>
                          <button 
                            className="btn btn-primary"
                            onClick={nextStep}
                            disabled={!requestFormData.dropoffLocation}
                          >
                            Next <i className="fas fa-arrow-right ms-1"></i>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Step 3: Ride Details */}
                    {step === 3 && (
                      <div className="step-content">
                        <h4>Ride Details</h4>
                        
                        <div className="mb-3">
                          <label htmlFor="passengers" className="form-label">Number of Passengers</label>
                          <select
                            className="form-select"
                            id="passengers"
                            name="passengers"
                            value={requestFormData.passengers}
                            onChange={handleFormChange}
                          >
                            <option value="1">1 passenger</option>
                            <option value="2">2 passengers</option>
                            <option value="3">3 passengers</option>
                            <option value="4">4 passengers</option>
                          </select>
                        </div>
                        
                        <div className="mb-3">
                          <label htmlFor="scheduledTime" className="form-label">Scheduled Time (Optional)</label>
                          <input
                            type="datetime-local"
                            className="form-control"
                            id="scheduledTime"
                            name="scheduledTime"
                            value={requestFormData.scheduledTime}
                            onChange={handleFormChange}
                            min={new Date().toISOString().slice(0, 16)}
                          />
                          <div className="form-text">Leave empty for immediate pickup</div>
                        </div>
                        
                        <div className="mb-3">
                          <label className="form-label">Special Requirements</label>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="feature-wheelchair"
                              name="feature"
                              value="wheelchairAccessible"
                              checked={requestFormData.requestedFeatures.includes('wheelchairAccessible')}
                              onChange={handleFormChange}
                            />
                            <label className="form-check-label" htmlFor="feature-wheelchair">
                              Wheelchair Accessible
                            </label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="feature-childSeat"
                              name="feature"
                              value="childSeat"
                              checked={requestFormData.requestedFeatures.includes('childSeat')}
                              onChange={handleFormChange}
                            />
                            <label className="form-check-label" htmlFor="feature-childSeat">
                              Child Seat
                            </label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="feature-extraLuggage"
                              name="feature"
                              value="extraLuggage"
                              checked={requestFormData.requestedFeatures.includes('extraLuggage')}
                              onChange={handleFormChange}
                            />
                            <label className="form-check-label" htmlFor="feature-extraLuggage">
                              Extra Luggage Space
                            </label>
                          </div>
                        </div>
                        
                        <div className="ride-summary mt-4">
                          <h5>Ride Summary</h5>
                          <div className="summary-item">
                            <div className="summary-label">Pickup:</div>
                            <div className="summary-value">{requestFormData.pickupAddress}</div>
                          </div>
                          <div className="summary-item">
                            <div className="summary-label">Dropoff:</div>
                            <div className="summary-value">{requestFormData.dropoffAddress}</div>
                          </div>
                          <div className="summary-item">
                            <div className="summary-label">Passengers:</div>
                            <div className="summary-value">{requestFormData.passengers}</div>
                          </div>
                          <div className="summary-item">
                            <div className="summary-label">Time:</div>
                            <div className="summary-value">
                              {requestFormData.scheduledTime ? new Date(requestFormData.scheduledTime).toLocaleString() : 'Now'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="step-actions mt-4 d-flex justify-content-between">
                          <button 
                            className="btn btn-outline-secondary"
                            onClick={prevStep}
                          >
                            <i className="fas fa-arrow-left me-1"></i> Back
                          </button>
                          <button 
                            className="btn btn-primary"
                            onClick={submitRequest}
                            disabled={requestLoading}
                          >
                            {requestLoading ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Submitting...
                              </>
                            ) : (
                              <>Request Ride <i className="fas fa-check ms-1"></i></>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Active Request */}
              {currentRequest && (
                <div className="active-request card mb-3">
                  <div className="card-body">
                    <h3 className="card-title">Active Request</h3>
                    
                    <div className="request-status mb-3">
                      <div className={`status-badge ${getStatusBadgeClass(currentRequest.status)}`}>
                        {getStatusLabel(currentRequest.status)}
                      </div>
                    </div>
                    
                    <div className="request-details">
                      <div className="detail-item">
                        <div className="detail-icon">
                          <i className="fas fa-map-marker-alt"></i>
                        </div>
                        <div className="detail-content">
                          <div className="detail-label">Pickup</div>
                          <div className="detail-value">{currentRequest.pickup.address}</div>
                        </div>
                      </div>
                      
                      <div className="detail-item">
                        <div className="detail-icon">
                          <i className="fas fa-flag-checkered"></i>
                        </div>
                        <div className="detail-content">
                          <div className="detail-label">Dropoff</div>
                          <div className="detail-value">{currentRequest.dropoff.address}</div>
                        </div>
                      </div>
                      
                      {requestStatus && requestStatus.eta && (
                        <div className="detail-item">
                          <div className="detail-icon">
                            <i className="fas fa-clock"></i>
                          </div>
                          <div className="detail-content">
                            <div className="detail-label">ETA</div>
                            <div className="detail-value">{requestStatus.eta} minutes</div>
                          </div>
                        </div>
                      )}
                      
                      {currentRequest.driver && (
                        <div className="detail-item">
                          <div className="detail-icon">
                            <i className="fas fa-user"></i>
                          </div>
                          <div className="detail-content">
                            <div className="detail-label">Driver</div>
                            <div className="detail-value">
                              {currentRequest.driver.firstName} {currentRequest.driver.lastName}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {currentRequest.vehicle && (
                        <div className="detail-item">
                          <div className="detail-icon">
                            <i className="fas fa-car"></i>
                          </div>
                          <div className="detail-content">
                            <div className="detail-label">Vehicle</div>
                            <div className="detail-value">
                              {currentRequest.vehicle.properties?.color} {currentRequest.vehicle.properties?.model}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="request-actions mt-4">
                      {currentRequest.status !== 'in_progress' && (
                        <button 
                          className="btn btn-danger w-100"
                          onClick={cancelRequest}
                        >
                          <i className="fas fa-times-circle me-2"></i>
                          Cancel Request
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Quick Help */}
              {!showRequestForm && (
                <div className="quick-help card">
                  <div className="card-body">
                    <h3 className="card-title">How It Works</h3>
                    <ol className="help-steps">
                      <li>
                        <i className="fas fa-map-marked-alt me-2"></i>
                        Set your pickup and dropoff locations
                      </li>
                      <li>
                        <i className="fas fa-user-friends me-2"></i>
                        Enter passenger count and any special requirements
                      </li>
                      <li>
                        <i className="fas fa-car me-2"></i>
                        Submit your request and wait for a driver
                      </li>
                      <li>
                        <i className="fas fa-location-arrow me-2"></i>
                        Track your driver's location in real-time
                      </li>
                    </ol>
                    <div className="help-footer">
                      <a href="#" className="text-decoration-none">
                        <i className="fas fa-question-circle me-1"></i>
                        More Help
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="col-md-8">
            {/* Map Container */}
            <div className="map-container card">
              <div className="card-body p-0">
                <div id="courtesy-map" ref={mapRef} className="courtesy-map"></div>
                
                <div className="map-overlay">
                  {showRequestForm && (
                    <div className="map-instructions">
                      {step === 1 && <div>Click on the map to set your pickup location</div>}
                      {step === 2 && <div>Click on the map to set your dropoff location</div>}
                    </div>
                  )}
                  
                  {!showRequestForm && !currentRequest && (
                    <div className="map-legend">
                      <div className="legend-item">
                        <div className="legend-icon vehicle-icon">
                          <i className="fas fa-car"></i>
                        </div>
                        <div className="legend-label">Available Car</div>
                      </div>
                    </div>
                  )}
                  
                  {currentRequest && (
                    <div className="map-legend">
                      <div className="legend-item">
                        <div className="legend-icon pickup-icon">
                          <i className="fas fa-map-marker-alt"></i>
                        </div>
                        <div className="legend-label">Pickup</div>
                      </div>
                      <div className="legend-item">
                        <div className="legend-icon dropoff-icon">
                          <i className="fas fa-flag-checkered"></i>
                        </div>
                        <div className="legend-label">Dropoff</div>
                      </div>
                      {driverLocation && (
                        <div className="legend-item">
                          <div className="legend-icon driver-icon">
                            <i className="fas fa-car"></i>
                          </div>
                          <div className="legend-label">Your Driver</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {loading && (
                  <div className="map-loading-overlay">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading map...</span>
                    </div>
                    <p>Loading map data...</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Additional Information */}
            {!showRequestForm && !currentRequest && (
              <div className="card mt-3">
                <div className="card-body">
                  <h3 className="card-title">Courtesy Car Information</h3>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="info-box">
                        <div className="info-icon">
                          <i className="fas fa-clock"></i>
                        </div>
                        <h4>Hours of Operation</h4>
                        <p>7:00 AM - 10:00 PM<br />Daily</p>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="info-box">
                        <div className="info-icon">
                          <i className="fas fa-map-marked-alt"></i>
                        </div>
                        <h4>Service Area</h4>
                        <p>Throughout Smart City<br />5 mile radius from center</p>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="info-box">
                        <div className="info-icon">
                          <i className="fas fa-info-circle"></i>
                        </div>
                        <h4>Contact Support</h4>
                        <p>555-123-4567<br />support@smartcity.com</p>
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
  );
};

// Helper function to get status badge class
const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-warning';
    case 'accepted':
      return 'bg-info';
    case 'in_progress':
      return 'bg-primary';
    case 'completed':
      return 'bg-success';
    case 'cancelled':
      return 'bg-danger';
    default:
      return 'bg-secondary';
  }
};

// Helper function to get status label
const getStatusLabel = (status) => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'accepted':
      return 'Driver Assigned';
    case 'in_progress':
      return 'On the Way';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};

export default CourtesyCars;

// src/HealthOverlay.js

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSignal, faClock, faCalendarAlt, faVideo,
  faThermometerHalf, faHeartbeat, faCheckCircle,
  faExclamationTriangle, faWifi, faChartLine, faMicrochip,
  faTimes, faExclamation
} from '@fortawesome/free-solid-svg-icons';
import '../css/HealthOverlay.css';

// Helper function to format the timestamp
const formatTimestamp = (ts) => {
  if (!ts) {
    return ''; // Return empty if no timestamp is provided
  }
  
  try {
    // If the timestamp is already a string with time format, just return it
    if (typeof ts === 'string' && ts.includes(':')) {
      return ts;
    }
    
    const dateObject = new Date(ts);
    
    // Check if the date object is valid
    if (isNaN(dateObject.getTime())) {
      console.warn(`Invalid timestamp received: ${ts}`);
      return 'Updating...';
    }
    
    // Format the time in a concise, readable format
    const hours = String(dateObject.getHours()).padStart(2, '0');
    const minutes = String(dateObject.getMinutes()).padStart(2, '0');
    const seconds = String(dateObject.getSeconds()).padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error("Error formatting timestamp:", error);
    return 'Updating...';
  }
};

// Format date
const formatDate = (date) => {
  const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
};

// Format current time with seconds
const formatTime = () => {
  const now = new Date();
  return now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export default function HealthOverlay({ props, status, metrics, timestamp, videoStats, className }) {
  // State for overlay visibility
  const [isOpen, setIsOpen] = useState(false);
  
  // Format the timestamp before rendering
  const formattedTimestamp = formatTimestamp(timestamp);
  const [currentTime, setCurrentTime] = useState(formatTime());
  const [currentDate, setCurrentDate] = useState(formatDate(new Date()));
  
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatTime());
      setCurrentDate(formatDate(new Date()));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Set default video stats if not provided
  const stats = videoStats || {
    resolution: '1080p',
    bitrate: '2.5 Mbps',
    codec: 'H.264',
    frameRate: '30fps'
  };
  
  // Determine status icon for the panel header
  const getStatusIcon = () => {
    switch(status) {
      case 'connected': return faCheckCircle;
      case 'connecting': return faWifi;
      case 'error': return faExclamationTriangle;
      default: return faSignal;
    }
  };
  
  // Determine status icon for the button
  const getButtonIcon = () => {
    switch(status) {
      case 'connected': return faCheckCircle;
      case 'connecting': return faExclamation;
      case 'error': return faTimes;
      default: return faSignal;
    }
  };
  
  // Get button class based on status
  const getButtonClass = () => {
    switch(status) {
      case 'connected': return 'status-btn-connected';
      case 'connecting': return 'status-btn-warning';
      case 'error': return 'status-btn-error';
      default: return '';
    }
  };

  return (
    <div className="health-overlay">
      {/* Toggle button */}
      <button 
        className={`health-status-btn ${getButtonClass()} ${className || ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={`System Status: ${status}`}
      >
        <FontAwesomeIcon icon={getButtonIcon()} />
      </button>
      
      {isOpen && (
        <div className="health-panel">
          {/* Header with status */}
          <div className={`health-header ${status}`}>
            <FontAwesomeIcon icon={getStatusIcon()} className="status-icon" />
            <span className="status-text">{status.toUpperCase()}</span>
            <button 
              className="close-panel-btn"
              onClick={() => setIsOpen(false)}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          
          {/* Time and date section */}
          <div className="health-section time-section">
            <div className="section-title">
              <FontAwesomeIcon icon={faClock} />
              <span>TIME & DATE</span>
            </div>
            <div className="time-display">{currentTime}</div>
            <div className="date-display">{currentDate}</div>
          </div>
          
          {/* System metrics section */}
          {metrics && (
            <div className="health-section metrics-section">
              <div className="section-title">
                <FontAwesomeIcon icon={faChartLine} />
                <span>SYSTEM STATS</span>
              </div>
              <div className="metric-grid">
                <div className="metric-item">
                  <FontAwesomeIcon icon={faMicrochip} className="metric-icon" />
                  <span className="metric-label">FPS</span>
                  <span className="metric-value">{metrics.fps}</span>
                </div>
                <div className="metric-item">
                  <FontAwesomeIcon icon={faHeartbeat} className="metric-icon" />
                  <span className="metric-label">Latency</span>
                  <span className="metric-value">{metrics.latency} ms</span>
                </div>
                <div className="metric-item">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="metric-icon" />
                  <span className="metric-label">Errors</span>
                  <span className="metric-value">{metrics.errors}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Video stats section */}
          <div className="health-section video-section">
            <div className="section-title">
              <FontAwesomeIcon icon={faVideo} />
              <span>VIDEO STATS</span>
            </div>
            <div className="metric-grid">
              <div className="metric-item">
                <span className="metric-label">Resolution</span>
                <span className="metric-value">{stats.resolution}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Bitrate</span>
                <span className="metric-value">{stats.bitrate}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Codec</span>
                <span className="metric-value">{stats.codec}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Frame Rate</span>
                <span className="metric-value">{stats.frameRate}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

HealthOverlay.propTypes = {
  status: PropTypes.oneOf(['connecting', 'connected', 'error']).isRequired,
  metrics: PropTypes.shape({
    fps: PropTypes.number,
    latency: PropTypes.number,
    errors: PropTypes.number,
  }),
  timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  videoStats: PropTypes.shape({
    resolution: PropTypes.string,
    bitrate: PropTypes.string,
    codec: PropTypes.string,
    frameRate: PropTypes.string
  }),
  className: PropTypes.string
};

HealthOverlay.defaultProps = {
  metrics: null,
  timestamp: null,
  videoStats: null,
  className: ''
};
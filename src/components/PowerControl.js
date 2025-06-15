import React, { useState } from 'react';
import { FaPowerOff, FaPlay, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';

// API URLs
const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.8.209:8002';
const WOL_SERVICE_URL = process.env.REACT_APP_WOL_SERVICE_URL || 'http://192.168.8.170:8002';

const PowerControl = ({ status, onStatusChange }) => {
  const [confirmShutdown, setConfirmShutdown] = useState(false);
  
  // Handle shutdown confirmation
  const handleShutdownClick = async () => {
    if (confirmShutdown) {
      try {
        await axios.post(`${API_URL}/api/power/shutdown`, {}, { timeout: 5000 });
        onStatusChange('offline');
      } catch (err) {
        console.error('Error shutting down server:', err);
        // If shutdown failed, server is probably still online
        onStatusChange('online');
      }
      setConfirmShutdown(false);
    } else {
      setConfirmShutdown(true);
    }
  };
  
  // Cancel shutdown confirmation
  const handleCancelShutdown = () => {
    setConfirmShutdown(false);
  };
  
  // Handle wake up
  const handleWakeUpClick = async () => {
    try {
      // For wakeup, we use the dedicated WoL service instead of the server endpoint
      try {
        console.log('Sending wake-up request to dedicated WoL service...');
        const response = await axios.post(`${WOL_SERVICE_URL}/wakeup`, {}, { timeout: 5000 });
        console.log('Wake-up request sent successfully:', response.data.message);
      } catch (wakeupErr) {
        console.error('Error sending wake-up request to WoL service:', wakeupErr.message);
        
        // Fallback to direct server API call (this will likely fail if server is offline)
        try {
          console.log('Attempting fallback to server API endpoint...');
          await axios.post(`${API_URL}/api/power/wakeup`, {}, { timeout: 5000 });
          console.log('Wake-up request sent successfully via server API');
        } catch (fallbackErr) {
          console.error('Fallback to server API failed:', fallbackErr.message);
        }
      }
      
      // Regardless of whether the API call succeeded, set status to starting
      onStatusChange('starting');
      
      // Poll for status more frequently after wake command
      const checkStatus = async () => {
        try {
          const response = await axios.get(`${API_URL}/api/power/status`, { timeout: 3000 });
          if (response.data.status === 'online') {
            onStatusChange('online');
            return true;
          }
          return false;
        } catch (err) {
          return false;
        }
      };
      
      // Check every 2 seconds for 30 seconds
      let attempts = 0;
      const statusInterval = setInterval(async () => {
        const isOnline = await checkStatus();
        attempts++;
        
        if (isOnline || attempts >= 15) {
          if (!isOnline && attempts >= 15) {
            // If we've tried 15 times and the server is still not online,
            // set the status back to offline
            onStatusChange('offline');
          }
          clearInterval(statusInterval);
        }
      }, 2000);
    } catch (err) {
      console.error('Error waking up server:', err);
      // If wakeup failed, server is probably still offline
      onStatusChange('offline');
    }
  };
  
  // Determine status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      case 'starting':
        return 'bg-yellow-500 animate-pulse';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Determine status text
  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return 'Server is online';
      case 'offline':
        return 'Server is offline';
      case 'starting':
        return 'Server is starting...';
      default:
        return 'Server status unknown';
    }
  };
  
  return (
    <div className="card">
      <div className="card-header">
        <span className="flex items-center">
          <FaPowerOff className="mr-2" />
          Power Control
        </span>
      </div>
      
      <div className="mt-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <span className={`h-3 w-3 rounded-full ${getStatusColor(status)} mr-2`}></span>
            <span className="text-lg">{getStatusText(status)}</span>
          </div>
          
          <div className="flex space-x-4">
            {status === 'online' && (
              <button
                className={`btn ${confirmShutdown ? 'btn-danger' : 'btn-secondary'}`}
                onClick={handleShutdownClick}
              >
                {confirmShutdown ? (
                  <span className="flex items-center">
                    <FaExclamationTriangle className="mr-2" />
                    Confirm Shutdown
                  </span>
                ) : (
                  <span className="flex items-center">
                    <FaPowerOff className="mr-2" />
                    Shutdown Server
                  </span>
                )}
              </button>
            )}
            
            {confirmShutdown && (
              <button
                className="btn btn-secondary"
                onClick={handleCancelShutdown}
              >
                Cancel
              </button>
            )}
            
            {status === 'offline' && (
              <button
                className="btn btn-success"
                onClick={handleWakeUpClick}
              >
                <span className="flex items-center">
                  <FaPlay className="mr-2" />
                  Wake Up Server
                </span>
              </button>
            )}
          </div>
        </div>
        
        <div className="bg-dark-600 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Power Management Information</h3>
          <p className="text-sm text-gray-300 mb-2">
            This dashboard allows you to control the power state of your server remotely.
          </p>
          <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
            <li>
              <span className="text-green-500 font-medium">Wake Up Server</span>: 
              Sends a Wake-on-LAN packet to start the server
            </li>
            <li>
              <span className="text-red-500 font-medium">Shutdown Server</span>: 
              Safely shuts down the server (requires confirmation)
            </li>
          </ul>
          <div className="mt-3 p-2 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded text-sm text-yellow-300 flex items-start">
            <FaExclamationTriangle className="mr-2 mt-0.5 flex-shrink-0" />
            <p>
              Ensure your server is properly configured for Wake-on-LAN and remote shutdown. 
              Improper configuration may result in these features not working correctly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PowerControl;
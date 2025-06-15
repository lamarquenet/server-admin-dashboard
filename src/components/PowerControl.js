import React, { useState, useEffect, useRef } from 'react';
import { FaPowerOff, FaPlay, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import axios from 'axios';

// API URLs
const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.8.209:8002';
const WOL_SERVICE_URL = process.env.REACT_APP_WOL_SERVICE_URL || 'http://192.168.8.170:8002';

// Timeout duration in seconds (2 minutes)
const TIMEOUT_DURATION = 120;

const PowerControl = ({ status, onStatusChange }) => {
  const [confirmShutdown, setConfirmShutdown] = useState(false);
  const [wakeupInProgress, setWakeupInProgress] = useState(false);
  const [shutdownInProgress, setShutdownInProgress] = useState(false);
  const [timeoutCounter, setTimeoutCounter] = useState(0);
  
  // Use refs to keep track of timers so we can clear them
  const timerRef = useRef(null);
  
  // Effect to handle timeout counter
  useEffect(() => {
    if ((wakeupInProgress || shutdownInProgress) && timeoutCounter > 0) {
      timerRef.current = setInterval(() => {
        setTimeoutCounter(prev => {
          if (prev <= 1) {
            // When timer reaches 0, reset the progress states
            if (wakeupInProgress) setWakeupInProgress(false);
            if (shutdownInProgress) setShutdownInProgress(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [wakeupInProgress, shutdownInProgress, timeoutCounter]);
  
  // Effect to monitor status changes
  useEffect(() => {
    // If wakeup is in progress and status becomes online, reset wakeup progress
    if (wakeupInProgress && status === 'online') {
      setWakeupInProgress(false);
      setTimeoutCounter(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    
    // If shutdown is in progress and status becomes offline, reset shutdown progress
    if (shutdownInProgress && status === 'offline') {
      setShutdownInProgress(false);
      setTimeoutCounter(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [status, wakeupInProgress, shutdownInProgress]);
  
  // Handle shutdown confirmation
  const handleShutdownClick = async () => {
    if (confirmShutdown) {
      try {
        // First set the shutdown in progress state and start the counter
        setShutdownInProgress(true);
        setTimeoutCounter(TIMEOUT_DURATION);
        setConfirmShutdown(false);
        
        await axios.post(`${API_URL}/api/power/shutdown`, {}, { timeout: 5000 });
        
        // Start polling the server status to detect when it actually goes offline
        const checkStatus = async () => {
          try {
            const response = await axios.get(`${API_URL}/api/power/status`, { timeout: 3000 });
            return response.data.status;
          } catch (err) {
            // If we can't reach the server, it's probably offline
            return 'offline';
          }
        };
        
        // Check every 5 seconds
        const statusInterval = setInterval(async () => {
          const serverStatus = await checkStatus();
          if (serverStatus === 'offline') {
            onStatusChange('offline');
            clearInterval(statusInterval);
          }
        }, 5000);
        
        // Clear the interval after the timeout duration
        setTimeout(() => {
          clearInterval(statusInterval);
          if (!shutdownInProgress) {
            onStatusChange('offline');
          }
        }, TIMEOUT_DURATION * 1000);
        
      } catch (err) {
        console.error('Error shutting down server:', err);
        // If shutdown command failed, reset everything
        setShutdownInProgress(false);
        setTimeoutCounter(0);
        onStatusChange('online');
      }
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
      // Set wakeup state and timer first
      setWakeupInProgress(true);
      setTimeoutCounter(TIMEOUT_DURATION);
      onStatusChange('starting');

      // Send wake-up command
      try {
        await axios.post(`${WOL_SERVICE_URL}/wakeup`, {}, { timeout: 5000 });
        console.log('Wake-up command sent successfully');
      } catch (wolErr) {
        console.log('Primary WoL service failed, trying fallback...');
        await axios.post(`${API_URL}/api/power/wakeup`, {}, { timeout: 5000 });
      }

      // Start polling with increasing intervals
      let pollInterval = setInterval(async () => {
        if (timeoutCounter <= 0) {
          clearInterval(pollInterval);
          setWakeupInProgress(false);
          onStatusChange('offline');
          return;
        }

        try {
          const response = await axios.get(`${API_URL}/api/power/status`, { timeout: 3000 });
          if (response.data.status === 'online') {
            clearInterval(pollInterval);
            setWakeupInProgress(false);
            setTimeoutCounter(0);
            onStatusChange('online');
          }
        } catch (err) {
          // Ignore timeout errors during boot - this is expected
          console.log('Server still booting...');
        }
      }, 5000);

      // Cleanup interval when component unmounts
      return () => {
        if (pollInterval) clearInterval(pollInterval);
      };

    } catch (err) {
      console.error('Wake up process failed:', err);
      setWakeupInProgress(false);
      setTimeoutCounter(0);
      onStatusChange('offline');
    }
  };
  
  // Determine status color based on both server status and operation progress
  const getStatusColor = () => {
    if (shutdownInProgress) {
      return 'bg-yellow-500 animate-pulse';
    } else if (wakeupInProgress) {
      return 'bg-blue-500 animate-pulse';
    } else {
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
    }
  };
  
  // Determine status text based on both server status and operation progress
  const getStatusText = () => {
    if (shutdownInProgress) {
      return `Server is shutting down... (${timeoutCounter}s remaining)`;
    } else if (wakeupInProgress) {
      return `Server is waking up... (${timeoutCounter}s remaining)`;
    } else {
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
            <span className={`h-3 w-3 rounded-full ${getStatusColor()} mr-2`}></span>
            <span className="text-lg">{getStatusText()}</span>
          </div>
          
          <div className="flex space-x-4">
            {/* Shutdown button - only show when online and not in progress */}
            {status === 'online' && !shutdownInProgress && (
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
            
            {/* Cancel button for shutdown confirmation */}
            {confirmShutdown && (
              <button
                className="btn btn-secondary"
                onClick={handleCancelShutdown}
              >
                Cancel
              </button>
            )}
            
            {/* Shutdown in progress indicator */}
            {shutdownInProgress && (
              <div className="flex items-center text-yellow-500">
                <FaSpinner className="animate-spin mr-2" />
                <span>Shutting down... ({timeoutCounter}s remaining)</span>
              </div>
            )}
            
            {/* Wake up button - only show when offline and not in progress */}
            {status === 'offline' && !wakeupInProgress && (
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
            
            {/* Wake up in progress indicator */}
            {wakeupInProgress && (
              <div className="flex items-center text-green-500">
                <FaSpinner className="animate-spin mr-2" />
                <span>Waking up... ({timeoutCounter}s remaining)</span>
              </div>
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
import React, { useState } from 'react';
import { FaPowerOff, FaPlay, FaExclamationTriangle } from 'react-icons/fa';

const PowerControl = ({ status, onPowerControl }) => {
  const [confirmShutdown, setConfirmShutdown] = useState(false);
  
  // Handle shutdown confirmation
  const handleShutdownClick = () => {
    if (confirmShutdown) {
      onPowerControl('shutdown');
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
  const handleWakeUpClick = () => {
    onPowerControl('wakeup');
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
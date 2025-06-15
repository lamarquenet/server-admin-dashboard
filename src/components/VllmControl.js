import React, { useState, useEffect } from 'react';
import { FaPlay, FaSpinner, FaStop } from 'react-icons/fa';
import axios from 'axios';

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.8.209:8002';

const VllmControl = () => {
  const [buttonState, setButtonState] = useState('normal'); // normal, loading, ready, shuttingDown
  const [timer, setTimer] = useState(0);

  // Effect to handle timer countdown
  useEffect(() => {
    let interval;
    
    if (buttonState === 'loading' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prevTimer => {
          if (prevTimer <= 1) {
            // When loading timer reaches 0, change to ready state (stop button)
            setButtonState('ready');
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
    } else if (buttonState === 'shuttingDown' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prevTimer => {
          if (prevTimer <= 1) {
            // When shutting down timer reaches 0, return to normal state
            setButtonState('normal');
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [buttonState, timer]);

  // Function to start VLLM service
  const startVllmService = async () => {
    try {
      // Set loading state before making the request
      setButtonState('loading');
      setTimer(125); // 125 seconds for loading (2 minutes 5 seconds)
      
      await axios.post(`${API_URL}/api/command/start-vllm`, {}, { timeout: 120000 });
      console.log('Vllm start command sent successfully');
      
      // Start polling to check if VLLM is actually running
      const checkVllmStatus = async () => {
        try {
          const response = await axios.get(`${API_URL}/api/command/vllm-status`, { timeout: 3000 });
          return response.data.status === 'running';
        } catch (err) {
          return false;
        }
      };

      // Poll every 5 seconds
      const pollInterval = setInterval(async () => {
        try {
          const isRunning = await checkVllmStatus();
          if (isRunning) {
            setButtonState('ready');
            clearInterval(pollInterval);
          }
        } catch (err) {
          console.error('Error checking VLLM status:', err);
        }
      }, 5000);

      // Clear polling after the timeout duration
      setTimeout(() => {
        clearInterval(pollInterval);
      }, 125000); // 125 seconds timeout
      
    } catch (err) {
      console.error('Error starting Vllm:', err);
      // If there's an error starting, reset to normal state
      setButtonState('normal');
      setTimer(0);
    }
  };

  // Handle button click based on current state
  const handleButtonClick = () => {
    if (buttonState === 'normal') {
      // Start VLLM
      startVllmService();
    } else if (buttonState === 'ready') {
      // Stop VLLM
      stopVllmService();
    }
  };

  // Function to stop VLLM service
  const stopVllmService = async () => {
    try {
      // Set shutting down state before making the request
      setButtonState('shuttingDown');
      setTimer(120); // 120 seconds timeout for shutdown
      
      await axios.post(`${API_URL}/api/command/stop-vllm`, {}, { timeout: 10000 }); // Increased timeout to 10s
      console.log('Vllm stop command sent successfully');
      
      // Start polling to check if VLLM has stopped
      const checkVllmStatus = async () => {
        try {
          const response = await axios.get(`${API_URL}/api/command/vllm-status`, { timeout: 3000 });
          return response.data.status !== 'running';
        } catch (err) {
          return true; // If we can't reach the status endpoint, assume it's stopped
        }
      };

      // Poll every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          const isStopped = await checkVllmStatus();
          if (isStopped) {
            setButtonState('normal');
            setTimer(0);
            clearInterval(pollInterval);
          }
        } catch (err) {
          console.error('Error checking VLLM status:', err);
        }
      }, 2000);

      // Clear polling after the timeout duration
      setTimeout(() => {
        clearInterval(pollInterval);
        setButtonState('normal'); // Revert to normal state after timeout
        setTimer(0);
      }, 30000); // 30 seconds timeout
      
    } catch (err) {
      console.error('Error stopping Vllm:', err);
      // If there's an error stopping, keep the current state
      setButtonState('ready');
      setTimer(0);
    }
  };

  // Render button based on state
  const renderButton = () => {
    switch (buttonState) {
      case 'loading':
        return (
          <button
            className="btn btn-primary opacity-75 cursor-not-allowed"
            disabled
          >
            <span className="flex items-center">
              <FaSpinner className="mr-2 animate-spin" />
              Loading... ({timer}s)
            </span>
          </button>
        );
      case 'ready':
        return (
          <button
            className="btn btn-danger"
            onClick={handleButtonClick}
          >
            <span className="flex items-center">
              <FaStop className="mr-2" />
              Stop Vllm
            </span>
          </button>
        );
      case 'shuttingDown':
        return (
          <button
            className="btn btn-warning opacity-75 cursor-not-allowed"
            disabled
          >
            <span className="flex items-center">
              <FaStop className="mr-2" />
              Shutting down... ({timer}s)
            </span>
          </button>
        );
      default:
        return (
          <button
            className="btn btn-primary"
            onClick={handleButtonClick}
          >
            <span className="flex items-center">
              <FaPlay className="mr-2" />
              Run Vllm
            </span>
          </button>
        );
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="flex items-center">
          <FaPlay className="mr-2" />
          Run Vllm
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex space-x-4">
            {renderButton()}
          </div>
        </div>

        <div className="bg-dark-600 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Vllm Control Information</h3>
          <p className="text-sm text-gray-300 mb-2">
            This section allows you to start the Vllm service on your server.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VllmControl;
import React, { useState, useEffect } from 'react';
import { FaPlay, FaSpinner, FaStop } from 'react-icons/fa';
import axios from 'axios';

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.8.209:8002';

const VllmControl = () => {
  const [buttonState, setButtonState] = useState('normal'); // normal, loading, ready, shuttingDown
  const [timer, setTimer] = useState(0);
  
  // Function to check VLLM status
  const checkVllmStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/command/vllm-status`, { timeout: 3000 });
      console.log('VLLM periodic status check:', response.data);
      
      if (response.data.status === 'running') {
        // If VLLM is running and we were in loading state, clear the timer
        if (buttonState === 'loading') {
          setTimer(0);
        }
        setButtonState('ready');
      } else {
        // If VLLM is not running and we were in shuttingDown state, clear the timer
        if (buttonState === 'shuttingDown') {
          setTimer(0);
        }
        // Only set to normal if we're not in the middle of starting up
        if (buttonState !== 'loading') {
          setButtonState('normal');
        }
      }
    } catch (err) {
      console.log('VLLM status check error:', err.message);
      // If we can't reach the status endpoint and we're not in a transitional state, set to normal
      if (buttonState !== 'loading' && buttonState !== 'shuttingDown') {
        setButtonState('normal');
      }
    }
  };

  // Effect to periodically check VLLM status
  useEffect(() => {
    // Check immediately on component mount
    checkVllmStatus();
    
    // Then check every 10 seconds
    const statusInterval = setInterval(checkVllmStatus, 5000);
    
    // Cleanup on unmount
    return () => clearInterval(statusInterval);
  }, []); // Empty dependency array means this runs once on mount

  // Effect to handle timer countdown
  useEffect(() => {
    let interval;
    
    if ((buttonState === 'loading' || buttonState === 'shuttingDown') && timer > 0) {
      interval = setInterval(() => {
        setTimer(prevTimer => {
          if (prevTimer <= 1) {
            // Let the periodic status check handle the state change
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
    setButtonState('loading');
    setTimer(150); // 2.5 minutes timeout
    
    try {
      await axios.post(`${API_URL}/api/command/start-vllm`, {});
      console.log('VLLM start command sent');
      // Status will be tracked by the periodic checker
    } catch (err) {
      console.error('Error starting VLLM:', err.response?.data || err.message);
      if (err.response) {
        console.log('Error details:', {
          data: err.response.data,
          status: err.response.status,
          headers: err.response.headers
        });
      }
      setButtonState('normal');
      setTimer(0);
    }
  };

  // Function to stop VLLM service
  const stopVllmService = async () => {
    setButtonState('shuttingDown');
    setTimer(20); // 20 seconds timeout
    
    try {
      await axios.post(`${API_URL}/api/command/stop-vllm`, {});
      console.log('VLLM stop command sent');
      // Status will be tracked by the periodic checker
    } catch (err) {
      console.error('Error stopping VLLM:', err.response?.data || err.message);
      if (err.response) {
        console.log('Error details:', {
          data: err.response.data,
          status: err.response.status,
          headers: err.response.headers
        });
      }
      setButtonState('ready');
      setTimer(0);
    }
  };

  // Handle button click based on current state
  const handleButtonClick = () => {
    if (buttonState === 'normal') {
      startVllmService();
    } else if (buttonState === 'ready') {
      stopVllmService();
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
            The status is checked every 10 seconds to ensure it reflects the current state.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VllmControl;
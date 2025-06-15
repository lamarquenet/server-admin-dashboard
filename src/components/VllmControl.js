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
      await axios.post(`${API_URL}/api/command/start-vllm`, {}, { timeout: 5000 });
      console.log('Vllm started successfully');
      // Set button to loading state for 40 seconds
      setButtonState('loading');
      setTimer(40);
    } catch (err) {
      console.error('Error starting Vllm:', err);
      // If there's an error, stay in normal state
      setButtonState('normal');
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
      await axios.post(`${API_URL}/api/command/stop-vllm`, {}, { timeout: 5000 });
      console.log('Vllm stopped successfully');
      // Set to shutting down state for 10 seconds
      setButtonState('shuttingDown');
      setTimer(10);
    } catch (err) {
      console.error('Error stopping Vllm:', err);
      // If there's an error, return to normal state
      setButtonState('normal');
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
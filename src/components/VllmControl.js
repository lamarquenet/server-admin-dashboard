import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaSpinner, FaStop, FaCog, FaFileAlt } from 'react-icons/fa';
import axios from 'axios';
import useInterval from '../hooks/useInterval';
import LogsViewer from './LogsViewer';

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.8.209:8002';

const VllmControl = ({ serverPowerStatus }) => {
  const [buttonState, setButtonState] = useState('normal'); // normal, loading, ready, shuttingDown
  const [timer, setTimer] = useState(0);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  
  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch available models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/command/vllm-models`, { timeout: 5000 });
        if (isMountedRef.current) {
          setModels(response.data.models || []);
          setDefaultModel(response.data.defaultModel || '');
          setSelectedModel(response.data.defaultModel || '');
          setLoadingModels(false);
        }
      } catch (err) {
        console.error('Error fetching models:', err);
        if (isMountedRef.current) {
          setLoadingModels(false);
        }
      }
    };

    if (serverPowerStatus === 'online') {
      fetchModels();
    }
  }, [serverPowerStatus]);

  // Function to check VLLM status
  const checkVllmStatus = useCallback(async () => {
    if (serverPowerStatus !== 'online') {
      console.log('Server not online, skipping VLLM status check');
      return;
    }
    
    try {
      const response = await axios.get(`${API_URL}/api/command/vllm-status`, { timeout: 3000 });
      
      if (!isMountedRef.current) return;
      
      if (response.data.status === 'running') {
        setButtonState('ready');
        setTimer(0);
      } else if (buttonState === 'shuttingDown') {
        setButtonState('normal');
        setTimer(0);
      } else if (buttonState === 'loading') {
        if (timer === 0) {
          setButtonState('normal');
          console.error('VLLM failed to start within timeout period');
        }
      } else {
        setButtonState('normal');
      }
    } catch (err) {
      console.log('Error checking VLLM status:', err.message);
      if (!isMountedRef.current) return;
      
      if (timer === 0) {
        if (buttonState !== 'loading' && buttonState !== 'shuttingDown') {
          setButtonState('normal');
        }
      }
    }
  }, [serverPowerStatus, buttonState, timer]);

  // useInterval for periodic status check
  useInterval(checkVllmStatus, serverPowerStatus === 'online' ? 5000 : null, [buttonState, serverPowerStatus]);

  // useInterval for timer countdown
  useInterval(() => {
    if (timer > 0) {
      setTimer(prevTimer => {
        const newTimer = prevTimer - 1;
        if (newTimer <= 0) {
          checkVllmStatus();
        }
        return newTimer;
      });
    }
  }, (buttonState === 'loading' || buttonState === 'shuttingDown') && timer > 0 ? 1000 : null, [buttonState]);

  // Effect to reset state when server power status changes
  useEffect(() => {
    if (serverPowerStatus === 'starting' || serverPowerStatus === 'offline') {
      setButtonState('normal');
      setTimer(0);
    }
  }, [serverPowerStatus]);

  // Function to start VLLM service
  const startVllmService = async () => {
    if (serverPowerStatus !== 'online') return;
    
    setButtonState('loading');
    setTimer(150); // 2.5 minutes timeout
    
    try {
      await axios.post(`${API_URL}/api/command/start-vllm`, { 
        model: selectedModel || defaultModel 
      });
      console.log('VLLM start command sent');
    } catch (err) {
      console.error('Error starting VLLM:', err.response?.data || err.message);
      setButtonState('normal');
      setTimer(0);
    }
  };

  // Function to stop VLLM service
  const stopVllmService = async () => {
    setButtonState('shuttingDown');
    setTimer(20);
    
    try {
      await axios.post(`${API_URL}/api/command/stop-vllm`, {});
      console.log('VLLM stop command sent');
    } catch (err) {
      console.error('Error stopping VLLM:', err.response?.data || err.message);
      setButtonState('ready');
      setTimer(0);
    }
  };

  // Handle button click
  const handleButtonClick = () => {
    if (serverPowerStatus !== 'online') return;
    
    if (buttonState === 'normal') {
      startVllmService();
    } else if (buttonState === 'ready') {
      stopVllmService();
    }
  };

  // Handle model selection change
  const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
  };

  // Get selected model info
  const getSelectedModelInfo = () => {
    return models.find(m => m.key === selectedModel);
  };

  // Render button based on state
  const renderButton = () => {
    switch (buttonState) {
      case 'loading':
        return (
          <button className="btn btn-primary opacity-75 cursor-not-allowed" disabled>
            <span className="flex items-center">
              <FaSpinner className="mr-2 animate-spin" />
              Loading... ({timer}s)
            </span>
          </button>
        );
      case 'ready':
        return (
          <button className="btn btn-danger" onClick={handleButtonClick}>
            <span className="flex items-center">
              <FaStop className="mr-2" />
              Stop vLLM
            </span>
          </button>
        );
      case 'shuttingDown':
        return (
          <button className="btn btn-warning opacity-75 cursor-not-allowed" disabled>
            <span className="flex items-center">
              <FaStop className="mr-2" />
              Stopping... ({timer}s)
            </span>
          </button>
        );
      default:
        return (
          <button className="btn btn-primary" onClick={handleButtonClick}>
            <span className="flex items-center">
              <FaPlay className="mr-2" />
              Start vLLM
            </span>
          </button>
        );
    }
  };

  return (
    <>
      <div className="card">
        <div className="card-header">
          <span className="flex items-center">
            <FaPlay className="mr-2" />
            vLLM Control
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              {/* Model selector */}
              <div className="flex items-center space-x-2">
                <FaCog className="text-gray-400" />
                <select
                  className="bg-dark-600 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-500 min-w-[200px]"
                  value={selectedModel}
                  onChange={handleModelChange}
                  disabled={buttonState !== 'normal' || serverPowerStatus !== 'online'}
                >
                  {loadingModels ? (
                    <option value="">Loading models...</option>
                  ) : models.length === 0 ? (
                    <option value="">No models available</option>
                  ) : (
                    models.map(model => (
                      <option key={model.key} value={model.key}>
                        {model.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              
              {serverPowerStatus === 'online' ? (
                renderButton()
              ) : (
                <button className="btn btn-primary opacity-50 cursor-not-allowed" disabled>
                  <span className="flex items-center">
                    <FaPlay className="mr-2" />
                    Server {serverPowerStatus === 'starting' ? 'Starting...' : 'Offline'}
                  </span>
                </button>
              )}
              
              {/* View Logs button */}
              <button
                className="btn btn-secondary"
                onClick={() => setShowLogs(true)}
                title="View vLLM logs"
              >
                <FaFileAlt />
              </button>
            </div>
          </div>

          {/* Selected model description */}
          {selectedModel && getSelectedModelInfo() && (
            <div className="bg-dark-600 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-300">
                {getSelectedModelInfo().description}
              </p>
            </div>
          )}

          <div className="bg-dark-600 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">vLLM Control Information</h3>
            <p className="text-sm text-gray-300 mb-2">
              Start the vLLM inference server with the selected configuration.
              {serverPowerStatus !== 'online' && (
                <span className="block mt-2 text-yellow-400">
                  Note: Server must be online to control vLLM service.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
      
      {/* Logs Modal */}
      {showLogs && (
        <LogsViewer service="vllm" onClose={() => setShowLogs(false)} />
      )}
    </>
  );
};

export default VllmControl;

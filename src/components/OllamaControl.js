import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaSpinner, FaStop, FaCog, FaDownload, FaTrash, FaList, FaFileAlt } from 'react-icons/fa';
import axios from 'axios';
import useInterval from '../hooks/useInterval';
import LogsViewer from './LogsViewer';

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.8.209:8002';

const OllamaControl = ({ serverPowerStatus }) => {
  const [buttonState, setButtonState] = useState('normal'); // normal, loading, ready, shuttingDown
  const [timer, setTimer] = useState(0);
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showModelList, setShowModelList] = useState(false);
  const [pullModelName, setPullModelName] = useState('');
  const [pulling, setPulling] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  
  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch models
  const fetchModels = useCallback(async () => {
    if (serverPowerStatus !== 'online') return;
    
    setLoadingModels(true);
    try {
      const response = await axios.get(`${API_URL}/api/ollama/models`, { timeout: 3000 });
      if (isMountedRef.current) {
        setModels(response.data.models || []);
      }
    } catch (err) {
      console.log('Error fetching Ollama models:', err.message);
    } finally {
      if (isMountedRef.current) {
        setLoadingModels(false);
      }
    }
  }, [serverPowerStatus]);

  // Function to check Ollama status
  const checkOllamaStatus = useCallback(async () => {
    if (serverPowerStatus !== 'online') return;
    
    try {
      const response = await axios.get(`${API_URL}/api/ollama/status`, { timeout: 3000 });
      
      if (!isMountedRef.current) return;
      
      if (response.data.status === 'running') {
        setButtonState('ready');
        setTimer(0);
        fetchModels();
      } else if (buttonState === 'shuttingDown') {
        setButtonState('normal');
        setTimer(0);
      } else if (buttonState === 'loading') {
        if (timer === 0) {
          setButtonState('normal');
        }
      } else {
        setButtonState('normal');
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      
      if (timer === 0 && buttonState !== 'loading' && buttonState !== 'shuttingDown') {
        setButtonState('normal');
      }
    }
  }, [serverPowerStatus, buttonState, timer, fetchModels]);

  // useInterval for periodic status check
  useInterval(checkOllamaStatus, serverPowerStatus === 'online' ? 5000 : null, [buttonState, serverPowerStatus]);

  // useInterval for timer countdown
  useInterval(() => {
    if (timer > 0) {
      setTimer(prevTimer => {
        const newTimer = prevTimer - 1;
        if (newTimer <= 0) {
          checkOllamaStatus();
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

  // Initial status check
  useEffect(() => {
    if (serverPowerStatus === 'online') {
      checkOllamaStatus();
    }
  }, [serverPowerStatus, checkOllamaStatus]);

  // Start Ollama service
  const startOllamaService = async () => {
    if (serverPowerStatus !== 'online') return;
    
    setButtonState('loading');
    setTimer(30); // 30 seconds timeout
    
    try {
      await axios.post(`${API_URL}/api/ollama/start`, {});
      console.log('Ollama start command sent');
    } catch (err) {
      console.error('Error starting Ollama:', err.response?.data || err.message);
      setButtonState('normal');
      setTimer(0);
    }
  };

  // Stop Ollama service
  const stopOllamaService = async () => {
    setButtonState('shuttingDown');
    setTimer(20);
    
    try {
      await axios.post(`${API_URL}/api/ollama/stop`, {});
      console.log('Ollama stop command sent');
    } catch (err) {
      console.error('Error stopping Ollama:', err.response?.data || err.message);
      setButtonState('ready');
      setTimer(0);
    }
  };

  // Pull a model
  const handlePullModel = async () => {
    if (!pullModelName.trim()) return;
    
    setPulling(true);
    try {
      await axios.post(`${API_URL}/api/ollama/pull`, { model: pullModelName.trim() });
      setPullModelName('');
      fetchModels();
    } catch (err) {
      console.error('Error pulling model:', err.response?.data || err.message);
    } finally {
      setPulling(false);
    }
  };

  // Delete a model
  const handleDeleteModel = async (modelName) => {
    if (!window.confirm(`Delete model "${modelName}"?`)) return;
    
    try {
      await axios.delete(`${API_URL}/api/ollama/model/${encodeURIComponent(modelName)}`);
      fetchModels();
    } catch (err) {
      console.error('Error deleting model:', err.response?.data || err.message);
    }
  };

  // Handle button click
  const handleButtonClick = () => {
    if (serverPowerStatus !== 'online') return;
    
    if (buttonState === 'normal') {
      startOllamaService();
    } else if (buttonState === 'ready') {
      stopOllamaService();
    }
  };

  // Render main button
  const renderButton = () => {
    switch (buttonState) {
      case 'loading':
        return (
          <button className="btn btn-primary opacity-75 cursor-not-allowed" disabled>
            <span className="flex items-center">
              <FaSpinner className="mr-2 animate-spin" />
              Starting... ({timer}s)
            </span>
          </button>
        );
      case 'ready':
        return (
          <button className="btn btn-danger" onClick={handleButtonClick}>
            <span className="flex items-center">
              <FaStop className="mr-2" />
              Stop Ollama
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
              Start Ollama
            </span>
          </button>
        );
    }
  };

  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return 'N/A';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <>
      <div className="card">
        <div className="card-header">
          <span className="flex items-center">
            <FaCog className="mr-2" />
            Ollama Control
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 flex-wrap gap-2">
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
              
              {buttonState === 'ready' && (
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowModelList(!showModelList)}
                >
                  <span className="flex items-center">
                    <FaList className="mr-2" />
                    Models ({models.length})
                  </span>
                </button>
              )}
              
              {/* View Logs button */}
              <button
                className="btn btn-secondary"
                onClick={() => setShowLogs(true)}
                title="View Ollama logs"
              >
                <FaFileAlt />
              </button>
            </div>
          </div>

          {/* Model List */}
          {buttonState === 'ready' && showModelList && (
            <div className="bg-dark-600 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Installed Models</h3>
              
              {loadingModels ? (
                <div className="flex items-center text-gray-400">
                  <FaSpinner className="animate-spin mr-2" />
                  Loading models...
                </div>
              ) : models.length === 0 ? (
                <p className="text-gray-400 text-sm">No models installed</p>
              ) : (
                <div className="space-y-2">
                  {models.map((model, index) => (
                    <div key={index} className="flex items-center justify-between bg-dark-700 rounded p-2">
                      <div>
                        <span className="text-white font-medium">{model.name}</span>
                        <span className="text-gray-400 text-xs ml-2">{formatSize(model.size)}</span>
                      </div>
                      <button
                        className="text-red-400 hover:text-red-300 text-sm"
                        onClick={() => handleDeleteModel(model.name)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Pull Model */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="text-xs font-semibold text-gray-400 mb-2">Pull New Model</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    className="flex-1 bg-dark-700 border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:border-primary-500"
                    placeholder="e.g., llama2, mistral"
                    value={pullModelName}
                    onChange={(e) => setPullModelName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handlePullModel()}
                  />
                  <button
                    className="btn btn-secondary text-sm"
                    onClick={handlePullModel}
                    disabled={pulling || !pullModelName.trim()}
                  >
                    {pulling ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaDownload />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-dark-600 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Ollama Control Information</h3>
            <p className="text-sm text-gray-300 mb-2">
              Start and manage Ollama models on your AI server. 
              {serverPowerStatus !== 'online' && (
                <span className="block mt-2 text-yellow-400">
                  Note: Server must be online to control Ollama.
                </span>
              )}
            </p>
            {buttonState === 'ready' && (
              <p className="text-xs text-green-400 mt-2">
                Ollama is running on port 11434
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Logs Modal */}
      {showLogs && (
        <LogsViewer service="ollama" onClose={() => setShowLogs(false)} />
      )}
    </>
  );
};

export default OllamaControl;

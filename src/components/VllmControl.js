import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaSpinner, FaStop, FaCog, FaFileAlt, FaTachometerAlt, FaMemory, FaClock, FaTasks, FaMicrochip } from 'react-icons/fa';
import axios from 'axios';
import useInterval from '../hooks/useInterval';
import LogsViewer from './LogsViewer';

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.8.209:8002';

const VllmControl = ({ serverPowerStatus }) => {
  const [buttonState, setButtonState] = useState('normal');
  const [timer, setTimer] = useState(0);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  const [metrics, setMetrics] = useState(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch vLLM metrics
  const fetchMetrics = useCallback(async () => {
    if (buttonState !== 'ready') return;

    try {
      const response = await axios.get(`${API_URL}/api/performance/vllm`, { timeout: 3000 });
      if (isMountedRef.current) {
        setMetrics(response.data.details || null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setMetrics(null);
      }
    }
  }, [buttonState]);

  useInterval(fetchMetrics, buttonState === 'ready' ? 3000 : null, [buttonState]);

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

  // Check VLLM status
  const checkVllmStatus = useCallback(async () => {
    if (serverPowerStatus !== 'online') return;

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
        }
      } else {
        setButtonState('normal');
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      if (timer === 0) {
        if (buttonState !== 'loading' && buttonState !== 'shuttingDown') {
          setButtonState('normal');
        }
      }
    }
  }, [serverPowerStatus, buttonState, timer]);

  useInterval(checkVllmStatus, serverPowerStatus === 'online' ? 5000 : null, [buttonState, serverPowerStatus]);

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

  useEffect(() => {
    if (serverPowerStatus === 'starting' || serverPowerStatus === 'offline') {
      setButtonState('normal');
      setTimer(0);
    }
  }, [serverPowerStatus]);

  const startVllmService = async () => {
    if (serverPowerStatus !== 'online') return;

    setButtonState('loading');
    setTimer(150);

    try {
      await axios.post(`${API_URL}/api/command/start-vllm`, {
        model: selectedModel || defaultModel
      });
    } catch (err) {
      console.error('Error starting VLLM:', err.response?.data || err.message);
      setButtonState('normal');
      setTimer(0);
    }
  };

  const stopVllmService = async () => {
    setButtonState('shuttingDown');
    setTimer(20);

    try {
      await axios.post(`${API_URL}/api/command/stop-vllm`, {});
    } catch (err) {
      console.error('Error stopping VLLM:', err.response?.data || err.message);
      setButtonState('ready');
      setTimer(0);
    }
  };

  const handleButtonClick = () => {
    if (serverPowerStatus !== 'online') return;

    if (buttonState === 'normal') {
      startVllmService();
    } else if (buttonState === 'ready') {
      stopVllmService();
    }
  };

  const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
  };

  const getSelectedModelInfo = () => {
    return models.find(m => m.key === selectedModel);
  };

  const formatNum = (num, decimals = 1) => {
    if (num === null || num === undefined) return 'N/A';
    return Number(num).toFixed(decimals);
  };

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

  const renderMetrics = () => {
    if (buttonState !== 'ready') return null;

    const gpuMem = metrics?.gpuMemory;

    return (
      <div className="mt-4 bg-dark-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center">
          <FaTachometerAlt className="mr-2" />
          vLLM Performance Metrics
        </h3>

        {/* GPU Memory Section */}
        {gpuMem && (
          <div className="mb-4 bg-dark-600 rounded-lg p-3">
            <div className="flex items-center text-gray-400 text-xs mb-2">
              <FaMicrochip className="mr-1" />
              GPU Memory
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-bold text-white">
                {gpuMem.usedGB} GB / {gpuMem.totalGB} GB
              </span>
              <span className={`text-sm font-semibold ${
                gpuMem.usagePercent > 80 ? 'text-red-400' :
                gpuMem.usagePercent > 60 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {gpuMem.usagePercent}%
              </span>
            </div>
            <div className="w-full bg-dark-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  gpuMem.usagePercent > 80 ? 'bg-red-500' :
                  gpuMem.usagePercent > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(gpuMem.usagePercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Model + KV Cache</span>
              <span>{gpuMem.freeGB} GB free</span>
            </div>
          </div>
        )}

        {/* Performance Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-dark-600 rounded-lg p-3">
            <div className="flex items-center text-gray-400 text-xs mb-1">
              <FaTachometerAlt className="mr-1" />
              Tokens/sec
            </div>
            <div className="text-xl font-bold text-green-400">
              {metrics?.tokensPerSecond ? formatNum(metrics.tokensPerSecond, 1) : 'N/A'}
            </div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="flex items-center text-gray-400 text-xs mb-1">
              <FaMemory className="mr-1" />
              GPU Cache
            </div>
            <div className="text-xl font-bold text-blue-400">
              {metrics?.gpuCacheUsage !== null ? `${formatNum(metrics.gpuCacheUsage)}%` : 'N/A'}
            </div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="flex items-center text-gray-400 text-xs mb-1">
              <FaClock className="mr-1" />
              Avg TTFT
            </div>
            <div className="text-xl font-bold text-purple-400">
              {metrics?.timeToFirstToken ? `${formatNum(metrics.timeToFirstToken * 1000, 0)}ms` : 'N/A'}
            </div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="flex items-center text-gray-400 text-xs mb-1">
              <FaTasks className="mr-1" />
              Running
            </div>
            <div className="text-xl font-bold text-white">
              {metrics?.requestsRunning ?? 0}
            </div>
          </div>
        </div>

        {/* KV Cache Bar */}
        {metrics?.kvCacheUsedPerc !== null && metrics?.kvCacheUsedPerc !== undefined && (
          <div className="mt-4 bg-dark-600 rounded-lg p-3">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>KV Cache Memory Usage</span>
              <span>{formatNum(metrics.kvCacheUsedPerc)}%</span>
            </div>
            <div className="w-full bg-dark-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  metrics.kvCacheUsedPerc > 80 ? 'bg-red-500' :
                  metrics.kvCacheUsedPerc > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(metrics.kvCacheUsedPerc, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
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

              <button
                className="btn btn-secondary"
                onClick={() => setShowLogs(true)}
                title="View vLLM logs"
              >
                <FaFileAlt />
              </button>
            </div>
          </div>

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

          {renderMetrics()}
        </div>
      </div>

      {showLogs && (
        <LogsViewer service="vllm" onClose={() => setShowLogs(false)} />
      )}
    </>
  );
};

export default VllmControl;

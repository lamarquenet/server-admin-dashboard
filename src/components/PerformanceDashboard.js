import React, { useState, useEffect, useCallback } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle, FaSync, FaTachometerAlt } from 'react-icons/fa';
import axios from 'axios';
import useInterval from '../hooks/useInterval';

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.8.209:8002';

const PerformanceDashboard = ({ serverPowerStatus }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch performance metrics
  const fetchMetrics = useCallback(async () => {
    if (serverPowerStatus !== 'online') {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/performance/all`, { timeout: 5000 });
      setMetrics(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [serverPowerStatus]);

  // Initial fetch
  useEffect(() => {
    if (serverPowerStatus === 'online') {
      fetchMetrics();
    }
  }, [serverPowerStatus, fetchMetrics]);

  // Auto-refresh every 10 seconds
  useInterval(fetchMetrics, autoRefresh && serverPowerStatus === 'online' ? 10000 : null);

  // Get status icon and color
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'healthy':
        return { icon: FaCheckCircle, color: 'text-green-400', bg: 'bg-green-900/30' };
      case 'degraded':
        return { icon: FaExclamationTriangle, color: 'text-yellow-400', bg: 'bg-yellow-900/30' };
      case 'unhealthy':
        return { icon: FaTimesCircle, color: 'text-red-400', bg: 'bg-red-900/30' };
      default:
        return { icon: FaExclamationTriangle, color: 'text-gray-400', bg: 'bg-gray-900/30' };
    }
  };

  // Render service card
  const renderServiceCard = (serviceName, serviceData) => {
    if (!serviceData) return null;
    
    const { icon: StatusIcon, color, bg } = getStatusDisplay(serviceData.status);
    
    return (
      <div key={serviceName} className={`${bg} rounded-lg p-4 border border-gray-700`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-white">{serviceData.name}</h3>
          <StatusIcon className={color} size={20} />
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Status:</span>
            <span className={color}>{serviceData.status}</span>
          </div>
          
          {serviceData.responseTime !== null && (
            <div className="flex justify-between">
              <span className="text-gray-400">Response Time:</span>
              <span className="text-white">{serviceData.responseTime}ms</span>
            </div>
          )}
          
          {serviceData.details && Object.keys(serviceData.details).length > 0 && (
            <div className="pt-2 border-t border-gray-700 mt-2">
              {serviceData.details.modelCount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Models:</span>
                  <span className="text-white">{serviceData.details.modelCount}</span>
                </div>
              )}
              {serviceData.details.runningModels !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Running:</span>
                  <span className="text-white">{serviceData.details.runningModels}</span>
                </div>
              )}
            </div>
          )}
          
          {serviceData.error && (
            <div className="text-red-400 text-xs mt-2">
              Error: {serviceData.error}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Loading state
  if (loading && serverPowerStatus === 'online') {
    return (
      <div className="card">
        <div className="card-header">
          <span className="flex items-center">
            <FaTachometerAlt className="mr-2" />
            Performance Dashboard
          </span>
        </div>
        <div className="p-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  // Server offline
  if (serverPowerStatus !== 'online') {
    return (
      <div className="card">
        <div className="card-header">
          <span className="flex items-center">
            <FaTachometerAlt className="mr-2" />
            Performance Dashboard
          </span>
        </div>
        <div className="p-4 text-gray-400 text-center">
          Server is {serverPowerStatus === 'starting' ? 'starting...' : 'offline'}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !metrics) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="flex items-center">
            <FaTachometerAlt className="mr-2" />
            Performance Dashboard
          </span>
        </div>
        <div className="p-4 text-red-400 text-center">
          <p>Error loading metrics: {error}</p>
          <button 
            className="btn btn-secondary mt-4"
            onClick={fetchMetrics}
          >
            <FaSync className="mr-2" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const summaryDisplay = getStatusDisplay(metrics?.summary?.overallStatus || 'unhealthy');

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between w-full">
          <span className="flex items-center">
            <FaTachometerAlt className="mr-2" />
            Performance Dashboard
          </span>
          <div className="flex items-center space-x-2">
            <button
              className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              <FaSync className={autoRefresh ? 'animate-spin' : ''} />
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={fetchMetrics}
              title="Refresh now"
            >
              <FaSync />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Summary */}
        {metrics?.summary && (
          <div className={`${summaryDisplay.bg} rounded-lg p-4 mb-4 border border-gray-700`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <summaryDisplay.icon className={`mr-2 ${summaryDisplay.color}`} size={24} />
                <span className="font-semibold text-white">
                  System Status: {metrics.summary.overallStatus.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                {metrics.summary.healthyServices}/{metrics.summary.totalServices} services healthy
              </div>
            </div>
          </div>
        )}

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics?.services && renderServiceCard('vllm', metrics.services.vllm)}
          {metrics?.services && renderServiceCard('ollama', metrics.services.ollama)}
          {metrics?.services && renderServiceCard('statsServer', metrics.services.statsServer)}
        </div>

        {/* Last Updated */}
        {metrics?.timestamp && (
          <div className="mt-4 text-xs text-gray-500 text-center">
            Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboard;

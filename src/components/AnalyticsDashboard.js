import React, { useState, useEffect, useCallback } from 'react';
import { FaChartBar, FaTachometerAlt, FaClock, FaSync, FaHistory } from 'react-icons/fa';
import axios from 'axios';
import useInterval from '../hooks/useInterval';

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.8.209:8002';

const AnalyticsDashboard = ({ serverPowerStatus }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    if (serverPowerStatus !== 'online') {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/analytics/vllm`, { timeout: 5000 });
      setAnalytics(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [serverPowerStatus]);

  // Trigger immediate poll
  const triggerPoll = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/analytics/poll`, {}, { timeout: 10000 });
      setAnalytics(response.data);
    } catch (err) {
      console.error('Error triggering poll:', err);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (serverPowerStatus === 'online') {
      fetchAnalytics();
    }
  }, [serverPowerStatus, fetchAnalytics]);

  // Auto-refresh every 15 seconds
  useInterval(fetchAnalytics, autoRefresh && serverPowerStatus === 'online' ? 15000 : null);

  // Format number
  const formatNum = (num, decimals = 1) => {
    if (num === null || num === undefined) return 'N/A';
    return Number(num).toFixed(decimals);
  };

  // Format large number
  const formatLargeNum = (num) => {
    if (num === null || num === undefined) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Loading state
  if (loading && serverPowerStatus === 'online') {
    return (
      <div className="card">
        <div className="card-header">
          <span className="flex items-center">
            <FaChartBar className="mr-2" />
            vLLM Analytics
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
            <FaChartBar className="mr-2" />
            vLLM Analytics
          </span>
        </div>
        <div className="p-4 text-gray-400 text-center">
          Server is {serverPowerStatus === 'starting' ? 'starting...' : 'offline'}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !analytics) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="flex items-center">
            <FaChartBar className="mr-2" />
            vLLM Analytics
          </span>
        </div>
        <div className="p-4 text-red-400 text-center">
          <p>Error loading analytics: {error}</p>
          <button
            className="btn btn-secondary mt-2"
            onClick={fetchAnalytics}
          >
            <FaSync className="mr-2" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const current = analytics?.current || {};
  const history = analytics?.history?.last24h || {};

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between w-full">
          <span className="flex items-center">
            <FaChartBar className="mr-2" />
            vLLM Analytics
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
              onClick={triggerPoll}
              title="Poll now"
            >
              <FaSync />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Current Metrics */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center">
            <FaTachometerAlt className="mr-2" />
            Current Metrics
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-dark-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Tokens/sec</div>
              <div className="text-xl font-bold text-green-400">
                {formatNum(current.tokensPerSecond)}
              </div>
            </div>

            <div className="bg-dark-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">GPU Cache</div>
              <div className="text-xl font-bold text-blue-400">
                {current.gpuCacheUtilization !== null ? `${formatNum(current.gpuCacheUtilization)}%` : 'N/A'}
              </div>
            </div>

            <div className="bg-dark-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Avg TTFT</div>
              <div className="text-xl font-bold text-purple-400">
                {current.avgTimeToFirstToken ? `${Math.round(current.avgTimeToFirstToken)}ms` : 'N/A'}
              </div>
            </div>

            <div className="bg-dark-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Requests</div>
              <div className="text-xl font-bold text-white">
                {current.requestsRunning ?? 0} / {current.requestsWaiting ?? 0}
              </div>
              <div className="text-xs text-gray-500">run / wait</div>
            </div>
          </div>
        </div>

        {/* Token Stats */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            Token Statistics
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-dark-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Prompt Tokens</div>
              <div className="text-lg font-bold text-cyan-400">
                {formatLargeNum(current.totalPromptTokens)}
              </div>
            </div>

            <div className="bg-dark-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Generation Tokens</div>
              <div className="text-lg font-bold text-orange-400">
                {formatLargeNum(current.totalGenerationTokens)}
              </div>
            </div>
          </div>
        </div>

        {/* 24h History */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center">
            <FaHistory className="mr-2" />
            Last 24 Hours
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-dark-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Total Requests</div>
              <div className="text-lg font-bold text-white">
                {formatLargeNum(history.totalRequests)}
              </div>
            </div>

            <div className="bg-dark-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Avg Tokens/sec</div>
              <div className="text-lg font-bold text-green-400">
                {formatNum(history.avgTokensPerSecond)}
              </div>
            </div>

            <div className="bg-dark-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Avg TTFT</div>
              <div className="text-lg font-bold text-purple-400">
                {history.avgTtft ? `${Math.round(history.avgTtft)}ms` : 'N/A'}
              </div>
            </div>

            <div className="bg-dark-700 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Samples</div>
              <div className="text-lg font-bold text-gray-300">
                {history.samples?.length || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        {analytics?.lastUpdated && (
          <div className="text-xs text-gray-500 text-right mt-4">
            Last updated: {new Date(analytics.lastUpdated).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

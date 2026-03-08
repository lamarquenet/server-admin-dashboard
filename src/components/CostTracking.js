import React, { useState, useEffect, useCallback } from 'react';
import { FaDollarSign, FaBolt, FaChartLine, FaSync, FaRedo, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import useInterval from '../hooks/useInterval';

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.8.209:8002';

const CostTracking = ({ serverPowerStatus }) => {
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [resetting, setResetting] = useState({ session: false, monthly: false });

  // Fetch cost data
  const fetchCostData = useCallback(async () => {
    if (serverPowerStatus !== 'online') {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/cost`, { timeout: 5000 });
      setCostData(response.data);
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
      fetchCostData();
    }
  }, [serverPowerStatus, fetchCostData]);

  // Auto-refresh every 60 seconds (1 minute)
  useInterval(fetchCostData, autoRefresh && serverPowerStatus === 'online' ? 60000 : null);

  // Reset session energy
  const resetSession = async () => {
    if (!window.confirm('Reset session energy counter to 0?')) return;

    setResetting(prev => ({ ...prev, session: true }));
    try {
      await axios.post(`${API_URL}/api/cost/reset-session`, {}, { timeout: 10000 });
      await fetchCostData(); // Refresh data
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setResetting(prev => ({ ...prev, session: false }));
    }
  };

  // Reset monthly energy
  const resetMonthly = async () => {
    if (!window.confirm('Reset monthly energy counter to 0?')) return;

    setResetting(prev => ({ ...prev, monthly: true }));
    try {
      await axios.post(`${API_URL}/api/cost/reset-monthly`, {}, { timeout: 10000 });
      await fetchCostData(); // Refresh data
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setResetting(prev => ({ ...prev, monthly: false }));
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (value < 0.01) return `$${(value * 100).toFixed(2)}¢`;
    return `$${Number(value).toFixed(4)}`;
  };

  // Format energy
  const formatEnergy = (kwh) => {
    if (kwh === null || kwh === undefined) return 'N/A';
    if (kwh < 1) {
      return `${(kwh * 1000).toFixed(2)} Wh`;
    }
    return `${Number(kwh).toFixed(4)} kWh`;
  };

  // Loading state
  if (loading && serverPowerStatus === 'online') {
    return (
      <div className="card">
        <div className="card-header">
          <span className="flex items-center">
            <FaDollarSign className="mr-2" />
            Power Cost
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
            <FaDollarSign className="mr-2" />
            Power Cost
          </span>
        </div>
        <div className="p-4 text-gray-400 text-center">
          Server is {serverPowerStatus === 'starting' ? 'starting...' : 'offline'}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !costData) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="flex items-center">
            <FaDollarSign className="mr-2" />
            Power Cost
          </span>
        </div>
        <div className="p-4 text-red-400 text-center">
          <p>Error: {error}</p>
          <button
            className="btn btn-secondary mt-2"
            onClick={fetchCostData}
          >
            <FaSync className="mr-2" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between w-full">
          <span className="flex items-center">
            <FaDollarSign className="mr-2" />
            Power Cost
          </span>
          <div className="flex items-center space-x-2">
            <button
              className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              <FaSync className={autoRefresh ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Main Cost Display - Only Session and Monthly */}
        <div className="grid grid-cols-2 gap-4">
          {/* Session Cost */}
          <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-4 border border-green-700/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center text-green-400 text-sm">
                <FaBolt className="mr-2" />
                Current Session
              </div>
              <button
                className="text-xs text-gray-400 hover:text-white p-1"
                onClick={resetSession}
                disabled={resetting.session}
                title="Reset session counter"
              >
                <FaRedo className={resetting.session ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatCurrency(costData?.totalCostUsd)}
            </div>
            <div className="text-sm text-gray-400">
              {formatEnergy(costData?.accumulatedEnergyKwh)}
            </div>
          </div>

          {/* Monthly Cost */}
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg p-4 border border-blue-700/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center text-blue-400 text-sm">
                <FaChartLine className="mr-2" />
                This Month
              </div>
              <button
                className="text-xs text-gray-400 hover:text-white p-1"
                onClick={resetMonthly}
                disabled={resetting.monthly}
                title="Reset monthly counter"
              >
                <FaRedo className={resetting.monthly ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatCurrency(costData?.monthlyCostUsd)}
            </div>
            <div className="text-sm text-gray-400">
              {formatEnergy(costData?.monthlyEnergyKwh)}
            </div>
          </div>
        </div>

        {/* Rate and Last Updated */}
        <div className="flex justify-between items-center mt-4 text-xs text-gray-500">
          <span>Rate: ${costData?.electricityRate || 0.10}/kWh</span>
          {costData?.lastUpdated && (
            <span>Updated: {new Date(costData.lastUpdated).toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostTracking;

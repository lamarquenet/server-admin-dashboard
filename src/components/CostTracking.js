import React, { useState, useEffect, useCallback } from 'react';
import { FaDollarSign, FaBolt, FaChartLine, FaSync } from 'react-icons/fa';
import axios from 'axios';
import useInterval from '../hooks/useInterval';

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.8.209:8002';

const CostTracking = ({ serverPowerStatus }) => {
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

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

  // Auto-refresh every 30 seconds
  useInterval(fetchCostData, autoRefresh && serverPowerStatus === 'online' ? 30000 : null);

  // Format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
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
            Power Cost Tracking
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
            Power Cost Tracking
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
            Power Cost Tracking
          </span>
        </div>
        <div className="p-4 text-red-400 text-center">
          <p>Error loading cost data: {error}</p>
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
            Power Cost Tracking
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
              onClick={fetchCostData}
              title="Refresh now"
            >
              <FaSync />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Main Cost Display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {/* Session Cost */}
          <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-4 border border-green-700/50">
            <div className="flex items-center text-green-400 text-sm mb-2">
              <FaDollarSign className="mr-2" />
              Session Cost
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(costData?.totalCostUsd)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {formatEnergy(costData?.accumulatedEnergyKwh)}
            </div>
          </div>

          {/* Monthly Cost */}
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg p-4 border border-blue-700/50">
            <div className="flex items-center text-blue-400 text-sm mb-2">
              <FaChartLine className="mr-2" />
              Monthly Cost
            </div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(costData?.monthlyCostUsd)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {formatEnergy(costData?.monthlyEnergyKwh)}
            </div>
          </div>

          {/* Session Energy */}
          <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 rounded-lg p-4 border border-yellow-700/50">
            <div className="flex items-center text-yellow-400 text-sm mb-2">
              <FaBolt className="mr-2" />
              Session Energy
            </div>
            <div className="text-2xl font-bold text-white">
              {formatEnergy(costData?.accumulatedEnergyKwh)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Since last reset
            </div>
          </div>

          {/* Electricity Rate */}
          <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg p-4 border border-purple-700/50">
            <div className="flex items-center text-purple-400 text-sm mb-2">
              <FaDollarSign className="mr-2" />
              Rate
            </div>
            <div className="text-2xl font-bold text-white">
              ${costData?.electricityRate || 0.10}/kWh
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Per kilowatt-hour
            </div>
          </div>
        </div>

        {/* Last Updated */}
        {costData?.lastUpdated && (
          <div className="text-xs text-gray-500 text-right">
            Last updated: {new Date(costData.lastUpdated).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default CostTracking;

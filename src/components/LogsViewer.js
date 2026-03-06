import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaFileAlt, FaSync, FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import axios from 'axios';
import useInterval from '../hooks/useInterval';

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.8.209:8002';

const LogsViewer = ({ service, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedLines, setExpandedLines] = useState(new Set());
  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/logs/${service}?lines=200`, { timeout: 5000 });
      if (response.data.success) {
        setLogs(response.data.logs);
        setError(null);
      } else {
        setError(response.data.error || 'Failed to fetch logs');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, [service]);

  // Auto-refresh every 5 seconds
  useInterval(fetchLogs, autoRefresh ? 5000 : null);

  // Scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current && autoRefresh) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoRefresh]);

  // Clear logs
  const handleClearLogs = async () => {
    if (!window.confirm(`Clear all ${service} logs?`)) return;
    
    try {
      await axios.delete(`${API_URL}/api/logs/${service}`);
      setLogs([]);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  // Toggle line expansion
  const toggleLine = (index) => {
    setExpandedLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Get log level color
  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'debug': return 'text-gray-500';
      default: return 'text-gray-300';
    }
  };

  // Truncate long lines
  const truncateLine = (line, maxLength = 200) => {
    if (line.length <= maxLength) return line;
    return line.substring(0, maxLength) + '...';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center">
            <FaFileAlt className="mr-2 text-primary-400" />
            <h2 className="text-lg font-semibold">{service.toUpperCase()} Logs</h2>
            <span className="ml-2 text-xs text-gray-400">({logs.length} lines)</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <FaSync className={autoRefresh ? 'animate-spin' : ''} />
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={fetchLogs}
            >
              <FaSync />
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={handleClearLogs}
            >
              <FaTrash />
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={onClose}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Logs Content */}
        <div 
          ref={logsContainerRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-xs"
        >
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-400 text-center py-8">
              <p>Error: {error}</p>
              <button 
                className="btn btn-sm btn-secondary mt-4"
                onClick={fetchLogs}
              >
                Retry
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No logs available
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => {
                    const isExpanded = expandedLines.has(index);
                    const isLong = log.message.length > 200;
                    
                    return (
                      <div 
                        key={index}
                        className={`flex items-start ${getLevelColor(log.level)} hover:bg-dark-700 rounded cursor-pointer`}
                        onClick={() => isLong && toggleLine(index)}
                      >
                        <span className="text-gray-600 select-none w-12 text-right mr-3 flex-shrink-0">
                          {index + 1}
                        </span>
                        {log.timestamp && (
                          <span className="text-gray-500 mr-2 flex-shrink-0">
                            [{log.timestamp}]
                          </span>
                        )}
                        <span className={`flex-1 ${isExpanded ? 'whitespace-pre-wrap break-all' : 'truncate'}`}>
                          {isExpanded ? log.message : truncateLine(log.message)}
                        </span>
                        {isLong && (
                          <span className="text-gray-600 ml-2 flex-shrink-0">
                            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                          </span>
                        )}
                      </div>
                    );
                  })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-gray-700 text-xs text-gray-500 flex justify-between">
          <span>Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}</span>
          <span>Click long lines to expand</span>
        </div>
      </div>
    </div>
  );
};

export default LogsViewer;

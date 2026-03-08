import React, { useState, useEffect, useCallback } from 'react';
import { FaPlay, FaSpinner, FaHistory, FaClock, FaTachometerAlt, FaMicrochip, FaTrash } from 'react-icons/fa';
import axios from 'axios';

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.8.209:8002';

const BenchmarkPanel = ({ serverPowerStatus, vllmStatus }) => {
  const [benchmarks, setBenchmarks] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [selectedService, setSelectedService] = useState('vllm');
  const [modelInput, setModelInput] = useState('');

  // Fetch benchmark results and config
  const fetchData = useCallback(async () => {
    if (serverPowerStatus !== 'online') {
      setLoading(false);
      return;
    }

    try {
      const [resultsRes, configRes] = await Promise.all([
        axios.get(`${API_URL}/api/benchmark/results`, { timeout: 5000 }),
        axios.get(`${API_URL}/api/benchmark/config`, { timeout: 5000 })
      ]);
      setBenchmarks(resultsRes.data);
      setConfig(configRes.data);
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
      fetchData();
    }
  }, [serverPowerStatus, fetchData]);

  // Run benchmark
  const runBenchmark = async () => {
    if (!modelInput.trim()) {
      setError('Please enter a model name');
      return;
    }

    setRunning(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/api/benchmark/run`, {
        model: modelInput.trim(),
        service: selectedService
      }, { timeout: 120000 }); // 2 minute timeout

      // Refresh results
      fetchData();

      // Show the new result
      console.log('Benchmark completed:', response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setRunning(false);
    }
  };

  // Format number
  const formatNum = (num, decimals = 2) => {
    if (num === null || num === undefined) return 'N/A';
    return Number(num).toFixed(decimals);
  };

  // Format timestamp
  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleString();
  };

  // Get recent benchmarks (last 10)
  const recentBenchmarks = benchmarks?.results?.slice(-10).reverse() || [];

  // Server offline
  if (serverPowerStatus !== 'online') {
    return (
      <div className="card">
        <div className="card-header">
          <span className="flex items-center">
            <FaTachometerAlt className="mr-2" />
            Model Benchmarking
          </span>
        </div>
        <div className="p-4 text-gray-400 text-center">
          Server is {serverPowerStatus === 'starting' ? 'starting...' : 'offline'}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="flex items-center">
          <FaTachometerAlt className="mr-2" />
          Model Benchmarking
        </span>
      </div>

      <div className="p-4">
        {/* Run Benchmark Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Run Benchmark</h3>

          {/* Config Info */}
          {config && (
            <div className="bg-dark-700 rounded-lg p-3 mb-4">
              <div className="text-xs text-gray-400 mb-2">Fixed Benchmark Configuration:</div>
              <div className="text-sm text-gray-300 font-mono line-clamp-2">
                "{config.prompt}"
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>Max tokens: {config.maxTokens}</span>
                <span>Temperature: {config.temperature}</span>
              </div>
            </div>
          )}

          {/* Input Controls */}
          <div className="flex flex-wrap gap-3">
            <select
              className="bg-dark-600 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              disabled={running}
            >
              <option value="vllm">vLLM</option>
              <option value="ollama">Ollama</option>
            </select>

            <input
              type="text"
              className="bg-dark-600 border border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-500 flex-1 min-w-[200px]"
              placeholder="Model name (e.g., cyankiwi-qwen3-coder-next)"
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              disabled={running}
              onKeyDown={(e) => e.key === 'Enter' && !running && runBenchmark()}
            />

            <button
              className={`btn ${running ? 'btn-secondary opacity-75' : 'btn-primary'}`}
              onClick={runBenchmark}
              disabled={running || !modelInput.trim()}
            >
              {running ? (
                <span className="flex items-center">
                  <FaSpinner className="mr-2 animate-spin" />
                  Running...
                </span>
              ) : (
                <span className="flex items-center">
                  <FaPlay className="mr-2" />
                  Run Benchmark
                </span>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center">
            <FaHistory className="mr-2" />
            Recent Results ({recentBenchmarks.length})
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : recentBenchmarks.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No benchmark results yet. Run a benchmark to see results here.
            </div>
          ) : (
            <div className="space-y-3">
              {recentBenchmarks.map((bench) => (
                <div
                  key={bench.benchmarkId}
                  className="bg-dark-700 rounded-lg p-4 border border-gray-700"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        bench.service === 'vllm' ? 'bg-blue-900/50 text-blue-400' : 'bg-purple-900/50 text-purple-400'
                      }`}>
                        {bench.service.toUpperCase()}
                      </span>
                      <span className="ml-2 font-semibold text-white">{bench.model}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTime(bench.timestamp)}
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <div className="text-gray-400 text-xs">Tokens/sec</div>
                      <div className="text-lg font-bold text-green-400">
                        {formatNum(bench.results?.tokensPerSecond)}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400 text-xs">TTFT</div>
                      <div className="text-lg font-bold text-purple-400">
                        {bench.results?.timeToFirstTokenMs ? `${bench.results.timeToFirstTokenMs}ms` : 'N/A'}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400 text-xs">Total Latency</div>
                      <div className="text-lg font-bold text-yellow-400">
                        {bench.results?.totalLatencyMs ? `${(bench.results.totalLatencyMs / 1000).toFixed(2)}s` : 'N/A'}
                      </div>
                    </div>

                    <div>
                      <div className="text-gray-400 text-xs">Tokens</div>
                      <div className="text-lg font-bold text-white">
                        {bench.results?.tokensGenerated || 0}
                      </div>
                    </div>
                  </div>

                  {/* GPU State */}
                  {bench.systemState && (
                    <div className="mt-3 pt-3 border-t border-gray-700 flex gap-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <FaMicrochip className="mr-1" />
                        GPU: {bench.systemState.gpuMemoryUsed}
                      </span>
                      <span>Util: {bench.systemState.gpuUtilization}</span>
                    </div>
                  )}

                  {/* Output Preview */}
                  {bench.results?.output && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Output:</div>
                      <div className="text-sm text-gray-300 line-clamp-2">
                        {bench.results.output}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BenchmarkPanel;

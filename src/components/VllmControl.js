import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaSpinner, FaStop, FaCog, FaFileAlt, FaTachometerAlt, FaMemory, FaClock, FaTasks, FaMicrochip, FaInfoCircle, FaSlidersH, FaChevronDown, FaChevronUp } from 'react-icons/fa';
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ov, setOv] = useState(null);  // advanced launch options (per-model, remembered)

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Format context length (e.g., 128000 -> "128K")
  const formatContextLength = (len) => {
    if (!len) return 'N/A';
    if (len >= 1000) {
      return `${(len / 1000).toFixed(len % 1000 === 0 ? 0 : 1)}K`;
    }
    return len.toString();
  };

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
      const modelKey = selectedModel || defaultModel;
      await axios.post(`${API_URL}/api/command/start-vllm`, {
        model: modelKey,
        overrides: buildOverrides(),
      });
      // Remember the last config used for this model
      if (ov) {
        try {
          localStorage.setItem(`vllm:lastConfig:${modelKey}`, JSON.stringify(ov));
        } catch { /* localStorage unavailable */ }
      }
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

  // ---- Advanced launch options ----

  // Initialize options from model defaults, or the last config used for this model
  useEffect(() => {
    const model = models.find(m => m.key === selectedModel);
    if (!model) return;
    const defaults = {
      thinking: 'thinking',
      effort: 'xhigh',
      tp: String(model.tensorParallelSize || 1),
      gpuMem: String(model.gpuMemoryUtilization || 0.9),
      ctx: String(model.maxModelLen),
      kv: model.kvCacheDtype || 'auto',
      mtp: model.speculativeTokens ? String(model.speculativeTokens) : 'off',
      parser: model.reasoningParser ? 'on' : 'off',
    };
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(`vllm:lastConfig:${selectedModel}`) || 'null');
    } catch { saved = null; }
    setOv({ ...defaults, ...(saved && typeof saved === 'object' ? saved : {}) });
  }, [selectedModel, models]);

  const setOvField = (field, value) => setOv(prev => ({ ...(prev || {}), [field]: value }));

  // Build the overrides payload for POST /api/command/start-vllm
  const buildOverrides = () => {
    const model = getSelectedModelInfo();
    if (!model || !ov) return undefined;
    const payload = {
      tensorParallelSize: Number(ov.tp),
      gpuMemoryUtilization: Number(ov.gpuMem),
      maxModelLen: Number(ov.ctx),
      kvCacheDtype: ov.kv,
      reasoningParser: ov.parser === 'on',
    };
    if (model.mtpSupported) {
      payload.speculativeEnabled = ov.mtp !== 'off';
      if (ov.mtp !== 'off') payload.speculativeTokens = Number(ov.mtp);
    }
    if (model.thinkingSupported) payload.thinkingMode = ov.thinking;
    return payload;
  };

  // Per-request kwargs snippet shown to the user (effort is request-level, not launch-level)
  const getRequestKwargsSnippet = () => {
    const model = getSelectedModelInfo();
    if (!model || !model.thinkingSupported || !ov) return null;
    const thinking = ov.thinking === 'thinking';
    const kwargs = thinking
      ? { enable_thinking: true, reasoning_effort: ov.effort }
      : { enable_thinking: false };
    return `"chat_template_kwargs": ${JSON.stringify(kwargs)}`;
  };

  const formatNum = (num, decimals = 1) => {
    if (num === null || num === undefined) return 'N/A';
    return Number(num).toFixed(decimals);
  };

  // Advanced launch options panel (visible when stopped — options apply at Start)
  const renderAdvancedOptions = () => {
    const model = getSelectedModelInfo();
    if (!model || !ov || buttonState !== 'normal') return null;

    const ctxOptions = [...new Set([32768, 65536, 131072, 262144, model.maxModelLen, model.maxModelLenNative])]
      .filter(v => v <= (model.maxModelLenNative || model.maxModelLen))
      .sort((a, b) => a - b);
    const gpuMemOptions = [];
    for (let v = 0.50; v <= 0.951; v += 0.05) gpuMemOptions.push(Number(v.toFixed(2)));
    const snippet = getRequestKwargsSnippet();

    const selectCls = "bg-dark-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-primary-500 w-full";
    const labelCls = "text-xs text-gray-400 mb-1 block";

    return (
      <div className="bg-dark-600 rounded-lg p-3 mb-4">
        <button
          className="flex items-center justify-between w-full text-sm font-semibold text-gray-400 hover:text-gray-200"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span className="flex items-center">
            <FaSlidersH className="mr-2" />
            Launch options
          </span>
          {showAdvanced ? <FaChevronUp /> : <FaChevronDown />}
        </button>

        {showAdvanced && (
          <div className="mt-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {model.thinkingSupported ? (
                <div>
                  <label className={labelCls}>Thinking mode</label>
                  <select className={selectCls} value={ov.thinking} onChange={e => setOvField('thinking', e.target.value)}>
                    <option value="thinking">Thinking</option>
                    <option value="instruct">Instruct</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className={labelCls}>Thinking mode</label>
                  <select className={`${selectCls} opacity-50`} disabled>
                    <option>Non-thinking model</option>
                  </select>
                </div>
              )}

              {model.thinkingSupported && ov.thinking === 'thinking' && (
                <div>
                  <label className={labelCls}>Reasoning effort</label>
                  <select className={selectCls} value={ov.effort} onChange={e => setOvField('effort', e.target.value)}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="xhigh">xhigh</option>
                  </select>
                </div>
              )}

              <div>
                <label className={labelCls}>Tensor parallel</label>
                <select className={selectCls} value={ov.tp} onChange={e => setOvField('tp', e.target.value)}>
                  <option value="1">1 GPU</option>
                  <option value="2">2 GPUs</option>
                  <option value="4">4 GPUs</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>GPU memory target</label>
                <select className={selectCls} value={ov.gpuMem} onChange={e => setOvField('gpuMem', e.target.value)}>
                  {gpuMemOptions.map(v => (
                    <option key={v} value={String(v)}>{Math.round(v * 100)}%</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Context length</label>
                <select className={selectCls} value={ov.ctx} onChange={e => setOvField('ctx', e.target.value)}>
                  {ctxOptions.map(v => (
                    <option key={v} value={String(v)}>{formatContextLength(v)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>KV cache dtype</label>
                <select className={selectCls} value={ov.kv} onChange={e => setOvField('kv', e.target.value)}>
                  <option value="auto">auto (fp16)</option>
                  <option value="fp8">fp8</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>MTP speculative</label>
                <select
                  className={`${selectCls} ${!model.mtpSupported ? 'opacity-50' : ''}`}
                  value={model.mtpSupported ? ov.mtp : 'off'}
                  disabled={!model.mtpSupported}
                  onChange={e => setOvField('mtp', e.target.value)}
                >
                  <option value="off">off</option>
                  {[1, 2, 3, 4].map(n => (
                    <option key={n} value={String(n)}>{n} tokens</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Reasoning parser</label>
                <select className={selectCls} value={ov.parser} onChange={e => setOvField('parser', e.target.value)}>
                  <option value="on">on</option>
                  <option value="off">off</option>
                </select>
              </div>
            </div>

            {snippet && (
              <div className="mt-3 bg-dark-800 rounded p-2 font-mono text-xs text-gray-400 overflow-x-auto">
                <div className="text-gray-500 mb-1">Per-request thinking control (use in your clients):</div>
                {snippet}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Options apply at Start and are remembered per model. Sampling defaults (temperature/top_p) follow
              the selected thinking mode automatically.
            </p>
          </div>
        )}
      </div>
    );
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

  // Render model configuration section (only when running)
  const renderModelConfig = () => {
    if (buttonState !== 'ready') return null;

    const config = getSelectedModelInfo();
    if (!config) return null;

    return (
      <div className="mt-4 bg-dark-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center">
          <FaInfoCircle className="mr-2" />
          Loaded Model Configuration
        </h3>

        <div className="bg-dark-600 rounded-lg p-3 mb-3">
          <div className="text-lg font-bold text-white mb-1">{config.name}</div>
          <div className="text-sm text-gray-400 font-mono">{config.id}</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-dark-600 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">Quantization</div>
            <div className="text-white font-semibold">
              {config.quantization ? config.quantization.toUpperCase() : 'None (FP16)'}
            </div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">Context Length</div>
            <div className="text-white font-semibold">
              {formatContextLength(config.maxModelLen)}
            </div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">KV Cache</div>
            <div className="text-white font-semibold">
              {config.kvCacheDtype ? config.kvCacheDtype.toUpperCase() : 'FP16'}
            </div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">GPU Memory Target</div>
            <div className="text-white font-semibold">
              {Math.round(config.gpuMemoryUtilization * 100)}%
            </div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">Tensor Parallel</div>
            <div className="text-white font-semibold">
              {config.tensorParallelSize || 1} GPU{(config.tensorParallelSize || 1) > 1 ? 's' : ''}
            </div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">Port</div>
            <div className="text-white font-semibold">
              {config.port || 8001}
            </div>
          </div>
        </div>
      </div>
    );
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

        {/* Performance Grid - Row 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
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
              {metrics?.gpuCacheUsage !== null && metrics?.gpuCacheUsage !== undefined ? `${formatNum(metrics.gpuCacheUsage)}%` : 'N/A'}
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
              Requests
            </div>
            <div className="text-xl font-bold text-white">
              {metrics?.requestsRunning ?? 0} / {metrics?.requestsWaiting ?? 0}
            </div>
            <div className="text-xs text-gray-500">running / waiting</div>
          </div>
        </div>

        {/* Performance Grid - Row 2: Token Stats */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-dark-600 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">Prompt Tokens</div>
            <div className="text-lg font-bold text-cyan-400">
              {metrics?.totalPromptTokens ? metrics.totalPromptTokens.toLocaleString() : '0'}
            </div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">Generation Tokens</div>
            <div className="text-lg font-bold text-orange-400">
              {metrics?.totalGenerationTokens ? metrics.totalGenerationTokens.toLocaleString() : '0'}
            </div>
          </div>
        </div>

        {/* KV Cache Bar */}
        {metrics?.kvCacheUsedPerc !== null && metrics?.kvCacheUsedPerc !== undefined && (
          <div className="bg-dark-600 rounded-lg p-3">
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

          {selectedModel && getSelectedModelInfo() && buttonState !== 'ready' && (
            <div className="bg-dark-600 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-300">
                {getSelectedModelInfo().description}
              </p>
            </div>
          )}

          {renderAdvancedOptions()}

          {buttonState !== 'ready' && (
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
          )}

          {renderModelConfig()}
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

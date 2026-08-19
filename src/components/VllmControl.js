import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaSpinner, FaStop, FaCog, FaFileAlt, FaTachometerAlt, FaMemory, FaClock, FaTasks, FaMicrochip, FaInfoCircle, FaSlidersH, FaChevronDown, FaChevronUp, FaHourglassHalf, FaBolt } from 'react-icons/fa';
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
  const [launchMeta, setLaunchMeta] = useState(null);  // { currentModel, runningModelId, lastLaunched } from /vllm-models

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
          // Prefer the model vLLM is actually serving (or last launched) over
          // the catalog default, so a page reload while running shows reality.
          setSelectedModel(response.data.currentModel || response.data.defaultModel || '');
          setLaunchMeta({
            currentModel: response.data.currentModel || null,
            runningModelId: response.data.runningModelId || null,
            lastLaunched: response.data.lastLaunched || null,
          });
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
      prefix: model.prefixCaching ? 'on' : 'off',
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
      maxModelLen: ov.ctx === 'auto' ? 'auto' : Number(ov.ctx),
      kvCacheDtype: ov.kv,
      reasoningParser: ov.parser === 'on',
      prefixCaching: ov.prefix === 'on',
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

    const ctxOptions = [...new Set([
      8192, 16384, 32768, 49152, 65536, 98304, 131072, 196608, 262144,
      model.maxModelLen, model.maxModelLenNative,
    ])]
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
                  {[1, 2, 4].filter(n => n >= (model.minTensorParallelSize || 1)).map(n => (
                    <option key={n} value={String(n)}>{n} GPU{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
                {(model.minTensorParallelSize || 1) > 1 && (
                  <div className="text-xs text-gray-500 mt-1">weights need ≥ {model.minTensorParallelSize} GPUs</div>
                )}
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
                  <option value="auto">auto ({formatContextLength(model.maxModelLenNative || model.maxModelLen)} native)</option>
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

              <div>
                <label className={labelCls}>Prefix caching</label>
                <select className={selectCls} value={ov.prefix} onChange={e => setOvField('prefix', e.target.value)}>
                  <option value="on">on</option>
                  <option value="off">off</option>
                </select>
                <div className="text-xs text-gray-500 mt-1">cached prefixes cut prefill, but hold KV blocks</div>
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

    // Show the model vLLM is actually serving (launchMeta), not whatever the
    // catalog default is. Overlay the resolved launch values when available.
    const shownKey = launchMeta?.currentModel || selectedModel;
    const config = models.find(m => m.key === shownKey) || getSelectedModelInfo();
    if (!config) return null;
    const resolved = launchMeta?.lastLaunched?.resolvedConfig;
    const actual = resolved && resolved.key === shownKey ? resolved : null;

    // Quantization lives in the checkpoint for AWQ/INT8 builds (no --quantization
    // flag), so derive the label from the model id when the catalog has none.
    const quantFromId = (id) => {
      if (/AWQ-INT4/i.test(id)) return 'AWQ INT4';
      if (/AWQ/i.test(id)) return 'AWQ';
      if (/INT8/i.test(id)) return 'INT8';
      return null;
    };
    const quantLabel = config.quantization
      ? config.quantization.toUpperCase()
      : quantFromId(launchMeta?.runningModelId || config.id) || 'None (FP16)';

    const tp = actual?.tensorParallelSize ?? config.tensorParallelSize ?? 1;

    return (
      <div className="mt-4 bg-dark-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center">
          <FaInfoCircle className="mr-2" />
          Loaded Model Configuration
        </h3>

        <div className="bg-dark-600 rounded-lg p-3 mb-3">
          <div className="text-lg font-bold text-white mb-1">{config.name}</div>
          <div className="text-sm text-gray-400 font-mono">
            {launchMeta?.runningModelId || config.id}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-dark-600 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">Quantization</div>
            <div className="text-white font-semibold">{quantLabel}</div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">Context Length</div>
            <div className="text-white font-semibold">
              {formatContextLength(actual?.maxModelLen ?? config.maxModelLen)}
            </div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">KV Cache</div>
            <div className="text-white font-semibold">
              {(actual?.kvCacheDtype ?? config.kvCacheDtype)
                ? (actual?.kvCacheDtype ?? config.kvCacheDtype).toUpperCase()
                : 'FP16'}
            </div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">GPU Memory Target</div>
            <div className="text-white font-semibold">
              {Math.round((actual?.gpuMemoryUtilization ?? config.gpuMemoryUtilization) * 100)}%
            </div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">Tensor Parallel</div>
            <div className="text-white font-semibold">
              {tp} GPU{tp > 1 ? 's' : ''}
            </div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="text-gray-400 text-xs mb-1">Prefix Caching</div>
            <div className="text-white font-semibold">
              {(actual?.prefixCaching ?? config.prefixCaching) ? 'On' : 'Off'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMetrics = () => {
    if (buttonState !== 'ready') return null;

    const gpuMem = metrics?.gpuMemory;

    // Live phase badge: prefilling (prompt ingest) / generating (tokens out) / idle.
    // tokensPerSecond is the last measured rate — it stays visible between requests.
    const phase = metrics?.phase;
    const phaseInfo = !phase ? null : ({
      prefilling: {
        label: `Prefilling${phase.elapsedSec > 0 ? ` · ${phase.elapsedSec}s` : ''}`,
        cls: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
      },
      generating: {
        label: phase.elapsedSec > 0 ? `Generating · ${phase.elapsedSec}s` : 'Generating',
        cls: 'bg-green-500/15 text-green-400 border border-green-500/30',
      },
      idle: { label: 'Idle', cls: 'bg-gray-500/15 text-gray-400 border border-gray-500/30' },
    })[phase.state];
    const generating = phase?.state === 'generating';

    return (
      <div className="mt-4 bg-dark-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center">
          <FaTachometerAlt className="mr-2" />
          vLLM Performance Metrics
          {phaseInfo && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${phaseInfo.cls}`}>
              {phaseInfo.label}
            </span>
          )}
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
                {gpuMem.activeUsedGB ?? gpuMem.usedGB} GB / {gpuMem.activeTotalGB ?? gpuMem.totalGB} GB
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
              <span>{gpuMem.activeGpus ? `${gpuMem.activeGpus} active GPU${gpuMem.activeGpus > 1 ? 's' : ''} · Model + KV Cache` : 'Model + KV Cache'}</span>
              <span>{gpuMem.freeGB} GB free total</span>
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
            <div className={`text-xl font-bold ${generating ? 'text-green-400' : 'text-gray-500'}`}>
              {metrics?.tokensPerSecond !== null && metrics?.tokensPerSecond !== undefined
                ? formatNum(metrics.tokensPerSecond, 1)
                : 'N/A'}
            </div>
            {!generating && metrics?.tokensPerSecond !== null && metrics?.tokensPerSecond !== undefined && (
              <div className="text-[10px] text-gray-500">last measured</div>
            )}
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

        {/* Performance Grid - Row 2: prefill / decode / cache */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-dark-600 rounded-lg p-3">
            <div className="flex items-center text-gray-400 text-xs mb-1">
              <FaHourglassHalf className="mr-1" />
              Avg Prefill
            </div>
            <div className="text-xl font-bold text-yellow-400">
              {metrics?.avgPrefillTimeMs !== null && metrics?.avgPrefillTimeMs !== undefined
                ? `${formatNum(metrics.avgPrefillTimeMs / 1000, 1)}s`
                : 'N/A'}
            </div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="flex items-center text-gray-400 text-xs mb-1">
              <FaPlay className="mr-1" />
              Avg Decode
            </div>
            <div className="text-xl font-bold text-orange-400">
              {metrics?.avgDecodeTimeMs !== null && metrics?.avgDecodeTimeMs !== undefined
                ? `${formatNum(metrics.avgDecodeTimeMs / 1000, 1)}s`
                : 'N/A'}
            </div>
          </div>

          <div className="bg-dark-600 rounded-lg p-3">
            <div className="flex items-center text-gray-400 text-xs mb-1">
              <FaBolt className="mr-1" />
              Cache Hit
            </div>
            <div className="text-xl font-bold text-cyan-400">
              {metrics?.cacheHitPerc !== null && metrics?.cacheHitPerc !== undefined
                ? `${formatNum(metrics.cacheHitPerc)}%`
                : 'N/A'}
            </div>
          </div>
        </div>

        {/* Performance Grid - Row 3: Token Stats */}
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

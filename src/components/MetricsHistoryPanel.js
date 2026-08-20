import React, { useState, useEffect, useCallback } from 'react';
import { FaChartLine, FaChevronDown, FaChevronUp, FaSync } from 'react-icons/fa';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.8.209:8002';

// Series colors — the two-series pairs were validated for CVD/contrast on the
// dark surface (#1f2937) with the dataviz palette validator; single-series
// charts reuse the accent color of their metric's tile for identity.
const COLORS = {
  tps: '#4ade80',        // green (tile identity)
  cache: '#22d3ee',      // cyan (tile identity)
  tokensIn: '#0891b2',   // cyan-600 (validated pair w/ tokensOut)
  tokensOut: '#ea580c',  // orange-600
  ttft: '#c084fc',       // purple (tile identity)
  kv: '#facc15',         // yellow (tile identity)
  preempt: '#f87171',    // red — status color, reserved
  running: '#3b82f6',    // blue (validated pair w/ waiting)
  waiting: '#d97706',    // amber
};

const fmt = (n, d = 1) => (Number.isFinite(n) ? Number(n).toFixed(d) : '—');
const fmtLarge = (n) => {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
};
const fmtDuration = (ms) => {
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
};

/**
 * Small line/area chart (SVG, no dependencies).
 * points: [{ t (ms), v: {seriesKey: number|null} }]
 * series: [{ key, color, label }]
 * yMax: fixed domain top (e.g. 100 for %); otherwise derived from data.
 * area: fill under the first (single) series.
 */
function LineChart({ points, series, yMax = null, area = false, unit = '' }) {
  const [hover, setHover] = useState(null);
  const W = 640, H = 180;
  const PAD = { l: 46, r: 10, t: 10, b: 20 };
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;

  if (!points || points.length < 2) {
    return <div className="text-xs text-gray-500 py-6 text-center">Sin datos todavía (necesita unas muestras)</div>;
  }

  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const xMaxMs = Math.max(t1 - t0, 1);
  const xOf = (t) => PAD.l + ((t - t0) / xMaxMs) * iw;

  const values = points.flatMap((p) => series.map((s) => p.v[s.key]).filter(Number.isFinite));
  const dataMax = Math.max(1, ...values);
  const top = yMax ?? Math.ceil(dataMax * 1.15 * 10) / 10;
  const yOf = (v) => PAD.t + ih - (Math.min(v, top) / top) * ih;

  // Path per series; null values break the line
  const pathFor = (key) => {
    let d = '', pen = false;
    for (const p of points) {
      const v = p.v[key];
      if (!Number.isFinite(v)) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${xOf(p.t).toFixed(1)},${yOf(v).toFixed(1)} `;
      pen = true;
    }
    return d.trim();
  };

  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const val = top * f;
    return { y: PAD.t + ih - f * ih, val, label: top >= 100 ? Math.round(val) : fmt(val, top < 10 ? 1 : 0) };
  });
  const xTicks = [0, 0.5, 1].map((f) => {
    const t = t0 + xMaxMs * f;
    return { x: xOf(t), label: `${Math.round((t - t0) / 60000)}m` };
  });

  const areaPath = area && series.length === 1 ? `${pathFor(series[0].key)} L${xOf(t1).toFixed(1)},${PAD.t + ih} L${xOf(t0).toFixed(1)},${PAD.t + ih} Z` : null;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    if (x < PAD.l || x > W - PAD.r) { setHover(null); return; }
    const frac = (x - PAD.l) / iw;
    const idx = Math.round(frac * (points.length - 1));
    setHover({ idx: Math.max(0, Math.min(points.length - 1, idx)) });
  };

  const hp = hover ? points[hover.idx] : null;
  const tipLeft = hover ? Math.min(Math.max(xOf(hp.t) / W * 100, 10), 78) : 0;

  return (
    <div className="relative">
      {series.length > 1 && (
        <div className="flex items-center gap-4 mb-1 px-1">
          {series.map((s) => (
            <span key={s.key} className="flex items-center text-xs text-gray-400">
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-crosshair select-none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
      >
        {gridY.map((g, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={g.y} y2={g.y} stroke="#374151" strokeWidth="1" />
            <text x={PAD.l - 6} y={g.y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">{g.label}</text>
          </g>
        ))}
        {xTicks.map((xt, i) => (
          <text key={i} x={xt.x} y={H - 6} textAnchor="middle" fontSize="9" fill="#9ca3af">{xt.label}</text>
        ))}
        {areaPath && <path d={areaPath} fill={series[0].color} fillOpacity="0.15" />}
        {series.map((s) => (
          <path key={s.key} d={pathFor(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
        ))}
        {hover && (
          <g>
            <line x1={xOf(hp.t)} x2={xOf(hp.t)} y1={PAD.t} y2={PAD.t + ih} stroke="#6b7280" strokeWidth="1" strokeDasharray="3,3" />
            {series.map((s) => Number.isFinite(hp.v[s.key]) && (
              <circle key={s.key} cx={xOf(hp.t)} cy={yOf(hp.v[s.key])} r="3.5" fill={s.color} stroke="#1f2937" strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>
      {hover && (
        <div
          className="absolute top-1 bg-dark-800 border border-gray-600 rounded px-2 py-1 text-xs pointer-events-none whitespace-nowrap"
          style={{ left: `${tipLeft}%` }}
        >
          <div className="text-gray-400">
            {new Date(hp.t).toLocaleTimeString()} · +{Math.round((hp.t - t0) / 60000)}m
          </div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center text-gray-400">
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="text-gray-200 font-semibold ml-2">
                {Number.isFinite(hp.v[s.key]) ? `${fmt(hp.v[s.key], hp.v[s.key] >= 100 ? 0 : 1)}${unit}` : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Collapsible chart section.
 */
function CollapsibleChart({ title, open, onToggle, children }) {
  return (
    <div className="bg-dark-600 rounded-lg">
      <button
        className="flex items-center justify-between w-full text-sm text-gray-300 hover:text-gray-100 px-3 py-2"
        onClick={onToggle}
      >
        <span>{title}</span>
        {open ? <FaChevronUp className="text-gray-500" /> : <FaChevronDown className="text-gray-500" />}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

/**
 * Persisted per-launch vLLM metrics history with charts (X = time since the
 * server started). Data is sampled server-side every 10s and survives
 * redeploys; each vLLM launch is a session you can revisit per model.
 */
const MetricsHistoryPanel = ({ currentModel }) => {
  const [open, setOpen] = useState(true);
  const [models, setModels] = useState([]);
  const [model, setModel] = useState('');
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('latest');
  const [session, setSession] = useState(null); // { id, startedAt, summary, samples }
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [charts, setCharts] = useState({ tps: true, cache: false, tokens: false, ttft: false, kv: false, requests: false });

  const toggle = (k) => setCharts((c) => ({ ...c, [k]: !c[k] }));

  const fetchModels = useCallback(async (preselect) => {
    try {
      const res = await axios.get(`${API_URL}/api/performance/history`, { timeout: 5000 });
      const list = res.data.models || [];
      setModels(list);
      if (preselect && list.includes(preselect)) setModel(preselect);
      else if (!preselect && list.length) setModel(list[list.length - 1]);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Load model list on mount (preselecting the running model)
  useEffect(() => { fetchModels(currentModel); }, [fetchModels, currentModel]);

  // Load session list when the model changes (or on refresh)
  useEffect(() => {
    if (!model) return;
    let alive = true;
    axios.get(`${API_URL}/api/performance/history`, { params: { model }, timeout: 5000 })
      .then((res) => {
        if (!alive) return;
        setSessions(res.data.sessions || []);
        setSessionId('latest');
      })
      .catch((err) => alive && setError(err.message));
    return () => { alive = false; };
  }, [model, refreshKey]);

  // Load samples for the selected session
  useEffect(() => {
    if (!model || !sessionId) return;
    let alive = true;
    axios.get(`${API_URL}/api/performance/history`, { params: { model, session: sessionId }, timeout: 8000 })
      .then((res) => {
        if (!alive) return;
        setSession(res.data.session || null);
        setError(null);
      })
      .catch((err) => alive && setError(err.message));
    return () => { alive = false; };
  }, [model, sessionId, refreshKey]);

  const refresh = () => {
    fetchModels(currentModel || model);
    setRefreshKey((k) => k + 1);
  };

  // Derive per-sample rates (tokens in/out) from cumulative counters
  const samples = session?.samples || [];
  const points = samples.map((s, i) => {
    const prev = i > 0 ? samples[i - 1] : null;
    const dtSec = prev ? (s.t - prev.t) / 1000 : 0;
    return {
      t: s.t,
      v: {
        tps: s.tps,
        cacheHit: s.cacheHitPerc,
        promptRate: prev && dtSec > 0 ? (s.promptTotal - prev.promptTotal) / dtSec : null,
        genRate: prev && dtSec > 0 ? (s.genTotal - prev.genTotal) / dtSec : null,
        ttft: s.ttftMs != null ? s.ttftMs : null,
        kv: s.kvPerc,
        running: s.running,
        waiting: s.waiting,
      },
      preempted: prev ? (s.preemptions || 0) > (prev.preemptions || 0) : false,
    };
  });

  const summary = session?.summary;
  const selectCls = 'bg-dark-800 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-primary-500';

  return (
    <div className="mt-4 bg-dark-700 rounded-lg p-4">
      <button
        className="flex items-center justify-between w-full text-sm font-semibold text-gray-400 hover:text-gray-200"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center">
          <FaChartLine className="mr-2" />
          Performance History
        </span>
        {open ? <FaChevronUp /> : <FaChevronDown />}
      </button>

      {open && (
        <div className="mt-3">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <select className={selectCls} value={model} onChange={(e) => setModel(e.target.value)} title="Modelo">
              {models.length === 0 && <option value="">Sin historial aún</option>}
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className={selectCls} value={sessionId} onChange={(e) => setSessionId(e.target.value)} title="Sesión (un launch de vLLM)">
              {sessions.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {new Date(s.startedAt).toLocaleString()} · {s.sampleCount} muestras
                </option>
              ))}
              <option value="latest">Última sesión</option>
            </select>
            <button className="btn btn-sm btn-secondary" onClick={refresh} title="Refrescar">
              <FaSync />
            </button>
          </div>

          {error && <div className="text-red-400 text-xs mb-2">Error: {error}</div>}
          {!session && !error && <div className="text-xs text-gray-500">Sin sesiones para este modelo todavía.</div>}

          {/* Session summary */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              <div className="bg-dark-600 rounded p-2">
                <div className="text-gray-500 text-[10px]">Duración</div>
                <div className="text-sm font-semibold text-white">{fmtDuration(summary.durationMs || 0)}</div>
              </div>
              <div className="bg-dark-600 rounded p-2">
                <div className="text-gray-500 text-[10px]">Avg tok/s</div>
                <div className="text-sm font-semibold text-green-400">{fmt(summary.avgTps)}</div>
              </div>
              <div className="bg-dark-600 rounded p-2">
                <div className="text-gray-500 text-[10px]">Avg cache hit</div>
                <div className="text-sm font-semibold text-cyan-400">{fmt(summary.avgCacheHitPerc)}%</div>
              </div>
              <div className="bg-dark-600 rounded p-2">
                <div className="text-gray-500 text-[10px]">Avg TTFT</div>
                <div className="text-sm font-semibold text-purple-400">{summary.avgTtftMs != null ? `${fmt(summary.avgTtftMs / 1000)}s` : '—'}</div>
              </div>
              <div className="bg-dark-600 rounded p-2">
                <div className="text-gray-500 text-[10px]">Tokens in</div>
                <div className="text-sm font-semibold text-cyan-400">{fmtLarge(summary.promptTokens)}</div>
              </div>
              <div className="bg-dark-600 rounded p-2">
                <div className="text-gray-500 text-[10px]">Tokens out</div>
                <div className="text-sm font-semibold text-orange-400">{fmtLarge(summary.genTokens)}</div>
              </div>
              <div className="bg-dark-600 rounded p-2">
                <div className="text-gray-500 text-[10px]">Avg prefill</div>
                <div className="text-sm font-semibold text-yellow-400">{summary.avgPrefillMs != null ? `${fmt(summary.avgPrefillMs / 1000)}s` : '—'}</div>
              </div>
              <div className="bg-dark-600 rounded p-2">
                <div className="text-gray-500 text-[10px]">Preemptions</div>
                <div className={`text-sm font-semibold ${summary.preemptions > 0 ? 'text-red-400' : 'text-gray-300'}`}>{summary.preemptions ?? 0}</div>
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="space-y-2">
            <CollapsibleChart title="Tokens / seg" open={charts.tps} onToggle={() => toggle('tps')}>
              <LineChart points={points} series={[{ key: 'tps', color: COLORS.tps, label: 'tokens/sec' }]} area unit=" tok/s" />
            </CollapsibleChart>

            <CollapsibleChart title="Cache Hit %" open={charts.cache} onToggle={() => toggle('cache')}>
              <LineChart points={points} series={[{ key: 'cacheHit', color: COLORS.cache, label: 'cache hit' }]} area yMax={100} unit="%" />
            </CollapsibleChart>

            <CollapsibleChart title="Tokens in / out (rate)" open={charts.tokens} onToggle={() => toggle('tokens')}>
              <LineChart
                points={points}
                series={[
                  { key: 'promptRate', color: COLORS.tokensIn, label: 'in (prompt)' },
                  { key: 'genRate', color: COLORS.tokensOut, label: 'out (generación)' },
                ]}
                unit=" tok/s"
              />
            </CollapsibleChart>

            <CollapsibleChart title="TTFT" open={charts.ttft} onToggle={() => toggle('ttft')}>
              <LineChart points={points} series={[{ key: 'ttft', color: COLORS.ttft, label: 'time to first token' }]} unit=" ms" />
            </CollapsibleChart>

            <CollapsibleChart title="KV Cache %" open={charts.kv} onToggle={() => toggle('kv')}>
              <LineChart points={points} series={[{ key: 'kv', color: COLORS.kv, label: 'KV cache' }]} area yMax={100} unit="%" />
            </CollapsibleChart>

            <CollapsibleChart title="Requests (running / waiting)" open={charts.requests} onToggle={() => toggle('requests')}>
              <LineChart
                points={points}
                series={[
                  { key: 'running', color: COLORS.running, label: 'running' },
                  { key: 'waiting', color: COLORS.waiting, label: 'waiting' },
                ]}
                yMax={null}
              />
            </CollapsibleChart>
          </div>

          <p className="text-[10px] text-gray-600 mt-2">
            Cada sesión es un launch de vLLM (X = tiempo desde que prendió). Se samplea cada 10s y queda
            guardada por modelo (últimas 10 sesiones, 24h máximo por sesión).
          </p>
        </div>
      )}
    </div>
  );
};

export default MetricsHistoryPanel;

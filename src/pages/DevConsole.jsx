/**
 * DevConsole.jsx — Hidden Developer Debug Screen
 *
 * Access: Settings → Tap App Version 7 times
 *
 * Shows:
 *   - Live Logs
 *   - API Calls
 *   - AI Requests
 *   - Crash History
 *   - Network State
 *   - Memory Usage
 *   - Current User
 *   - Permission Status
 *   - Firebase Events
 *   - Authentication State
 */
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal, Activity, Zap, AlertTriangle, Wifi, WifiOff,
  Database, Shield, Cpu, User, Trash2, RefreshCw, ArrowLeft,
  ChevronDown, Bot, Server, Bug, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getLiveLogs, getAPILogs, getAILogs, getCrashHistory,
  getErrorQueue, clearErrorData, forceFlush
} from '../services/ErrorMonitor';
import { dumpLogs } from '../utils/logger';
import Platform from '../platform/Platform';

const TABS = [
  { id: 'logs', label: 'Logs', icon: Terminal },
  { id: 'api', label: 'API', icon: Server },
  { id: 'ai', label: 'AI', icon: Bot },
  { id: 'crashes', label: 'Crashes', icon: Bug },
  { id: 'system', label: 'System', icon: Cpu },
];

function StatusBadge({ ok, label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
      background: ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
      color: ok ? '#16a34a' : '#dc2626',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ok ? '#22c55e' : '#ef4444' }} />
      {label}
    </span>
  );
}

function LogEntry({ entry }) {
  const severityColor = {
    error: '#ef4444', warning: '#f59e0b', info: '#3b82f6',
    api: '#8b5cf6', ai: '#06b6d4', system: '#6b7280', network: '#10b981',
  };
  const color = severityColor[entry.type] || severityColor[entry.severity] || '#6b7280';

  return (
    <div style={{
      padding: '8px 12px', borderBottom: '1px solid var(--border)',
      fontSize: '0.72rem', fontFamily: 'ui-monospace, monospace',
      lineHeight: 1.5, display: 'flex', gap: 8, alignItems: 'flex-start',
    }}>
      <span style={{ color: 'var(--text3)', flexShrink: 0, fontSize: '0.65rem' }}>
        {entry.ts?.slice(11, 23) || '—'}
      </span>
      <span style={{
        flexShrink: 0, padding: '1px 5px', borderRadius: 4, fontSize: '0.6rem',
        fontWeight: 800, textTransform: 'uppercase', background: `${color}20`, color,
      }}>
        {entry.type || entry.category || 'LOG'}
      </span>
      <span style={{ color: 'var(--text)', wordBreak: 'break-word', flex: 1 }}>
        {entry.message || entry.endpoint || entry.status || JSON.stringify(entry).slice(0, 200)}
      </span>
    </div>
  );
}

function APILogEntry({ log }) {
  const isError = !log.success;
  return (
    <div style={{
      padding: '10px 12px', borderBottom: '1px solid var(--border)',
      fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 800,
            background: isError ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
            color: isError ? '#dc2626' : '#16a34a',
          }}>
            {log.status || (isError ? 'ERR' : 'OK')}
          </span>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{log.method || 'POST'}</span>
        </div>
        <span style={{ color: 'var(--text3)', fontSize: '0.65rem' }}>
          {log.latencyMs ? `${log.latencyMs}ms` : '—'} · {log.ts?.slice(11, 19)}
        </span>
      </div>
      <div style={{ color: 'var(--text2)', fontFamily: 'ui-monospace, monospace', fontSize: '0.7rem', wordBreak: 'break-all' }}>
        {log.endpoint || '—'}
      </div>
      {log.error && (
        <div style={{ color: '#dc2626', fontSize: '0.68rem' }}>{log.error}</div>
      )}
    </div>
  );
}

function CrashEntry({ crash }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      padding: '12px', borderBottom: '1px solid var(--border)',
      background: crash.severity === 'fatal' ? 'rgba(239,68,68,0.04)' : 'transparent',
    }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setOpen(!open)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{
              padding: '2px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 800,
              background: crash.severity === 'fatal' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
              color: crash.severity === 'fatal' ? '#dc2626' : '#d97706',
              textTransform: 'uppercase',
            }}>
              {crash.severity}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>{crash.category}</span>
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {crash.message}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', marginTop: 2 }}>
            {crash.currentRoute} · {crash.platform} · {new Date(crash.timestamp).toLocaleString()}
          </div>
        </div>
        <ChevronDown size={14} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s', color: 'var(--text3)' }} />
      </div>
      {open && (
        <div style={{ marginTop: 8, padding: 10, background: 'var(--bg)', borderRadius: 8, fontSize: '0.68rem', fontFamily: 'ui-monospace, monospace' }}>
          <div><strong>Module:</strong> {crash.module}</div>
          {crash.apiEndpoint && <div><strong>Endpoint:</strong> {crash.apiEndpoint}</div>}
          {crash.httpStatus && <div><strong>HTTP:</strong> {crash.httpStatus}</div>}
          {crash.firebaseCode && <div><strong>Firebase:</strong> {crash.firebaseCode}</div>}
          {crash.pluginName && <div><strong>Plugin:</strong> {crash.pluginName}</div>}
          <div><strong>UID:</strong> {crash.uid || '—'}</div>
          <div><strong>Online:</strong> {crash.isOnline ? 'Yes' : 'No'}</div>
          {crash.stack && (
            <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#dc2626', fontSize: '0.65rem', maxHeight: 200, overflow: 'auto' }}>
              {crash.stack}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function DevConsole() {
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('logs');
  const [refreshKey, setRefreshKey] = useState(0);

  // Strict Security Guard: Only superadmin role can view DevConsole
  useEffect(() => {
    if (userRole !== 'superadmin') {
      navigate('/', { replace: true });
    }
  }, [userRole, navigate]);

  if (userRole !== 'superadmin') {
    return null;
  }

  // Auto-refresh every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => setRefreshKey(k => k + 1), 3000);
    return () => clearInterval(timer);
  }, []);

  const logs = useMemo(() => {
    void refreshKey;
    return [...getLiveLogs(), ...dumpLogs().map(l => ({ ...l, type: l.tag?.toLowerCase() || 'log' }))].sort((a, b) => (b.ts || '').localeCompare(a.ts || '')).slice(0, 200);
  }, [refreshKey]);

  const apiLogs = useMemo(() => { void refreshKey; return getAPILogs().reverse(); }, [refreshKey]);
  const aiLogs = useMemo(() => { void refreshKey; return getAILogs().reverse(); }, [refreshKey]);
  const crashes = useMemo(() => { void refreshKey; return getCrashHistory(); }, [refreshKey]);
  const errorQueue = useMemo(() => { void refreshKey; return getErrorQueue(); }, [refreshKey]);

  const isOnline = navigator.onLine;
  const memory = performance?.memory;

  return (
    <div className="fade-in" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: 4 }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
            <Terminal size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Developer Console
          </h1>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text3)' }}>
            v{Platform.isAndroid() ? 'Android' : 'Web'} · {currentUser?.uid?.slice(0, 8) || 'No user'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <StatusBadge ok={isOnline} label={isOnline ? 'Online' : 'Offline'} />
          <StatusBadge ok={crashes.length === 0} label={`${crashes.length} crashes`} />
        </div>
      </div>

      {/* System Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '12px 0' }}>
        <div style={{ padding: '10px 12px', background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', fontWeight: 600 }}>ERRORS</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: errorQueue.length > 0 ? '#dc2626' : 'var(--text)' }}>{errorQueue.length}</div>
        </div>
        <div style={{ padding: '10px 12px', background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', fontWeight: 600 }}>API CALLS</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{apiLogs.length}</div>
        </div>
        <div style={{ padding: '10px 12px', background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', fontWeight: 600 }}>MEMORY</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
            {memory?.usedJSHeapSize ? `${Math.round(memory.usedJSHeapSize / 1048576)}MB` : '—'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
              background: activeTab === tab.id ? 'var(--accent)' : 'var(--bg)',
              color: activeTab === tab.id ? '#fff' : 'var(--text2)',
            }}
          >
            <tab.icon size={13} />
            {tab.label}
            {tab.id === 'crashes' && crashes.length > 0 && (
              <span style={{ background: '#dc2626', color: '#fff', padding: '1px 5px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 800 }}>
                {crashes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: 300 }}>
        {activeTab === 'logs' && (
          <div>
            <div style={{ padding: '8px 12px', fontSize: '0.7rem', color: 'var(--text3)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Showing {logs.length} entries (auto-refreshing)</span>
              <RefreshCw size={12} className="animate-spin" style={{ opacity: 0.4 }} />
            </div>
            {logs.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: '0.8rem' }}>No logs yet. Interact with the app to see events.</div>
            ) : (
              logs.map((entry, i) => <LogEntry key={i} entry={entry} />)
            )}
          </div>
        )}

        {activeTab === 'api' && (
          <div>
            <div style={{ padding: '8px 12px', fontSize: '0.7rem', color: 'var(--text3)' }}>
              API Calls ({apiLogs.length}) · {apiLogs.filter(l => !l.success).length} failed
            </div>
            {apiLogs.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: '0.8rem' }}>No API calls recorded yet.</div>
            ) : (
              apiLogs.map((log, i) => <APILogEntry key={i} log={log} />)
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div>
            <div style={{ padding: '8px 12px', fontSize: '0.7rem', color: 'var(--text3)' }}>
              AI Requests ({aiLogs.length}) · Avg latency: {aiLogs.length > 0 ? Math.round(aiLogs.filter(l => l.latencyMs).reduce((s, l) => s + l.latencyMs, 0) / Math.max(aiLogs.filter(l => l.latencyMs).length, 1)) : '—'}ms
            </div>
            {aiLogs.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: '0.8rem' }}>No AI requests recorded yet.</div>
            ) : (
              aiLogs.map((log, i) => <APILogEntry key={i} log={log} />)
            )}
          </div>
        )}

        {activeTab === 'crashes' && (
          <div>
            <div style={{ padding: '8px 12px', fontSize: '0.7rem', color: 'var(--text3)' }}>
              Crash History ({crashes.length}) · {errorQueue.filter(e => !e.uploaded).length} pending upload
            </div>
            {crashes.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', fontSize: '0.85rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎉</div>
                <div style={{ color: '#16a34a', fontWeight: 700 }}>No crashes recorded!</div>
                <div style={{ color: 'var(--text3)', fontSize: '0.75rem', marginTop: 4 }}>Your app is running smoothly.</div>
              </div>
            ) : (
              crashes.map((crash, i) => <CrashEntry key={i} crash={crash} />)
            )}
          </div>
        )}

        {activeTab === 'system' && (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Platform', value: Platform.isAndroid() ? 'Android (Capacitor)' : 'Web Browser', icon: Cpu },
              { label: 'User UID', value: currentUser?.uid || 'Not logged in', icon: User },
              { label: 'User Email', value: currentUser?.email || '—', icon: User },
              { label: 'Network', value: navigator.onLine ? '🟢 Online' : '🔴 Offline', icon: isOnline ? Wifi : WifiOff },
              { label: 'Connection Type', value: navigator?.connection?.effectiveType || '—', icon: Activity },
              { label: 'User Agent', value: navigator.userAgent.slice(0, 100), icon: Terminal },
              { label: 'App Version', value: '1.1.16', icon: Shield },
              { label: 'Heap Used', value: memory?.usedJSHeapSize ? `${Math.round(memory.usedJSHeapSize / 1048576)} MB` : '—', icon: Database },
              { label: 'Heap Limit', value: memory?.jsHeapSizeLimit ? `${Math.round(memory.jsHeapSizeLimit / 1048576)} MB` : '—', icon: Database },
              { label: 'Error Queue', value: `${errorQueue.length} items (${errorQueue.filter(e => !e.uploaded).length} pending)`, icon: AlertTriangle },
              { label: 'Screen', value: `${window.innerWidth}×${window.innerHeight}`, icon: Activity },
              { label: 'Language', value: navigator.language, icon: Activity },
              { label: 'Current Time', value: new Date().toLocaleString(), icon: Clock },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <item.icon size={14} color="var(--text3)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', wordBreak: 'break-all' }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'var(--card)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'center', zIndex: 50 }}>
        <button
          onClick={() => { forceFlush(); setRefreshKey(k => k + 1); }}
          style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <RefreshCw size={13} /> Flush to Firestore
        </button>
        <button
          onClick={() => { clearErrorData(); setRefreshKey(k => k + 1); }}
          style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <Trash2 size={13} /> Clear All Data
        </button>
      </div>
    </div>
  );
}

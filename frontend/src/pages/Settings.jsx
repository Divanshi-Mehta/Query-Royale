import { useState, useEffect } from 'react'
import {
  Server,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  Database,
  Trash2,
  Activity,
  Layers
} from 'lucide-react'
import {
  checkBackendHealth,
  fetchTablesStatus,
  resetDatabase,
  getCustomBackendUrl,
  setCustomBackendUrl
} from '../api/client'

export default function Settings() {
  const [backendUrl, setBackendUrl] = useState(getCustomBackendUrl() || 'http://localhost:8000')
  const [healthInfo, setHealthInfo] = useState(null)
  const [tablesInfo, setTablesInfo] = useState(null)
  const [testing, setTesting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    setTesting(true)
    try {
      const [h, t] = await Promise.all([
        checkBackendHealth().catch(() => null),
        fetchTablesStatus().catch(() => null),
      ])
      setHealthInfo(h)
      setTablesInfo(t)
    } catch {
      setHealthInfo(null)
    } finally {
      setTesting(false)
    }
  }

  function handleSave(e) {
    e.preventDefault()
    setCustomBackendUrl(backendUrl === 'http://localhost:8000' ? '' : backendUrl)
    setToast({ type: 'success', msg: 'Configuration saved! Checking connection…' })
    checkConnection()
    setTimeout(() => setToast(null), 3000)
  }

  async function handleResetDb() {
    if (!window.confirm('Are you sure you want to clear active locks and deadlocks in the database?')) return
    setResetting(true)
    try {
      const res = await resetDatabase()
      setToast({ type: 'success', msg: res.message || 'Database reset successfully!' })
      await checkConnection()
    } catch (err) {
      setToast({ type: 'error', msg: `Reset failed: ${err.message}` })
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="animate-in" style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && (
        <div
          className="animate-in"
          style={{
            background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${toast.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            borderRadius: 10,
            padding: '12px 16px',
            color: toast.type === 'error' ? '#f87171' : '#34d399',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Backend & DB Health Card */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Server size={18} color="#6366f1" />
            <div>
              <div className="card-title">Live Backend &amp; Database Telemetry</div>
              <div className="card-subtitle">Real-time status of FastAPI service and storage engine</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={checkConnection}
            disabled={testing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}
          >
            <RefreshCw size={13} className={testing ? 'spin' : ''} />
            <span>{testing ? 'Testing…' : 'Ping Server'}</span>
          </button>
        </div>

        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>FastAPI Backend</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: healthInfo?.status === 'healthy' ? '#10b981' : '#f59e0b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthInfo?.status === 'healthy' ? '#10b981' : '#f59e0b' }} />
                <span>{healthInfo?.status === 'healthy' ? 'Operational' : 'Disconnected'}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Port: 8000 / Vite Proxy</div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Database Engine</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Database size={16} />
                <span>{(healthInfo?.database || tablesInfo?.db_type || 'SQLITE').toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                {healthInfo?.database === 'mysql' ? 'Active MySQL Service' : 'Built-in Seamless SQLite'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Maintenance</div>
              <div style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleResetDb}
                  disabled={resetting}
                  style={{ color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', width: '100%', justifyContent: 'center' }}
                >
                  <Trash2 size={12} style={{ marginRight: 6 }} />
                  {resetting ? 'Resetting…' : 'Clear Locks / Deadlocks'}
                </button>
              </div>
            </div>
          </div>

          {/* Database Tables Summary */}
          {tablesInfo && tablesInfo.tables && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                Database Tables &amp; Record Counts
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {Object.entries(tablesInfo.tables).map(([tbl, cnt]) => (
                  <div key={tbl} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#818cf8', fontWeight: 600 }}>{tbl}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>{cnt} rows</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backend API Configuration */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={18} color="#6366f1" />
            <div>
              <div className="card-title">Backend API Endpoint Configuration</div>
              <div className="card-subtitle">Connect to a local or remote FastAPI instance</div>
            </div>
          </div>
        </div>

        <form className="card-body" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">FastAPI Backend URL</label>
            <input
              type="text"
              className="form-control"
              value={backendUrl}
              onChange={e => setBackendUrl(e.target.value)}
              placeholder="http://localhost:8000"
            />
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Leave as <code>http://localhost:8000</code> or blank to use standard Vite dev server proxying.
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">
              Save Configuration
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setBackendUrl('http://localhost:8000')
                setCustomBackendUrl('')
                checkConnection()
              }}
            >
              <RotateCcw size={13} /> Reset Defaults
            </button>
          </div>
        </form>
      </div>

      {/* Architecture Spec */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Architecture Specification</div>
          <span className="chip chip-blue">System Blueprint</span>
        </div>
        <div className="card-body" style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>
              <strong style={{ color: '#38bdf8' }}>OS Engine:</strong> Implements FCFS, Shortest Job First (SJF), Shortest Remaining Time First (SRTF), Priority, and Round Robin scheduling algorithms with interactive Gantt timeline tracking.
            </li>
            <li>
              <strong style={{ color: '#34d399' }}>DBMS Engine:</strong> Manages SQL query execution, 2-Phase Locking (2PL), cycle detection in Wait-For Graphs with automated victim abortion, and Write-Ahead Logging (WAL) with ARIES recovery.
            </li>
            <li>
              <strong style={{ color: '#a78bfa' }}>AI Assistant:</strong> Evaluates live CPU burst distribution, recommends optimal scheduling algorithms, detects missing database indexes, and diagnoses deadlocks.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
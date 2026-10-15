import { useState } from 'react'
import { Server, CheckCircle2, RotateCcw } from 'lucide-react'

export default function Settings() {
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000')
  const [mockMode, setMockMode] = useState(true)
  const [telemetryInterval, setTelemetryInterval] = useState(1500)
  const [dbName, setDbName] = useState('query_royale_db')
  const [saved, setSaved] = useState(false)

  function handleSave(e) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="animate-in" style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {saved && (
        <div
          className="animate-in"
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 10,
            padding: '12px 16px',
            color: '#34d399',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={16} />
          <span>Platform settings updated successfully.</span>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Server size={18} color="#6366f1" />
            <div>
              <div className="card-title">Backend API &amp; Connection Setup</div>
              <div className="card-subtitle">Connect the frontend to your FastAPI and MySQL services</div>
            </div>
          </div>
        </div>

        <form className="card-body" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">FastAPI Backend Endpoint</label>
            <input
              type="text"
              className="form-control"
              value={backendUrl}
              onChange={e => setBackendUrl(e.target.value)}
              placeholder="http://localhost:8000"
            />
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Base URL where FastAPI server routes (e.g. /api/scheduling) are served.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">MySQL Database Name</label>
            <input
              type="text"
              className="form-control"
              value={dbName}
              onChange={e => setDbName(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                Mock Data Simulation Mode
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Use client-side OS scheduling simulations, sample query results and mock transactions
              </div>
            </div>
            <input
              type="checkbox"
              checked={mockMode}
              onChange={e => setMockMode(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#6366f1', cursor: 'pointer' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Live Telemetry Wobble Interval ({telemetryInterval}ms)</label>
            <input
              type="range"
              min="500"
              max="5000"
              step="500"
              value={telemetryInterval}
              onChange={e => setTelemetryInterval(parseInt(e.target.value))}
              style={{ accentColor: '#6366f1' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button type="submit" className="btn btn-primary">
              Save Configuration
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setBackendUrl('http://localhost:8000')
                setMockMode(true)
                setTelemetryInterval(1500)
              }}
            >
              <RotateCcw size={13} /> Reset Defaults
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Architecture Overview</div>
          <span className="chip chip-blue">System Spec</span>
        </div>
        <div className="card-body" style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
          <p style={{ marginBottom: 10 }}>
            <strong>Query Royale</strong> is structured into three primary computational engines:
          </p>
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>
              <strong style={{ color: '#38bdf8' }}>OS Engine:</strong> Implements FCFS, Shortest Job First (SJF), Shortest Remaining Time First (SRTF), Priority, and Round Robin scheduling algorithms with interactive Gantt timeline tracking.
            </li>
            <li>
              <strong style={{ color: '#34d399' }}>DBMS Engine:</strong> Manages SQL query execution, 2-Phase Locking (2PL), cycle detection in Wait-For Graphs with automated victim abortion, and Write-Ahead Logging (WAL) with ARIES recovery.
            </li>
            <li>
              <strong style={{ color: '#a78bfa' }}>Assistance:</strong> Evaluates live CPU burst distribution, recommends optimal scheduling algorithms, detects missing database indexes, and diagnoses deadlocks.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

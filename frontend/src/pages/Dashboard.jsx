import { useState, useEffect } from 'react'
import {
  Cpu,
  HardDrive,
  FileText,
  AlertTriangle,
  Activity,
  Pause,
  Play,
  MoreVertical,
  ArrowLeftRight,
  Lock,
  Monitor
} from 'lucide-react'

// Sparkline SVG Component for smooth wave lines matching mockup
function SparklineWave({ color = '#3b82f6', height = 36, points = [12, 18, 14, 25, 20, 28, 22, 34, 28, 30] }) {
  const width = 180
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width
    const y = height - ((p - min) / range) * (height - 8) - 4
    return `${x},${y}`
  })

  const pathD = `M ${coords.join(' L ')}`

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathD} L ${width},${height} L 0,${height} Z`}
        fill={`url(#grad-${color.replace('#', '')})`}
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Mini Bar Chart Component for bottom cards
function MiniBarChart({ color = '#14b8a6', heights = [35, 60, 45, 80, 55, 90, 70, 40, 85, 95] }) {
  return (
    <div className="bottom-summary-chart">
      {heights.map((h, i) => (
        <div
          key={i}
          className="mini-bar-item"
          style={{
            height: `${h}%`,
            background: color,
            opacity: 0.35 + (i / heights.length) * 0.65,
          }}
        />
      ))}
    </div>
  )
}

const INITIAL_PROCESSES = [
  {
    pid: 10234,
    user: 'app_user',
    query: 'SELECT * FROM orders',
    status: 'Running',
    cpu: 45,
    elapsed: 12,
    gantt: { start: 4, duration: 13, color: '#10b981', label: 'SELECT * FROM orders' }
  },
  {
    pid: 10235,
    user: 'report_user',
    query: 'UPDATE accounts SET balance = balance + 50...',
    status: 'Running',
    cpu: 32,
    elapsed: 8,
    gantt: { start: 6, duration: 16, color: '#3b82f6', label: 'UPDATE accounts SET ...' }
  },
  {
    pid: 10236,
    user: 'analytics',
    query: 'SELECT * FROM users WHERE active = true...',
    status: 'Running',
    cpu: 18,
    elapsed: 5,
    gantt: { start: 8, duration: 11, color: '#8b5cf6', label: 'SELECT * FROM users ...' }
  },
  {
    pid: 10237,
    user: 'app_user',
    query: 'DELETE FROM sessions WHERE expired_at < NOW()...',
    status: 'Waiting',
    cpu: 0,
    elapsed: 3,
    gantt: { start: 7, duration: 9, color: '#f59e0b', label: 'DELETE FROM sessions ...' }
  },
  {
    pid: 10238,
    user: 'app_user',
    query: 'INSERT INTO logs (event, ts) VALUES (...)',
    status: 'Waiting',
    cpu: 0,
    elapsed: 2,
    gantt: { start: 9, duration: 9, color: '#ec4899', label: 'INSERT INTO logs ...' }
  },
  {
    pid: 10239,
    user: 'dba',
    query: 'VACUUM ANALYZE',
    status: 'Idle',
    cpu: 0,
    elapsed: 75,
    gantt: { start: 6, duration: 16, color: '#06b6d4', label: 'VACUUM ANALYZE' }
  },
]

export default function Dashboard({ onNavigate, activeDeadlocksCount = 0 }) {
  const [isPaused, setIsPaused] = useState(false)
  const [activeTab, setActiveTab] = useState('processes')
  const [processes, setProcesses] = useState(INITIAL_PROCESSES)
  const [liveCpu, setLiveCpu] = useState(32)
  const [liveRam, setLiveRam] = useState(62)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)

  // Simulation timer for elapsed time and slight fluctuations
  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setProcesses(prev =>
        prev.map(p => {
          if (p.status === 'Running') {
            const cpuDelta = (Math.random() * 6 - 3) | 0
            const newCpu = Math.max(10, Math.min(85, p.cpu + cpuDelta))
            return {
              ...p,
              cpu: newCpu,
              elapsed: p.elapsed + 1,
            }
          }
          if (p.status === 'Waiting' && Math.random() < 0.15) {
            return {
              ...p,
              elapsed: p.elapsed + 1,
            }
          }
          return {
            ...p,
            elapsed: p.elapsed + 1,
          }
        })
      )

      // Slight CPU and RAM wobble
      setLiveCpu(curr => Math.max(24, Math.min(68, curr + ((Math.random() * 4 - 2) | 0))))
      setLiveRam(curr => Math.max(55, Math.min(75, curr + ((Math.random() * 2 - 1) | 0))))
    }, 1500)

    return () => clearInterval(interval)
  }, [isPaused])

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `00:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* System Overview Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Monitor size={18} color="#6366f1" />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '0.02em' }}>
            System Overview
          </h2>
        </div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          Real-time Engine Telemetry · 4 Cores Active
        </div>
      </div>

      {/* 4 Top Overview Cards matching the mockup image */}
      <div className="metrics-grid" style={{ marginBottom: 0 }}>
        {/* Card 1: CPU */}
        <div className="overview-kpi-card">
          <div className="overview-kpi-top">
            <div className="overview-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <Cpu size={22} />
            </div>
            <div>
              <div className="overview-kpi-label">CPU</div>
              <div className="overview-kpi-val">{liveCpu}%</div>
              <div className="overview-kpi-sub">4 Cores</div>
            </div>
          </div>
          <div className="overview-sparkline-wrap">
            <SparklineWave color="#3b82f6" points={[15, 22, 18, 32, 28, 40, 32, 45, 38, liveCpu]} />
          </div>
        </div>

        {/* Card 2: RAM */}
        <div className="overview-kpi-card">
          <div className="overview-kpi-top">
            <div className="overview-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <HardDrive size={22} />
            </div>
            <div>
              <div className="overview-kpi-label">RAM</div>
              <div className="overview-kpi-val">{liveRam}%</div>
              <div className="overview-kpi-sub">7.8 GB / 15.6 GB</div>
            </div>
          </div>
          <div className="overview-sparkline-wrap">
            <SparklineWave color="#10b981" points={[58, 60, 59, 62, 61, 63, 62, 64, 63, liveRam]} />
          </div>
        </div>

        {/* Card 3: Queries */}
        <div className="overview-kpi-card">
          <div className="overview-kpi-top">
            <div className="overview-kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
              <FileText size={22} />
            </div>
            <div>
              <div className="overview-kpi-label">Queries</div>
              <div className="overview-kpi-val">128</div>
              <div className="overview-kpi-sub">Active</div>
            </div>
          </div>
          <div className="overview-sparkline-wrap">
            <SparklineWave color="#8b5cf6" points={[110, 118, 114, 122, 120, 129, 125, 134, 126, 128]} />
          </div>
        </div>

        {/* Card 4: Deadlocks */}
        <div
          className="overview-kpi-card"
          onClick={() => onNavigate && onNavigate('deadlocks')}
          style={{ cursor: 'pointer' }}
          title="Click to view Deadlocks"
        >
          <div className="overview-kpi-top">
            <div
              className="overview-kpi-icon"
              style={{
                background: activeDeadlocksCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: activeDeadlocksCount > 0 ? '#ef4444' : '#10b981'
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className="overview-kpi-label">Deadlocks</div>
              <div
                className="overview-kpi-val"
                style={{ color: activeDeadlocksCount > 0 ? '#ef4444' : '#10b981' }}
              >
                {activeDeadlocksCount}
              </div>
              <div className="overview-kpi-sub">
                {activeDeadlocksCount > 0 ? 'Detected' : 'All Resolved'}
              </div>
            </div>
          </div>
          <div className="overview-sparkline-wrap">
            <SparklineWave
              color={activeDeadlocksCount > 0 ? '#ef4444' : '#10b981'}
              points={[1, 0, 2, 1, 2, 2, 3, 2, 1, activeDeadlocksCount]}
            />
          </div>
        </div>
      </div>

      {/* Main Section: Live Query Execution (matching image with table and Gantt Chart) */}
      <div className="live-execution-card">
        {/* Header row */}
        <div className="live-execution-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={18} color="#8b5cf6" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Live Query Execution
            </h3>
          </div>

          {/* Sub-tabs */}
          <div className="live-tabs">
            <button
              className={`live-tab-btn ${activeTab === 'processes' ? 'active' : ''}`}
              onClick={() => setActiveTab('processes')}
            >
              Processes
            </button>
            <button
              className={`live-tab-btn ${activeTab === 'gantt' ? 'active' : ''}`}
              onClick={() => setActiveTab('gantt')}
            >
              Gantt Chart
            </button>
            <button
              className={`live-tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              Transactions
            </button>
            <button
              className={`live-tab-btn ${activeTab === 'locks' ? 'active' : ''}`}
              onClick={() => setActiveTab('locks')}
            >
              Locks
            </button>
          </div>

          {/* Pause & Options */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setIsPaused(!isPaused)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                borderColor: isPaused ? '#f59e0b' : 'var(--border-subtle)',
                color: isPaused ? '#f59e0b' : '#94a3b8'
              }}
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: '6px 8px' }}
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            >
              <MoreVertical size={14} />
            </button>

            {showOptionsMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 36,
                  right: 0,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-glow)',
                  borderRadius: 8,
                  padding: 6,
                  zIndex: 20,
                  minWidth: 150,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  fontSize: 11
                }}
              >
                <div
                  style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: 4, color: '#e2e8f0' }}
                  onClick={() => { onNavigate?.('scheduler'); setShowOptionsMenu(false); }}
                >
                  Open OS Scheduler
                </div>
                <div
                  style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: 4, color: '#e2e8f0' }}
                  onClick={() => { onNavigate?.('dbms'); setShowOptionsMenu(false); }}
                >
                  Open DBMS Engine
                </div>
                <div
                  style={{ padding: '6px 10px', cursor: 'pointer', borderRadius: 4, color: '#e2e8f0' }}
                  onClick={() => { onNavigate?.('ai'); setShowOptionsMenu(false); }}
                >
                  Ask AI to Analyze
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'processes' && (
          <div className="live-split-view">
            {/* Left Column: Process Table */}
            <div className="live-table-col">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PID</th>
                    <th>User</th>
                    <th>Query</th>
                    <th>Status</th>
                    <th>CPU %</th>
                    <th>Elapsed Time</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map(proc => (
                    <tr key={proc.pid}>
                      <td style={{ fontFamily: 'JetBrains Mono', color: '#94a3b8', fontSize: 11 }}>
                        {proc.pid}
                      </td>
                      <td style={{ color: '#cbd5e1', fontSize: 11 }}>
                        {proc.user}
                      </td>
                      <td
                        style={{
                          fontFamily: 'JetBrains Mono',
                          fontSize: 11,
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: '#e2e8f0'
                        }}
                        title={proc.query}
                      >
                        {proc.query}
                      </td>
                      <td>
                        <span
                          className={
                            proc.status === 'Running'
                              ? 'badge-status-running'
                              : proc.status === 'Waiting'
                              ? 'badge-status-waiting'
                              : 'badge-status-idle'
                          }
                        >
                          {proc.status}
                        </span>
                      </td>
                      <td>
                        <div className="cpu-progress-cell">
                          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, minWidth: 28, color: '#94a3b8' }}>
                            {proc.cpu}%
                          </span>
                          <div className="cpu-progress-track">
                            <div
                              className="cpu-progress-fill"
                              style={{
                                width: `${proc.cpu}%`,
                                background: proc.cpu > 40 ? '#10b981' : proc.cpu > 20 ? '#3b82f6' : '#64748b'
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#94a3b8' }}>
                        {formatTime(proc.elapsed)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: 14, fontSize: 11, color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Showing 1 to 6 of 128 processes</span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onNavigate && onNavigate('scheduler')}
                  style={{ fontSize: 10, padding: '2px 8px' }}
                >
                  View Scheduler &rarr;
                </button>
              </div>
            </div>

            {/* Right Column: Visual Gantt Chart matching mockup */}
            <div className="live-gantt-col">
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                  Gantt Chart
                </div>

                {/* Timeline Header: 0s, 5s, 10s, 15s, 20s, 25s */}
                <div className="mockup-gantt-timeline-header">
                  <span>0s</span>
                  <span>5s</span>
                  <span>10s</span>
                  <span>15s</span>
                  <span>20s</span>
                  <span>25s</span>
                </div>

                {/* Horizontal Gantt Bars aligned to each PID */}
                <div>
                  {processes.map(proc => {
                    const totalDuration = 25
                    const leftPct = (proc.gantt.start / totalDuration) * 100
                    const widthPct = (proc.gantt.duration / totalDuration) * 100

                    return (
                      <div key={proc.pid} className="mockup-gantt-row">
                        <div className="mockup-gantt-pid">{proc.pid}</div>
                        <div className="mockup-gantt-track">
                          <div
                            className="mockup-gantt-bar-item"
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              background: proc.gantt.color,
                            }}
                            title={`${proc.pid} (${proc.gantt.label})`}
                          >
                            {proc.gantt.label}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Status Legend at bottom */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  fontSize: 11,
                  color: '#94a3b8'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                  <span>Running</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                  <span>Waiting</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4' }} />
                  <span>Idle</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Full Gantt View */}
        {activeTab === 'gantt' && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                Full Execution Timeline
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onNavigate && onNavigate('scheduler')}
              >
                Open Scheduler Simulator
              </button>
            </div>
            <div className="mockup-gantt-timeline-header">
              <span>0s</span><span>5s</span><span>10s</span><span>15s</span><span>20s</span><span>25s</span><span>30s</span>
            </div>
            {processes.map(proc => (
              <div key={proc.pid} className="mockup-gantt-row" style={{ height: 32 }}>
                <div className="mockup-gantt-pid">{proc.pid}</div>
                <div className="mockup-gantt-track" style={{ height: 28 }}>
                  <div
                    className="mockup-gantt-bar-item"
                    style={{
                      left: `${(proc.gantt.start / 30) * 100}%`,
                      width: `${(proc.gantt.duration / 30) * 100}%`,
                      background: proc.gantt.color,
                      fontSize: 11
                    }}
                  >
                    {proc.user} — {proc.gantt.label} ({proc.gantt.duration}s)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Transactions */}
        {activeTab === 'transactions' && (
          <div style={{ padding: 16 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Isolation</th>
                  <th>State</th>
                  <th>Locks Held</th>
                  <th>Statements</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 'TXN-1040', iso: 'REPEATABLE READ', state: 'COMMITTED', locks: 0, stmts: 3, dur: '142ms' },
                  { id: 'TXN-1041', iso: 'REPEATABLE READ', state: 'ACTIVE', locks: 2, stmts: 5, dur: '1.2s' },
                  { id: 'TXN-1042', iso: 'READ COMMITTED', state: 'ACTIVE', locks: 1, stmts: 2, dur: '850ms' },
                  { id: 'TXN-1043', iso: 'SERIALIZABLE', state: 'WAITING', locks: 1, stmts: 1, dur: '2.4s' },
                ].map(t => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'JetBrains Mono', color: '#6366f1', fontWeight: 600 }}>{t.id}</td>
                    <td style={{ fontSize: 11, color: '#94a3b8' }}>{t.iso}</td>
                    <td>
                      <span className={`chip ${t.state === 'COMMITTED' ? 'chip-green' : t.state === 'ACTIVE' ? 'chip-blue' : 'chip-amber'}`}>
                        {t.state}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono' }}>{t.locks}</td>
                    <td style={{ fontFamily: 'JetBrains Mono' }}>{t.stmts}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', color: '#38bdf8' }}>{t.dur}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Locks */}
        {activeTab === 'locks' && (
          <div style={{ padding: 16 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lock ID</th>
                  <th>Transaction</th>
                  <th>Resource Table</th>
                  <th>Type</th>
                  <th>State</th>
                  <th>Mode</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 'L-001', txn: 'TXN-1042', res: 'orders', type: 'SHARED', state: 'GRANTED', mode: 'READ' },
                  { id: 'L-002', txn: 'TXN-1041', res: 'products', type: 'EXCLUSIVE', state: 'GRANTED', mode: 'WRITE' },
                  { id: 'L-003', txn: 'TXN-1043', res: 'orders', type: 'EXCLUSIVE', state: 'WAITING', mode: 'WRITE' },
                ].map(l => (
                  <tr key={l.id}>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{l.id}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', color: '#818cf8' }}>{l.txn}</td>
                    <td style={{ fontFamily: 'JetBrains Mono' }}>{l.res}</td>
                    <td>
                      <span className={`chip ${l.type === 'SHARED' ? 'chip-cyan' : 'chip-purple'}`}>
                        {l.type}
                      </span>
                    </td>
                    <td>
                      <span className={`chip ${l.state === 'GRANTED' ? 'chip-green' : 'chip-amber'}`}>
                        {l.state}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: '#94a3b8' }}>{l.mode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3 Bottom Summary Cards matching the mockup image */}
      <div className="bottom-summary-grid">
        {/* Card 1: Transactions */}
        <div className="bottom-summary-card">
          <div className="bottom-summary-left">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(20, 184, 166, 0.15)',
                color: '#14b8a6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <ArrowLeftRight size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Transactions
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                56
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Active Transactions
              </div>
            </div>
          </div>
          <MiniBarChart color="#14b8a6" heights={[30, 45, 60, 40, 75, 55, 90, 65, 80, 70]} />
        </div>

        {/* Card 2: Locks */}
        <div className="bottom-summary-card">
          <div className="bottom-summary-left">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Lock size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Locks
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                24
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Active Locks
              </div>
            </div>
          </div>
          <MiniBarChart color="#8b5cf6" heights={[40, 50, 70, 60, 85, 45, 95, 80, 60, 75]} />
        </div>

        {/* Card 3: Deadlocks (24h) */}
        <div className="bottom-summary-card">
          <div className="bottom-summary-left">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Deadlocks (24h)
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                7
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Total Deadlocks
              </div>
            </div>
          </div>
          <MiniBarChart color="#ef4444" heights={[20, 15, 30, 25, 60, 40, 80, 50, 70, 90]} />
        </div>
      </div>
    </div>
  )
}

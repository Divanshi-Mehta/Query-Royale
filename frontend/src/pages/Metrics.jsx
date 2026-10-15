import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts'

function generatePoint(prev) {
  return {
    cpu:        Math.max(10, Math.min(95, (prev?.cpu        ?? 60) + (Math.random() * 14 - 7)  | 0)),
    processes:  Math.max(2,  Math.min(20, (prev?.processes  ?? 10) + (Math.random() * 4  - 2)  | 0)),
    txns:       Math.max(0,  Math.min(15, (prev?.txns       ??  6) + (Math.random() * 3  - 1)  | 0)),
    locks:      Math.max(0,  Math.min(10, (prev?.locks      ??  4) + (Math.random() * 3  - 1)  | 0)),
    deadlocks:  Math.max(0,  Math.min(3,  (prev?.deadlocks  ??  1) + (Math.random() < 0.15 ? 1 : (Math.random() < 0.4 ? -1 : 0)))),
  }
}

const INITIAL_HISTORY = Array.from({ length: 12 }, (_, i) => {
  const p = generatePoint()
  return { ...p, t: `T-${12 - i}` }
}).reverse()

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-glow)', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

export default function Metrics() {
  const [history, setHistory] = useState(INITIAL_HISTORY)
  const [live, setLive] = useState(history[history.length - 1])

  useEffect(() => {
    const id = setInterval(() => {
      setHistory(h => {
        const last = h[h.length - 1]
        const next = { ...generatePoint(last), t: `T-0` }
        const updated = h.slice(1).map((item, i) => ({ ...item, t: `T-${h.length - 2 - i}` }))
        setLive(next)
        return [...updated, next]
      })
    }, 2500)
    return () => clearInterval(id)
  }, [])

  const barData = [
    { name: 'FCFS', runs: 14, avgWait: 5.2 },
    { name: 'SJF',  runs: 9,  avgWait: 2.8 },
    { name: 'SRTF', runs: 7,  avgWait: 2.1 },
    { name: 'RR',   runs: 11, avgWait: 4.1 },
    { name: 'PRI',  runs: 6,  avgWait: 3.4 },
  ]

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-h1">System Metrics</h1>
          <p className="page-desc">Live simulation · CPU, processes, transactions, locks &amp; deadlocks</p>
        </div>
        <div className="chip chip-green">● Live Sim</div>
      </div>

      {/* Live metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'CPU',         val: `${live.cpu}%`,        color: 'var(--accent-blue)',   icon: '🖥', pct: live.cpu   },
          { label: 'Processes',   val: live.processes,        color: 'var(--accent-cyan)',   icon: '⚙',  pct: live.processes * 5 },
          { label: 'Waiting',     val: Math.floor(live.processes * 0.3), color: 'var(--accent-amber)', icon: '⏳', pct: 30 },
          { label: 'Transactions',val: live.txns,             color: 'var(--accent-green)',  icon: '🔄', pct: live.txns * 7 },
          { label: 'Deadlocks',   val: live.deadlocks,        color: 'var(--accent-red)',    icon: '💀', pct: live.deadlocks * 33 },
        ].map((m, i) => (
          <div key={m.label} className={`metric-card animate-in animate-delay-${i + 1}`}>
            <div className="metric-icon-wrap" style={{ background: `${m.color}22` }}>
              <span style={{ fontSize: 18 }}>{m.icon}</span>
            </div>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ color: m.color, fontSize: 26 }}>{m.val}</div>
            <div className="mini-bar" style={{ marginTop: 8 }}>
              <div className="mini-bar-fill" style={{ width: `${Math.min(100, m.pct)}%`, background: m.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="metrics-chart-row animate-in animate-delay-2">
        {/* CPU + Processes line chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Live Metrics Feed</div>
            <div className="card-subtitle">Updates every 2.5 seconds · Sample simulation</div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,155,255,0.06)" vertical={false} />
                <XAxis dataKey="t" tick={{ fill: '#4a6080', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4a6080', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-muted)' }} />
                <Line type="monotone" dataKey="cpu"       name="CPU %"       stroke="#4f8ef7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="processes" name="Processes"    stroke="#22d3ee" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="txns"      name="Transactions" stroke="#34d399" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="locks"     name="Locks"        stroke="#a78bfa" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Algorithm performance */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Scheduling Runs</div>
            <div className="card-subtitle">By algorithm · This session</div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,155,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#4a6080', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#4a6080', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-muted)' }} />
                <Bar dataKey="runs" name="Runs" fill="#4f8ef7" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="avgWait" name="Avg Wait (ms)" fill="#6c63ff" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Snapshot table */}
      <div className="card animate-in animate-delay-3" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div className="card-title">Metrics Snapshot</div>
          <div className="chip chip-gray">⚠ Sample</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th><th>CPU %</th><th>Active Procs</th>
                <th>Waiting Procs</th><th>Transactions</th><th>Active Locks</th><th>Deadlocks</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(-6).reverse().map((h, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text-muted)' }}>{h.t}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: h.cpu > 70 ? 'var(--accent-red)' : 'var(--accent-blue)' }}>{h.cpu}%</span>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg-elevated)', overflow: 'hidden', width: 60 }}>
                        <div style={{ width: `${h.cpu}%`, height: '100%', background: h.cpu > 70 ? 'var(--accent-red)' : 'var(--accent-blue)', borderRadius: 2, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono' }}>{h.processes}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-amber)' }}>{Math.floor(h.processes * 0.3)}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-green)' }}>{h.txns}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-purple)' }}>{h.locks}</td>
                  <td><span className={`chip ${h.deadlocks > 0 ? 'chip-red' : 'chip-green'}`}>{h.deadlocks}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

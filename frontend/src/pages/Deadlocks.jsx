import { useState } from 'react'
import { AlertTriangle, CheckCircle2, RotateCcw, Zap, Target, ShieldAlert } from 'lucide-react'

export const INITIAL_DEADLOCKS = [
  {
    id: 'DL-001',
    detected: '23:01:18',
    status: 'Active',
    cycle: ['TXN-1038', 'TXN-1041'],
    victim: 'TXN-1038',
    resolution: 'Pending',
    description: 'TXN-1038 holds exclusive lock on "products", waiting for "orders". TXN-1041 holds lock on "orders", waiting for "products".',
    resources: ['products', 'orders'],
  },
  {
    id: 'DL-002',
    detected: '22:45:03',
    status: 'Resolved',
    cycle: ['TXN-1030', 'TXN-1031', 'TXN-1032'],
    victim: 'TXN-1031',
    resolution: 'Rollback',
    description: 'Three-way deadlock involving inventory, warehouse, and shipments tables.',
    resources: ['inventory', 'warehouse', 'shipments'],
  },
]

const WAIT_FOR_EDGES = [
  { from: 'TXN-1038', to: 'TXN-1041', resource: 'orders' },
  { from: 'TXN-1041', to: 'TXN-1038', resource: 'products' },
]

function WaitForGraph({ edges, victim, isResolved }) {
  const nodes = [...new Set(edges.flatMap(e => [e.from, e.to]))]
  const positions = {
    'TXN-1038': { x: 80, y: 100 },
    'TXN-1041': { x: 280, y: 100 },
  }

  return (
    <svg width="100%" height="200" viewBox="0 0 380 200" style={{ overflow: 'visible' }}>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#f87171" />
        </marker>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Edges */}
      {!isResolved &&
        edges.map((e, i) => {
          const from = positions[e.from]
          const to = positions[e.to]
          if (!from || !to) return null
          const dx = to.x - from.x
          const dy = to.y - from.y
          const len = Math.sqrt(dx * dx + dy * dy)
          const nx = dx / len
          const ny = dy / len
          const r = 36
          const sx = from.x + nx * r
          const sy = from.y + ny * r
          const ex = to.x - nx * r
          const ey = to.y - ny * r

          const offset = i === 0 ? -14 : 14
          const perpX = -ny * offset
          const perpY = nx * offset

          return (
            <g key={i}>
              <line
                x1={sx + perpX}
                y1={sy + perpY}
                x2={ex + perpX}
                y2={ey + perpY}
                stroke="#f87171"
                strokeWidth={2}
                strokeDasharray="5,3"
                markerEnd="url(#arrow)"
                opacity={0.8}
              />
              <text
                x={(sx + ex) / 2 + perpX}
                y={(sy + ey) / 2 + perpY - 5}
                fill="#8ba3c7"
                fontSize={9}
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
              >
                {e.resource}
              </text>
            </g>
          )
        })}

      {/* Nodes */}
      {nodes.map(n => {
        const pos = positions[n]
        if (!pos) return null
        const isVictim = n === victim
        return (
          <g key={n} filter="url(#glow)">
            <circle
              cx={pos.x}
              cy={pos.y}
              r={36}
              fill={
                isResolved && isVictim
                  ? 'rgba(100, 116, 139, 0.15)'
                  : isVictim
                  ? 'rgba(248,113,113,0.15)'
                  : 'rgba(79,142,247,0.15)'
              }
              stroke={isResolved && isVictim ? '#64748b' : isVictim ? '#f87171' : '#4f8ef7'}
              strokeWidth={isVictim ? 2 : 1.5}
            />
            <text
              x={pos.x}
              y={pos.y - 4}
              textAnchor="middle"
              fill={isResolved && isVictim ? '#94a3b8' : isVictim ? '#f87171' : '#4f8ef7'}
              fontSize={9}
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              {n}
            </text>
            {isVictim && (
              <text
                x={pos.x}
                y={pos.y + 12}
                textAnchor="middle"
                fill={isResolved ? '#94a3b8' : '#f87171'}
                fontSize={8}
                fontFamily="sans-serif"
              >
                {isResolved ? '✓ ABORTED' : '✕ VICTIM'}
              </text>
            )}
          </g>
        )
      })}

      <text x="190" y="180" textAnchor="middle" fill={isResolved ? '#10b981' : '#4a6080'} fontSize={10} fontWeight={isResolved ? '700' : '400'}>
        {isResolved ? '✓ Deadlock Cycle Successfully Broken' : 'Wait-For Graph — Cycle Detected'}
      </text>
    </svg>
  )
}

export default function Deadlocks({
  deadlocks: propDeadlocks,
  setDeadlocks: propSetDeadlocks,
}) {
  const [localDeadlocks, setLocalDeadlocks] = useState(INITIAL_DEADLOCKS)
  const deadlocks = propDeadlocks ?? localDeadlocks
  const setDeadlocks = propSetDeadlocks ?? setLocalDeadlocks

  const [selectedId, setSelectedId] = useState(INITIAL_DEADLOCKS[0].id)
  const [resolving, setResolving] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)

  const selected = deadlocks.find(d => d.id === selectedId) || deadlocks[0]
  const activeCount = deadlocks.filter(d => d.status === 'Active').length

  function handleResolve(idToResolve) {
    setResolving(true)
    setTimeout(() => {
      setDeadlocks(prev =>
        prev.map(d =>
          d.id === idToResolve
            ? { ...d, status: 'Resolved', resolution: 'Aborted & Rolled Back' }
            : d
        )
      )
      setResolving(false)
      const victim = deadlocks.find(d => d.id === idToResolve)?.victim || selected?.victim || 'victim'
      setToastMsg(`Deadlock ${idToResolve} successfully resolved! Victim ${victim} was aborted and its locks released.`)
    }, 600)
  }

  function handleReset() {
    setDeadlocks(INITIAL_DEADLOCKS)
    setSelectedId(INITIAL_DEADLOCKS[0].id)
    setToastMsg(null)
  }

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toastMsg && (
        <div
          className="animate-in"
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#34d399',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} />
            <span>{toastMsg}</span>
          </div>
          <button
            onClick={() => setToastMsg(null)}
            style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-h1">Deadlock Detector</h1>
          <p className="page-desc">Cycle detection via Wait-For Graph (WFG) · Victim selection &amp; resolution</p>
        </div>
        <div className={`chip ${activeCount > 0 ? 'chip-red' : 'chip-green'}`}>
          {activeCount > 0 ? `⚠ ${activeCount} Active Deadlock` : '✓ All Deadlocks Resolved'}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="overview-kpi-card">
          <div className="overview-kpi-top">
            <div className="overview-kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="overview-kpi-label">Active Deadlocks</div>
              <div className="overview-kpi-val" style={{ color: activeCount > 0 ? '#ef4444' : '#10b981' }}>
                {activeCount}
              </div>
              <div className="overview-kpi-sub">Unresolved cycles</div>
            </div>
          </div>
        </div>

        <div className="overview-kpi-card">
          <div className="overview-kpi-top">
            <div className="overview-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="overview-kpi-label">Resolved Cycles</div>
              <div className="overview-kpi-val">
                {deadlocks.filter(d => d.status === 'Resolved').length}
              </div>
              <div className="overview-kpi-sub">Session history</div>
            </div>
          </div>
        </div>

        <div className="overview-kpi-card">
          <div className="overview-kpi-top">
            <div className="overview-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <Target size={20} />
            </div>
            <div>
              <div className="overview-kpi-label">Victims Selected</div>
              <div className="overview-kpi-val">
                {deadlocks.length}
              </div>
              <div className="overview-kpi-sub">Min cost algorithm</div>
            </div>
          </div>
        </div>

        <div className="overview-kpi-card">
          <div className="overview-kpi-top">
            <div className="overview-kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="overview-kpi-label">Detection Algorithm</div>
              <div className="overview-kpi-val" style={{ fontSize: 18 }}>DFS Cycle</div>
              <div className="overview-kpi-sub">WFG depth traversal</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Deadlock List & Detail + Resolve Button */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Deadlock list */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Detected Deadlocks Queue</div>
            <div className="chip chip-gray">{deadlocks.length} total</div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {deadlocks.map(dl => {
              const isSelected = selected?.id === dl.id
              const isActive = dl.status === 'Active'
              return (
                <div
                  key={dl.id}
                  onClick={() => setSelectedId(dl.id)}
                  style={{
                    background: isSelected
                      ? isActive
                        ? 'rgba(239, 68, 68, 0.08)'
                        : 'rgba(16, 185, 129, 0.08)'
                      : 'var(--bg-elevated)',
                    border: `1px solid ${
                      isSelected
                        ? isActive
                          ? 'rgba(239, 68, 68, 0.35)'
                          : 'rgba(16, 185, 129, 0.35)'
                        : 'var(--border-subtle)'
                    }`,
                    borderRadius: 10,
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700, color: isActive ? '#ef4444' : '#10b981' }}>
                      {dl.id}
                    </span>
                    <span className={isActive ? 'chip chip-red' : 'chip chip-green'}>
                      {dl.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {dl.cycle.map(t => (
                      <span
                        key={t}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 4,
                          padding: '2px 6px',
                          fontSize: 10,
                          fontFamily: 'JetBrains Mono',
                          color: '#e2e8f0',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    Victim: <span style={{ color: '#f59e0b', fontFamily: 'JetBrains Mono' }}>{dl.victim}</span> · Detected {dl.detected}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected Detail & Action Panel */}
        {selected && (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Deadlock Detail — {selected.id}</div>
                <div className="card-subtitle">Detected at {selected.detected}</div>
              </div>
              <span className={selected.status === 'Active' ? 'chip chip-red' : 'chip chip-green'}>
                {selected.status}
              </span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  background: selected.status === 'Active' ? 'rgba(239, 68, 68, 0.06)' : 'rgba(16, 185, 129, 0.06)',
                  border: `1px solid ${selected.status === 'Active' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 12,
                  color: '#e2e8f0',
                  lineHeight: 1.6,
                }}
              >
                {selected.description}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Cycle Size', val: `${selected.cycle.length} Transactions` },
                  { label: 'Selected Victim', val: selected.victim },
                  { label: 'Resolution Status', val: selected.resolution },
                  { label: 'Contested Resources', val: selected.resources.join(', ') },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' }}>{item.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', marginTop: 3, fontFamily: 'JetBrains Mono' }}>
                      {item.val}
                    </div>
                  </div>
                ))}
              </div>

              {/* Priority 2 Requirement: Resolve Deadlock Button */}
              <div style={{ paddingTop: 8 }}>
                {selected.status === 'Active' ? (
                  <button
                    id="resolve-deadlock-btn-main"
                    className="btn btn-resolve-deadlock"
                    onClick={() => handleResolve(selected.id)}
                    disabled={resolving}
                    style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                  >
                    {resolving ? (
                      <>
                        <span className="spinner" style={{ width: 14, height: 14 }} />
                        Aborting Victim &amp; Releasing Locks…
                      </>
                    ) : (
                      <>
                        <Zap size={15} fill="white" />
                        Resolve Deadlock ({selected.id})
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    className="btn btn-ghost"
                    onClick={handleReset}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <RotateCcw size={13} /> Reset Simulation &amp; Trigger Deadlock
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wait-For Graph SVG visualization */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Wait-For Graph Visualization — {selected?.id}</div>
            <div className="card-subtitle">Topological graph cycle representation</div>
          </div>
          <span className={selected?.status === 'Active' ? 'chip chip-red' : 'chip chip-green'}>
            {selected?.status === 'Active' ? 'Cycle Active' : 'Cycle Broken'}
          </span>
        </div>
        <div className="card-body">
          <div className="wait-for-graph">
            {selected && (
              <WaitForGraph
                edges={WAIT_FOR_EDGES}
                victim={selected.victim}
                isResolved={selected.status === 'Resolved'}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

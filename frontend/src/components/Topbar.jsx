import { useState } from 'react'
import { Bell, Clock, CheckCircle2, AlertTriangle, ShieldCheck, X } from 'lucide-react'

const PAGE_META = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Welcome back, Admin!',
  },
  scheduler: {
    title: 'OS Scheduler',
    subtitle: 'CPU scheduling algorithms, Gantt timeline & execution metrics',
  },
  dbms: {
    title: 'DBMS Engine',
    subtitle: 'Transaction manager, 2PL lock coordinator, deadlock detection & WAL',
  },
  sql: {
    title: 'SQL Query Console',
    subtitle: 'Execute live and simulated SQL queries on Query Royale database',
  },
  locks: {
    title: 'Lock Manager',
    subtitle: 'Shared (S) and Exclusive (X) locks across transactions',
  },
  deadlocks: {
    title: 'Deadlock Detector',
    subtitle: 'Cycle detection via Wait-For Graph and automated resolution',
  },
  ai: {
    title: 'Assistance',
    subtitle: 'Intelligent scheduling diagnostics, query optimization & performance insights',
  },
  metrics: {
    title: 'System Analysis',
    subtitle: 'Real-time telemetry and comparative algorithm benchmarks',
  },
  settings: {
    title: 'Platform Settings',
    subtitle: 'Simulation timing, backend connection parameters & mock data toggles',
  },
}

export default function Topbar({ activePage, onNavigate }) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'deadlock',
      title: 'Deadlock Detected',
      desc: 'Cycle detected between TXN-1038 and TXN-1041 on table orders',
      time: '2m ago',
      icon: AlertTriangle,
      color: '#ef4444',
      targetPage: 'deadlocks',
    },
    {
      id: 2,
      type: 'scheduler',
      title: 'SJF Recommendation Ready',
      desc: 'AI recommends switching scheduler to SJF for a 38% wait time reduction',
      time: '6m ago',
      icon: CheckCircle2,
      color: '#6366f1',
      targetPage: 'ai',
    },
    {
      id: 3,
      type: 'wal',
      title: 'WAL Checkpoint Flushed',
      desc: 'Checkpoint LSN 0x1F45000 successfully written to disk',
      time: '12m ago',
      icon: ShieldCheck,
      color: '#10b981',
      targetPage: 'dbms',
    },
  ])

  const meta = PAGE_META[activePage] || {
    title: 'Query Royale',
    subtitle: 'OS & DBMS Simulation Platform',
  }

  function dismissNotification(e, id) {
    e.stopPropagation()
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <header className="topbar">
      {/* Page Title & Subtitle */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', margin: 0 }}>
          {meta.title}
        </h1>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0 0' }}>
          {meta.subtitle}
        </p>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'var(--transition)',
              position: 'relative',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
              e.currentTarget.style.color = '#ffffff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
              e.currentTarget.style.color = '#94a3b8'
            }}
            title="Notifications"
          >
            <Bell size={17} />
            {notifications.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -3,
                  background: '#6366f1',
                  color: '#ffffff',
                  fontSize: 10,
                  fontWeight: 800,
                  width: 17,
                  height: 17,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 8px rgba(99, 102, 241, 0.6)',
                }}
              >
                {notifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Drawer */}
          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: 46,
                right: 0,
                width: 320,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-glow)',
                borderRadius: 14,
                boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
                zIndex: 100,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: '#f8fafc' }}>
                  Notifications ({notifications.length})
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={() => setNotifications([])}
                    style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 11, cursor: 'pointer' }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                    No unread notifications
                  </div>
                ) : (
                  notifications.map(n => {
                    const Icon = n.icon
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.targetPage) onNavigate(n.targetPage)
                          setShowNotifications(false)
                        }}
                        style={{
                          padding: '12px 14px',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          display: 'flex',
                          gap: 10,
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: `${n.color}18`,
                            color: n.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={14} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>
                            {n.title}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>
                            {n.desc}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                            {n.time}
                          </div>
                        </div>
                        <button
                          onClick={e => dismissNotification(e, n.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            alignSelf: 'flex-start',
                            padding: 2,
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live Status Pill matching image */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 999,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            color: '#f8fafc',
          }}
        >
          <Clock size={14} color="#94a3b8" />
          <span>Live</span>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
              animation: 'pulse 1.8s infinite',
            }}
          />
        </div>
      </div>
    </header>
  )
}

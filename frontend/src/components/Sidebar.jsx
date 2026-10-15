import { useState } from 'react'
import {
  Crown,
  LayoutDashboard,
  FileCode2,
  Cpu,
  Database,
  Lock,
  AlertTriangle,
  Bot,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown
} from 'lucide-react'

export default function Sidebar({
  activePage,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  activeDeadlocksCount = 0
}) {
  const [showUserMenu, setShowUserMenu] = useState(false)

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sql', label: 'SQL Queries', icon: FileCode2 },
    { id: 'scheduler', label: 'OS Scheduler', icon: Cpu },
    { id: 'dbms', label: 'DBMS', icon: Database },
    { id: 'locks', label: 'Locks', icon: Lock },
    {
      id: 'deadlocks',
      label: 'Deadlocks',
      icon: AlertTriangle,
      badge: activeDeadlocksCount > 0 ? String(activeDeadlocksCount) : null
    },
    { id: 'ai', label: 'Assistance', icon: Bot },
    { id: 'metrics', label: 'Analysis', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Top Header Row with Crown and Toggle */}
      <div className="sidebar-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
              flexShrink: 0
            }}
          >
            <Crown size={18} strokeWidth={2.2} />
          </div>
          {!isCollapsed && (
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#ffffff',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }}
            >
              Query Royale
            </span>
          )}
        </div>

        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation List */}
      <div style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              className={`nav-item-mockup ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              title={item.label}
            >
              <span className="nav-icon-wrap" style={{ flexShrink: 0 }}>
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
              {!isCollapsed && (
                <>
                  <span style={{ fontSize: 13, flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span className="nav-badge-pill">{item.badge}</span>
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* User Footer Profile Card */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border-subtle)', position: 'relative' }}>
        <div
          className="user-profile-card"
          onClick={() => setShowUserMenu(!showUserMenu)}
          title="Admin Account"
        >
          <div className="user-avatar-badge">AR</div>
          {!isCollapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
                  Admin
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  admin@queryroyale.com
                </div>
              </div>
              <ChevronDown size={14} color="#64748b" />
            </>
          )}
        </div>

        {/* Small quick popover */}
        {showUserMenu && !isCollapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 10,
              right: 10,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-glow)',
              borderRadius: 10,
              padding: '8px',
              marginBottom: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              zIndex: 30,
              fontSize: 11
            }}
          >
            <div style={{ color: '#94a3b8', padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 4 }}>
              Active Session: Live Demo
            </div>
            <button
              onClick={() => { onNavigate('settings'); setShowUserMenu(false) }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#e2e8f0',
                padding: '6px 8px',
                textAlign: 'left',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Settings size={13} /> Settings &amp; Mock API
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

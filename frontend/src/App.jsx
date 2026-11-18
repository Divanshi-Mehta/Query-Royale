import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Scheduler from './pages/Scheduler'
import DbmsEngine from './pages/DbmsEngine'
import SqlQueries from './pages/SqlQueries'
import Locks from './pages/Locks'
import Deadlocks, { INITIAL_DEADLOCKS } from './pages/Deadlocks'
import AIAssistant from './pages/AIAssistant'
import Metrics from './pages/Metrics'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { Crown, RefreshCw } from 'lucide-react'

const PAGES = {
  dashboard: { label: 'Dashboard', component: Dashboard },
  sql: { label: 'SQL Queries', component: SqlQueries },
  scheduler: { label: 'OS Scheduler', component: Scheduler },
  dbms: { label: 'DBMS', component: DbmsEngine },
  locks: { label: 'Locks', component: Locks },
  deadlocks: { label: 'Deadlocks', component: Deadlocks },
  ai: { label: 'Assistance', component: AIAssistant },
  metrics: { label: 'Analysis', component: Metrics },
  settings: { label: 'Settings', component: Settings },
}

function MainAppShell() {
  const { user, isAuthenticated, isLoading, logout, refreshUser } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [deadlocks, setDeadlocks] = useState(INITIAL_DEADLOCKS)

  // Loading Screen while verifying session
  if (isLoading) {
    return (
      <div className="login-page-container">
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              margin: '0 auto 16px',
              boxShadow: '0 0 24px rgba(99, 102, 241, 0.5)',
            }}
          >
            <Crown size={28} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', color: '#94a3b8' }}>
            <RefreshCw size={18} className="animate-spin" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Verifying secure session...</span>
          </div>
        </div>
      </div>
    )
  }

  // Not authenticated: render Login Page with 2FA support
  if (!isAuthenticated) {
    return <Login />
  }

  const activeDeadlocksCount = deadlocks.filter(d => d.status === 'Active').length
  const PageComponent = PAGES[activePage]?.component ?? Dashboard

  return (
    <div className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        activeDeadlocksCount={activeDeadlocksCount}
        user={user}
        onLogout={logout}
      />
      <div className="main-area">
        <Topbar
          activePage={activePage}
          onNavigate={setActivePage}
          user={user}
          onLogout={logout}
        />
        <main className="page-content">
          <PageComponent
            onNavigate={setActivePage}
            deadlocks={deadlocks}
            setDeadlocks={setDeadlocks}
            activeDeadlocksCount={activeDeadlocksCount}
            user={user}
            onUserUpdated={refreshUser}
          />
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppShell />
    </AuthProvider>
  )
}

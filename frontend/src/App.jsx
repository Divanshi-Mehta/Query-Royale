import { useState } from 'react'
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

export default function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [deadlocks, setDeadlocks] = useState(INITIAL_DEADLOCKS)

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
      />
      <div className="main-area">
        <Topbar activePage={activePage} onNavigate={setActivePage} />
        <main className="page-content">
          <PageComponent
            onNavigate={setActivePage}
            deadlocks={deadlocks}
            setDeadlocks={setDeadlocks}
            activeDeadlocksCount={activeDeadlocksCount}
          />
        </main>
      </div>
    </div>
  )
}

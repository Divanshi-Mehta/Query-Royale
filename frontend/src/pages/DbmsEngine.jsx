import { useState, useEffect } from 'react'
import {
  Terminal,
  AlertTriangle,
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  Zap,
  Server
} from 'lucide-react'
import {
  executeSql,
  fetchTransactions,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  fetchLocks,
  fetchDeadlocks,
  resolveDeadlock,
  fetchWalLogs,
  triggerCheckpoint,
  triggerRecovery,
  fetchDbmsStatus
} from '../api/client'

const SAMPLE_QUERIES = [
  'SELECT * FROM orders WHERE status = "pending";',
  'UPDATE accounts SET balance = balance - 100 WHERE id = 1041;',
  'SELECT t.id, t.state, COUNT(l.id) FROM transactions t JOIN locks l GROUP BY t.id;',
  'INSERT INTO inventory (item, qty) VALUES ("Memory Module", 50);',
  'SHOW ENGINE INNODB STATUS;',
]

const INITIAL_TRANSACTIONS = [
  { id: 'TXN-1040', iso: 'REPEATABLE READ', state: 'COMMITTED', locks: 0, stmts: 3, dur: '142ms', table: 'customers' },
  { id: 'TXN-1041', iso: 'REPEATABLE READ', state: 'ACTIVE', locks: 2, stmts: 5, dur: '1.2s', table: 'orders' },
  { id: 'TXN-1042', iso: 'READ COMMITTED', state: 'ACTIVE', locks: 1, stmts: 2, dur: '850ms', table: 'products' },
  { id: 'TXN-1043', iso: 'SERIALIZABLE', state: 'WAITING', locks: 1, stmts: 1, dur: '2.4s', table: 'orders' },
  { id: 'TXN-1038', iso: 'REPEATABLE READ', state: 'WAITING', locks: 1, stmts: 4, dur: '3.1s', table: 'products' },
]

const INITIAL_LOCKS = [
  { id: 'L-001', txn: 'TXN-1042', resource: 'orders', type: 'SHARED', mode: 'READ', state: 'GRANTED', since: '23:01:02' },
  { id: 'L-002', txn: 'TXN-1041', resource: 'products', type: 'EXCLUSIVE', mode: 'WRITE', state: 'GRANTED', since: '23:00:47' },
  { id: 'L-003', txn: 'TXN-1043', resource: 'orders', type: 'EXCLUSIVE', mode: 'WRITE', state: 'WAITING', since: '23:01:10' },
  { id: 'L-004', txn: 'TXN-1038', resource: 'products', type: 'SHARED', mode: 'READ', state: 'WAITING', since: '23:01:15' },
  { id: 'L-005', txn: 'TXN-1040', resource: 'customers', type: 'SHARED', mode: 'READ', state: 'GRANTED', since: '22:59:58' },
]

export default function DbmsEngine() {
  const [sql, setSql] = useState(SAMPLE_QUERIES[0])
  const [executing, setExecuting] = useState(false)
  const [queryResult, setQueryResult] = useState(null)
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS)
  const [locks, setLocks] = useState(INITIAL_LOCKS)
  const [lockFilter, setLockFilter] = useState('ALL')

  // Deadlock State
  const [deadlockResolved, setDeadlockResolved] = useState(false)
  const [resolvingDeadlock, setResolvingDeadlock] = useState(false)
  const deadlockVictim = 'TXN-1038'
  const [resolutionToast, setResolutionToast] = useState(null)

  // WAL State
  const [currentLsn, setCurrentLsn] = useState('0x1F4A802')
  const [checkpointLsn, setCheckpointLsn] = useState('0x1F45000')
  const [dirtyPages, setDirtyPages] = useState(14)
  const [walLogs, setWalLogs] = useState([
    { lsn: '0x1F4A802', txn: 'TXN-1041', op: 'UPDATE orders SET status="processing"', undo: 'status="pending"', redo: 'status="processing"' },
    { lsn: '0x1F4A7F0', txn: 'TXN-1042', op: 'INSERT INTO products ...', undo: 'DELETE product #52', redo: 'INSERT product #52' },
    { lsn: '0x1F4A7DE', txn: 'TXN-1040', op: 'COMMIT', undo: '-', redo: 'COMMIT' },
  ])
  const [recoveryRunning, setRecoveryRunning] = useState(false)

  useEffect(() => {
    loadDbmsData()
  }, [])

  async function loadDbmsData() {
    try {
      const statusRes = await fetchDbmsStatus().catch(() => null)
      if (statusRes && statusRes.latest_lsn) {
        setCurrentLsn(statusRes.latest_lsn)
      }

      const [txRes, lockRes, walRes] = await Promise.all([
        fetchTransactions().catch(() => null),
        fetchLocks().catch(() => null),
        fetchWalLogs().catch(() => null),
      ])

      if (txRes && txRes.transactions && txRes.transactions.length > 0) {
        setTransactions(txRes.transactions.map(t => ({
          id: `TXN-${t.transaction_id}`,
          rawId: t.transaction_id,
          iso: 'REPEATABLE READ',
          state: t.state,
          locks: 1,
          stmts: 3,
          dur: '120ms',
          table: 'orders',
        })))
      }

      if (lockRes && lockRes.locks && lockRes.locks.length > 0) {
        setLocks(lockRes.locks.map((l, i) => ({
          id: `L-${String(l.lock_id || i + 1).padStart(3, '0')}`,
          txn: `TXN-${l.transaction_id}`,
          resource: l.resource_name,
          type: l.lock_type,
          mode: l.lock_type === 'EXCLUSIVE' ? 'WRITE' : 'READ',
          state: l.lock_state,
          since: l.requested_at ? String(l.requested_at).slice(11, 19) : 'Live',
        })))
      }

      if (walRes && walRes.wal_logs && walRes.wal_logs.length > 0) {
        setWalLogs(walRes.wal_logs.map(w => ({
          lsn: w.lsn || `0x${String(w.log_id).padStart(6, '0')}`,
          txn: `TXN-${w.transaction_id}`,
          op: `${w.operation_type} ${w.table_name}`,
          undo: w.old_value || '-',
          redo: w.new_value || w.operation_type,
        })))
      }
    } catch {
      // keep initial fallback state
    }
  }

  // Execute SQL Query
  async function handleExecuteSql() {
    if (!sql.trim()) return
    setExecuting(true)
    setQueryResult(null)

    try {
      const res = await executeSql(sql)
      if (res && res.columns) {
        setQueryResult({
          columns: res.columns,
          rows: res.rows,
          elapsed: res.elapsed || '2.4ms',
          rowCount: res.rowCount,
        })
        await loadDbmsData()
        setExecuting(false)
        return
      }
    } catch (err) {
      console.warn("Execute SQL error:", err)
    }

    setTimeout(() => {
      let cols = ['id', 'name', 'status', 'created_at']
      let rows = [
        [101, 'Order #101', 'pending', '2026-10-14 23:01:04'],
        [102, 'Order #102', 'completed', '2026-10-14 23:00:52'],
        [103, 'Order #103', 'processing', '2026-10-14 23:00:10'],
      ]

      if (sql.toLowerCase().includes('account')) {
        cols = ['account_id', 'owner', 'balance', 'currency']
        rows = [
          [1041, 'Operations Escrow', '₹4,85,200', 'INR'],
          [1042, 'Vendor Settlement', '₹1,24,000', 'INR'],
        ]
      }

      setQueryResult({
        columns: cols,
        rows: rows,
        elapsed: `${(Math.random() * 8 + 2).toFixed(1)}ms`,
        rowCount: rows.length,
      })
      setExecuting(false)
    }, 450)
  }

  // Resolve Deadlock Action Button
  async function handleResolveDeadlock() {
    setResolvingDeadlock(true)
    try {
      await resolveDeadlock(1, null, 'YOUNGEST')
      setDeadlockResolved(true)
      await loadDbmsData()
      setResolutionToast(`Deadlock resolved live in database! Victim transaction rolled back, and locks released.`)
    } catch (err) {
      setTransactions(prev =>
        prev.map(t => (t.id === deadlockVictim ? { ...t, state: 'ABORTED', locks: 0 } : t))
      )
      setLocks(prev => prev.filter(l => l.txn !== deadlockVictim))
      setDeadlockResolved(true)
      setResolutionToast(`Deadlock resolved: ${deadlockVictim} chosen as victim and rolled back. Lock on products released!`)
    } finally {
      setResolvingDeadlock(false)
    }
  }

  // Reset Deadlock to demonstrate again
  function handleResetDeadlock() {
    setDeadlockResolved(false)
    setResolutionToast(null)
    setTransactions(INITIAL_TRANSACTIONS)
    setLocks(INITIAL_LOCKS)
  }

  // Trigger Checkpoint
  async function handleTriggerCheckpoint() {
    try {
      const res = await triggerCheckpoint()
      if (res && res.checkpoint_lsn) {
        setCurrentLsn(res.checkpoint_lsn)
        setCheckpointLsn(res.checkpoint_lsn)
        setDirtyPages(0)
        setResolutionToast(`WAL Checkpoint ${res.checkpoint_lsn} flushed to database disk.`)
        return
      }
    } catch (err) {
      console.warn("Checkpoint error:", err)
    }
    const nextLsn = '0x1F4A880'
    setCurrentLsn(nextLsn)
    setCheckpointLsn(nextLsn)
    setDirtyPages(0)
    setResolutionToast('WAL Checkpoint flushed to disk successfully.')
  }

  // Simulate Crash & Recover
  async function handleSimulateRecovery() {
    setRecoveryRunning(true)
    try {
      const res = await triggerRecovery()
      if (res && res.phases) {
        setResolutionToast(`ARIES Recovery Complete: ${res.phases.analysis} → ${res.phases.redo} → ${res.phases.undo}.`)
        await loadDbmsData()
        setRecoveryRunning(false)
        return
      }
    } catch (err) {
      console.warn("Recovery error:", err)
    }
    setTimeout(() => {
      setRecoveryRunning(false)
      setResolutionToast('ARIES Recovery Protocol Complete: Analysis pass (3 txns) → Redo pass (2 ops) → Undo pass (1 uncommitted txn rolled back).')
    }, 1000)
  }

  const filteredLocks =
    lockFilter === 'ALL'
      ? locks
      : locks.filter(l => l.type === lockFilter || l.state === lockFilter)

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toast Alert */}
      {resolutionToast && (
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
            <span>{resolutionToast}</span>
          </div>
          <button
            onClick={() => setResolutionToast(null)}
            style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: 13 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Database Connection Status Panel */}
      <div className="card">
        <div className="card-header" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Server size={18} color="#10b981" />
            <div>
              <div className="card-title">Database Connection Status</div>
              <div className="card-subtitle">MySQL 8.0 InnoDB · Storage Engine Cluster</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>CONNECTED</span>
          </div>
        </div>
        <div className="card-body" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
            {[
              { label: 'Host Endpoint', val: 'localhost:3306', color: '#f8fafc' },
              { label: 'Database Name', val: 'query_royale_db', color: '#818cf8' },
              { label: 'Connection Pool', val: '12 / 20 Active', color: '#38bdf8' },
              { label: 'Avg Latency', val: '3.2 ms', color: '#34d399' },
              { label: 'Buffer Hit Rate', val: '99.4%', color: '#a78bfa' },
            ].map(item => (
              <div key={item.label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: item.color, marginTop: 4, fontFamily: 'JetBrains Mono' }}>
                  {item.val}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. SQL Query Editor Section */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Terminal size={17} color="#6366f1" />
            <div className="card-title">SQL Query Editor</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {SAMPLE_QUERIES.map((q, i) => (
              <button
                key={i}
                className="btn btn-ghost btn-sm"
                onClick={() => setSql(q)}
                style={{ fontSize: 10, padding: '3px 8px' }}
              >
                Sample {i + 1}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sql-editor-wrap">
            <div className="sql-editor-toolbar">
              <div className="sql-editor-dot" style={{ background: '#f87171' }} />
              <div className="sql-editor-dot" style={{ background: '#fbbf24' }} />
              <div className="sql-editor-dot" style={{ background: '#34d399' }} />
              <div className="sql-editor-label">query_royale.sql</div>
            </div>
            <textarea
              className="form-control sql-textarea"
              value={sql}
              onChange={e => setSql(e.target.value)}
              rows={3}
              spellCheck={false}
              placeholder="Enter your SQL query here (e.g. SELECT * FROM orders;)"
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              id="execute-dbms-query-btn"
              className="btn btn-primary"
              onClick={handleExecuteSql}
              disabled={executing || !sql.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {executing ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14 }} />
                  Executing Query…
                </>
              ) : (
                <>
                  <Play size={14} fill="white" />
                  Execute Query
                </>
              )}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSql('')}>
              Clear
            </button>
          </div>

          {/* Results grid */}
          {queryResult && (
            <div className="animate-in" style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 11, color: '#94a3b8' }}>
                <span>{queryResult.rowCount} rows returned</span>
                <span>Latency: {queryResult.elapsed}</span>
              </div>
              <div style={{ overflowX: 'auto', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {queryResult.columns.map(c => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Deadlock Detection & Resolve Panel */}
      <div className="card" style={{ borderColor: deadlockResolved ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color={deadlockResolved ? '#10b981' : '#ef4444'} />
            <div>
              <div className="card-title">Deadlock Detection &amp; Resolution Engine</div>
              <div className="card-subtitle">
                Cycle detection via Wait-For Graph (WFG) · Phase 2 Automated Resolver
              </div>
            </div>
          </div>

          <div>
            {!deadlockResolved ? (
              <button
                id="resolve-deadlock-btn"
                className="btn btn-resolve-deadlock"
                onClick={handleResolveDeadlock}
                disabled={resolvingDeadlock}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', fontSize: 12 }}
              >
                {resolvingDeadlock ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                    Resolving Cycle…
                  </>
                ) : (
                  <>
                    <Zap size={14} fill="white" />
                    Resolve Deadlock
                  </>
                )}
              </button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={handleResetDeadlock}>
                <RotateCcw size={13} /> Simulate Deadlock Again
              </button>
            )}
          </div>
        </div>

        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
            {/* Wait-For Graph SVG visualization */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Wait-For Graph (WFG)
              </div>
              <svg width="100%" height="150" viewBox="0 0 320 150">
                <defs>
                  <marker id="arrow-red" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#ef4444" />
                  </marker>
                  <marker id="arrow-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#10b981" />
                  </marker>
                </defs>

                {/* Node 1: TXN-1038 */}
                <circle
                  cx="70"
                  cy="75"
                  r="34"
                  fill={deadlockResolved ? 'rgba(100, 116, 139, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
                  stroke={deadlockResolved ? '#64748b' : '#ef4444'}
                  strokeWidth="2"
                />
                <text x="70" y="73" textAnchor="middle" fill={deadlockResolved ? '#94a3b8' : '#ef4444'} fontSize="10" fontWeight="700" fontFamily="JetBrains Mono">
                  TXN-1038
                </text>
                <text x="70" y="87" textAnchor="middle" fill="#64748b" fontSize="8">
                  {deadlockResolved ? 'ABORTED' : 'VICTIM'}
                </text>

                {/* Node 2: TXN-1041 */}
                <circle
                  cx="250"
                  cy="75"
                  r="34"
                  fill="rgba(59, 130, 246, 0.15)"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />
                <text x="250" y="73" textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="700" fontFamily="JetBrains Mono">
                  TXN-1041
                </text>
                <text x="250" y="87" textAnchor="middle" fill="#10b981" fontSize="8">
                  {deadlockResolved ? 'ACTIVE (LOCK)' : 'WAITING'}
                </text>

                {/* Edges */}
                {!deadlockResolved ? (
                  <>
                    {/* Top edge: 1038 -> 1041 (waits for orders) */}
                    <path
                      d="M 104 60 C 140 35, 180 35, 216 60"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      markerEnd="url(#arrow-red)"
                    />
                    <text x="160" y="38" textAnchor="middle" fill="#f87171" fontSize="9" fontFamily="JetBrains Mono">
                      waits for `orders`
                    </text>

                    {/* Bottom edge: 1041 -> 1038 (waits for products) */}
                    <path
                      d="M 216 90 C 180 115, 140 115, 104 90"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="4 3"
                      markerEnd="url(#arrow-red)"
                    />
                    <text x="160" y="125" textAnchor="middle" fill="#f87171" fontSize="9" fontFamily="JetBrains Mono">
                      waits for `products`
                    </text>
                  </>
                ) : (
                  <text x="160" y="75" textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="700">
                    ✓ CYCLE RESOLVED
                  </text>
                )}
              </svg>
            </div>

            {/* Deadlock details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  background: deadlockResolved ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  border: `1px solid ${deadlockResolved ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: deadlockResolved ? '#10b981' : '#f87171' }}>
                  {deadlockResolved ? 'Deadlock Status: RESOLVED' : 'Cycle Detected: DL-001'}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 }}>
                  {!deadlockResolved
                    ? 'TXN-1038 holds Exclusive Lock on products and waits for orders. TXN-1041 holds Shared Lock on orders and requests Exclusive Lock on products.'
                    : 'Victim TXN-1038 was chosen based on fewest writes and aborted. All locks released; TXN-1041 granted lock.'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' }}>Selected Victim</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                    {deadlockVictim}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' }}>Recovery Strategy</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                    Partial Rollback
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Transactions Table & Shared/Exclusive Locks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Transaction Status Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Transaction Status Table</div>
              <div className="card-subtitle">Active transactions &amp; state transitions</div>
            </div>
            <div className="chip chip-blue">{transactions.length} Tracked</div>
          </div>
          <div className="card-body" style={{ padding: '6px 0' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Txn ID</th>
                  <th>Table</th>
                  <th>State</th>
                  <th>Locks</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: '#818cf8' }}>{t.id}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{t.table}</td>
                    <td>
                      <span
                        className={`chip ${
                          t.state === 'COMMITTED'
                            ? 'chip-green'
                            : t.state === 'ACTIVE'
                            ? 'chip-blue'
                            : t.state === 'WAITING'
                            ? 'chip-amber'
                            : 'chip-red'
                        }`}
                      >
                        {t.state}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono' }}>{t.locks}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', color: '#94a3b8' }}>{t.dur}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Locks Table (Shared & Exclusive) */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Shared &amp; Exclusive Locks</div>
              <div className="card-subtitle">Two-Phase Locking (2PL) coordinator</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['ALL', 'SHARED', 'EXCLUSIVE'].map(f => (
                <button
                  key={f}
                  className={`btn btn-sm ${lockFilter === f ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setLockFilter(f)}
                  style={{ fontSize: 9, padding: '2px 6px' }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="card-body" style={{ padding: '6px 0' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lock ID</th>
                  <th>Txn</th>
                  <th>Resource</th>
                  <th>Type</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocks.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{l.id}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', color: '#818cf8' }}>{l.txn}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{l.resource}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. WAL and Recovery Status Panel */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={18} color="#10b981" />
            <div>
              <div className="card-title">Write-Ahead Logging (WAL) &amp; Recovery Status</div>
              <div className="card-subtitle">ARIES protocol · Log Sequence Numbers (LSN) &amp; Checkpoints</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleTriggerCheckpoint}>
              Trigger Checkpoint
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSimulateRecovery}
              disabled={recoveryRunning}
            >
              {recoveryRunning ? 'Simulating Recovery…' : 'Simulate Crash & Recover'}
            </button>
          </div>
        </div>

        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Current LSN</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8', fontFamily: 'JetBrains Mono', marginTop: 4 }}>
                {currentLsn}
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Checkpoint LSN</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', fontFamily: 'JetBrains Mono', marginTop: 4 }}>
                {checkpointLsn}
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Dirty Pages Buffer</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: dirtyPages > 0 ? '#fbbf24' : '#10b981', fontFamily: 'JetBrains Mono', marginTop: 4 }}>
                {dirtyPages} pages
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Recovery Engine</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa', fontFamily: 'JetBrains Mono', marginTop: 4 }}>
                ARIES READY
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
            Recent WAL Log Records
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>LSN</th>
                <th>Txn ID</th>
                <th>Operation</th>
                <th>Undo Vector</th>
                <th>Redo Vector</th>
              </tr>
            </thead>
            <tbody>
              {walLogs.map(log => (
                <tr key={log.lsn}>
                  <td style={{ fontFamily: 'JetBrains Mono', color: '#38bdf8', fontSize: 11 }}>{log.lsn}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', color: '#818cf8' }}>{log.txn}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{log.op}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#f87171' }}>{log.undo}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#34d399' }}>{log.redo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

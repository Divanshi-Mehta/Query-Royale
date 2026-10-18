import { useState, useEffect } from 'react'
import {
  Lock,
  Unlock,
  Plus,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Database
} from 'lucide-react'
import {
  fetchLocks,
  fetchTransactions,
  acquireLock,
  releaseLock,
  beginTransaction
} from '../api/client'

const TXN_CHIP = {
  COMMITTED: 'chip-green',
  ACTIVE:    'chip-blue',
  WAITING:   'chip-amber',
  DEADLOCK:  'chip-red',
  ABORTED:   'chip-red',
  ROLLEDBACK:'chip-red',
}

const LOCK_CHIP = {
  GRANTED: 'chip-green',
  WAITING: 'chip-amber',
  RELEASED:'chip-gray',
}

const TYPE_CHIP = {
  SHARED:    'chip-cyan',
  EXCLUSIVE: 'chip-purple',
}

export default function Locks() {
  const [locks, setLocks] = useState([])
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState(null)

  // Quick Acquire Form
  const [targetTxnId, setTargetTxnId] = useState('')
  const [targetResource, setTargetResource] = useState('orders')
  const [targetType, setTargetType] = useState('EXCLUSIVE')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [lockRes, txRes] = await Promise.all([
        fetchLocks().catch(() => null),
        fetchTransactions(50).catch(() => null),
      ])

      if (lockRes && lockRes.locks) {
        setLocks(lockRes.locks)
        setIsLive(true)
      }
      if (txRes && txRes.transactions) {
        setTransactions(txRes.transactions)
        if (!targetTxnId && txRes.transactions.length > 0) {
          const active = txRes.transactions.find(t => t.state === 'ACTIVE')
          setTargetTxnId(active ? active.transaction_id : txRes.transactions[0].transaction_id)
        }
      }
    } catch (err) {
      console.warn('Failed loading locks data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAcquire(e) {
    e.preventDefault()
    if (!targetTxnId) {
      setFeedbackMsg({ type: 'error', text: 'Please start or select an active transaction first.' })
      return
    }

    setSubmitting(true)
    try {
      const res = await acquireLock(Number(targetTxnId), targetResource, targetType)
      setFeedbackMsg({ type: 'success', text: res.message || 'Lock acquired successfully!' })
      await loadData()
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to acquire lock.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRelease(txnId, resourceName) {
    try {
      const res = await releaseLock(txnId, resourceName)
      setFeedbackMsg({ type: 'success', text: res.message || 'Lock released successfully!' })
      await loadData()
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to release lock.' })
    }
  }

  async function handleStartTxn() {
    try {
      const res = await beginTransaction(1, 'ACTIVE')
      setFeedbackMsg({ type: 'success', text: res.message || 'Started new transaction!' })
      await loadData()
      if (res.transaction_id) {
        setTargetTxnId(res.transaction_id)
      }
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to begin transaction.' })
    }
  }

  const filtered = filter === 'ALL'
    ? locks
    : locks.filter(l => (l.lock_state || l.state) === filter)

  const granted = locks.filter(l => (l.lock_state || l.state) === 'GRANTED').length
  const waiting = locks.filter(l => (l.lock_state || l.state) === 'WAITING').length

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="page-header">
        <div>
          <h1 className="page-h1">2PL Lock Coordinator</h1>
          <p className="page-desc">Strict Two-Phase Locking (2PL) · Shared (S) and Exclusive (X) locks on database resources</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className={`chip ${isLive ? 'chip-green' : 'chip-amber'}`}>
            {isLive ? '● Live Backend Database' : '⚠ Connecting to Backend…'}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={loadData}
            title="Refresh locks"
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className="animate-in"
          style={{
            background: feedbackMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${feedbackMsg.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            borderRadius: 10,
            padding: '10px 16px',
            color: feedbackMsg.type === 'error' ? '#f87171' : '#34d399',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Locks',     val: locks.length, color: 'var(--accent-blue)',   icon: '🔒' },
          { label: 'Granted',         val: granted,       color: 'var(--accent-green)',  icon: '✅' },
          { label: 'Waiting (Blocked)', val: waiting,     color: 'var(--accent-amber)',  icon: '⏳' },
          { label: 'Transactions',    val: transactions.length, color: 'var(--accent-cyan)', icon: '🔄' },
        ].map((s, i) => (
          <div key={s.label} className={`metric-card animate-in animate-delay-${i + 1}`}>
            <div className="metric-icon-wrap" style={{ background: `${s.color}22` }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
            </div>
            <div className="metric-label">{s.label}</div>
            <div className="metric-value" style={{ color: s.color, fontSize: 28 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Interactive Acquire Lock Panel */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock size={16} color="#6366f1" />
            <div style={{ fontWeight: 700, fontSize: 13, color: '#f8fafc' }}>
              Acquire Live Lock on Table
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleStartTxn}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}
          >
            <Plus size={13} />
            <span>Begin New Transaction</span>
          </button>
        </div>

        <form onSubmit={handleAcquire} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: 12, alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Transaction
            </label>
            <select
              className="form-control"
              value={targetTxnId}
              onChange={e => setTargetTxnId(e.target.value)}
              style={{ fontSize: 12 }}
            >
              {transactions.length === 0 ? (
                <option value="">No transactions (Click Begin New)</option>
              ) : (
                transactions.map(t => (
                  <option key={t.transaction_id} value={t.transaction_id}>
                    TXN-{t.transaction_id} ({t.state})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Resource Table
            </label>
            <select
              className="form-control"
              value={targetResource}
              onChange={e => setTargetResource(e.target.value)}
              style={{ fontSize: 12 }}
            >
              <option value="orders">orders</option>
              <option value="products">products</option>
              <option value="accounts">accounts</option>
              <option value="queries">queries</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Lock Type
            </label>
            <select
              className="form-control"
              value={targetType}
              onChange={e => setTargetType(e.target.value)}
              style={{ fontSize: 12 }}
            >
              <option value="EXCLUSIVE">EXCLUSIVE (Write Lock - X)</option>
              <option value="SHARED">SHARED (Read Lock - S)</option>
            </select>
          </div>

          <div style={{ paddingTop: 18 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              <Lock size={13} />
              <span>{submitting ? 'Acquiring…' : 'Acquire Lock'}</span>
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Lock Table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Live Lock Table</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['ALL', 'GRANTED', 'WAITING'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '4px 10px', fontSize: 10 }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lock ID</th>
                  <th>Transaction</th>
                  <th>Resource</th>
                  <th>Type</th>
                  <th>State</th>
                  <th>Requested Since</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                      No {filter !== 'ALL' ? filter.toLowerCase() : ''} locks currently held in the database.
                    </td>
                  </tr>
                ) : (
                  filtered.map(lock => {
                    const lockId = lock.lock_id ?? lock.id
                    const txnId = lock.transaction_id ?? lock.txn
                    const resource = lock.resource_name ?? lock.resource
                    const type = lock.lock_type ?? lock.type
                    const state = lock.lock_state ?? lock.state
                    const since = lock.requested_at ?? lock.since

                    return (
                      <tr key={lockId} className={state === 'WAITING' ? 'lock-row-waiting' : 'lock-row-granted'}>
                        <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>#{lockId}</td>
                        <td>
                          <span className="chip chip-indigo" style={{ fontSize: 10 }}>
                            {typeof txnId === 'number' ? `TXN-${txnId}` : txnId}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{resource}</td>
                        <td>
                          <span className={`chip ${TYPE_CHIP[type] || 'chip-gray'}`}>{type}</span>
                        </td>
                        <td>
                          <span className={`chip ${LOCK_CHIP[state] || 'chip-gray'}`}>{state}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                          {typeof since === 'string' && since.includes('T') ? since.split('T')[1].slice(0, 8) : (since || 'Just now')}
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleRelease(typeof txnId === 'number' ? txnId : parseInt(txnId.replace(/\D/g, '')), resource)}
                            title="Release this lock"
                            style={{ fontSize: 10, padding: '2px 8px', color: '#f87171' }}
                          >
                            <Unlock size={11} style={{ marginRight: 4 }} />
                            Release
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transaction Panel */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Live Transactions</div>
            <div className="chip chip-gray">{transactions.length} total</div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 16px', maxHeight: 420, overflowY: 'auto' }}>
            {transactions.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 11 }}>
                No recorded transactions.
              </div>
            ) : (
              transactions.map(t => (
                <div key={t.transaction_id} style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  border: '1px solid var(--border-subtle)',
                  transition: 'var(--transition)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                      TXN-{t.transaction_id}
                    </span>
                    <span className={`chip ${TXN_CHIP[t.state] || 'chip-gray'}`}>{t.state}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 10, color: 'var(--text-muted)' }}>
                    <span>⚙ PID: {t.process_id}</span>
                    <span>⏰ {typeof t.start_time === 'string' && t.start_time.includes('T') ? t.start_time.split('T')[1].slice(0, 8) : (t.start_time || 'Recent')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

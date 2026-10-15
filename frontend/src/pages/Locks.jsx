import { useState } from 'react'

const INITIAL_LOCKS = [
  { id: 1, txn: 'TXN-1042', resource: 'orders',      type: 'SHARED',    state: 'GRANTED', since: '23:01:02', mode: 'READ'  },
  { id: 2, txn: 'TXN-1041', resource: 'products',    type: 'EXCLUSIVE', state: 'GRANTED', since: '23:00:47', mode: 'WRITE' },
  { id: 3, txn: 'TXN-1043', resource: 'orders',      type: 'EXCLUSIVE', state: 'WAITING', since: '23:01:10', mode: 'WRITE' },
  { id: 4, txn: 'TXN-1044', resource: 'products',    type: 'SHARED',    state: 'WAITING', since: '23:01:15', mode: 'READ'  },
  { id: 5, txn: 'TXN-1040', resource: 'customers',   type: 'SHARED',    state: 'GRANTED', since: '22:59:58', mode: 'READ'  },
  { id: 6, txn: 'TXN-1045', resource: 'inventory',   type: 'EXCLUSIVE', state: 'GRANTED', since: '23:00:05', mode: 'WRITE' },
]

const TRANSACTIONS = [
  { id: 'TXN-1040', state: 'COMMITTED', locks: 1, started: '22:59:50', ops: 3 },
  { id: 'TXN-1041', state: 'ACTIVE',    locks: 1, started: '23:00:40', ops: 5 },
  { id: 'TXN-1042', state: 'ACTIVE',    locks: 1, started: '23:00:55', ops: 2 },
  { id: 'TXN-1043', state: 'WAITING',   locks: 0, started: '23:01:08', ops: 1 },
  { id: 'TXN-1044', state: 'WAITING',   locks: 0, started: '23:01:13', ops: 1 },
  { id: 'TXN-1045', state: 'ACTIVE',    locks: 1, started: '23:00:00', ops: 4 },
]

const TXN_CHIP = {
  COMMITTED: 'chip-green',
  ACTIVE:    'chip-blue',
  WAITING:   'chip-amber',
  ABORTED:   'chip-red',
  ROLLBACK:  'chip-red',
}

const LOCK_CHIP = {
  GRANTED: 'chip-green',
  WAITING: 'chip-amber',
}

const TYPE_CHIP = {
  SHARED:    'chip-cyan',
  EXCLUSIVE: 'chip-purple',
}

export default function Locks() {
  const [locks] = useState(INITIAL_LOCKS)
  const [filter, setFilter] = useState('ALL')

  const filtered = filter === 'ALL' ? locks : locks.filter(l => l.state === filter)

  const granted = locks.filter(l => l.state === 'GRANTED').length
  const waiting = locks.filter(l => l.state === 'WAITING').length

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-h1">Lock Manager</h1>
          <p className="page-desc">Active &amp; waiting locks across all transactions · Sample data</p>
        </div>
        <div className="chip chip-amber">⚠ Sample Data</div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Locks',     val: locks.length, color: 'var(--accent-blue)',   icon: '🔒' },
          { label: 'Granted',         val: granted,       color: 'var(--accent-green)',  icon: '✅' },
          { label: 'Waiting',         val: waiting,       color: 'var(--accent-amber)',  icon: '⏳' },
          { label: 'Transactions',    val: TRANSACTIONS.length, color: 'var(--accent-cyan)', icon: '🔄' },
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Lock Table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Lock Table</div>
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
                  <th>Lock ID</th><th>Transaction</th><th>Resource</th>
                  <th>Type</th><th>Mode</th><th>State</th><th>Since</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lock => (
                  <tr key={lock.id} className={lock.state === 'WAITING' ? 'lock-row-waiting' : 'lock-row-granted'}>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>L-{lock.id.toString().padStart(4, '0')}</td>
                    <td><span className="chip chip-indigo" style={{ background: 'rgba(108,99,255,0.15)', color: 'var(--accent-indigo)', border: '1px solid rgba(108,99,255,0.3)', fontSize: 10 }}>{lock.txn}</span></td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11 }}>{lock.resource}</td>
                    <td><span className={`chip ${TYPE_CHIP[lock.type]}`}>{lock.type}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{lock.mode}</td>
                    <td><span className={`chip ${LOCK_CHIP[lock.state]}`}>{lock.state}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{lock.since}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transaction Panel */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Transactions</div>
            <div className="chip chip-gray">{TRANSACTIONS.length} total</div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 16px' }}>
            {TRANSACTIONS.map(t => (
              <div key={t.id} style={{
                background: 'var(--bg-elevated)',
                borderRadius: 8,
                padding: '10px 14px',
                border: '1px solid var(--border-subtle)',
                transition: 'var(--transition)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{t.id}</span>
                  <span className={`chip ${TXN_CHIP[t.state]}`}>{t.state}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 10, color: 'var(--text-muted)' }}>
                  <span>🔒 {t.locks} lock{t.locks !== 1 ? 's' : ''}</span>
                  <span>📋 {t.ops} ops</span>
                  <span>⏰ {t.started}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'

const SAMPLE_HISTORY = [
  { id: 1, sql: 'SELECT * FROM orders WHERE status = "pending"',    status: 'Completed', rows: 12, time: '8ms',   ts: '23:01:04' },
  { id: 2, sql: 'UPDATE products SET stock = stock - 1 WHERE id=5', status: 'Completed', rows: 1,  time: '3ms',   ts: '23:00:52' },
  { id: 3, sql: 'BEGIN TRANSACTION',                                  status: 'Completed', rows: 0,  time: '1ms',   ts: '23:00:48' },
  { id: 4, sql: 'SELECT COUNT(*) FROM transactions WHERE state="ACTIVE"', status: 'Completed', rows: 1, time: '5ms', ts: '22:59:33' },
  { id: 5, sql: 'DELETE FROM locks WHERE transaction_id = 1038',    status: 'Failed',    rows: 0,  time: '2ms',   ts: '22:59:12' },
]

const CHIP_MAP = {
  Completed: 'chip-green',
  Running:   'chip-blue',
  Submitted: 'chip-amber',
  Failed:    'chip-red',
}

const SAMPLE_QUERIES = [
  'SELECT * FROM orders WHERE status = "pending"',
  'SELECT p.pid, p.state, s.algorithm FROM processes p JOIN scheduling_results s ON p.id = s.process_id',
  'SELECT t.id, t.state, COUNT(l.id) as lock_count FROM transactions t LEFT JOIN locks l ON t.id = l.transaction_id GROUP BY t.id',
  'SHOW TABLES',
  'DESCRIBE system_metrics',
]

export default function SqlQueries() {
  const [sql, setSql]             = useState(SAMPLE_QUERIES[0])
  const [status, setStatus]       = useState(null)
  const [rows, setRows]           = useState(null)
  const [history, setHistory]     = useState(SAMPLE_HISTORY)
  const [executing, setExecuting] = useState(false)

  function handleExecute() {
    if (!sql.trim()) return
    setExecuting(true)
    setStatus('Running')
    setRows(null)

    setTimeout(() => {
      const isFail = sql.toLowerCase().includes('delete') || sql.toLowerCase().includes('drop')
      const newEntry = {
        id: Date.now(),
        sql: sql.length > 60 ? sql.slice(0, 60) + '…' : sql,
        status: isFail ? 'Failed' : 'Completed',
        rows: isFail ? 0 : Math.floor(Math.random() * 20) + 1,
        time: `${Math.floor(Math.random() * 20) + 2}ms`,
        ts: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }
      setHistory(h => [newEntry, ...h].slice(0, 10))
      setStatus(isFail ? 'Failed' : 'Completed')

      if (!isFail) {
        // Generate sample result rows
        setRows(generateSampleRows(sql))
      }
      setExecuting(false)
    }, 800)
  }

  function generateSampleRows(query) {
    if (query.toLowerCase().includes('orders')) {
      return {
        columns: ['id', 'customer', 'status', 'amount', 'created_at'],
        data: [
          [1001, 'Alice Kumar',  'pending', '₹4,500', '2026-10-14 22:58'],
          [1002, 'Bob Sharma',   'pending', '₹1,200', '2026-10-14 22:59'],
          [1003, 'Carol Singh',  'pending', '₹8,750', '2026-10-14 23:00'],
        ],
      }
    }
    if (query.toLowerCase().includes('transaction')) {
      return {
        columns: ['id', 'state', 'lock_count'],
        data: [
          [1040, 'COMMITTED', 0],
          [1041, 'ACTIVE',    2],
          [1042, 'ACTIVE',    1],
        ],
      }
    }
    return {
      columns: ['id', 'name', 'value'],
      data: Array.from({ length: 4 }, (_, i) => [i + 1, `Row ${i + 1}`, Math.random().toFixed(3)]),
    }
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-h1">SQL Query Engine</h1>
          <p className="page-desc">Execute queries against the MySQL DBMS backend · Sample results shown</p>
        </div>
        <div className="chip chip-amber">⚠ Sample Data</div>
      </div>

      {/* Editor + quick-pick */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, marginBottom: 20 }}>
        {/* SQL Editor */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Query Editor</div>
            {status && (
              <span className={`chip ${CHIP_MAP[status]}`}>{status}</span>
            )}
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Fake code-editor chrome */}
            <div className="sql-editor-wrap">
              <div className="sql-editor-toolbar">
                <div className="sql-editor-dot" style={{ background: '#f87171' }} />
                <div className="sql-editor-dot" style={{ background: '#fbbf24' }} />
                <div className="sql-editor-dot" style={{ background: '#34d399' }} />
                <div className="sql-editor-label">query.sql</div>
              </div>
              <textarea
                id="sql-textarea"
                className="form-control sql-textarea"
                value={sql}
                onChange={e => setSql(e.target.value)}
                rows={5}
                spellCheck={false}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                id="execute-query-btn"
                className="btn btn-primary"
                onClick={handleExecute}
                disabled={executing || !sql.trim()}
              >
                {executing
                  ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Executing…</>
                  : '▶  Execute Query'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSql(''); setStatus(null); setRows(null) }}>
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Quick pick */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Sample Queries</div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SAMPLE_QUERIES.map((q, i) => (
              <button
                key={i}
                onClick={() => { setSql(q); setStatus(null); setRows(null) }}
                style={{
                  background: sql === q ? 'rgba(79,142,247,0.12)' : 'var(--bg-elevated)',
                  border: `1px solid ${sql === q ? 'rgba(79,142,247,0.3)' : 'transparent'}`,
                  borderRadius: 6,
                  color: sql === q ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  padding: '7px 10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  lineHeight: 1.4,
                  transition: 'var(--transition)',
                }}
              >
                {q.length > 55 ? q.slice(0, 55) + '…' : q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {rows && (
        <div className="card animate-in" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Query Results</div>
              <div className="card-subtitle">{rows.data.length} rows returned · Sample data</div>
            </div>
            <span className="chip chip-green">Completed</span>
          </div>
          <div className="card-body" style={{ overflowX: 'auto', padding: '12px 16px' }}>
            <table className="data-table">
              <thead>
                <tr>{rows.columns.map(c => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {rows.data.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>{String(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Execution History */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Execution History</div>
          <div className="chip chip-gray">Last {history.length} queries</div>
        </div>
        <div className="card-body" style={{ padding: '4px 0' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th><th>Query</th><th>Status</th><th>Rows</th><th>Time</th><th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id}>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>#{h.id}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.sql}</td>
                  <td><span className={`chip ${CHIP_MAP[h.status]}`}>{h.status}</span></td>
                  <td style={{ fontFamily: 'JetBrains Mono' }}>{h.rows}</td>
                  <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-cyan)' }}>{h.time}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{h.ts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

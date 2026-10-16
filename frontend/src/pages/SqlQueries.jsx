import { useState, useEffect } from 'react'
import { executeSql, fetchSqlHistory } from '../api/client'

const CHIP_MAP = {
  Completed: 'chip-green',
  Running:   'chip-blue',
  Submitted: 'chip-amber',
  Failed:    'chip-red',
}

const SAMPLE_QUERIES = [
  'SELECT * FROM orders WHERE status = "pending"',
  'SELECT * FROM products ORDER BY stock DESC',
  'SELECT * FROM accounts',
  'SELECT query_id, query_text, scheduling_algorithm, status FROM queries ORDER BY query_id DESC LIMIT 10',
  'SELECT * FROM system_metrics ORDER BY metric_id DESC LIMIT 5',
  'INSERT INTO orders (customer, status, amount) VALUES ("Dev User", "pending", 3999.00)',
]

export default function SqlQueries() {
  const [sql, setSql]             = useState(SAMPLE_QUERIES[0])
  const [status, setStatus]       = useState(null)
  const [rows, setRows]           = useState(null)
  const [history, setHistory]     = useState([])
  const [executing, setExecuting] = useState(false)
  const [executionTime, setExecutionTime] = useState(null)
  const [isLive, setIsLive]       = useState(false)

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    try {
      const res = await fetchSqlHistory()
      if (res && res.history && res.history.length > 0) {
        setHistory(res.history)
        setIsLive(true)
      }
    } catch {
      // Backend not running yet or no history
    }
  }

  async function handleExecute() {
    if (!sql.trim()) return
    setExecuting(true)
    setStatus('Running')
    setRows(null)
    setExecutionTime(null)

    try {
      const result = await executeSql(sql)
      setIsLive(true)
      setStatus(result.status)
      setExecutionTime(result.elapsed)

      setRows({
        columns: result.columns || [],
        data: result.rows || [],
        rowCount: result.rowCount,
        elapsed: result.elapsed,
      })

      // Reload live history
      await loadHistory()
    } catch (err) {
      setStatus('Failed')
      setRows({
        columns: ['error'],
        data: [[err.message]],
        rowCount: 0,
      })
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-h1">SQL Query Engine</h1>
          <p className="page-desc">Execute queries against the live database backend</p>
        </div>
        <div className={`chip ${isLive ? 'chip-green' : 'chip-amber'}`}>
          {isLive ? '● Live Backend Connected' : '⚠ Connecting to Backend…'}
        </div>
      </div>

      {/* Editor + quick-pick */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, marginBottom: 20 }}>
        {/* SQL Editor */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Query Editor</div>
            {status && (
              <span className={`chip ${CHIP_MAP[status] || 'chip-gray'}`}>{status}</span>
            )}
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                  ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Executing on DB…</>
                  : '▶  Execute Query'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSql(''); setStatus(null); setRows(null) }}>
                Clear
              </button>
              {executionTime && (
                <span style={{ fontSize: 12, color: 'var(--accent-cyan)', fontFamily: 'JetBrains Mono' }}>
                  ⚡ Executed in {executionTime}
                </span>
              )}
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
              <div className="card-title">Live Query Results</div>
              <div className="card-subtitle">
                {rows.data.length} row(s) returned {rows.elapsed ? `in ${rows.elapsed}` : ''}
              </div>
            </div>
            <span className={`chip ${status === 'Completed' ? 'chip-green' : 'chip-red'}`}>
              {status}
            </span>
          </div>
          <div className="card-body" style={{ overflowX: 'auto', padding: '12px 16px' }}>
            {rows.data.length === 0 ? (
              <div style={{ padding: '20px 0', color: 'var(--text-muted)', textAlign: 'center' }}>
                Query executed successfully. 0 rows returned.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>{rows.columns.map(c => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.data.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}>
                          {cell === null ? <span style={{ color: 'var(--text-muted)' }}>NULL</span> : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
          {history.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No queries executed yet. Run a query above to record live history.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Query</th><th>Status</th><th>Time</th><th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>#{h.id}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11, maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.sql}
                    </td>
                    <td><span className={`chip ${CHIP_MAP[h.status] || 'chip-gray'}`}>{h.status}</span></td>
                    <td style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-cyan)' }}>{h.time || '2ms'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{h.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

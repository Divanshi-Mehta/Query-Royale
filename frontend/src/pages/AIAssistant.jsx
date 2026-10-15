import { useState, useRef, useEffect } from 'react'
import {
  Bot,
  Send,
  Zap,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Copy,
  Activity,
  Cpu,
  Database
} from 'lucide-react'

const SUGGESTIONS = [
  'Analyze my system',
  'Optimize CPU scheduling',
  'Explain slow query SELECT * FROM orders',
  'Check for deadlock vulnerabilities',
  'Summarize system health',
]

const INITIAL_MESSAGES = [
  {
    id: 1,
    sender: 'assistant',
    text: `Hello Admin! I am the **Query Royale Assistance**. I monitor your OS scheduling queues, DBMS Two-Phase Locks, query execution plans, and transaction deadlocks in real-time.

Click any suggestion below or ask me to diagnose your engine.`,
    time: '23:02',
    actions: null,
  },
]

let msgCounter = 100

function getFormattedTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function AIAssistant({ onNavigate }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [simulateError, setSimulateError] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(false)

  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function handleSend(textToSend) {
    const query = textToSend || input
    if (!query.trim()) return

    const userMsg = {
      id: ++msgCounter,
      sender: 'user',
      text: query,
      time: getFormattedTime(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Multi-step loading thought simulation
    setLoadingStep('Inspecting CPU process queues...')
    setTimeout(() => {
      setLoadingStep('Evaluating 2PL lock dependency graph...')
    }, 450)
    setTimeout(() => {
      setLoadingStep('Generating optimization synthesis...')
    }, 900)

    setTimeout(() => {
      if (simulateError) {
        setMessages(prev => [
          ...prev,
          {
            id: ++msgCounter,
            sender: 'assistant',
            isError: true,
            text: '⚠️ **AI Inference Error**: Unable to reach backend model endpoint `http://localhost:8000/api/ai/diagnose`. The mock engine fallback encountered a simulation timeout.',
            time: getFormattedTime(),
            actions: 'retry',
          },
        ])
        setLoading(false)
        return
      }

      let reply = ''
      let actionType = null

      const qLower = query.toLowerCase()
      if (qLower.includes('analyze') || qLower.includes('system') || qLower.includes('health')) {
        reply = `### 📊 System Health Diagnostic Report

**Overall Status: Optimal (Score: 88/100)**
- **OS Engine:** 6 active processes currently scheduled. CPU utilization is steady at **32%**.
- **DBMS Contention:** 5 active transactions holding **5 locks**. 1 deadlock cycle resolved on table \`orders\`.
- **WAL & Recovery:** LSN sequence stable at \`0x1F4A802\`. Zero uncheckpointed crash risks.

**Key Finding:** CPU scheduling can be improved by replacing FCFS with SJF to minimize wait time for short queries.`
        actionType = 'scheduling'
      } else if (qLower.includes('scheduling') || qLower.includes('cpu')) {
        reply = `### ⚡ CPU Scheduling Optimization Recommendation

Current workload has high burst variance (PID 10239 takes 75s, whereas PID 10238 takes only 2s).

- **Current Algorithm:** First-Come, First-Served (FCFS)
- **Observed Avg Waiting Time:** \`4.20 ms\`
- **Projected with SJF:** \`2.60 ms\` (**-38.1% waiting time**)
- **Projected with Round Robin (Q=3ms):** \`3.10 ms\` (**-26.2% waiting time**)

Recommendation: Switch to **SJF (Shortest Job First)** to prevent head-of-line blocking by batch jobs.`
        actionType = 'apply_sjf'
      } else if (qLower.includes('orders') || qLower.includes('slow query') || qLower.includes('explain')) {
        reply = `### 💡 Slow Query Analysis: \`SELECT * FROM orders\`

**Execution Plan Analysis:**
\`\`\`sql
EXPLAIN SELECT * FROM orders WHERE status = "pending";
-- Filter: (orders.status = 'pending') (cost=1420.50 rows=128400)
-- Full Table Scan on orders
\`\`\`

**Root Cause:**
No index on column \`status\`. The database engine scans all 128,400 rows sequentially.

**Suggested Optimization:**
\`\`\`sql
CREATE INDEX idx_orders_status ON orders(status, created_at);
\`\`\`
**Expected Benefit:** Index Range Scan instead of Full Table Scan. Query latency drops from **142ms &rarr; 4ms** (~97% faster).`
        actionType = 'copy_sql'
      } else if (qLower.includes('deadlock')) {
        reply = `### 🛡️ Deadlock Risk & Cycle Assessment

**Detected Pattern:** 
Circular wait between \`TXN-1038\` and \`TXN-1041\` competing for resources \`orders\` and \`products\`.

**Remediation Applied:**
- Selected \`TXN-1038\` as victim (fewest log entries modified).
- Rolled back and released exclusive lock on table \`products\`.

**Prevention Best Practice:**
Enforce strict resource ordering protocol: always acquire locks in alphanumeric order (\`orders\` before \`products\`) across all transaction handlers.`
        actionType = 'deadlock_info'
      } else {
        reply = `I evaluated your request: **"${query}"**.

All engine metrics appear healthy:
- OS Queue: 6 processes ready.
- DBMS Locks: 24 active locks granted.
- Deadlock Detection: 0 active cycles in Wait-For Graph.

You can ask me to **"Analyze my system"**, **"Optimize CPU scheduling"**, or **"Explain slow query"** for deeper diagnostics.`
      }

      setMessages(prev => [
        ...prev,
        {
          id: ++msgCounter,
          sender: 'assistant',
          text: reply,
          time: getFormattedTime(),
          actionType: actionType,
        },
      ])
      setLoading(false)
    }, 1200)
  }

  function copyIndexSql() {
    navigator.clipboard?.writeText('CREATE INDEX idx_orders_status ON orders(status, created_at);')
    setCopiedIndex(true)
    setTimeout(() => setCopiedIndex(false), 2000)
  }

  return (
    <div className="animate-in ai-chat-container">
      {/* Left Chat Main Window */}
      <div className="ai-chat-main">
        {/* Chat Header */}
        <div className="ai-chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Bot size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                Assistance
                <span className="chip chip-purple" style={{ fontSize: 9 }}>Diagnostic</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Assistance for OS scheduling, DBMS locking &amp; query optimization
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className={`btn btn-sm ${simulateError ? 'btn-danger' : 'btn-ghost'}`}
              onClick={() => setSimulateError(!simulateError)}
              title="Toggle error state simulation for testing UI resilience"
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              <AlertTriangle size={12} />
              {simulateError ? 'Error Mode: ON' : 'Test Error State'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setMessages(INITIAL_MESSAGES)}
              title="Reset Chat"
              style={{ padding: '4px 8px' }}
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="ai-messages-scroll">
          {messages.map(msg => {
            const isUser = msg.sender === 'user'
            return (
              <div
                key={msg.id}
                className={`ai-msg-bubble ${isUser ? 'ai-msg-user' : 'ai-msg-assistant'}`}
              >
                {!isUser && (
                  <div className="ai-msg-avatar" style={{ background: msg.isError ? '#ef4444' : '#6366f1', color: 'white' }}>
                    {msg.isError ? <AlertTriangle size={16} /> : <Bot size={16} />}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div
                    className="ai-msg-content"
                    style={{
                      background: msg.isError ? 'rgba(239, 68, 68, 0.12)' : undefined,
                      border: msg.isError ? '1px solid rgba(239, 68, 68, 0.3)' : undefined,
                      color: msg.isError ? '#fca5a5' : undefined,
                    }}
                  >
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {msg.text}
                    </div>

                    {/* Action buttons inside assistant messages */}
                    {msg.actionType === 'apply_sjf' && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onNavigate && onNavigate('scheduler')}
                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <Zap size={13} fill="white" />
                          Apply SJF to OS Scheduler
                        </button>
                      </div>
                    )}

                    {msg.actionType === 'copy_sql' && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={copyIndexSql}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8' }}
                        >
                          <Copy size={13} />
                          {copiedIndex ? 'Copied Index DDL!' : 'Copy CREATE INDEX DDL'}
                        </button>
                      </div>
                    )}

                    {msg.actions === 'retry' && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleSend('Analyze my system')}
                        >
                          <RefreshCw size={12} /> Retry Inference
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
                    {msg.time}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Loading State Animation */}
          {loading && (
            <div className="ai-msg-bubble ai-msg-assistant animate-in">
              <div className="ai-msg-avatar" style={{ background: '#6366f1', color: 'white' }}>
                <Bot size={16} />
              </div>
              <div className="ai-msg-content" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="spinner" style={{ width: 14, height: 14 }} />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {loadingStep || 'Assistance is thinking…'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="ai-prompt-pills-row">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              className="ai-prompt-pill"
              onClick={() => handleSend(s)}
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          className="ai-input-form"
          onSubmit={e => {
            e.preventDefault()
            handleSend(input)
          }}
        >
          <input
            id="ai-prompt-input"
            className="ai-input-box"
            placeholder="Ask AI: e.g. Analyze my system, Optimize CPU scheduling..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            id="ai-send-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading || !input.trim()}
            style={{ padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Send size={15} />
          </button>
        </form>
      </div>

      {/* Right Diagnostics Insight Cards */}
      <div className="ai-side-panel">
        {/* Card 1: System Performance Summary */}
        <div className="card ai-card-glow">
          <div className="card-header" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} color="#6366f1" />
              <div className="card-title">System Performance Summary</div>
            </div>
            <span className="chip chip-green">88 / 100</span>
          </div>
          <div className="card-body" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: '#94a3b8' }}>CPU Efficiency</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>84% Optimal</span>
              </div>
              <div className="mini-bar">
                <div className="mini-bar-fill" style={{ width: '84%', background: '#10b981' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: '#94a3b8' }}>Lock Contention</span>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>Low (1 Cycle)</span>
              </div>
              <div className="mini-bar">
                <div className="mini-bar-fill" style={{ width: '25%', background: '#f59e0b' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: '#94a3b8' }}>Buffer Cache Hit Ratio</span>
                <span style={{ color: '#3b82f6', fontWeight: 600 }}>99.4%</span>
              </div>
              <div className="mini-bar">
                <div className="mini-bar-fill" style={{ width: '99%', background: '#3b82f6' }} />
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5, marginTop: 4 }}>
              System running smoothly. Minor scheduling variance observed due to unindexed queries.
            </div>
          </div>
        </div>

        {/* Card 2: Suggestions for Improving Scheduling */}
        <div className="card">
          <div className="card-header" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={16} color="#10b981" />
              <div className="card-title">Scheduling Suggestion</div>
            </div>
            <span className="chip chip-blue">-38% Wait</span>
          </div>
          <div className="card-body" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#f8fafc', fontWeight: 600 }}>
              Switch FCFS &rarr; SJF
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
              Current process burst distribution has high variance (std dev: 3.4ms). SJF will prioritize short queries, dropping average waiting time from 4.2ms to 2.6ms.
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigate && onNavigate('scheduler')}
              style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
            >
              Open OS Scheduler &rarr;
            </button>
          </div>
        </div>

        {/* Card 3: Query Explanation / Optimization */}
        <div className="card">
          <div className="card-header" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={16} color="#38bdf8" />
              <div className="card-title">Query Optimization</div>
            </div>
            <span className="chip chip-cyan">97% Speedup</span>
          </div>
          <div className="card-body" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono', color: '#f8fafc', background: 'var(--bg-elevated)', padding: '6px 8px', borderRadius: 6 }}>
              SELECT * FROM orders WHERE status = "pending"
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
              Full Table Scan detected on 128,400 rows. Adding a composite index on <code style={{ color: '#38bdf8' }}>(status, created_at)</code> reduces latency from 142ms to 4ms.
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onNavigate && onNavigate('dbms')}
              style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
            >
              Test in SQL Console &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

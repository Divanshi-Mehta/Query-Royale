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
import { sendAiChatMessage } from '../api/client'

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
  const [lastAnalysis, setLastAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [simulateError, setSimulateError] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(false)

  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(textToSend) {
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

    setLoadingStep('Analyzing live OS and DBMS data...')

    try {
      const res = await sendAiChatMessage(query)
      if (res && res.reply) {
        setLastAnalysis({
          intent: res.intent,
          timestamp: res.timestamp,
          dataSource: res.data_source,
        })
        const qLower = query.toLowerCase()
        let actionType = null
        if (qLower.includes('schedul') || qLower.includes('cpu')) actionType = 'apply_sjf'
        else if (qLower.includes('slow') || qLower.includes('orders') || qLower.includes('query')) actionType = 'copy_sql'
        else if (qLower.includes('deadlock')) actionType = 'deadlock_info'

        setMessages(prev => [
          ...prev,
          {
            id: ++msgCounter,
            sender: 'assistant',
            text: res.reply,
            time: getFormattedTime(),
            actionType,
          },
        ])
        setLoading(false)
        return
      }

    } catch (err) {
      console.error('AI backend request failed:', err)

      setMessages(prev => [
        ...prev,
        {
          id: ++msgCounter,
          sender: 'assistant',
          isError: true,
          text: `Unable to get a response from the backend. Please check that the FastAPI server is running on port 8001.\n\nError: ${err.message || 'Request failed'}`,
          time: getFormattedTime(),
        },
      ])
    } finally {
      setLoading(false)
      setLoadingStep('')
    }
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
        <div className="card ai-card-glow">
          <div className="card-header" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} color="#6366f1" />
              <div className="card-title">Live Analysis Status</div>
            </div>
            <span className="chip chip-green">
              {lastAnalysis ? 'Connected' : 'Ready'}
            </span>
          </div>

          <div className="card-body" style={{
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Latest analysis
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                {lastAnalysis
                  ? lastAnalysis.intent.replaceAll('_', ' ')
                  : 'No analysis yet'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Data source
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {lastAnalysis?.dataSource || 'Waiting for backend response'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Last successful response
              </div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {lastAnalysis?.timestamp
                  ? new Date(lastAnalysis.timestamp).toLocaleString()
                  : 'No response received yet'}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={16} color="#10b981" />
              <div className="card-title">Available Diagnostics</div>
            </div>
          </div>

          <div className="card-body" style={{
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>CPU Scheduling</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Review recorded processes and get a rule-based scheduling recommendation.
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleSend('Recommend a CPU scheduling algorithm')}
                disabled={loading}
                style={{ marginTop: 8 }}
              >
                Analyze scheduling
              </button>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Locks and Deadlocks</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Inspect reported locks, waiting requests, and recorded deadlock pairs.
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleSend('Check for deadlocks')}
                disabled={loading}
                style={{ marginTop: 8 }}
              >
                Check deadlocks
              </button>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Query History</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Review recent logged queries. Actual execution plans and timings must be measured separately.
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleSend('Show recent queries and help diagnose a slow query')}
                disabled={loading}
                style={{ marginTop: 8 }}
              >
                Review queries
              </button>
            </div>
          </div>
        </div>
      </div>


    </div>
  )
}

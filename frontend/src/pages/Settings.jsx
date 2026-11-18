<<<<<<< HEAD
import { useState, useEffect } from 'react'
=======
import { useState } from 'react'
>>>>>>> d2d547e (feat: add login page with two-factor authentication (2FA) and backend integration)
import {
  Server,
  CheckCircle2,
  RotateCcw,
<<<<<<< HEAD
  RefreshCw,
  Database,
  Trash2,
  Activity,
  Layers
} from 'lucide-react'
import {
  checkBackendHealth,
  fetchTablesStatus,
  resetDatabase,
  getCustomBackendUrl,
  setCustomBackendUrl
} from '../api/client'

export default function Settings() {
  const [backendUrl, setBackendUrl] = useState(getCustomBackendUrl() || 'http://localhost:8001')
  const [healthInfo, setHealthInfo] = useState(null)
  const [tablesInfo, setTablesInfo] = useState(null)
  const [testing, setTesting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    setTesting(true)
    try {
      const [h, t] = await Promise.all([
        checkBackendHealth().catch(() => null),
        fetchTablesStatus().catch(() => null),
      ])
      setHealthInfo(h)
      setTablesInfo(t)
    } catch {
      setHealthInfo(null)
    } finally {
      setTesting(false)
    }
  }
=======
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Copy,
  Check,
  Lock,
  RefreshCw,
  AlertCircle,
  QrCode,
  UserCheck,
} from 'lucide-react'
import {
  initiate2FASetup,
  confirm2FASetup,
  disable2FA,
  regenerateBackupCodes,
} from '../services/auth'

export default function Settings({ user, onUserUpdated }) {
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000')
  const [mockMode, setMockMode] = useState(true)
  const [telemetryInterval, setTelemetryInterval] = useState(1500)
  const [dbName, setDbName] = useState('query_royale')
  const [saved, setSaved] = useState(false)
>>>>>>> d2d547e (feat: add login page with two-factor authentication (2FA) and backend integration)

  // 2FA Management states
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false)
  const [setupData, setSetupData] = useState(null)
  const [verifyCodeInput, setVerifyCodeInput] = useState('')
  const [disablePasswordInput, setDisablePasswordInput] = useState('')
  const [isDisabling2FA, setIsDisabling2FA] = useState(false)

  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedBackups, setCopiedBackups] = useState(false)
  const [twoFAMessage, setTwoFAMessage] = useState('')
  const [twoFAError, setTwoFAError] = useState('')
  const [isSubmitting2FA, setIsSubmitting2FA] = useState(false)

  const is2FAActive = Boolean(user?.is_2fa_enabled)

  function handleSave(e) {
    e.preventDefault()
    setCustomBackendUrl(backendUrl === 'http://localhost:8001' ? '' : backendUrl)
    setToast({ type: 'success', msg: 'Configuration saved! Checking connection…' })
    checkConnection()
    setTimeout(() => setToast(null), 3000)
  }

  async function handleResetDb() {
    if (!window.confirm('Are you sure you want to clear active locks and deadlocks in the database?')) return
    setResetting(true)
    try {
      const res = await resetDatabase()
      setToast({ type: 'success', msg: res.message || 'Database reset successfully!' })
      await checkConnection()
    } catch (err) {
      setToast({ type: 'error', msg: `Reset failed: ${err.message}` })
    } finally {
      setResetting(false)
    }
  }

  // Start 2FA Setup Flow
  async function handleStart2FASetup() {
    setTwoFAError('')
    setTwoFAMessage('')
    setIsSubmitting2FA(true)

    try {
      const data = await initiate2FASetup()
      setSetupData(data)
      setIsSettingUp2FA(true)
    } catch (err) {
      setTwoFAError(err.message || 'Failed to start 2FA setup.')
    } finally {
      setIsSubmitting2FA(false)
    }
  }

  // Confirm 2FA Setup Flow
  async function handleConfirm2FASetup(e) {
    e.preventDefault()
    if (!verifyCodeInput.trim() || verifyCodeInput.trim().length !== 6) {
      setTwoFAError('Please enter a valid 6-digit confirmation code.')
      return
    }

    setIsSubmitting2FA(true)
    setTwoFAError('')

    try {
      await confirm2FASetup(
        setupData.secret,
        verifyCodeInput.trim(),
        setupData.backup_codes
      )
      setTwoFAMessage('Two-Factor Authentication is now active on your account!')
      setIsSettingUp2FA(false)
      setSetupData(null)
      setVerifyCodeInput('')
      onUserUpdated && onUserUpdated()
    } catch (err) {
      setTwoFAError(err.message || 'Invalid 6-digit code. Please try again.')
    } finally {
      setIsSubmitting2FA(false)
    }
  }

  // Disable 2FA Flow
  async function handleDisable2FA(e) {
    e.preventDefault()
    if (!disablePasswordInput) {
      setTwoFAError('Password is required to disable 2FA.')
      return
    }

    setIsSubmitting2FA(true)
    setTwoFAError('')

    try {
      await disable2FA(disablePasswordInput)
      setTwoFAMessage('Two-Factor Authentication has been successfully disabled.')
      setIsDisabling2FA(false)
      setDisablePasswordInput('')
      onUserUpdated && onUserUpdated()
    } catch (err) {
      setTwoFAError(err.message || 'Failed to disable 2FA.')
    } finally {
      setIsSubmitting2FA(false)
    }
  }

  // Regenerate Backup Codes
  async function handleRegenerateBackups() {
    setIsSubmitting2FA(true)
    setTwoFAError('')
    try {
      const res = await regenerateBackupCodes()
      setSetupData(prev => ({
        ...(prev || {}),
        backup_codes: res.backup_codes,
      }))
      setTwoFAMessage('New emergency backup codes generated! Save them securely.')
    } catch (err) {
      setTwoFAError(err.message || 'Failed to regenerate backup codes.')
    } finally {
      setIsSubmitting2FA(false)
    }
  }

  function copyText(text, type) {
    navigator.clipboard.writeText(text)
    if (type === 'key') {
      setCopiedKey(true)
      setTimeout(() => setCopiedKey(false), 2000)
    } else {
      setCopiedBackups(true)
      setTimeout(() => setCopiedBackups(false), 2000)
    }
  }

  return (
<<<<<<< HEAD
    <div className="animate-in" style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && (
=======
    <div
      className="animate-in"
      style={{
        maxWidth: 820,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {saved && (
>>>>>>> d2d547e (feat: add login page with two-factor authentication (2FA) and backend integration)
        <div
          className="animate-in"
          style={{
            background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${toast.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            borderRadius: 10,
            padding: '12px 16px',
            color: toast.type === 'error' ? '#f87171' : '#34d399',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toast.msg}</span>
        </div>
      )}

<<<<<<< HEAD
      {/* Backend & DB Health Card */}
=======
      {/* USER PROFILE & AUTH CARD */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserCheck size={18} color="#22d3ee" />
            <div>
              <div className="card-title">User Account &amp; Authentication</div>
              <div className="card-subtitle">Active authenticated user session details</div>
            </div>
          </div>
          <span className="chip chip-blue">{user?.role ? user.role.toUpperCase() : 'USER'}</span>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div style={{ background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Username</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginTop: 4 }}>
              {user?.username || 'admin'}
            </div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>Email Address</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginTop: 4 }}>
              {user?.email || 'admin@queryroyale.com'}
            </div>
          </div>
          <div style={{ background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: 10 }}>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>2FA Security Status</div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: is2FAActive ? '#34d399' : '#fbbf24',
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {is2FAActive ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
              {is2FAActive ? '2FA Active (TOTP)' : '2FA Disabled'}
            </div>
          </div>
        </div>
      </div>

      {/* TWO-FACTOR AUTHENTICATION (2FA) MANAGEMENT CARD */}
      <div className="card" style={{ borderColor: is2FAActive ? 'rgba(34, 211, 238, 0.3)' : 'var(--border-subtle)' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={18} color="#22d3ee" />
            <div>
              <div className="card-title">Two-Factor Authentication (2FA)</div>
              <div className="card-subtitle">
                Enhance account security using standard RFC 6238 Time-based One-Time Passwords (TOTP)
              </div>
            </div>
          </div>
          <span
            className={`chip ${is2FAActive ? 'chip-green' : 'chip-amber'}`}
            style={{ fontWeight: 700 }}
          >
            {is2FAActive ? 'ENFORCED' : 'OFF'}
          </span>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {twoFAError && (
            <div className="login-alert login-alert-error" style={{ margin: 0 }}>
              <AlertCircle size={18} />
              <span>{twoFAError}</span>
            </div>
          )}

          {twoFAMessage && (
            <div className="login-alert login-alert-success" style={{ margin: 0 }}>
              <CheckCircle2 size={18} />
              <span>{twoFAMessage}</span>
            </div>
          )}

          {/* 2FA Current Status Overview */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: 'var(--bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                {is2FAActive
                  ? 'Two-Factor Authentication is currently active'
                  : 'Two-Factor Authentication is currently disabled'}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                {is2FAActive
                  ? 'Your account requires both your password and a 6-digit authenticator code on each sign in.'
                  : 'Protect your Query Royale account by requiring an authenticator app code on login.'}
              </div>
            </div>

            <div>
              {is2FAActive ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleRegenerateBackups}
                    disabled={isSubmitting2FA}
                  >
                    Regenerate Backups
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      setIsDisabling2FA(!isDisabling2FA)
                      setIsSettingUp2FA(false)
                    }}
                  >
                    Disable 2FA
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleStart2FASetup}
                  disabled={isSubmitting2FA}
                >
                  <ShieldCheck size={16} /> Enable 2FA Now
                </button>
              )}
            </div>
          </div>

          {/* WIZARD: ENABLE 2FA FLOW */}
          {isSettingUp2FA && setupData && (
            <div
              className="animate-in"
              style={{
                padding: '16px',
                borderRadius: 12,
                border: '1px solid var(--border-glow)',
                background: 'rgba(34, 211, 238, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#22d3ee', fontWeight: 700, fontSize: 14 }}>
                <QrCode size={18} />
                <span>Step 1: Scan QR Code with Authenticator App</span>
              </div>

              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                {setupData.qr_svg && (
                  <div
                    style={{
                      width: 160,
                      height: 160,
                      borderRadius: 10,
                      padding: 8,
                      background: '#ffffff',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    }}
                    dangerouslySetInnerHTML={{ __html: setupData.qr_svg }}
                  />
                )}

                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                    Or enter this secret key manually into Google Authenticator or Microsoft Authenticator:
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--bg-elevated)',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <code style={{ fontSize: 13, color: '#22d3ee', letterSpacing: '0.08em', flex: 1, fontFamily: 'monospace' }}>
                      {setupData.secret}
                    </code>
                    <button
                      type="button"
                      className="btn-copy-small"
                      onClick={() => copyText(setupData.secret, 'key')}
                    >
                      {copiedKey ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                      <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                    Compatible with Google Authenticator, Authy, Apple Keychain, 1Password, Bitwarden, etc.
                  </div>
                </div>
              </div>

              {/* Emergency Backup Codes */}
              {setupData.backup_codes && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc' }}>
                      Step 2: Save Emergency Recovery Codes
                    </span>
                    <button
                      type="button"
                      className="btn-copy-small"
                      onClick={() => copyText(setupData.backup_codes.join('\n'), 'backup')}
                    >
                      {copiedBackups ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                      <span>{copiedBackups ? 'Copied All' : 'Copy Codes'}</span>
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {setupData.backup_codes.map((code, idx) => (
                      <span key={idx} className="backup-code-pill">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Enter 6-digit confirmation code */}
              <form onSubmit={handleConfirm2FASetup} style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label className="form-label">
                  Step 3: Enter the 6-digit code from your app to activate:
                </label>
                <div style={{ display: 'flex', gap: 10, maxWidth: 360 }}>
                  <input
                    type="text"
                    maxLength={6}
                    inputMode="numeric"
                    className="form-control"
                    placeholder="000000"
                    value={verifyCodeInput}
                    onChange={e => setVerifyCodeInput(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting2FA}
                  >
                    {isSubmitting2FA ? <RefreshCw size={14} className="animate-spin" /> : 'Activate 2FA'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setIsSettingUp2FA(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* DISABLE 2FA CONFIRMATION PROMPT */}
          {isDisabling2FA && (
            <form
              onSubmit={handleDisable2FA}
              className="animate-in"
              style={{
                padding: '16px',
                borderRadius: 10,
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>
                Confirm Password to Disable Two-Factor Authentication
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                Disabling 2FA makes your account less secure. Please enter your account password to confirm:
              </div>
              <div style={{ display: 'flex', gap: 10, maxWidth: 400 }}>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter your account password"
                  value={disablePasswordInput}
                  onChange={e => setDisablePasswordInput(e.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={isSubmitting2FA}
                >
                  {isSubmitting2FA ? <RefreshCw size={14} className="animate-spin" /> : 'Disable'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsDisabling2FA(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* BACKEND API CONFIGURATION */}
>>>>>>> d2d547e (feat: add login page with two-factor authentication (2FA) and backend integration)
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Server size={18} color="#6366f1" />
            <div>
              <div className="card-title">Live Backend &amp; Database Telemetry</div>
              <div className="card-subtitle">Real-time status of FastAPI service and storage engine</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={checkConnection}
            disabled={testing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}
          >
            <RefreshCw size={13} className={testing ? 'spin' : ''} />
            <span>{testing ? 'Testing…' : 'Ping Server'}</span>
          </button>
        </div>

        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>FastAPI Backend</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: healthInfo?.status === 'healthy' ? '#10b981' : '#f59e0b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthInfo?.status === 'healthy' ? '#10b981' : '#f59e0b' }} />
                <span>{healthInfo?.status === 'healthy' ? 'Operational' : 'Disconnected'}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Port: 8001 / Vite Proxy</div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Database Engine</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Database size={16} />
                <span>{(healthInfo?.database || tablesInfo?.db_type || 'SQLITE').toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                {healthInfo?.database === 'mysql' ? 'Active MySQL Service' : 'Built-in Seamless SQLite'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Maintenance</div>
              <div style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleResetDb}
                  disabled={resetting}
                  style={{ color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', width: '100%', justifyContent: 'center' }}
                >
                  <Trash2 size={12} style={{ marginRight: 6 }} />
                  {resetting ? 'Resetting…' : 'Clear Locks / Deadlocks'}
                </button>
              </div>
            </div>
          </div>

          {/* Database Tables Summary */}
          {tablesInfo && tablesInfo.tables && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                Database Tables &amp; Record Counts
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {Object.entries(tablesInfo.tables).map(([tbl, cnt]) => (
                  <div key={tbl} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#818cf8', fontWeight: 600 }}>{tbl}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>{cnt} rows</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backend API Configuration */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={18} color="#6366f1" />
            <div>
              <div className="card-title">Backend API Endpoint Configuration</div>
              <div className="card-subtitle">Connect to a local or remote FastAPI instance</div>
            </div>
          </div>
        </div>

        <form className="card-body" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">FastAPI Backend URL</label>
            <input
              type="text"
              className="form-control"
              value={backendUrl}
              onChange={e => setBackendUrl(e.target.value)}
              placeholder="http://localhost:8001"
            />
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Leave as <code>http://localhost:8001</code> or blank to use standard Vite dev server proxying.
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">
              Save Configuration
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setBackendUrl('http://localhost:8001')
                setCustomBackendUrl('')
                checkConnection()
              }}
            >
              <RotateCcw size={13} /> Reset Defaults
            </button>
          </div>
        </form>
      </div>

      {/* Architecture Spec */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Architecture Specification</div>
          <span className="chip chip-blue">System Blueprint</span>
        </div>
        <div className="card-body" style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>
              <strong style={{ color: '#38bdf8' }}>OS Engine:</strong> Implements FCFS, Shortest Job First (SJF), Shortest Remaining Time First (SRTF), Priority, and Round Robin scheduling algorithms with interactive Gantt timeline tracking.
            </li>
            <li>
              <strong style={{ color: '#34d399' }}>DBMS Engine:</strong> Manages SQL query execution, 2-Phase Locking (2PL), cycle detection in Wait-For Graphs with automated victim abortion, and Write-Ahead Logging (WAL) with ARIES recovery.
            </li>
            <li>
              <strong style={{ color: '#a78bfa' }}>AI Assistant:</strong> Evaluates live CPU burst distribution, recommends optimal scheduling algorithms, detects missing database indexes, and diagnoses deadlocks.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
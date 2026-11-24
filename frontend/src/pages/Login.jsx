import { useState, useEffect } from 'react'
import {
  Crown,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, register } = useAuth()

  // Tabs: 'signin' | 'signup'
  const [activeTab, setActiveTab] = useState('signin')

  // Form states
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Signup extra states
  const [email, setEmail] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // UI feedback
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Reset messages when switching tabs
  useEffect(() => {
    setErrorMsg('')
    setSuccessMsg('')
  }, [activeTab])

  // Autofill demo helper for real admin account in DB
  function handleAutofillAdmin() {
    setUsername('admin')
    setPassword('AdminPassword123!')
    setErrorMsg('')
  }

  // 1. Submit Sign In
  async function handleSignInSubmit(e) {
    e?.preventDefault()
    if (!username.trim() || !password) {
      setErrorMsg('Please enter both username and password.')
      return
    }

    setIsLoading(true)
    setErrorMsg('')

    try {
      await login(username.trim(), password)
      // Success will update AuthContext and transition to main app
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  // 2. Submit Sign Up
  async function handleSignUpSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in all required fields.')
      return
    }

    if (!email.includes('@')) {
      setErrorMsg("Please enter a valid email address with an '@' symbol (e.g. name@example.com).")
      return
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }

    setIsLoading(true)
    setErrorMsg('')

    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
      })
      setSuccessMsg('Account created successfully! Logging you in...')
    } catch (err) {
      const msg = typeof err === 'string' ? err : (err.message || 'Registration failed.')
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page-container">
      {/* Decorative background grid and ambient lighting */}
      <div className="login-ambient-glow login-glow-1" />
      <div className="login-ambient-glow login-glow-2" />
      <div className="login-grid-overlay" />

      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <Crown size={28} strokeWidth={2.4} color="#ffffff" />
          </div>
          <div>
            <h1 className="login-brand-title">QUERY ROYALE</h1>
            <p className="login-brand-subtitle">
              OS + DBMS + AI Simulation Platform
            </p>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="login-alert login-alert-error">
            <AlertCircle size={18} className="flex-shrink-0" />
            <div style={{ flex: 1 }}>
              {typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}
            </div>
          </div>
        )}

        {/* Global Success Banner */}
        {successMsg && (
          <div className="login-alert login-alert-success">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <div style={{ flex: 1 }}>{successMsg}</div>
          </div>
        )}

        {/* Tab Header */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab-btn ${activeTab === 'signin' ? 'active' : ''}`}
            onClick={() => setActiveTab('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`login-tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => setActiveTab('signup')}
          >
            Create Account
          </button>
        </div>

        {/* TAB CONTENT: SIGN IN */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignInSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Username or Email</label>
              <div className="input-with-icon">
                <User size={17} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. admin or admin@queryroyale.com"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <Lock size={17} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  Sign In to Query Royale <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Real database admin account hint pill */}
            <div className="login-demo-pill" onClick={handleAutofillAdmin}>
              <div className="login-demo-tag">DEFAULT ADMIN ACCOUNT</div>
              <div className="login-demo-text">
                Username: <strong>admin</strong> • Password: <strong>AdminPassword123!</strong>
              </div>
              <div className="login-demo-subtext">
                Click to autofill and verify live backend authentication
              </div>
            </div>
          </form>
        )}

        {/* TAB CONTENT: SIGN UP */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-with-icon">
                <User size={17} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Choose a username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={17} className="input-icon" />
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password (min 6 characters)</label>
              <div className="input-with-icon">
                <Lock size={17} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Create a secure password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="input-with-icon">
                <Lock size={17} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Re-type password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Creating Account...
                </>
              ) : (
                <>
                  Create Real Account <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Card Footer Security Indicator */}
        <div className="login-footer">
          <ShieldCheck size={14} color="#34d399" />
          <span>Real PBKDF2 Password Hashing &bull; SQLite / MySQL Storage &bull; JWT Bearer Auth</span>
        </div>
      </div>
    </div>
  )
}

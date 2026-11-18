import { useState, useRef, useEffect } from 'react'
import {
  Crown,
  ShieldCheck,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { confirm2FASetup } from '../services/auth'

export default function Login() {
  const { login, complete2FALogin, register } = useAuth()

  // Views: 'signin' | 'signup' | '2fa_verify' | '2fa_setup_prompt'
  const [activeTab, setActiveTab] = useState('signin')
  const [step2FA, setStep2FA] = useState(false)

  // Form states
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Signup extra states
  const [email, setEmail] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [enable2FAOnSignup, setEnable2FAOnSignup] = useState(false)

  // 2FA verification states
  const [preAuthToken, setPreAuthToken] = useState('')
  const [targetUsername, setTargetUsername] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [backupCodeInput, setBackupCodeInput] = useState('')

  // 2FA Registration Setup Data
  const [setup2FAData, setSetup2FAData] = useState(null)
  const [setupOtpInput, setSetupOtpInput] = useState('')

  // UI feedback
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedBackups, setCopiedBackups] = useState(false)

  const otpRefs = useRef([])

  // Reset errors on tab switch
  useEffect(() => {
    setErrorMsg('')
    setSuccessMsg('')
  }, [activeTab])

  // Autofill demo helper
  function handleAutofillAdmin() {
    setUsername('admin')
    setPassword('AdminPassword123!')
    setErrorMsg('')
  }

  // Handle OTP digit changes
  function handleOtpChange(index, value) {
    if (!/^\d*$/.test(value)) return

    const newDigits = [...otpDigits]
    newDigits[index] = value.slice(-1)
    setOtpDigits(newDigits)

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }

    // Auto submit if all 6 filled
    const combined = newDigits.join('')
    if (combined.length === 6 && !newDigits.includes('')) {
      handleVerify2FA(combined)
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').trim()
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('')
      setOtpDigits(digits)
      otpRefs.current[5]?.focus()
      handleVerify2FA(pasted)
    }
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
      const result = await login(username.trim(), password)
      if (result.requires2FA) {
        setPreAuthToken(result.preAuthToken)
        setTargetUsername(result.username)
        setStep2FA(true)
        setOtpDigits(['', '', '', '', '', ''])
        setTimeout(() => otpRefs.current[0]?.focus(), 100)
      }
      // If requires2FA is false, AuthContext updates user state and parent component re-renders
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  // 2. Submit 2FA Verification
  async function handleVerify2FA(codeOverride) {
    const code = codeOverride || (useBackupCode ? backupCodeInput.trim() : otpDigits.join(''))

    if (useBackupCode && !code) {
      setErrorMsg('Please enter a recovery backup code.')
      return
    }

    if (!useBackupCode && code.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.')
      return
    }

    setIsLoading(true)
    setErrorMsg('')

    try {
      await complete2FALogin(preAuthToken, {
        totpCode: useBackupCode ? null : code,
        backupCode: useBackupCode ? code : null,
      })
      // Success will automatically update auth state
    } catch (err) {
      setErrorMsg(err.message || '2FA verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // 3. Submit Sign Up
  async function handleSignUpSubmit(e) {
    e.preventDefault()
    if (!username.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in all required fields.')
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
      const result = await register({
        username: username.trim(),
        email: email.trim(),
        password,
        enable2faNow: enable2FAOnSignup,
      })

      if (result.requires2FASetup) {
        setSetup2FAData(result)
        setPreAuthToken(result.preAuthToken)
        setTargetUsername(result.username)
      } else {
        setSuccessMsg('Account created successfully!')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed.')
    } finally {
      setIsLoading(false)
    }
  }

  // 4. Complete 2FA Setup during registration
  async function handleConfirmSetup2FA(e) {
    e.preventDefault()
    if (!setupOtpInput.trim() || setupOtpInput.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit confirmation code from your authenticator app.')
      return
    }

    setIsLoading(true)
    setErrorMsg('')

    try {
      await complete2FALogin(setup2FAData.preAuthToken, {
        totpCode: setupOtpInput.trim(),
      })
    } catch (err) {
      setErrorMsg(err.message || 'Invalid confirmation code. Please check your app.')
    } finally {
      setIsLoading(false)
    }
  }

  function copyToClipboard(text, type) {
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
            <div style={{ flex: 1 }}>{errorMsg}</div>
          </div>
        )}

        {/* Global Success Banner */}
        {successMsg && (
          <div className="login-alert login-alert-success">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <div style={{ flex: 1 }}>{successMsg}</div>
          </div>
        )}

        {/* VIEW 1: TWO-FACTOR AUTHENTICATION VERIFICATION SCREEN */}
        {step2FA ? (
          <div className="login-2fa-section">
            <div className="login-2fa-badge">
              <div className="login-2fa-badge-icon">
                <ShieldCheck size={24} color="#22d3ee" />
              </div>
              <div>
                <h3 className="login-2fa-badge-title">2-Factor Authentication</h3>
                <p className="login-2fa-badge-desc">
                  Verification required for <strong>{targetUsername}</strong>
                </p>
              </div>
            </div>

            <p className="login-instruction-text">
              {useBackupCode
                ? 'Enter one of your emergency recovery backup codes (e.g. QR-A1B2-C3D4).'
                : 'Enter the 6-digit security code generated by your Google Authenticator or TOTP app.'}
            </p>

            {!useBackupCode ? (
              <div className="otp-inputs-row" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => (otpRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(idx, e)}
                    className="otp-digit-box"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Recovery Backup Code</label>
                <div className="input-with-icon">
                  <KeyRound size={17} className="input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="QR-XXXX-XXXX"
                    value={backupCodeInput}
                    onChange={e => setBackupCodeInput(e.target.value.toUpperCase())}
                    autoFocus
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              className="login-submit-btn"
              onClick={() => handleVerify2FA()}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Verifying Code...
                </>
              ) : (
                <>
                  Verify &amp; Sign In <ArrowRight size={16} />
                </>
              )}
            </button>

            <div className="login-2fa-toggle-row">
              <button
                type="button"
                className="text-link-btn"
                onClick={() => {
                  setUseBackupCode(!useBackupCode)
                  setErrorMsg('')
                }}
              >
                {useBackupCode ? 'Use 6-digit Authenticator App code' : 'Use emergency backup recovery code'}
              </button>

              <button
                type="button"
                className="text-link-btn text-link-muted"
                onClick={() => {
                  setStep2FA(false)
                  setOtpDigits(['', '', '', '', '', ''])
                  setErrorMsg('')
                }}
              >
                Cancel &amp; Back to Login
              </button>
            </div>
          </div>
        ) : setup2FAData ? (
          /* VIEW 2: 2FA SETUP WIZARD (DURING REGISTRATION) */
          <div className="login-2fa-setup-section">
            <div className="login-2fa-badge">
              <div className="login-2fa-badge-icon">
                <Sparkles size={24} color="#a78bfa" />
              </div>
              <div>
                <h3 className="login-2fa-badge-title">Set Up Authenticator App</h3>
                <p className="login-2fa-badge-desc">
                  Scan the QR code with Google Authenticator or Authy
                </p>
              </div>
            </div>

            {/* QR Code Display */}
            {setup2FAData.qrSvg && (
              <div className="login-qr-wrapper">
                <div
                  className="login-qr-svg-container"
                  dangerouslySetInnerHTML={{ __html: setup2FAData.qrSvg }}
                />
              </div>
            )}

            {/* Secret Key in Monospace */}
            <div className="login-key-box">
              <div>
                <span className="login-key-label">Manual Secret Key:</span>
                <code className="login-key-text">{setup2FAData.totpSecret}</code>
              </div>
              <button
                type="button"
                className="btn-copy-small"
                onClick={() => copyToClipboard(setup2FAData.totpSecret, 'key')}
                title="Copy Secret Key"
              >
                {copiedKey ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                <span>{copiedKey ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Backup Codes Display */}
            {setup2FAData.backupCodes && (
              <div className="backup-codes-preview">
                <div className="backup-codes-header">
                  <span>Emergency Backup Codes (Save these securely):</span>
                  <button
                    type="button"
                    className="btn-copy-small"
                    onClick={() =>
                      copyToClipboard(setup2FAData.backupCodes.join('\n'), 'backup')
                    }
                  >
                    {copiedBackups ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                    <span>{copiedBackups ? 'Copied' : 'Copy Codes'}</span>
                  </button>
                </div>
                <div className="backup-codes-grid">
                  {setup2FAData.backupCodes.map((code, idx) => (
                    <span key={idx} className="backup-code-pill">
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmation 6-digit input */}
            <form onSubmit={handleConfirmSetup2FA} style={{ marginTop: 16 }}>
              <label className="form-label">
                Enter 6-digit confirmation code from your app:
              </label>
              <div className="input-with-icon" style={{ marginBottom: 14 }}>
                <KeyRound size={17} className="input-icon" />
                <input
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  className="form-input"
                  placeholder="000000"
                  value={setupOtpInput}
                  onChange={e => setSetupOtpInput(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    Confirm &amp; Complete Registration <CheckCircle2 size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* VIEW 3: STANDARD LOGIN & REGISTRATION TABS */
          <>
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

                {/* 2FA Toggle for Signup */}
                <div className="login-checkbox-group">
                  <label className="login-checkbox-label">
                    <input
                      type="checkbox"
                      checked={enable2FAOnSignup}
                      onChange={e => setEnable2FAOnSignup(e.target.checked)}
                      className="login-checkbox"
                    />
                    <div>
                      <div style={{ fontWeight: 600, color: '#f1f5f9' }}>
                        Enable 2-Factor Authentication (2FA) Now
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>
                        Protects your account with Google Authenticator or any TOTP app
                      </div>
                    </div>
                  </label>
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
          </>
        )}

        {/* Card Footer Security Indicator */}
        <div className="login-footer">
          <ShieldCheck size={14} color="#34d399" />
          <span>Real PBKDF2 Password Hashing &bull; RFC 6238 TOTP Standard &bull; JWT Bearer Auth</span>
        </div>
      </div>
    </div>
  )
}

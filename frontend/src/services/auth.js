/**
 * Authentication & 2FA Service
 * Connects directly to FastAPI backend without any fake mock logic.
 */

const API_BASE = '/api/auth'

export const TOKEN_KEY = 'qr_auth_token'
export const USER_KEY = 'qr_auth_user'

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY)
  try {
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSession(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

async function request(endpoint, options = {}) {
  const token = getStoredToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`
  }

  const url = `${API_BASE}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const errorMsg = data.detail || data.message || `Request failed with status ${response.status}`
    throw new Error(errorMsg)
  }

  return data
}

/**
 * Step 1: Submit username/email and password.
 * Returns { requires_2fa: true, pre_auth_token, ... } OR { requires_2fa: false, access_token, user, ... }
 */
export async function loginUser(username, password) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

/**
 * Step 2: Submit 6-digit TOTP code or backup code for 2FA verification.
 */
export async function verifyLogin2FA(preAuthToken, { totpCode, backupCode }) {
  return request('/login-2fa', {
    method: 'POST',
    body: JSON.stringify({
      pre_auth_token: preAuthToken,
      totp_code: totpCode || null,
      backup_code: backupCode || null,
    }),
  })
}

/**
 * User Registration with optional immediate 2FA setup.
 */
export async function registerUser({ username, email, password, enable2faNow = false }) {
  return request('/register', {
    method: 'POST',
    body: JSON.stringify({
      username,
      email,
      password,
      enable_2fa_now: Boolean(enable2faNow),
    }),
  })
}

/**
 * Verify token and fetch current authenticated user profile.
 */
export async function getCurrentUser() {
  return request('/me', {
    method: 'GET',
  })
}

/**
 * Initiate 2FA setup (generates TOTP secret, QR code SVG, backup codes).
 */
export async function initiate2FASetup() {
  return request('/2fa/setup', {
    method: 'POST',
  })
}

/**
 * Confirm 2FA setup with a 6-digit test code.
 */
export async function confirm2FASetup(secret, totpCode, backupCodes) {
  return request('/2fa/confirm', {
    method: 'POST',
    body: JSON.stringify({
      secret,
      totp_code: totpCode,
      backup_codes: backupCodes,
    }),
  })
}

/**
 * Disable 2FA with user's current password.
 */
export async function disable2FA(password) {
  return request('/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

/**
 * Generate 5 new backup recovery codes.
 */
export async function regenerateBackupCodes() {
  return request('/2fa/regenerate-backups', {
    method: 'POST',
  })
}

/**
 * Authentication Service
 * Connects directly to FastAPI backend without mock logic.
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
    let errorMsg = ''
    if (Array.isArray(data.detail)) {
      errorMsg = data.detail
        .map(err => {
          let msg = err.msg || err.message || (typeof err === 'string' ? err : '')
          if (msg.startsWith('Value error, ')) {
            msg = msg.replace('Value error, ', '')
          }
          return msg
        })
        .filter(Boolean)
        .join('. ')
    } else if (typeof data.detail === 'string') {
      errorMsg = data.detail
    } else if (data.detail && typeof data.detail === 'object') {
      errorMsg = data.detail.msg || data.detail.message || JSON.stringify(data.detail)
    } else if (data.message) {
      errorMsg = data.message
    } else {
      errorMsg = `Request failed with status ${response.status}`
    }
    throw new Error(errorMsg)
  }

  return data
}

/**
 * Submit username/email and password to authenticate.
 * Returns { access_token, user, status }
 */
export async function loginUser(username, password) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

/**
 * Real user registration.
 */
export async function registerUser({ username, email, password }) {
  return request('/register', {
    method: 'POST',
    body: JSON.stringify({
      username,
      email,
      password,
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

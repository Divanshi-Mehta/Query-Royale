import { createContext, useContext, useState, useEffect } from 'react'
import {
  getStoredToken,
  getStoredUser,
  setSession,
  clearSession,
  getCurrentUser,
  loginUser,
  registerUser,
} from '../services/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser())
  const [token, setToken] = useState(getStoredToken())
  const [isLoading, setIsLoading] = useState(true)

  // Verify session on app mount
  useEffect(() => {
    async function verify() {
      const storedToken = getStoredToken()
      if (!storedToken) {
        setIsLoading(false)
        return
      }

      try {
        const userData = await getCurrentUser()
        setUser(userData)
        setSession(storedToken, userData)
      } catch (err) {
        console.warn('Session verification failed, logging out:', err.message)
        clearSession()
        setUser(null)
        setToken(null)
      } finally {
        setIsLoading(false)
      }
    }

    verify()
  }, [])

  async function login(username, password) {
    const res = await loginUser(username, password)
    setSession(res.access_token, res.user)
    setToken(res.access_token)
    setUser(res.user)
    return { success: true, user: res.user }
  }

  async function register({ username, email, password }) {
    const res = await registerUser({ username, email, password })
    setSession(res.access_token, res.user)
    setToken(res.access_token)
    setUser(res.user)
    return { success: true, user: res.user }
  }

  async function refreshUser() {
    try {
      const freshUser = await getCurrentUser()
      setUser(freshUser)
      setSession(getStoredToken(), freshUser)
      return freshUser
    } catch {
      return null
    }
  }

  function logout() {
    clearSession()
    setUser(null)
    setToken(null)
  }

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    login,
    register,
    refreshUser,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

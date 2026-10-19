import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

// ─── Helper: parse a JWT payload without a library ────────────────────────────
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

// ─── Helper: check if a JWT access token is expired ──────────────────────────
function isTokenExpired(token) {
  if (!token) return true
  const payload = parseJwt(token)
  if (!payload?.exp) return true
  // Add 10-second buffer to account for clock skew.
  return Date.now() >= (payload.exp - 10) * 1000
}

// ─── Helper: flatten backend error responses into a single readable string ────
function extractErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err.response) {
    return 'Cannot connect to the server. Please check your network connection and try again.'
  }
  const data = err.response.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.message) return data.message
  if (data.detail) return data.detail
  if (data.non_field_errors) return data.non_field_errors.join(' ')
  // Flatten field-level DRF errors into one string.
  const flat = Object.entries(data)
    .map(([field, msgs]) => {
      const text = Array.isArray(msgs) ? msgs.join(', ') : String(msgs)
      return field === 'non_field_errors' ? text : `${field}: ${text}`
    })
    .join(' | ')
  return flat || fallback
}

export function AuthProvider({ children }) {
  // Initialise from localStorage — but verify the stored user is still valid.
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('postcare_user'))
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)

  // ─── On mount: if tokens expired clear auth; otherwise refresh user profile ──
  useEffect(() => {
    const access = localStorage.getItem('postcare_access')
    const refresh = localStorage.getItem('postcare_refresh')
    if (isTokenExpired(access) && isTokenExpired(refresh)) {
      // Both tokens are gone/expired — clear everything.
      localStorage.removeItem('postcare_access')
      localStorage.removeItem('postcare_refresh')
      localStorage.removeItem('postcare_user')
      setUser(null)
      return
    }

    // Refresh user profile if authenticated so patient_profile_id / patient_id are fresh
    if (access || refresh) {
      api.get('/auth/me/')
        .then((res) => {
          if (res.data) {
            setUser(res.data)
            localStorage.setItem('postcare_user', JSON.stringify(res.data))
          }
        })
        .catch(() => {
          // If token is invalid and refresh fails, api interceptor handles redirection
        })
    }
  }, [])

  // ─── LOGIN ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      // api.js will NOT attach an Authorization header to this endpoint.
      const res = await api.post('/auth/login/', { email, password })
      const { user: u, access, refresh } = res.data
      setUser(u)
      localStorage.setItem('postcare_user', JSON.stringify(u))
      localStorage.setItem('postcare_access', access)
      localStorage.setItem('postcare_refresh', refresh)
      return { success: true, user: u }
    } catch (err) {
      return { success: false, error: extractErrorMessage(err, 'Invalid email or password. Please try again.') }
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── GOOGLE LOGIN ──────────────────────────────────────────────────────────
  const googleLogin = useCallback(async (googleData = {}) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/google/', googleData)
      const { user: u, access, refresh } = res.data
      setUser(u)
      localStorage.setItem('postcare_user', JSON.stringify(u))
      localStorage.setItem('postcare_access', access)
      localStorage.setItem('postcare_refresh', refresh)
      return { success: true, user: u }
    } catch (err) {
      return {
        success: false,
        error: extractErrorMessage(err, 'Google sign-in failed. Please try again.'),
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── LOGOUT ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('postcare_refresh')
      if (refresh) await api.post('/auth/logout/', { refresh })
    } catch {
      // Logout must succeed even if the API call fails.
    } finally {
      setUser(null)
      localStorage.removeItem('postcare_user')
      localStorage.removeItem('postcare_access')
      localStorage.removeItem('postcare_refresh')
    }
  }, [])

  // ─── REGISTER ──────────────────────────────────────────────────────────────
  const register = useCallback(async (data) => {
    setLoading(true)
    try {
      // api.js will NOT attach an Authorization header to this endpoint,
      // so an expired token in localStorage cannot block registration.
      const res = await api.post('/auth/register/', data)
      return { success: true, data: res.data }
    } catch (err) {
      return {
        success: false,
        error: extractErrorMessage(err, 'Registration failed. Please check your details and try again.'),
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        googleLogin,
        logout,
        register,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

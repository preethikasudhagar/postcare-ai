import React, { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('postcare_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/login/', { email, password })
      const { user: u, access, refresh } = res.data
      setUser(u)
      localStorage.setItem('postcare_user', JSON.stringify(u))
      localStorage.setItem('postcare_access', access)
      localStorage.setItem('postcare_refresh', refresh)
      return { success: true, user: u }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Invalid credentials' }
    } finally { setLoading(false) }
  }, [])

  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('postcare_refresh')
      if (refresh) await api.post('/auth/logout/', { refresh })
    } catch {}
    setUser(null)
    localStorage.removeItem('postcare_user')
    localStorage.removeItem('postcare_access')
    localStorage.removeItem('postcare_refresh')
  }, [])

  const register = useCallback(async (data) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/register/', data)
      return { success: true, data: res.data }
    } catch (err) {
      return { success: false, error: err.response?.data || 'Registration failed' }
    } finally { setLoading(false) }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true)
    try { await api.post('/auth/forgot-password/', { email }) } catch {}
    setSent(true); setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm bg-white border border-border rounded-lg shadow-xs p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-text">Reset password</h1>
          <p className="text-sm text-text-muted mt-1">Enter your email to receive a reset link</p>
        </div>
        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-success-tint rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-sm text-text-secondary mb-1">If an account exists for <strong>{email}</strong>, a reset link has been sent.</p>
            <p className="text-xs text-text-muted mt-3 p-2 bg-warning-tint rounded">Demo mode: no real email is sent.</p>
            <Link to="/login" className="block mt-4 text-primary text-sm font-medium hover:text-primary-hover">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text mb-1">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                className="w-full h-10 px-3 text-sm border border-border-strong rounded-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-10 bg-primary text-white text-sm font-medium rounded-sm hover:bg-primary-hover disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Send reset link
            </button>
            <p className="text-center text-sm text-text-muted">
              <Link to="/login" className="text-primary hover:text-primary-hover">Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

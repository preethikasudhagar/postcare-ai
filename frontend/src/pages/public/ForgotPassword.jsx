import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import AuthLayout from '../../components/layout/AuthLayout'
import { CheckCircle2, ArrowLeft } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password/', { email })
    } catch {}
    setSent(true)
    setLoading(false)
  }

  return (
    <AuthLayout
      title={sent ? 'Check your email' : 'Reset your password'}
      subtitle={
        sent
          ? 'Instructions to reset your password have been sent'
          : 'Enter your registered email address to receive a reset link'
      }
    >
      {sent ? (
        <div className="text-center py-2 space-y-4">
          <div className="w-12 h-12 bg-success-tint border border-success/20 rounded-full flex items-center justify-center mx-auto text-success">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            If an account exists for <span className="font-semibold text-text">{email}</span>, a password reset link has been dispatched.
          </p>
          <div className="p-3 bg-surface-muted border border-border rounded-lg text-[11px] text-text-muted">
            Academic Prototype: Authentication tokens are pre-seeded in the database for instant testing.
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 w-full h-11 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-xs"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              Email address <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
              className="w-full h-11 px-3.5 text-sm bg-white border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover active:scale-[0.99] transition-all duration-150 disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-xs"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Send Reset Link
          </button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text font-medium transition-colors"
            >
              <ArrowLeft size={13} /> Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}

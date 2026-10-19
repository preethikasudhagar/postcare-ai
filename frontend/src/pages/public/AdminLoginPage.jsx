import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from '../../components/layout/AuthLayout'
import { Eye, EyeOff, AlertCircle, ShieldCheck, ArrowLeft, Lock } from 'lucide-react'

export default function AdminLoginPage() {
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)
    setLoading(false)

    if (result.success) {
      if (result.user.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        // Enforce role separation on the admin portal
        logout()
        setError(`Access denied. Your account is registered with the role "${result.user.role}", not Administrator. Please use the standard user sign-in portal.`)
      }
    } else {
      setError(result.error || 'Invalid administrator credentials. Please try again.')
    }
  }

  return (
    <AuthLayout
      title="Administrator Sign In"
      subtitle="PostCare AI Clinical Governance & IT Portal"
    >
      {/* Administrative Notice Badge */}
      <div className="flex items-center gap-2 p-2.5 mb-5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-medium">
        <Lock size={14} className="text-primary flex-shrink-0" />
        <span>Restricted access: Authorized clinical & system administrators only.</span>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 mb-5 bg-danger-tint border border-danger/20 rounded-lg text-left overflow-hidden">
          <AlertCircle size={16} className="text-danger mt-0.5 flex-shrink-0" />
          <p className="text-xs text-danger font-medium break-words min-w-0">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-text mb-1.5">
            Admin Email address <span className="text-danger">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@postcare.demo"
            autoComplete="email"
            className="w-full h-11 px-3.5 text-sm bg-white border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text mb-1.5">
            Admin Password <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter administrator password"
              autoComplete="current-password"
              className="w-full h-11 px-3.5 pr-11 text-sm bg-white border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text focus:outline-none transition-colors"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 text-xs font-medium text-text cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-border-strong focus:ring-primary"
            />
            Remember admin session
          </label>
          <Link
            to="/forgot-password"
            className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover active:scale-[0.99] transition-all duration-150 disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-xs"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <ShieldCheck size={16} />
          )}
          Sign In to Admin Portal
        </button>
      </form>

      {/* Admin Demo Shortcut */}
      <div className="mt-6 pt-5 border-t border-border">
        <p className="text-xs font-semibold text-text-muted mb-2.5 text-center">
          Quick Demo Administrator
        </p>
        <button
          type="button"
          onClick={() => {
            setEmail('admin@postcare.demo')
            setPassword('Admin@123')
            setError('')
          }}
          className="w-full flex items-center gap-2.5 p-2.5 border border-border rounded-lg hover:border-primary hover:bg-primary-tint/30 transition-all text-left group focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border bg-danger-tint text-danger border-danger/20">
            <ShieldCheck size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-text group-hover:text-primary transition-colors">
              Hospital Administrator
            </p>
            <p className="text-[11px] text-text-muted truncate">
              admin@postcare.demo
            </p>
          </div>
        </button>
      </div>

      {/* Return to standard sign in */}
      <div className="mt-6 pt-4 border-t border-border text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary font-medium transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Return to Patient & Clinician Sign In</span>
        </Link>
      </div>
    </AuthLayout>
  )
}

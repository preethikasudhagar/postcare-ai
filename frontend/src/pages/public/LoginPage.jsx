import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from '../../components/layout/AuthLayout'
import { Eye, EyeOff, AlertCircle, User, Stethoscope, HeartPulse, ShieldCheck } from 'lucide-react'

const DEMO_ACCOUNTS = [
  { role: 'Patient', email: 'patient@postcare.demo', password: 'Patient@123', icon: User, color: 'bg-secondary-tint text-secondary border-secondary/20' },
  { role: 'Doctor', email: 'doctor@postcare.demo', password: 'Doctor@123', icon: Stethoscope, color: 'bg-primary-tint text-primary border-primary/20' },
  { role: 'Caregiver', email: 'caregiver@postcare.demo', password: 'Caregiver@123', icon: HeartPulse, color: 'bg-warning-tint text-warning border-warning/20' },
  { role: 'Admin', email: 'admin@postcare.demo', password: 'Admin@123', icon: ShieldCheck, color: 'bg-danger-tint text-danger border-danger/20' },
]

const ROLE_DASHBOARDS = {
  patient: '/patient/dashboard',
  doctor: '/doctor/dashboard',
  nurse: '/nurse/dashboard',
  admin: '/admin/dashboard',
  caregiver: '/caregiver/dashboard',
}

export default function LoginPage() {
  const { login } = useAuth()
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
      navigate(ROLE_DASHBOARDS[result.user.role] || '/patient/dashboard')
    } else {
      setError(result.error || 'Invalid credentials. Please check your email and password.')
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to access your recovery portal">
      {error && (
        <div className="flex items-start gap-2.5 p-3 mb-5 bg-danger-tint border border-danger/20 rounded-lg text-left overflow-hidden">
          <AlertCircle size={16} className="text-danger mt-0.5 flex-shrink-0" />
          <p className="text-xs text-danger font-medium break-words min-w-0">{error}</p>
        </div>
      )}

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
            autoComplete="email"
            className="w-full h-11 px-3.5 text-sm bg-white border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text mb-1.5">
            Password <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
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
            Remember me
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
          {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Sign In
        </button>
      </form>

      {/* Dedicated Administrator Portal Entry */}
      <div className="mt-4 p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-danger-tint border border-danger/20 flex items-center justify-center text-danger flex-shrink-0">
            <ShieldCheck size={16} />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-text leading-tight">System Administrator?</p>
            <p className="text-[11px] text-text-muted leading-tight">Clinical IT & governance portal</p>
          </div>
        </div>
        <Link
          to="/admin/login"
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-text border border-border-strong rounded-md transition-all shadow-2xs hover:border-primary hover:text-primary"
        >
          <span>Admin Sign In</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>

      {/* Demo Accounts Section */}
      <div className="mt-5 pt-4 border-t border-border">

        <p className="text-xs font-semibold text-text-muted mb-2.5 text-center">
          Quick Demo Accounts
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              onClick={() => {
                setEmail(acc.email)
                setPassword(acc.password)
                setError('')
              }}
              className="flex items-center gap-2.5 p-2.5 border border-border rounded-lg hover:border-primary hover:bg-primary-tint/30 transition-all text-left group focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <div
                className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border ${acc.color}`}
              >
                <acc.icon size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text group-hover:text-primary transition-colors">
                  {acc.role}
                </p>
                <p className="text-[11px] text-text-muted truncate">
                  {acc.email.split('@')[0]}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-text-muted">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary hover:text-primary-hover font-semibold transition-colors">
          Create account
        </Link>
      </div>
    </AuthLayout>
  )
}

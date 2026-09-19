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
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)
    const result = await googleLogin({
      email: 'google.user@postcare.demo',
      name: 'Google Patient',
      role: 'patient',
    })
    setGoogleLoading(false)
    if (result.success) {
      navigate(ROLE_DASHBOARDS[result.user.role] || '/patient/dashboard')
    } else {
      setError(result.error || 'Failed to sign in with Google.')
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to access your recovery portal">
      {error && (
        <div className="flex items-start gap-2.5 p-3 mb-5 bg-danger-tint border border-danger/20 rounded-lg text-left">
          <AlertCircle size={16} className="text-danger mt-0.5 flex-shrink-0" />
          <p className="text-xs text-danger font-medium">{error}</p>
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
          disabled={loading || googleLoading}
          className="w-full h-11 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover active:scale-[0.99] transition-all duration-150 disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-xs"
        >
          {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Sign In
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-text-muted font-medium">Or continue with</span>
        </div>
      </div>

      {/* Google Sign-in Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading || googleLoading}
        className="w-full h-11 border border-border-strong bg-white hover:bg-surface-muted text-text font-semibold rounded-lg active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2.5 text-sm shadow-xs disabled:opacity-60"
      >
        {googleLoading ? (
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        Continue with Google
      </button>

      {/* Demo Accounts Section */}
      <div className="mt-6 pt-5 border-t border-border">
        <p className="text-xs font-semibold text-text-muted mb-2.5 text-center">
          Quick Demo Accounts (Synthetic Data)
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

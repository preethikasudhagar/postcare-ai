import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Eye, EyeOff, AlertCircle, User, Stethoscope, HeartPulse, ShieldCheck } from 'lucide-react'

const DEMO_ACCOUNTS = [
  { role: 'Patient', email: 'patient@postcare.demo', password: 'Patient@123', icon: User, color: 'bg-secondary-tint text-secondary' },
  { role: 'Doctor', email: 'doctor@postcare.demo', password: 'Doctor@123', icon: Stethoscope, color: 'bg-primary-tint text-primary' },
  { role: 'Caregiver', email: 'caregiver@postcare.demo', password: 'Caregiver@123', icon: HeartPulse, color: 'bg-warning-tint text-warning' },
  { role: 'Admin', email: 'admin@postcare.demo', password: 'Admin@123', icon: ShieldCheck, color: 'bg-danger-tint text-danger' },
]

const ROLE_DASHBOARDS = { patient: '/patient/dashboard', doctor: '/doctor/dashboard', nurse: '/nurse/dashboard', admin: '/admin/dashboard', caregiver: '/caregiver/dashboard' }

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
    setError(''); setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) {
      navigate(ROLE_DASHBOARDS[result.user.role] || '/patient/dashboard')
    } else {
      setError(result.error || 'Invalid credentials. Please check your email and password.')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-primary p-10 text-white">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.2)" />
              <path d="M16 6v20M6 16h20" stroke="white" strokeWidth="3" strokeLinecap="round" />
              <path d="M22 10 C26 10 28 13 28 16" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div>
              <div className="text-xl font-bold">PostCare AI</div>
              <div className="text-sm text-white/70">Intelligent Post-Operative Recovery Management</div>
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-3">Smarter recovery, every step of the way.</h1>
          <p className="text-white/80 text-sm mb-8">A digital platform for personalized discharge planning, daily recovery tracking, and intelligent follow-up management.</p>

          <div className="space-y-4">
            {[
              { icon: '📋', text: 'Personalized discharge plans created by your care team' },
              { icon: '📊', text: 'Daily recovery tracking with ML-based risk classification' },
              { icon: '🔔', text: 'Alerts, follow-up appointments, and medication reminders' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl">{item.icon}</span>
                <p className="text-sm text-white/85">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mini Timeline preview */}
        <div className="mt-8 p-4 bg-white/10 rounded-lg">
          <p className="text-xs text-white/60 mb-3 font-medium">Recovery Timeline (demo)</p>
          <div className="flex items-center gap-1">
            {['low','low','medium','low','high','medium','low','low','medium','low','low','low','low'].map((r, i) => (
              <div key={i} title={`Day ${i+1}`}
                className={`flex-1 h-2 rounded-full ${r==='low'?'bg-green-400':r==='medium'?'bg-yellow-400':'bg-red-400'}`} />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-2xs text-white/50">
            <span>Discharge</span><span>Today</span>
          </div>
        </div>

        <p className="text-xs text-white/50 mt-4">Academic Healthcare Prototype • Synthetic data only</p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center p-6 bg-bg">
        <div className="w-full max-w-login">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#1D5FD1" />
                <path d="M16 6v20M6 16h20" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span className="text-xl font-bold text-text">PostCare AI</span>
            </div>
            <h2 className="text-2xl font-semibold text-text">Welcome back</h2>
            <p className="text-sm text-text-muted mt-1">Sign in to your account</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 bg-danger-tint border border-danger/20 rounded-[10px]">
              <AlertCircle size={16} className="text-danger mt-0.5 flex-shrink-0" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text mb-1">Email address<span className="text-danger ml-0.5">*</span></label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com" autoComplete="email"
                className="w-full h-10 px-3 text-sm border border-border-strong rounded-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors" />
            </div>

            <div>
              <label className="block text-xs font-medium text-text mb-1">Password<span className="text-danger ml-0.5">*</span></label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  placeholder="Your password" autoComplete="current-password"
                  className="w-full h-10 px-3 pr-10 text-sm border border-border-strong rounded-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors" />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 text-primary border-border-strong rounded" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm text-primary hover:text-primary-hover transition-colors">Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-11 bg-primary text-white font-medium rounded-sm hover:bg-primary-hover active:scale-[0.98] transition-all duration-150 disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Log in
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6">
            <p className="text-xs font-medium text-text-muted mb-3 text-center">Demo accounts (synthetic data)</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button key={acc.role}
                  onClick={() => { setEmail(acc.email); setPassword(acc.password); setError('') }}
                  className="flex items-center gap-2 p-2.5 border border-border rounded-[10px] hover:bg-surface-muted hover:border-border-strong transition-all text-left group">
                  <div className={`w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0 ${acc.color}`}>
                    <acc.icon size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text">{acc.role}</p>
                    <p className="text-2xs text-text-muted truncate max-w-[100px]">{acc.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-text-muted mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:text-primary-hover font-medium transition-colors">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

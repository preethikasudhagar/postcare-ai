import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { AlertCircle, CheckCircle } from 'lucide-react'

function PasswordStrength({ password }) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special character', pass: /[^A-Za-z0-9]/.test(password) },
  ]
  const score = checks.filter(c => c.pass).length
  const colors = ['bg-border', 'bg-danger', 'bg-warning', 'bg-secondary', 'bg-success']
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= score ? colors[score] : 'bg-border'}`} />
        ))}
      </div>
      {password && <p className="text-xs text-text-muted">{labels[score]}</p>}
      {password && (
        <div className="mt-2 grid grid-cols-2 gap-1">
          {checks.map(c => (
            <div key={c.label} className={`flex items-center gap-1 text-xs ${c.pass ? 'text-success' : 'text-text-muted'}`}>
              {c.pass ? <CheckCircle size={11} /> : <span className="w-2.5 h-2.5 rounded-full border border-current inline-block" />}
              {c.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', role: 'patient' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    const res = await register({ ...form, username: form.email })
    setLoading(false)
    if (res.success) navigate('/login')
    else setError(typeof res.error === 'string' ? res.error : JSON.stringify(res.error))
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col justify-center w-[45%] bg-primary p-10 text-white">
        <svg width="48" height="48" viewBox="0 0 32 32" fill="none" className="mb-6">
          <rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.2)" />
          <path d="M16 6v20M6 16h20" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 10 C26 10 28 13 28 16" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <h2 className="text-3xl font-bold mb-3">Join PostCare AI</h2>
        <p className="text-white/80 text-sm">Create your account to access personalized post-operative recovery management.</p>
        <p className="text-white/50 text-xs mt-8">Academic Healthcare Prototype • Synthetic data only</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-bg">
        <div className="w-full max-w-login">
          <h2 className="text-2xl font-semibold text-text mb-1">Create an account</h2>
          <p className="text-sm text-text-muted mb-6">Fill in your details to get started</p>

          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 bg-danger-tint border border-danger/20 rounded-[10px]">
              <AlertCircle size={16} className="text-danger mt-0.5 flex-shrink-0" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text mb-1">First name<span className="text-danger ml-0.5">*</span></label>
                <input value={form.first_name} onChange={set('first_name')} required
                  className="w-full h-10 px-3 text-sm border border-border-strong rounded-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text mb-1">Last name<span className="text-danger ml-0.5">*</span></label>
                <input value={form.last_name} onChange={set('last_name')} required
                  className="w-full h-10 px-3 text-sm border border-border-strong rounded-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text mb-1">Email address<span className="text-danger ml-0.5">*</span></label>
              <input type="email" value={form.email} onChange={set('email')} required
                className="w-full h-10 px-3 text-sm border border-border-strong rounded-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>

            <div>
              <label className="block text-xs font-medium text-text mb-1">Role<span className="text-danger ml-0.5">*</span></label>
              <select value={form.role} onChange={set('role')}
                className="w-full h-10 px-3 text-sm border border-border-strong rounded-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="caregiver">Caregiver</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text mb-1">Password<span className="text-danger ml-0.5">*</span></label>
              <input type="password" value={form.password} onChange={set('password')} required
                className="w-full h-10 px-3 text-sm border border-border-strong rounded-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <PasswordStrength password={form.password} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-11 bg-primary text-white font-medium rounded-sm hover:bg-primary-hover disabled:opacity-60 flex items-center justify-center gap-2 text-sm transition-colors">
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Create account
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:text-primary-hover">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

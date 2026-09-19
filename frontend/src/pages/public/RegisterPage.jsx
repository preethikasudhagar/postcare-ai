import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from '../../components/layout/AuthLayout'
import { AlertCircle, CheckCircle } from 'lucide-react'

function PasswordStrength({ password }) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
    { label: 'Special character', pass: /[^A-Za-z0-9]/.test(password) },
  ]
  const score = checks.filter((c) => c.pass).length
  const colors = ['bg-border', 'bg-danger', 'bg-warning', 'bg-secondary', 'bg-success']
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= score ? colors[score] : 'bg-border'
            }`}
          />
        ))}
      </div>
      {password && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-text-muted">Strength: {labels[score]}</p>
        </div>
      )}
      {password && (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {checks.map((c) => (
            <div
              key={c.label}
              className={`flex items-center gap-1.5 text-[11px] ${
                c.pass ? 'text-success font-medium' : 'text-text-muted'
              }`}
            >
              {c.pass ? (
                <CheckCircle size={12} className="flex-shrink-0" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full border border-current inline-block flex-shrink-0" />
              )}
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
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'patient',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await register({ ...form, username: form.email })
    setLoading(false)
    if (res.success) {
      navigate('/login')
    } else {
      setError(typeof res.error === 'string' ? res.error : JSON.stringify(res.error))
    }
  }

  return (
    <AuthLayout title="Create an account" subtitle="Fill in your details to get started">
      {error && (
        <div className="flex items-start gap-2.5 p-3 mb-5 bg-danger-tint border border-danger/20 rounded-lg text-left">
          <AlertCircle size={16} className="text-danger mt-0.5 flex-shrink-0" />
          <p className="text-xs text-danger font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              First name <span className="text-danger">*</span>
            </label>
            <input
              value={form.first_name}
              onChange={set('first_name')}
              required
              placeholder="Jane"
              className="w-full h-11 px-3.5 text-sm bg-white border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              Last name <span className="text-danger">*</span>
            </label>
            <input
              value={form.last_name}
              onChange={set('last_name')}
              required
              placeholder="Doe"
              className="w-full h-11 px-3.5 text-sm bg-white border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text mb-1.5">
            Email address <span className="text-danger">*</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            required
            placeholder="jane.doe@example.com"
            className="w-full h-11 px-3.5 text-sm bg-white border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text mb-1.5">
            Role <span className="text-danger">*</span>
          </label>
          <select
            value={form.role}
            onChange={set('role')}
            className="w-full h-11 px-3 text-sm bg-white border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-text cursor-pointer"
          >
            <option value="patient">Patient (Recovering from surgery)</option>
            <option value="doctor">Doctor (Attending Surgeon / Physician)</option>
            <option value="nurse">Nurse (Post-Op Care Coordinator)</option>
            <option value="caregiver">Caregiver (Family / Helper)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-text mb-1.5">
            Password <span className="text-danger">*</span>
          </label>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            required
            placeholder="Create a secure password"
            className="w-full h-11 px-3.5 text-sm bg-white border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
          />
          <PasswordStrength password={form.password} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover active:scale-[0.99] transition-all duration-150 disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-xs"
        >
          {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Create Account
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-text-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-semibold hover:text-primary-hover transition-colors">
          Sign in
        </Link>
      </div>
    </AuthLayout>
  )
}

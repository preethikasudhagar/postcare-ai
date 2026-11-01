import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from '../../components/layout/AuthLayout'
import { AlertCircle, CheckCircle, ShieldCheck, Stethoscope } from 'lucide-react'
import { toast } from 'sonner'

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
    specialization: 'General Surgery',
    license_number: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const payload = {
      ...form,
      username: form.email,
    }

    if (form.role !== 'doctor') {
      delete payload.specialization
      delete payload.license_number
    }

    const res = await register(payload)
    setLoading(false)

    if (res.success) {
      if (form.role === 'doctor') {
        toast.info('Doctor account registered! Verification pending from Hospital Administration.')
        navigate('/doctor/pending-approval')
      } else if (form.role === 'caregiver') {
        toast.success('Caregiver account created successfully!')
        navigate('/caregiver/dashboard')
      } else {
        toast.success('Patient account created successfully!')
        navigate('/patient/dashboard')
      }
    } else {
      // res.error is always a clean human-readable string from AuthContext.
      setError(res.error || 'Registration failed. Please try again.')
    }
  }

  return (
    <AuthLayout title="Create an account" subtitle="Fill in your details to get started">
      {error && (
        <div className="flex items-start gap-2.5 p-3 mb-5 bg-danger-tint border border-danger/20 rounded-lg text-left overflow-hidden">
          <AlertCircle size={16} className="text-danger mt-0.5 flex-shrink-0" />
          <p className="text-xs text-danger font-medium break-words min-w-0">{error}</p>
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
              className="w-full h-11 px-3.5 text-sm bg-surface border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
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
              className="w-full h-11 px-3.5 text-sm bg-surface border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
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
            className="w-full h-11 px-3.5 text-sm bg-surface border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text mb-1.5">
            Role <span className="text-danger">*</span>
          </label>
          <select
            value={form.role}
            onChange={set('role')}
            className="w-full h-11 px-3 text-sm bg-surface border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-text cursor-pointer"
          >
            <option value="patient">Patient (Recovering from surgery)</option>
            <option value="caregiver">Caregiver (Family member / Guardian)</option>
            <option value="doctor">Doctor (Attending Physician / Surgeon)</option>
          </select>
        </div>

        {form.role === 'doctor' && (
          <div className="p-3.5 bg-primary-tint/40 border border-primary/20 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs">
              <Stethoscope size={15} />
              <span>Physician Professional Credentials</span>
            </div>

            <div>
              <label className="block text-2xs font-semibold text-text-secondary mb-1">
                Clinical Specialization <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={form.specialization}
                onChange={set('specialization')}
                placeholder="e.g. Orthopedic Surgery, Cardiology, General Surgery"
                className="w-full h-10 px-3 text-xs bg-surface border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text placeholder:text-text-muted/60"
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold text-text-secondary mb-1">
                Medical License / Registration Number <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={form.license_number}
                onChange={set('license_number')}
                placeholder="e.g. MCI-123456-D or State Council Reg No."
                className="w-full h-10 px-3 text-xs bg-surface border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text placeholder:text-text-muted/60"
              />
            </div>

            <div className="flex items-start gap-1.5 pt-1 text-2xs text-text-muted leading-tight">
              <ShieldCheck size={13} className="text-primary mt-0.5 flex-shrink-0" />
              <span>Doctor accounts require hospital administrative verification before clinical access is granted.</span>
            </div>
          </div>
        )}

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
            className="w-full h-11 px-3.5 text-sm bg-surface border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
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

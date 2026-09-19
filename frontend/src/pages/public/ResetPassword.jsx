import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import { ArrowLeft } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1500)
    }, 600)
  }

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Enter and confirm your new account password"
    >
      {success ? (
        <div className="text-center py-4 space-y-3">
          <p className="text-xs font-semibold text-success">
            Password reset successful! Redirecting to login...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              New password <span className="text-danger">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter new password"
              className="w-full h-11 px-3.5 text-sm bg-white border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              Confirm new password <span className="text-danger">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new password"
              className="w-full h-11 px-3.5 text-sm bg-white border border-border-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all placeholder:text-text-muted/60"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover active:scale-[0.99] transition-all duration-150 disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-xs"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Reset Password
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

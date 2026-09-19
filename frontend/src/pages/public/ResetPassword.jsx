import React from 'react'
import { Link } from 'react-router-dom'
export default function ResetPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm bg-white border border-border rounded-lg shadow-xs p-8 text-center">
        <h1 className="text-2xl font-semibold text-text mb-2">Set new password</h1>
        <p className="text-sm text-text-muted mb-6">Enter your new password below.</p>
        <form className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-medium text-text mb-1">New password</label>
            <input type="password" placeholder="New password" className="w-full h-10 px-3 text-sm border border-border-strong rounded-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <button type="submit" className="w-full h-10 bg-primary text-white text-sm font-medium rounded-sm hover:bg-primary-hover">Reset password</button>
        </form>
        <Link to="/login" className="block mt-4 text-sm text-primary">Back to login</Link>
      </div>
    </div>
  )
}

import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, Home } from 'lucide-react'

export default function Forbidden() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-4 text-center">
      <div className="w-16 h-16 rounded-full bg-danger-tint flex items-center justify-center mb-4 text-danger">
        <ShieldAlert size={32} />
      </div>
      <h1 className="text-2xl font-bold text-text mb-2">Access Denied (403)</h1>
      <p className="text-sm text-text-secondary max-w-sm mb-6">
        You do not have the required permissions to view this resource. Please sign in with an authorized account.
      </p>
      <Link
        to="/login"
        className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-white text-sm font-medium rounded-sm hover:bg-primary-hover transition-colors"
      >
        <Home size={16} /> Sign in with another account
      </Link>
    </div>
  )
}

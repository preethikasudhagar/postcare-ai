import React from 'react'
import { Link } from 'react-router-dom'
import Logo from '../ui/Logo'

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-primary selection:text-white">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <Link to="/" className="inline-flex items-center group mb-2 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1.5 transition-transform hover:scale-[1.02]">
          <Logo variant="full" size="lg" />
        </Link>
        <p className="text-xs font-medium text-text-muted">
          Intelligent Post-Operative Recovery Platform
        </p>
      </div>

      {/* Main Centered Card */}
      <div className="w-full max-w-[440px] bg-surface border border-border rounded-xl shadow-sm p-6 sm:p-8">
        {(title || subtitle) && (
          <div className="text-center mb-6">
            {title && <h1 className="text-xl font-semibold text-text tracking-tight">{title}</h1>}
            {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
          </div>
        )}

        {children}
      </div>

      {/* Subtle Footer */}
      <div className="mt-8 text-center text-xs text-text-muted">
        <p>© {new Date().getFullYear()} PostCare AI. All rights reserved.</p>
      </div>
    </div>
  )
}

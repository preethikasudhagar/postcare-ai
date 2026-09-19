import React from 'react'
import { Link } from 'react-router-dom'

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-primary selection:text-white">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <Link to="/" className="flex items-center gap-2.5 group mb-2 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-xs group-hover:bg-primary-hover transition-colors">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <path d="M16 6v20M6 16h20" stroke="white" strokeWidth="3" strokeLinecap="round" />
              <path d="M22 10 C26 10 28 13 28 16" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-text tracking-tight">
            PostCare <span className="text-primary">AI</span>
          </span>
        </Link>
        <p className="text-xs font-medium text-text-muted">
          Intelligent Post-Operative Recovery Platform
        </p>
      </div>

      {/* Main Centered Card */}
      <div className="w-full max-w-[440px] bg-white border border-border rounded-xl shadow-sm p-6 sm:p-8">
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

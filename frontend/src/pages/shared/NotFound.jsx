import React from 'react'
import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-4 text-center">
      <div className="w-16 h-16 rounded-full bg-primary-tint flex items-center justify-center mb-4 text-primary text-2xl font-bold">
        404
      </div>
      <h1 className="text-2xl font-bold text-text mb-2">Page not found</h1>
      <p className="text-sm text-text-secondary max-w-sm mb-6">
        The requested page does not exist or may have been moved.
      </p>
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-white text-sm font-medium rounded-sm hover:bg-primary-hover transition-colors"
        >
          <Home size={16} /> Return home
        </Link>
      </div>
    </div>
  )
}

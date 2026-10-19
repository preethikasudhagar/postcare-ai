import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    } else {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-white border border-border rounded-[10px] shadow-xs my-6">
          <div className="w-12 h-12 rounded-full bg-danger-tint text-danger flex items-center justify-center mb-3">
            <AlertCircle size={26} />
          </div>
          <h2 className="text-base font-bold text-text mb-1">
            {this.props.title || 'Unable to display this view'}
          </h2>
          <p className="text-xs text-text-muted max-w-md mb-4 leading-relaxed">
            {this.state.error?.message ||
              'An unexpected runtime error occurred while rendering this component. You can try reloading or returning to the dashboard.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 h-8 px-4 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors shadow-xs"
            >
              <RotateCcw size={13} /> Try Again
            </button>
            <a
              href="/"
              className="inline-flex items-center h-8 px-4 border border-border text-text text-xs font-medium rounded hover:bg-surface-muted transition-colors"
            >
              Return Home
            </a>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

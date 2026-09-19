import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
const cn = (...a) => twMerge(clsx(...a))

// Re-export components from other UI modules
export { default as Button } from './Button.jsx'
export { Card, CardHeader, CardBody, CardFooter, StatCard } from './Card.jsx'
export { Modal, ConfirmDialog, Drawer } from './Modal.jsx'
export { Input, Textarea, Select, Checkbox, Switch, Slider } from './FormFields.jsx'
export { RiskBadge, StatusBadge } from './Badge.jsx'

export function Skeleton({ className, width, height, rounded = false }) {
  return (
    <div className={cn('skeleton', rounded && 'rounded-full', className)}
      style={{ width, height }} aria-hidden="true" />
  )
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={cn('skeleton h-3 rounded', i === lines - 1 && 'w-3/4')} />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-border rounded-[10px] p-5 space-y-3" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-[8px]" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-2/3 rounded" />
          <div className="skeleton h-3 w-1/2 rounded" />
        </div>
      </div>
      <div className="skeleton h-20 rounded" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3 px-4 border-b border-border">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className={cn('skeleton h-4 rounded flex-1', j === 0 && 'max-w-[120px]')} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-primary-tint flex items-center justify-center mb-4">
          <Icon size={28} className="text-primary" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-md font-semibold text-text mb-1">{title}</h3>
      {description && <p className="text-sm text-text-muted max-w-xs">{description}</p>}
      {action && (
        <button onClick={action.onClick}
          className="mt-4 h-9 px-4 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-sm transition-colors">
          {action.label}
        </button>
      )}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', description, onRetry, details }) {
  const [show, setShow] = React.useState(false)
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-danger-tint flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C62828" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h3 className="text-md font-semibold text-text mb-1">{title}</h3>
      {description && <p className="text-sm text-text-muted max-w-xs mb-4">{description}</p>}
      {onRetry && (
        <button onClick={onRetry}
          className="h-9 px-4 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-sm transition-colors">
          Try again
        </button>
      )}
      {details && (
        <button onClick={() => setShow(s => !s)}
          className="mt-2 text-xs text-text-muted underline">
          {show ? 'Hide' : 'Show'} details
        </button>
      )}
      {show && details && (
        <pre className="mt-2 text-xs bg-surface-muted p-3 rounded text-left max-w-sm overflow-auto">{details}</pre>
      )}
    </div>
  )
}

export function Avatar({ name = '', src, size = 'md', className }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' }
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['bg-primary', 'bg-secondary', 'bg-success', 'bg-warning']
  const bg = colors[name.charCodeAt(0) % colors.length] || 'bg-primary'

  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0', sizes[size], !src && bg, className)}>
      {src ? <img src={src} alt={name} className="w-full h-full rounded-full object-cover" /> : initials}
    </div>
  )
}

export function ProgressBar({ value = 0, color = 'primary', size = 'md', showLabel = false, animated = false }) {
  const heights = { sm: 'h-1', md: 'h-2', lg: 'h-3' }
  const colors = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }
  return (
    <div className="w-full">
      {showLabel && <div className="flex justify-between text-xs text-text-muted mb-1"><span>Progress</span><span className="tabular-nums">{value}%</span></div>}
      <div className={cn('w-full bg-border rounded-full overflow-hidden', heights[size])}>
        <div className={cn('rounded-full transition-all duration-500', heights[size], colors[color], animated && 'animate-pulse')}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  )
}

export function PageHeader({ breadcrumbs = [], title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
      <div>
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-text-muted mb-2" aria-label="Breadcrumb">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>/</span>}
                {b.href ? (
                  <a href={b.href} className="hover:text-text transition-colors">{b.label}</a>
                ) : (
                  <span className="text-text">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-2xl sm:text-3xl font-semibold text-text">{title}</h1>
        {description && <p className="text-xs sm:text-sm text-text-secondary mt-1">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

export function DisclaimerNote({ compact = false, className }) {
  return (
    <div className={cn('flex items-start gap-3 p-3 bg-primary-tint border border-primary/20 rounded-[10px]', className)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D5FD1" strokeWidth="2" className="mt-0.5 flex-shrink-0">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p className="text-xs text-primary">
        {compact
          ? 'ML classification is an academic prototype. Not a medical diagnosis.'
          : 'This ML classification is an academic prototype and should not be used as a substitute for professional medical judgment. All predictions are for demonstration purposes only using synthetic data.'}
      </p>
    </div>
  )
}

export function Stepper({ steps, currentStep, onStepClick }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {steps.map((step, i) => {
        const isCompleted = i < currentStep
        const isCurrent = i === currentStep
        const isClickable = typeof onStepClick === 'function'
        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(i)}
              className={cn(
                'flex flex-col items-center flex-shrink-0 focus:outline-none transition-all',
                isClickable ? 'cursor-pointer group' : 'cursor-default'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all',
                isCompleted ? 'bg-primary border-primary text-white group-hover:bg-primary-hover group-hover:scale-105' :
                isCurrent ? 'border-primary text-primary bg-white ring-2 ring-primary/20 shadow-xs' :
                'border-border text-text-muted bg-white group-hover:border-border-strong'
              )}>
                {isCompleted ? '✓' : i + 1}
              </div>
              <span className={cn(
                'text-2xs mt-1.5 font-medium whitespace-nowrap transition-colors',
                isCurrent ? 'text-primary font-semibold' : 'text-text-muted group-hover:text-text'
              )}>
                {step.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className={cn('flex-1 min-w-[20px] h-0.5 mb-5 mx-1 transition-colors', isCompleted ? 'bg-primary' : 'bg-border')} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export function Alert({ variant = 'info', title, message, dismissible = false, onDismiss }) {
  const cfg = {
    info:    { bg: 'bg-primary-tint border-primary/20', icon: '💡', text: 'text-primary' },
    success: { bg: 'bg-success-tint border-success/20', icon: '✓', text: 'text-success' },
    warning: { bg: 'bg-warning-tint border-warning/20', icon: '⚠', text: 'text-warning' },
    error:   { bg: 'bg-danger-tint border-danger/20',   icon: '✕', text: 'text-danger' },
  }[variant]
  return (
    <div className={cn('flex items-start gap-3 p-4 border rounded-[10px]', cfg.bg)}>
      <span className={cn('font-bold flex-shrink-0', cfg.text)}>{cfg.icon}</span>
      <div className="flex-1">
        {title && <p className={cn('text-sm font-semibold', cfg.text)}>{title}</p>}
        {message && <p className="text-sm text-text-secondary mt-0.5">{message}</p>}
      </div>
    </div>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex border-b border-border overflow-x-auto">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          aria-current={active === t.id ? 'page' : undefined}
          className={cn(
            'px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap',
            active === t.id
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text hover:border-border-strong'
          )}
        >
          {t.label}
          {t.badge && (
            <span className="ml-1.5 px-1.5 py-0.5 text-2xs bg-danger text-white rounded-full tabular-nums">{t.badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}

export default Skeleton

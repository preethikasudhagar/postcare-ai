import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
const cn = (...a) => twMerge(clsx(...a))

export function Card({ children, className, interactive = false, alert = false }) {
  return (
    <div className={cn(
      'bg-white border border-border rounded-[10px] shadow-xs',
      interactive && 'cursor-pointer hover:shadow-sm transition-shadow duration-150',
      alert && 'border-l-4 border-l-danger',
      className
    )}>
      {children}
    </div>
  )
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn('flex items-start justify-between px-5 pt-5 pb-0', className)}>
      <div>
        <h3 className="text-md font-semibold text-text">{title}</h3>
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  )
}

export function CardBody({ children, className }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}

export function CardFooter({ children, className }) {
  return (
    <div className={cn('px-5 pb-5 pt-0 border-t border-border mt-0 flex items-center gap-2', className)}>
      {children}
    </div>
  )
}

export function StatCard({ label, value, icon: Icon, iconBg = 'bg-primary-tint', iconColor = 'text-primary', trend, trendUp, loading = false, className }) {
  if (loading) {
    return (
      <div className={cn('bg-white border border-border rounded-[10px] shadow-xs p-5', className)}>
        <div className="flex items-start justify-between">
          <div className="skeleton h-10 w-10 rounded-[8px]" />
          <div className="skeleton h-4 w-16 rounded mt-1" />
        </div>
        <div className="mt-4 skeleton h-8 w-20 rounded" />
        <div className="mt-2 skeleton h-3 w-24 rounded" />
      </div>
    )
  }
  return (
    <div className={cn('bg-white border border-border rounded-[10px] shadow-xs p-5', className)}>
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-[8px] flex items-center justify-center', iconBg)}>
          {Icon && <Icon size={20} className={iconColor} strokeWidth={1.75} />}
        </div>
        {trend !== undefined && (
          <span className={cn('text-xs font-medium', trendUp ? 'text-success' : 'text-danger')}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-4xl font-semibold tabular-nums text-text">{value}</div>
        <div className="text-xs text-text-muted mt-1 font-medium">{label}</div>
      </div>
    </div>
  )
}

export default Card

import React from 'react'
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
const cn = (...a) => twMerge(clsx(...a))

const riskConfig = {
  low:    { label: 'Low risk',    bg: 'bg-success-tint', text: 'text-success', Icon: CheckCircle },
  medium: { label: 'Medium risk', bg: 'bg-warning-tint', text: 'text-warning', Icon: AlertTriangle },
  high:   { label: 'High risk',   bg: 'bg-danger-tint',  text: 'text-danger',  Icon: AlertCircle },
}

const statusConfig = {
  upcoming:     { label: 'Upcoming',     bg: 'bg-primary-tint',  text: 'text-primary' },
  completed:    { label: 'Completed',    bg: 'bg-success-tint',  text: 'text-success' },
  missed:       { label: 'Missed',       bg: 'bg-danger-tint',   text: 'text-danger' },
  rescheduled:  { label: 'Rescheduled',  bg: 'bg-warning-tint',  text: 'text-warning' },
  taken:        { label: 'Taken',        bg: 'bg-success-tint',  text: 'text-success' },
  pending:      { label: 'Pending',      bg: 'bg-warning-tint',  text: 'text-warning' },
  active:       { label: 'Active',       bg: 'bg-primary-tint',  text: 'text-primary' },
  draft:        { label: 'Draft',        bg: 'bg-surface-muted', text: 'text-text-secondary' },
  published:    { label: 'Published',    bg: 'bg-success-tint',  text: 'text-success' },
  patient:      { label: 'Patient',      bg: 'bg-secondary-tint',text: 'text-secondary' },
  doctor:       { label: 'Doctor',       bg: 'bg-primary-tint',  text: 'text-primary' },
  nurse:        { label: 'Nurse',        bg: 'bg-warning-tint',  text: 'text-warning' },
  admin:        { label: 'Admin',        bg: 'bg-danger-tint',   text: 'text-danger' },
  caregiver:    { label: 'Caregiver',    bg: 'bg-surface-muted', text: 'text-text-secondary' },
}

export function RiskBadge({ level }) {
  const cfg = riskConfig[level] || riskConfig.low
  const { Icon } = cfg
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.text)}>
      <Icon size={11} aria-hidden="true" />
      {cfg.label}
    </span>
  )
}

export function StatusBadge({ status }) {
  const cfg = statusConfig[status] || { label: status, bg: 'bg-surface-muted', text: 'text-text-secondary' }
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.text)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {cfg.label}
    </span>
  )
}

export default RiskBadge

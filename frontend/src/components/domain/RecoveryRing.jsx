import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
const cn = (...a) => twMerge(clsx(...a))

export default function RecoveryRing({ value = 78, size = 120, showCategory = true, label = 'Recovery score' }) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  let color = '#15803D' // Green
  let category = 'Good progress'
  let bgTint = 'text-success'

  if (value < 50) {
    color = '#C62828'
    category = 'High attention'
    bgTint = 'text-danger'
  } else if (value < 80) {
    color = '#B45309'
    category = 'Needs monitoring'
    bgTint = 'text-warning'
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-bold text-text tabular-nums leading-none">{value}</span>
          <span className="text-2xs text-text-muted mt-0.5">/ 100</span>
        </div>
      </div>
      {showCategory && (
        <div className="text-center mt-3">
          <p className={cn('text-xs font-semibold', bgTint)}>{category}</p>
          <p className="text-2xs text-text-muted">{label}</p>
        </div>
      )}
    </div>
  )
}

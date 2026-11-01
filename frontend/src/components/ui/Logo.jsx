import React, { useId } from 'react'

/**
 * Official PostCare AI Brand Logo Component
 * Option 6: Caregiver + Patient symbol with Medical Cross & Green Recovery Swoosh
 * 
 * @param {('full'|'icon')} variant - 'full' includes icon + wordmark, 'icon' is standalone mark
 * @param {('light'|'dark')} theme - 'light' for light backgrounds, 'dark' for dark backgrounds
 * @param {('xs'|'sm'|'md'|'lg'|'xl')} size - Predefined sizing scale
 * @param {boolean} compact - Shortcut for variant="icon"
 * @param {string} subtitle - Optional secondary tagline (e.g. "Recovery Management")
 * @param {string} className - Additional CSS classes
 */
export default function Logo({
  variant = 'full',
  theme = 'light',
  size = 'md',
  compact = false,
  subtitle,
  className = '',
  ...props
}) {
  const uid = useId().replace(/:/g, '_')
  const isIconOnly = compact || variant === 'icon'
  const isDark = theme === 'dark'

  // Gradient IDs scoped to this instance
  const caregiverGradId = `caregiverGrad_${uid}`
  const patientGradId = `patientGrad_${uid}`
  const badgeGradId = `badgeGrad_${uid}`
  const swooshGradId = `swooshGrad_${uid}`

  // Sizing maps
  const iconSizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }

  const textSizes = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }

  const currentIconSize = iconSizes[size] || iconSizes.md
  const currentTextSize = textSizes[size] || textSizes.md

  // Wordmark colors
  const postcareColor = isDark ? '#FFFFFF' : '#1E1B4B'
  const aiColor = isDark ? '#A78BFA' : '#7138D8'

  // Vector mark element
  const MarkSvg = (
    <svg
      viewBox="0 0 280 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${currentIconSize} flex-shrink-0 transition-transform duration-200`}
      aria-hidden="true"
    >
      <defs>
        {/* Caregiver gradient: Royal purple (#7138D8) to deep purple (#5421A8) */}
        <linearGradient id={caregiverGradId} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#7138D8" />
          <stop offset="100%" stopColor="#5421A8" />
        </linearGradient>

        {/* Patient gradient: Soft lavender (#A78BFA) to royal purple (#7138D8) */}
        <linearGradient id={patientGradId} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#7138D8" />
        </linearGradient>

        {/* Badge disc gradient */}
        <linearGradient id={badgeGradId} x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#7138D8" />
          <stop offset="100%" stopColor="#5421A8" />
        </linearGradient>

        {/* Green recovery swoosh gradient */}
        <linearGradient id={swooshGradId} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="45%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#16A34A" />
        </linearGradient>
      </defs>

      {/* Left: Caregiver Head */}
      <circle cx="116" cy="66" r="36" fill={`url(#${caregiverGradId})`} />

      {/* Right: Patient Head */}
      <circle cx="203" cy="88" r="31" fill={`url(#${patientGradId})`} />

      {/* Patient Torso (Positioned behind Caregiver) */}
      <path
        d="M 152 135 C 168 122 188 122 208 122 C 246 122 272 150 274 202 C 242 206 198 202 176 192 C 164 168 155 148 152 135 Z"
        fill={`url(#${patientGradId})`}
      />

      {/* Subtle separation contour */}
      <path
        d="M 8 205 C 8 146 50 110 116 110 C 148 110 172 124 186 146 C 148 160 86 186 8 205 Z"
        fill="#FFFFFF"
        opacity="0.15"
      />

      {/* Caregiver Torso (Foreground left) */}
      <path
        d="M 10 203 C 10 148 50 112 116 112 C 146 112 170 126 184 147 C 146 161 86 186 10 203 Z"
        fill={`url(#${caregiverGradId})`}
      />

      {/* Green Recovery Swoosh Accent */}
      <path
        d="M 8 214 C 42 188 94 188 146 206 C 196 224 244 218 274 194 C 260 228 206 244 150 232 C 94 220 44 232 8 214 Z"
        fill={`url(#${swooshGradId})`}
      />

      {/* Medical Cross Badge Container */}
      {/* Outer white halo / contrast ring */}
      <circle cx="178" cy="172" r="52" fill="#FFFFFF" />
      {/* Inner royal/deep purple disc */}
      <circle cx="178" cy="172" r="46" fill={`url(#${badgeGradId})`} />

      {/* Pure White Medical Cross with rounded caps */}
      <rect x="170" y="146" width="16" height="52" rx="4" fill="#FFFFFF" />
      <rect x="152" y="164" width="52" height="16" rx="4" fill="#FFFFFF" />
    </svg>
  )

  if (isIconOnly) {
    return (
      <div
        className={`inline-flex items-center justify-center ${className}`}
        title="PostCare AI"
        {...props}
      >
        {MarkSvg}
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center gap-3 ${className}`}
      {...props}
    >
      {MarkSvg}
      <div className="flex flex-col text-left">
        <span className={`font-bold tracking-tight leading-none ${currentTextSize}`}>
          <span style={{ color: postcareColor }}>PostCare</span>{' '}
          <span style={{ color: aiColor }}>AI</span>
        </span>
        {subtitle && (
          <span className="text-2xs font-medium text-text-muted leading-tight mt-1">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}

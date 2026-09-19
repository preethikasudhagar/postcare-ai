import React, { useState } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
const cn = (...a) => twMerge(clsx(...a))

function InputWrapper({ label, name, required, error, helperText, children }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={name} className="text-xs font-medium text-text">
          {label}{required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-xs text-danger">
          <AlertCircle size={12} />{error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-text-muted">{helperText}</p>
      ) : null}
    </div>
  )
}

export function Input({ label, name, type = 'text', placeholder, value, onChange, onBlur, error, helperText, required, disabled, className, autoComplete, ...props }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <InputWrapper label={label} name={name} required={required} error={error} helperText={helperText}>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={isPassword ? (show ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          className={cn(
            'w-full h-10 px-3 text-sm bg-white border rounded-sm text-text placeholder-text-muted',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 focus:border-primary',
            error ? 'border-danger bg-danger-tint' : 'border-border-strong hover:border-primary',
            disabled && 'bg-surface-muted text-text-muted cursor-not-allowed',
            isPassword && 'pr-10',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text">
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </InputWrapper>
  )
}

export function Textarea({ label, name, placeholder, value, onChange, onBlur, error, helperText, required, disabled, rows = 4, className, ...props }) {
  return (
    <InputWrapper label={label} name={name} required={required} error={error} helperText={helperText}>
      <textarea
        id={name} name={name} placeholder={placeholder} value={value}
        onChange={onChange} onBlur={onBlur} disabled={disabled} required={required} rows={rows}
        className={cn(
          'w-full px-3 py-2 text-sm bg-white border rounded-sm text-text placeholder-text-muted resize-y',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors',
          error ? 'border-danger bg-danger-tint' : 'border-border-strong hover:border-primary',
          disabled && 'bg-surface-muted cursor-not-allowed',
          className
        )}
        {...props}
      />
    </InputWrapper>
  )
}

export function Select({ label, name, options = [], value, onChange, onBlur, error, helperText, required, disabled, className, placeholder = 'Select…' }) {
  return (
    <InputWrapper label={label} name={name} required={required} error={error} helperText={helperText}>
      <select
        id={name} name={name} value={value} onChange={onChange} onBlur={onBlur}
        disabled={disabled} required={required}
        className={cn(
          'w-full h-10 px-3 text-sm bg-white border rounded-sm text-text appearance-none',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors',
          error ? 'border-danger' : 'border-border-strong hover:border-primary',
          disabled && 'bg-surface-muted cursor-not-allowed',
          className
        )}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </InputWrapper>
  )
}

export function Checkbox({ name, label, checked, onChange, helperText, disabled }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input type="checkbox" name={name} checked={checked} onChange={onChange} disabled={disabled}
        className="w-4 h-4 mt-0.5 text-primary border-border-strong rounded focus:ring-primary" />
      <span>
        <span className="text-sm text-text">{label}</span>
        {helperText && <span className="block text-xs text-text-muted">{helperText}</span>}
      </span>
    </label>
  )
}

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className={cn('relative w-10 h-6 rounded-full transition-colors duration-200',
        checked ? 'bg-primary' : 'bg-border-strong', disabled && 'opacity-50')}
        onClick={() => !disabled && onChange(!checked)}>
        <div className={cn('absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
          checked && 'translate-x-4')} />
      </div>
      {label && <span className="text-sm text-text">{label}</span>}
    </label>
  )
}

export function Slider({ min = 0, max = 10, value, onChange, step = 1, label, minLabel, maxLabel, showValue = true }) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text">{label}</label>
          {showValue && (
            <span className="text-2xl font-semibold tabular-nums text-primary">{value}</span>
          )}
        </div>
      )}
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-border rounded-full appearance-none cursor-pointer accent-primary" />
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-xs text-text-muted">
          <span>{minLabel}</span><span>{maxLabel}</span>
        </div>
      )}
    </div>
  )
}

export default Input

import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
const cn = (...a) => twMerge(clsx(...a))

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

export function Modal({ isOpen, onClose, title, subtitle, children, footer, size = 'md' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const prev = document.activeElement
    ref.current?.focus()
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 animate-fadeIn" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative bg-white rounded-lg shadow-lg w-full animate-slideUp focus:outline-none',
          sizes[size]
        )}
      >
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-text">{title}</h2>
            {subtitle && <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-sm text-text-muted hover:text-text hover:bg-surface-muted transition-colors ml-4">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[70vh]">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 p-5 pt-0">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'warning', loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <button onClick={onClose}
            className="h-9 px-4 text-sm font-medium text-text-secondary border border-border-strong rounded-sm hover:bg-surface-muted transition-colors">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={cn(
              'h-9 px-4 text-sm font-medium text-white rounded-sm transition-colors disabled:opacity-50 flex items-center gap-2',
              variant === 'danger' ? 'bg-danger hover:bg-danger-hover' : 'bg-primary hover:bg-primary-hover'
            )}>
            {loading && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{description}</p>
    </Modal>
  )
}

export function Drawer({ isOpen, onClose, title, children, footer, side = 'right', size = 'md' }) {
  const widths = { sm: 'w-80', md: 'w-[480px]', lg: 'w-[600px]' }

  useEffect(() => {
    if (!isOpen) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={cn(
        'relative ml-auto bg-white shadow-lg flex flex-col animate-slideUp max-h-screen',
        widths[size]
      )}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-sm text-text-muted hover:text-text hover:bg-surface-muted">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="p-5 border-t border-border flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export default Modal

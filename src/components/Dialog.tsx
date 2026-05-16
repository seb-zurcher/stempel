import type { ReactNode } from 'react'

interface Props {
  onClose: () => void
  children: ReactNode
}

export function Dialog({ onClose, children }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded flex flex-col gap-4 p-5 animate-fade-in overflow-hidden"
        style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

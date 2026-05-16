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
      {/*
        Outer div owns overflow-hidden + border-radius with NO transform.
        Inner div owns the animation (which GPU-composites the element).
        Keeping them separate is required on iOS: native date/time controls
        render in their own compositor layer and are not clipped by
        overflow:hidden on a composited (transform-animated) ancestor.
      */}
      <div
        className="w-full max-w-sm rounded overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        <div
          className="flex flex-col gap-4 p-5 animate-fade-in"
          style={{ backgroundColor: 'var(--bg)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

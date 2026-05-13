import { useToastStore } from '../store/useToastStore'
import type { Toast } from '../store/useToastStore'

const BG: Record<Toast['type'], string> = {
  success: '#166534',
  error:   '#c73e3a',
  info:    '#1e293b',
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2.5 rounded text-sm font-medium text-white shadow-lg max-w-sm w-full text-center ${
            t.leaving ? 'animate-toast-out' : 'animate-toast-in'
          }`}
          style={{ backgroundColor: BG[t.type] }}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

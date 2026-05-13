import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  leaving: boolean
}

interface ToastStore {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast(message, type = 'info') {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, type, leaving: false }] }))

    // Begin leave animation after 3 s, then remove from DOM after 150 ms
    setTimeout(() => {
      set((s) => ({
        toasts: s.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
      }))
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, 150)
    }, 3_000)
  },
}))

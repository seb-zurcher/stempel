import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        accent:      '#1E2A4A',
        destructive: '#FF6B5B',
      },
      keyframes: {
        'stamp': {
          '0%':   { transform: 'translateY(-14px) scale(1.12)', opacity: '0' },
          '55%':  { transform: 'translateY(4px)   scale(0.95)', opacity: '1' },
          '75%':  { transform: 'translateY(-2px)  scale(1.01)' },
          '100%': { transform: 'translateY(0)     scale(1)',    opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(1rem)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        'slide-down': {
          from: { transform: 'translateY(0)',    opacity: '1' },
          to:   { transform: 'translateY(1rem)', opacity: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'stamp':     'stamp 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        'toast-in':  'slide-up   0.18s ease-out',
        'toast-out': 'slide-down 0.15s ease-in forwards',
        'fade-in':   'fade-in    0.15s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config

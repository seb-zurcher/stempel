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
        accent: '#c73e3a',
      },
      keyframes: {
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
        'toast-in':  'slide-up   0.18s ease-out',
        'toast-out': 'slide-down 0.15s ease-in forwards',
        'fade-in':   'fade-in    0.15s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config

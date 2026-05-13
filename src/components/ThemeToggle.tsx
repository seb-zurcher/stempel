import { Sun, Moon, Monitor } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Settings } from '../lib/db'
import { strings } from '../lib/strings.de'

type Theme = Settings['theme']

const CYCLE: Theme[] = ['system', 'light', 'dark']

const ICONS: Record<Theme, React.ElementType> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
}

const LABELS: Record<Theme, string> = {
  system: strings.themeSystem,
  light: strings.themeLight,
  dark: strings.themeDark,
}

export function ThemeToggle() {
  const theme = useStore((s) => s.settings.theme)
  const updateSettings = useStore((s) => s.updateSettings)

  const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]
  const Icon = ICONS[theme]

  return (
    <button
      onClick={() => updateSettings({ theme: next })}
      aria-label={`${strings.theme}: ${LABELS[theme]}`}
      title={`${strings.theme}: ${LABELS[theme]}`}
      className="p-2 rounded transition-opacity opacity-50 hover:opacity-100"
    >
      <Icon size={16} />
    </button>
  )
}

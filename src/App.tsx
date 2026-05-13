import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import Stempeluhr from './pages/Stempeluhr'
import Rechner from './pages/Rechner'
import Einstellungen from './pages/Einstellungen'
import { ThemeToggle } from './components/ThemeToggle'
import { useStore } from './store/useStore'
import { strings } from './lib/strings.de'
import { Settings } from 'lucide-react'

function AppShell() {
  const loc = useLocation()
  const navigate = useNavigate()
  const settingsActive = loc.pathname === '/einstellungen'
  const handleSyncCallback = useStore((s) => s.handleSyncCallback)

  // Detect OAuth redirect back to the app
  useEffect(() => {
    const params = new URLSearchParams(loc.search)
    const code = params.get('code')
    if (!code) return
    window.history.replaceState({}, '', window.location.pathname)
    handleSyncCallback(code).then(() => navigate('/einstellungen'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 pt-4 flex items-center justify-between">
          <span className="font-semibold tracking-tight text-base" style={{ color: 'var(--accent)' }}>
            Stempel
          </span>
          <div className="flex items-center">
            <ThemeToggle />
            <Link
              to="/einstellungen"
              aria-label={strings.settings}
              title={strings.settings}
              className="p-2 rounded transition-opacity hover:opacity-100"
              style={{ opacity: settingsActive ? 1 : 0.5 }}
            >
              <Settings size={16} />
            </Link>
          </div>
        </div>
        <nav className="max-w-2xl mx-auto px-4 mt-2 flex gap-0">
          <NavLink
            to="/stempeluhr"
            style={({ isActive }) => ({
              borderBottomColor: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--muted)',
            })}
            className="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          >
            {strings.tab1}
          </NavLink>
          <NavLink
            to="/rechner"
            style={({ isActive }) => ({
              borderBottomColor: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--muted)',
            })}
            className="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
          >
            {strings.tab2}
          </NavLink>
        </nav>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/stempeluhr" replace />} />
          <Route path="/stempeluhr" element={<Stempeluhr />} />
          <Route path="/rechner" element={<Rechner />} />
          <Route path="/einstellungen" element={<Einstellungen />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const init = useStore((s) => s.init)
  const theme = useStore((s) => s.settings.theme)

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'dark') { root.classList.add('dark'); return }
    if (theme === 'light') { root.classList.remove('dark'); return }

    // system: mirror prefers-color-scheme
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    root.classList.toggle('dark', mq.matches)
    const handler = (e: MediaQueryListEvent) => root.classList.toggle('dark', e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

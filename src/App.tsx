import { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import Stempeluhr from './pages/Stempeluhr'
import Rechner from './pages/Rechner'
import Einstellungen from './pages/Einstellungen'
import { ThemeToggle } from './components/ThemeToggle'
import { Toaster } from './components/Toaster'
import { useStore } from './store/useStore'
import { useToastStore } from './store/useToastStore'
import { strings } from './lib/strings.de'
import { Settings } from 'lucide-react'

// Capture the OAuth code at module level — before any React rendering.
// The root <Navigate to="/stempeluhr"> fires during render and would strip
// the ?code= query string before useEffect has a chance to read it.
let pendingOAuthCode: string | null =
  new URLSearchParams(window.location.search).get('code')
if (pendingOAuthCode) {
  // Clean the URL immediately so the router never sees the code params.
  window.history.replaceState({}, '', window.location.pathname)
}

function AppShell() {
  const loc = useLocation()
  const navigate = useNavigate()
  const settingsActive = loc.pathname === '/einstellungen'
  const handleSyncCallback = useStore((s) => s.handleSyncCallback)
  const addToast = useToastStore((s) => s.addToast)

  // Process the OAuth code captured at module level before routing ran.
  // The ref prevents StrictMode's double-invocation from redeeming the
  // same code twice (codes are single-use; second attempt → invalid_grant).
  const oauthHandled = useRef(false)
  useEffect(() => {
    if (!pendingOAuthCode || oauthHandled.current) return
    oauthHandled.current = true
    const code = pendingOAuthCode
    pendingOAuthCode = null // consume so re-mounts don't retry
    // Navigate first so the toast appears on Einstellungen, not Stempeluhr.
    // handleSyncCallback fires syncNow() in background after token exchange.
    navigate('/einstellungen')
    handleSyncCallback(code)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Offline / back-online toasts
  useEffect(() => {
    const onOffline = () => addToast(strings.toastOffline, 'info')
    window.addEventListener('offline', onOffline)
    return () => window.removeEventListener('offline', onOffline)
  }, [addToast])

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-4 pt-5 flex items-center justify-between">
          {/* Brand — stamp icon + name, animated on load */}
          <div className="flex items-center gap-2.5 animate-stamp">
            {/* logo.svg has no background rect — container provides themed bg */}
            <div
              className="w-9 h-9 rounded-md overflow-hidden shrink-0 flex items-center justify-center bg-[#ECEAE3] dark:bg-[#2C3B5A]"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
            >
              <img
                src="/icons/logo.svg"
                alt=""
                aria-hidden="true"
                className="w-full h-full"
              />
            </div>
            <span
              className="font-mono font-bold tracking-[0.2em] text-base uppercase select-none"
              style={{ color: 'var(--accent)' }}
            >
              Stempel
            </span>
          </div>
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

      <Toaster />
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
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell />
    </BrowserRouter>
  )
}

import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { Dialog } from '../components/Dialog'
import { createStempelData, downloadStempelData, parseStempelData } from '../lib/json-data'
import type { StempelData } from '../lib/json-data'
import { strings } from '../lib/strings.de'
import { hasClientId } from '../lib/auth'
import { formatDate } from '../lib/time'

export default function Einstellungen() {
  const {
    entries, settings, importData,
    enableSync, syncNow, signOut,
    syncStatus, syncError,
  } = useStore()

  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<StempelData | null>(null)
  const [importError, setImportError] = useState('')
  const [importDone, setImportDone] = useState('')

  // ── JSON export / import ──────────────────────────────────────────────────

  function handleExport() {
    downloadStempelData(createStempelData(entries, settings))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImportError('')
    setImportDone('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string)
        setPending(parseStempelData(raw))
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Fehler beim Lesen der Datei.')
      }
    }
    reader.readAsText(file)
  }

  async function handleImport(mode: 'merge' | 'replace') {
    if (!pending) return
    await importData(pending, mode)
    setPending(null)
    setImportDone(
      mode === 'merge'
        ? 'Daten erfolgreich zusammengeführt.'
        : 'Daten erfolgreich ersetzt.',
    )
  }

  // ── Shared styles ─────────────────────────────────────────────────────────

  const sectionHead = 'text-xs font-semibold uppercase tracking-widest mb-3'
  const btnOutline = 'w-full text-left px-4 py-2.5 text-sm rounded transition-opacity hover:opacity-80'
  const btnPrimary = 'px-4 py-1.5 text-sm rounded font-medium text-white'

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">{strings.settings}</h1>

      {/* ── Google Drive Sync ─────────────────────────────────────────── */}
      <section>
        <h2 className={sectionHead} style={{ color: 'var(--muted)' }}>
          {strings.syncToggle}
        </h2>

        {!hasClientId && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            <code className="font-mono text-xs">VITE_GOOGLE_CLIENT_ID</code> nicht konfiguriert.
            Siehe <code className="font-mono text-xs">.env.example</code>.
          </p>
        )}

        {hasClientId && !settings.syncEnabled && (
          <button
            onClick={() => enableSync()}
            className={btnOutline}
            style={{ border: '1px solid var(--border)', color: 'var(--fg)' }}
          >
            Synchronisation aktivieren →
          </button>
        )}

        {hasClientId && settings.syncEnabled && (
          <div className="flex flex-col gap-3">
            {/* Status line */}
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              {syncStatus === 'syncing' && <span>Wird synchronisiert…</span>}
              {syncStatus === 'idle' && settings.lastSyncAt && (
                <span>
                  {strings.toastSyncSuccess} —{' '}
                  <span className="font-mono">
                    {new Date(settings.lastSyncAt).toLocaleTimeString('de-CH', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                    {', '}
                    {formatDate(settings.lastSyncAt.slice(0, 10))}
                  </span>
                </span>
              )}
              {syncStatus === 'error' && (
                <span style={{ color: 'var(--accent)' }}>
                  {strings.toastSyncError}: {syncError}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => syncNow()}
                disabled={syncStatus === 'syncing'}
                className={btnPrimary}
                style={{ backgroundColor: 'var(--accent)', opacity: syncStatus === 'syncing' ? 0.6 : 1 }}
              >
                {strings.syncNow}
              </button>
              <button
                onClick={() => signOut()}
                className="px-4 py-1.5 text-sm rounded"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
              >
                {strings.signOut}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── JSON backup ───────────────────────────────────────────────── */}
      <section>
        <h2 className={sectionHead} style={{ color: 'var(--muted)' }}>
          Datensicherung
        </h2>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleExport}
            className={btnOutline}
            style={{ border: '1px solid var(--border)', color: 'var(--fg)' }}
          >
            {strings.jsonExport}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className={btnOutline}
            style={{ border: '1px solid var(--border)', color: 'var(--fg)' }}
          >
            {strings.jsonImport}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {importError && (
          <p className="mt-2 text-xs" style={{ color: 'var(--accent)' }}>{importError}</p>
        )}
        {importDone && (
          <p className="mt-2 text-xs" style={{ color: '#166534' }}>{importDone}</p>
        )}
      </section>

      {/* Merge-or-replace dialog */}
      {pending && (
        <Dialog onClose={() => setPending(null)}>
          <h3 className="font-semibold text-sm">{strings.jsonImport}</h3>
          <div className="text-sm" style={{ color: 'var(--muted)' }}>
            <p>
              Gefunden:{' '}
              <span className="font-mono" style={{ color: 'var(--fg)' }}>
                {pending.entries.length}
              </span>{' '}
              Einträge.
            </p>
            <p className="mt-1">Wie sollen die Daten importiert werden?</p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleImport('merge')}
              className="px-4 py-2 text-sm rounded font-medium text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              Zusammenführen
              <span className="block text-xs font-normal opacity-80">
                Neuere Einträge gewinnen — lokale Daten bleiben erhalten.
              </span>
            </button>
            <button
              onClick={() => handleImport('replace')}
              className="px-4 py-2 text-sm rounded"
              style={{ border: '1px solid var(--border)', color: 'var(--fg)' }}
            >
              Ersetzen
              <span className="block text-xs font-normal" style={{ color: 'var(--muted)' }}>
                Alle lokalen Daten werden überschrieben.
              </span>
            </button>
          </div>
          <button
            onClick={() => setPending(null)}
            className="text-xs self-end"
            style={{ color: 'var(--muted)' }}
          >
            Abbrechen
          </button>
        </Dialog>
      )}
    </div>
  )
}

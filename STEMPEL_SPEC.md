# Stempel — Build Specification

> **App name:** Stempel
> **Purpose:** Personal time-tracking PWA for when the corporate HR tool is down or unreachable (travel, outages, MDM-restricted devices).
> **Target user:** Single user (private use). No multi-user, no auth beyond personal Google Drive sync.
> **Hosting:** GitHub Pages (static site, no backend).
> **UI language:** German (all labels, menus, buttons, errors, toasts).
> **Chat/dev language:** English.

---

## 1. High-level overview

Stempel is a two-tab PWA:

- **Tab 1 — Stempeluhr (Time Tracker):** Manual clock-in/clock-out with note field. Daily and weekly overview with totals and overtime vs. an 8h 18min (498 min) daily target. Export to CSV and PDF.
- **Tab 2 — Feierabend-Rechner (Finish-time Calculator):** Pure stateless calculator. Input clock-in time, lunch break duration, and optional overtime; output: planned finish time. No data saved.

The app must work fully offline once loaded (PWA), with iPhone home-screen install as the primary use case, and desktop browser as a secondary read-only viewer.

---

## 2. Tech stack

- **Framework:** React 18 + Vite (TypeScript).
- **Styling:** Tailwind CSS with CSS variables for theming (light/dark/system).
- **State:** Zustand (lightweight, no Redux ceremony).
- **Local storage:** IndexedDB via `idb` library (more robust than LocalStorage; survives more wipes than LocalStorage).
- **PWA:** `vite-plugin-pwa` with Workbox for offline caching and installability.
- **Sync (iPhone only):** Google Drive API via App Folder scope (`drive.appdata`). OAuth 2.0 with PKCE, no client secret needed (suitable for static hosting).
- **Date/time:** `date-fns` (small, tree-shakeable).
- **PDF export:** `jspdf` + `jspdf-autotable`.
- **Icons:** `lucide-react`.
- **Routing:** `react-router-dom` (two routes: `/stempeluhr` and `/rechner`).

**Build target:** Modern evergreen browsers + iOS Safari 16+.

---

## 3. Data model

```ts
// IndexedDB store: "entries"
interface TimeEntry {
  id: string;              // uuid v4
  date: string;            // ISO date "YYYY-MM-DD" — the work day this entry belongs to
  clockIn: string;         // ISO datetime "YYYY-MM-DDTHH:mm" (local)
  clockOut: string | null; // null = currently clocked in
  note: string;            // free text, can be empty
  createdAt: string;       // ISO datetime, for sync conflict resolution
  updatedAt: string;       // ISO datetime, for sync conflict resolution
}

// IndexedDB store: "settings"
interface Settings {
  theme: 'system' | 'light' | 'dark';
  dailyTargetMinutes: number; // default 498
  syncEnabled: boolean;
  lastSyncAt: string | null;
  googleRefreshToken: string | null; // encrypted at rest if feasible; otherwise plain
}
```

**Rules:**
- Only **one open entry** (clockOut === null) can exist at a time globally. Attempting to clock in while an entry is open should prompt: "Du bist noch eingestempelt. Zuerst ausstempeln?"
- `date` is derived from `clockIn` at the moment of clock-in and never changes, even if the entry crosses midnight.
- Entries are editable after clock-out (date, time in/out, note) via a small edit dialog. No deletion without a confirm dialog.

---

## 4. Tab 1 — Stempeluhr

### 4.1 Main view (today)

A single large primary action button:

- If no open entry exists: **"Einstempeln"** (big, green-ish).
- If an open entry exists: **"Ausstempeln"** (big, red-ish), with a live-updating timer below it showing elapsed time since clock-in (HH:MM:SS).

Below the button:
- Current time (large, monospaced).
- Today's accumulated worked minutes vs. target (e.g. `4h 12min / 8h 18min`, with a progress bar).
- Quick note field (textarea, optional) — content is attached to the entry being created/closed.

### 4.2 Übersicht (Overview)

Toggle between **Tag** (Day), **Woche** (Week), **Monat** (Month).

For each view:
- List of entries (newest first), grouped by date.
- Each row shows: date, clock-in time, clock-out time, total duration, note (truncated with hover/tap for full).
- Daily total row at the bottom of each day's group, plus delta vs. 498min (e.g. `+15min` in green, `-32min` in red).
- Week/month view also shows aggregate total and aggregate delta at the top.

Each row has a small edit (pencil) and delete (trash) icon.

### 4.3 Export

Button "Exportieren" opens a small dialog:
- Date range picker (default: current week).
- Format: CSV or PDF (radio buttons).
- "Exportieren" button triggers download.

**CSV columns:** `Datum, Einstempeln, Ausstempeln, Dauer (h:mm), Soll-Differenz (min), Notiz`.

**PDF:** Same data as a table, with a header showing date range and grand total. A4 portrait, monospaced numbers.

Filename: `stempel-export-YYYY-MM-DD_bis_YYYY-MM-DD.csv` (or `.pdf`).

### 4.4 Edge cases to handle

- **Crossing midnight:** An entry where `clockIn` is on day X and `clockOut` is on day X+1 belongs to day X (the day the work started). Display shows clock-out as `01:23 (+1)` or similar to indicate overflow.
- **Forgotten clock-out:** If the user opens the app and an open entry from a previous day exists, show a banner: "Letzter Eintrag vom {date} ist noch offen. Korrigieren?" with a quick form to set clock-out time.
- **Manual entry:** A "Manueller Eintrag" button on the overview view to add an entry retroactively (full form: date, time in, time out, note).

---

## 5. Tab 2 — Feierabend-Rechner

Pure stateless calculator. No persistence.

**Inputs:**
- Einstempelzeit (time picker, defaults to now rounded down to 5min)
- Pausenlänge (number input, minutes, default 30)
- Sollarbeitszeit (number input, minutes, default 498 — pulls from settings)
- Überstunden-Modus (checkbox): if checked, reveal an additional input "Zusätzliche Minuten" (e.g. +60 for one hour of overtime).

**Output (live, no submit button):**
- Geplanter Feierabend: **HH:MM** (large, prominent).
- Sub-line: "Du arbeitest bis dahin {x}h {y}min inkl. {z}min Pause."

**Formula:**
```
finishTime = clockIn + dailyTargetMinutes + breakMinutes + overtimeMinutes
```

Also show a small "Jetzt" button next to the clock-in input to set it to current time.

---

## 6. Theming

Three modes selectable in Settings: **System**, **Hell**, **Dunkel**.

- Use CSS variables (`--bg`, `--fg`, `--accent`, `--border`, `--muted`, etc.).
- System mode follows `prefers-color-scheme`.
- Toggle via a small icon in the top-right of the header.
- Persist choice in IndexedDB settings store.

**Design direction:** Restrained, utilitarian, Swiss-precise. Think: clean grid, monospaced numbers, generous whitespace, single accent color (suggest a deep red `#c73e3a` reminiscent of an ink stamp — fits the "Stempel" name). Avoid AI-slop gradients and rounded-everywhere blobs.

**Typography:**
- UI/body: `Inter` is forbidden per skill guidance. Use **"IBM Plex Sans"** for UI and **"IBM Plex Mono"** for all numbers and times. Both available via Google Fonts or self-hosted.
- Headings: heavier weight of IBM Plex Sans, slightly tighter tracking.

---

## 7. PWA configuration

- `manifest.webmanifest` with:
  - `name`: "Stempel"
  - `short_name`: "Stempel"
  - `start_url`: "/"
  - `display`: "standalone"
  - `theme_color`: matches accent
  - `background_color`: matches light-mode background
  - Icons: 192x192, 512x512, maskable variant. Suggest a simple red "S" or a stylized ink-stamp glyph on a neutral background.
- Service worker:
  - Precache app shell on install.
  - Runtime cache for Google Fonts (stale-while-revalidate).
  - **Important:** No caching of Google Drive API calls.
- iOS Safari specifics:
  - `apple-touch-icon` link tags for 180x180.
  - `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style` meta tags.
  - Test installability via "Zum Home-Bildschirm" flow on iOS.

---

## 8. Google Drive sync (iPhone-first)

### 8.1 Behavior

- Sync is **opt-in** via a toggle in Settings labeled "Google Drive Synchronisation".
- When enabled for the first time: launch OAuth 2.0 PKCE flow → request `https://www.googleapis.com/auth/drive.appdata` scope only (NOT full Drive access).
- All sync state stored in a single JSON file in the app's hidden App Folder, e.g. `stempel-data.json`.
- File format:
  ```json
  {
    "version": 1,
    "entries": [ /* TimeEntry[] */ ],
    "settings": { "dailyTargetMinutes": 498 },
    "lastModified": "2026-05-13T14:32:00Z"
  }
  ```

### 8.2 Sync logic

- **On app start (if sync enabled):**
  1. Pull `stempel-data.json` from Drive.
  2. Compare remote `lastModified` vs. local `lastSyncAt`.
  3. If remote is newer: merge entries by `id` (remote `updatedAt` wins per entry). Show toast "Aktualisiert von Cloud".
  4. If local has unsynced changes: push immediately after pull-merge.
- **On any change (clock in/out/edit/delete):**
  - Mark local as dirty.
  - Debounced push (5 seconds after last change) to avoid hammering the API.
- **On manual "Jetzt synchronisieren" button** (in Settings): force pull + push immediately.
- **Conflict handling:** Per-entry `updatedAt` wins. If two clients edited the same entry, the later `updatedAt` keeps. Deletions tracked via a tombstone list (`deletedIds: string[]`).

### 8.3 OAuth specifics for GitHub Pages

- Use PKCE flow (no client secret required, safe for static hosting).
- Register the GitHub Pages URL as authorized redirect URI in Google Cloud Console.
- Store refresh token in IndexedDB. Refresh access token on every app start.
- Provide a clear "Abmelden" button that revokes the token and clears local credentials.

### 8.4 Desktop usage pattern

The desktop browser is a **viewer / occasional editor**, not the primary entry device.

- Same app, same code. User logs in with the same Google account → pulls the same JSON file.
- If user cannot log in with private Google account on work browser (MDM blocks it), provide a **"JSON importieren"** button: user emails themselves the JSON exported from the phone, then loads it on desktop for viewing.
- Add an export button "Daten als JSON exportieren" (separate from CSV/PDF export — this is the full data dump for backup or cross-device transfer).
- Add corresponding "Daten aus JSON importieren" button with a merge-or-replace dialog.

---

## 9. German UI strings (canonical list)

To avoid drift, use these exact strings:

| Key | Value |
|---|---|
| Tab 1 title | Stempeluhr |
| Tab 2 title | Feierabend-Rechner |
| Clock in button | Einstempeln |
| Clock out button | Ausstempeln |
| Note field placeholder | Notiz (optional) |
| Overview heading | Übersicht |
| Day / Week / Month | Tag / Woche / Monat |
| Export button | Exportieren |
| Manual entry button | Manueller Eintrag |
| Edit | Bearbeiten |
| Delete | Löschen |
| Confirm delete | Wirklich löschen? |
| Settings | Einstellungen |
| Theme | Erscheinungsbild |
| Theme options | System / Hell / Dunkel |
| Daily target | Tägliche Sollarbeitszeit |
| Sync toggle | Google Drive Synchronisation |
| Sync now | Jetzt synchronisieren |
| Sign out | Abmelden |
| JSON export | Daten als JSON exportieren |
| JSON import | Daten aus JSON importieren |
| Calculator: clock-in | Einstempelzeit |
| Calculator: break | Pausenlänge (min) |
| Calculator: target | Sollarbeitszeit (min) |
| Calculator: overtime mode | Überstunden hinzufügen |
| Calculator: overtime input | Zusätzliche Minuten |
| Calculator: result label | Geplanter Feierabend |
| Currently clocked in toast | Du bist eingestempelt seit {time} |
| Forgotten clock-out banner | Letzter Eintrag vom {date} ist noch offen. Korrigieren? |
| Sync success toast | Synchronisiert |
| Sync error toast | Synchronisation fehlgeschlagen |
| Offline toast | Offline — Änderungen werden später synchronisiert |

---

## 10. Repo structure

```
stempel/
├── public/
│   ├── icons/                 # PWA icons
│   ├── manifest.webmanifest
│   └── apple-touch-icon.png
├── src/
│   ├── components/
│   │   ├── ClockButton.tsx
│   │   ├── EntryList.tsx
│   │   ├── EntryRow.tsx
│   │   ├── EditEntryDialog.tsx
│   │   ├── ExportDialog.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── ...
│   ├── pages/
│   │   ├── Stempeluhr.tsx
│   │   ├── Rechner.tsx
│   │   └── Einstellungen.tsx
│   ├── lib/
│   │   ├── db.ts              # IndexedDB wrapper
│   │   ├── sync.ts            # Google Drive sync logic
│   │   ├── auth.ts            # OAuth PKCE flow
│   │   ├── time.ts            # Date/time helpers (target diff, formatting)
│   │   ├── export.ts          # CSV + PDF generation
│   │   └── strings.de.ts      # German UI string constants
│   ├── store/
│   │   └── useStore.ts        # Zustand store
│   ├── styles/
│   │   └── theme.css          # CSS variables for light/dark
│   ├── App.tsx
│   ├── main.tsx
│   └── sw.ts                  # service worker entry
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Pages deployment
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 11. GitHub Pages deployment

- Vite config: `base: '/stempel/'` (or root if using a custom domain / user.github.io repo).
- GitHub Action on push to `main`: build → upload `dist/` to `gh-pages` branch.
- Note: PWA service workers require HTTPS — GitHub Pages provides this by default.

---

## 12. Implementation order (suggested for Claude Code)

1. Scaffold Vite + React + TS + Tailwind + router. Two empty pages.
2. IndexedDB layer (`lib/db.ts`) with `entries` and `settings` stores.
3. Tab 1 minimum viable: clock-in/out button, persist entries, show today's list.
4. Daily target diff + progress bar.
5. Übersicht with day/week/month toggle and aggregates.
6. Edit/delete entries.
7. Manual entry dialog.
8. Tab 2 calculator (pure UI, no persistence).
9. Theme system (system/light/dark).
10. Export to CSV + PDF.
11. JSON import/export.
12. PWA manifest + service worker + iOS specifics.
13. Google Drive OAuth + sync.
14. Forgotten clock-out detection.
15. Polish: animations, empty states, error toasts.
16. GitHub Pages deployment workflow.

---

## 13. Out of scope (explicitly not to build)

- Multi-user / accounts beyond personal Google sync.
- Project/client/category tagging on entries (only the free-text note).
- Direct push to corporate HR tool.
- iCloud sync (impossible from a PWA).
- Push notifications / reminders.
- Statistics dashboards beyond daily/weekly totals + delta.
- Localization beyond German (no i18n framework needed; strings inline in `strings.de.ts`).

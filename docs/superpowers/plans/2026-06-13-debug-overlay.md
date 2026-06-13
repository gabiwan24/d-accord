# Debug-Overlay — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permanentes Debug-Overlay das Echtzeit-Pitch-Erkennungsdaten anzeigt und als `.txt` exportiert, um Noise-Töne und Erkennungsfehler zu analysieren.

**Architecture:** Ein modul-globaler `debugStore` (kein React) sammelt Frames von beiden Detektoren via `addDebugFrame()`. Gefiltert werden nur signifikante Frames (Energy-Schwellenwert + Änderungserkennung). `DebugOverlay.tsx` subscribt via `useEffect` und rendert Live-Daten + scrollbaren Log. Beide Detektoren rufen `addDebugFrame` nach ihrem jeweiligen `onUpdate` auf.

**Tech Stack:** React 19, TypeScript strict, Tailwind CSS v4, Vitest

---

## File Map

| Datei | Aktion |
|---|---|
| `src/lib/debugStore.ts` | Neu — Store mit DebugFrame-Typ, addDebugFrame, subscribe, getLog, clearLog |
| `src/lib/debugStore.test.ts` | Neu — Unit-Tests für Filter-Logik |
| `src/lib/audioDetector.ts` | Ändern — addDebugFrame nach onUpdate |
| `src/lib/tunerDetector.ts` | Ändern — addDebugFrame nach onReading |
| `src/components/DebugOverlay.tsx` | Neu — Overlay-Component |
| `src/App.tsx` | Ändern — DebugOverlay einbinden |

---

## Task 1: `debugStore.ts` — Store + Tests

**Files:**
- Create: `src/lib/debugStore.ts`
- Create: `src/lib/debugStore.test.ts`

### Schritt 1: Test schreiben

Erstelle `src/lib/debugStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import {
  addDebugFrame,
  clearLog,
  getLog,
  subscribe,
  type DebugFrame,
  MIN_LOG_ENERGY,
} from './debugStore'

function makeFrame(overrides: Partial<DebugFrame> = {}): DebugFrame {
  return {
    timestamp: Date.now(),
    source: 'detector',
    hz: 440,
    rawMidi: 69,
    energy: MIN_LOG_ENERGY + 0.001,
    pitchClasses: [4, 7],
    stable: true,
    smoothedMidi: null,
    cents: null,
    detectedString: null,
    targetPitchClasses: [],
    correct: [],
    noise: [],
    missing: [],
    ...overrides,
  }
}

describe('debugStore', () => {
  beforeEach(() => clearLog())

  it('logs a frame when energy is sufficient and pitchClasses changed', () => {
    addDebugFrame(makeFrame({ pitchClasses: [4, 7] }))
    expect(getLog()).toHaveLength(1)
  })

  it('does not log when energy is below MIN_LOG_ENERGY', () => {
    addDebugFrame(makeFrame({ energy: MIN_LOG_ENERGY - 0.0001 }))
    expect(getLog()).toHaveLength(0)
  })

  it('does not log when pitchClasses unchanged and cents diff < 5', () => {
    addDebugFrame(makeFrame({ pitchClasses: [4, 7], cents: 10 }))
    addDebugFrame(makeFrame({ pitchClasses: [4, 7], cents: 13 })) // diff = 3 < 5, no change
    expect(getLog()).toHaveLength(1)
  })

  it('logs when cents diff >= 5 even if pitchClasses unchanged', () => {
    addDebugFrame(makeFrame({ pitchClasses: [4, 7], cents: 10 }))
    addDebugFrame(makeFrame({ pitchClasses: [4, 7], cents: 16 })) // diff = 6 >= 5
    expect(getLog()).toHaveLength(2)
  })

  it('logs when pitchClasses change', () => {
    addDebugFrame(makeFrame({ pitchClasses: [4, 7] }))
    addDebugFrame(makeFrame({ pitchClasses: [4, 9] })) // different
    expect(getLog()).toHaveLength(2)
  })

  it('caps log at 200 entries', () => {
    for (let i = 0; i < 210; i++) {
      addDebugFrame(makeFrame({ pitchClasses: [i % 12], cents: i * 10 }))
    }
    expect(getLog().length).toBeLessThanOrEqual(200)
  })

  it('notifies subscribers on every frame (not just logged)', () => {
    let callCount = 0
    const unsub = subscribe(() => { callCount++ })
    addDebugFrame(makeFrame({ energy: MIN_LOG_ENERGY - 0.0001 })) // below threshold — not logged
    addDebugFrame(makeFrame()) // above threshold — logged
    unsub()
    expect(callCount).toBe(2) // subscribers notified on every frame
  })

  it('clearLog empties the log', () => {
    addDebugFrame(makeFrame())
    clearLog()
    expect(getLog()).toHaveLength(0)
  })
})
```

### Schritt 2: Tests ausführen — erwarte FAIL

```
npm test -- --run src/lib/debugStore.test.ts
```

Erwarte: `Cannot find module './debugStore'`

### Schritt 3: `debugStore.ts` implementieren

Erstelle `src/lib/debugStore.ts`:

```typescript
export const MIN_LOG_ENERGY = 0.0005
const MAX_LOG_ENTRIES = 200
const MIN_CENTS_DELTA = 5

export interface DebugFrame {
  timestamp: number
  source: 'detector' | 'tuner'
  hz: number | null
  rawMidi: number | null
  energy: number
  pitchClasses: number[]
  stable: boolean
  smoothedMidi: number | null
  cents: number | null
  detectedString: string | null
  targetPitchClasses: number[]
  correct: number[]
  noise: number[]
  missing: number[]
}

const log: DebugFrame[] = []
const subscribers = new Set<(frame: DebugFrame) => void>()

let lastLoggedPCKey = ''
let lastLoggedCents: number | null = null

function pcKey(pcs: number[]): string {
  return [...pcs].sort((a, b) => a - b).join(',')
}

export function addDebugFrame(frame: DebugFrame): void {
  // Notify all subscribers on every frame (for live display)
  for (const cb of subscribers) cb(frame)

  // Filter: only log significant frames
  if (frame.energy < MIN_LOG_ENERGY) return

  const currentPCKey = pcKey(frame.pitchClasses)
  const centsDelta =
    frame.cents !== null && lastLoggedCents !== null
      ? Math.abs(frame.cents - lastLoggedCents)
      : Infinity

  const pitchClassesChanged = currentPCKey !== lastLoggedPCKey
  const centsJumped = centsDelta >= MIN_CENTS_DELTA

  if (!pitchClassesChanged && !centsJumped) return

  lastLoggedPCKey = currentPCKey
  if (frame.cents !== null) lastLoggedCents = frame.cents

  if (log.length >= MAX_LOG_ENTRIES) log.shift()
  log.push(frame)
}

export function subscribe(cb: (frame: DebugFrame) => void): () => void {
  subscribers.add(cb)
  return () => subscribers.delete(cb)
}

export function getLog(): DebugFrame[] {
  return log
}

export function clearLog(): void {
  log.length = 0
  lastLoggedPCKey = ''
  lastLoggedCents = null
}
```

### Schritt 4: Tests ausführen — erwarte PASS

```
npm test -- --run src/lib/debugStore.test.ts
```

Erwarte: 8 Tests grün.

### Schritt 5: Alle Tests ausführen

```
npm test -- --run
```

Erwarte: alle 66 + 8 = 74 Tests grün.

### Schritt 6: Commit

```
git add src/lib/debugStore.ts src/lib/debugStore.test.ts
git commit -m "feat: add debugStore for pitch detection frame logging"
```

---

## Task 2: `audioDetector.ts` — addDebugFrame integrieren

**Files:**
- Modify: `src/lib/audioDetector.ts`

Achtung: `audioDetector.ts` verwendet PitchPlease's `data`-Objekt. Bekannte Felder: `data.pitchClasses`, `data.maxEnergy`, `data.stable`. Das Feld `data.fundMidis` existiert (tunerDetector nutzt es), aber TypeScript-Typ in audioDetector-Kontext könnte es nicht kennen — verwende `(data as any).fundMidis?.[0]` falls nötig.

### Schritt 1: Aktuelle Datei lesen

Lies `src/lib/audioDetector.ts` vollständig.

### Schritt 2: Import hinzufügen

Am Anfang der Datei, nach den bestehenden Imports:

```typescript
import { addDebugFrame } from './debugStore'
import { midiToHz } from './musicMath'
```

### Schritt 3: addDebugFrame am Ende von `onUpdate` aufrufen

Im `onUpdate`-Handler, ganz am **Ende** — nach allen bestehenden `callbacks.*`-Aufrufen, aber noch innerhalb von `onUpdate`. Den Block direkt vor der abschließenden `}` von `onUpdate` einfügen:

```typescript
    // Debug: send raw frame data to debug store
    const fundMidi = (data as { fundMidis?: number[] }).fundMidis?.[0] ?? null
    const targetPCs =
      expected?.kind === 'chord'
        ? (expected.chord.shapes[expected.tuningId]?.pitchClasses ?? [])
        : []
    const detectedPCs: number[] = data.pitchClasses ?? []
    addDebugFrame({
      timestamp: Date.now(),
      source: 'detector',
      hz: fundMidi !== null ? midiToHz(fundMidi) : null,
      rawMidi: fundMidi,
      energy: data.maxEnergy,
      pitchClasses: detectedPCs,
      stable: data.stable,
      smoothedMidi: null,
      cents: null,
      detectedString: null,
      targetPitchClasses: targetPCs,
      correct: detectedPCs.filter((pc) => targetPCs.includes(pc)),
      noise: detectedPCs.filter((pc) => !targetPCs.includes(pc)),
      missing: targetPCs.filter((pc) => !detectedPCs.includes(pc)),
    })
```

**Wichtig:** Dieser Block kommt an das **Ende** von `onUpdate` — nach dem `if (matches)` / `else`-Block, aber VOR der schließenden `}` des `onUpdate`-Callbacks. Nicht in einen der `if`-Zweige einbauen.

### Schritt 4: Build + Tests

```
npm test -- --run && npm run build
```

Erwarte: alle Tests grün, Build sauber. TypeScript darf keine Fehler zeigen.

### Schritt 5: Commit

```
git add src/lib/audioDetector.ts
git commit -m "feat: send debug frames from audioDetector to debugStore"
```

---

## Task 3: `tunerDetector.ts` — addDebugFrame integrieren

**Files:**
- Modify: `src/lib/tunerDetector.ts`

### Schritt 1: Import hinzufügen

Am Anfang von `src/lib/tunerDetector.ts`, nach den bestehenden Imports:

```typescript
import { addDebugFrame } from './debugStore'
import { midiToHz } from './musicMath'
```

Hinweis: `midiToHz` ist bereits in musicMath exportiert. `centsBetweenMidi` ist schon importiert.

### Schritt 2: addDebugFrame nach `callbacks.onReading(reading)` aufrufen

Im `onUpdate`-Handler, **direkt nach** der Zeile `callbacks.onReading(reading)` einfügen:

```typescript
      addDebugFrame({
        timestamp: Date.now(),
        source: 'tuner',
        hz: rawMidi !== null ? midiToHz(rawMidi) : null,
        rawMidi,
        energy: data.maxEnergy,
        pitchClasses: [],
        stable: false,
        smoothedMidi: detectedMidi,
        cents: reading.cents,
        detectedString: reading.detectedLabel,
        targetPitchClasses: [],
        correct: [],
        noise: [],
        missing: [],
      })
```

### Schritt 3: Build + Tests

```
npm test -- --run && npm run build
```

Erwarte: alle Tests grün, Build sauber.

### Schritt 4: Commit

```
git add src/lib/tunerDetector.ts
git commit -m "feat: send debug frames from tunerDetector to debugStore"
```

---

## Task 4: `DebugOverlay.tsx` — Overlay-Component

**Files:**
- Create: `src/components/DebugOverlay.tsx`

### Schritt 1: Datei erstellen

```typescript
import { useEffect, useRef, useState } from 'react'
import { clearLog, getLog, subscribe, type DebugFrame } from '../lib/debugStore'

const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function pcName(pc: number): string {
  return PC_NAMES[pc] ?? String(pc)
}

function pcsLabel(pcs: number[]): string {
  return pcs.length === 0 ? '—' : pcs.map(pcName).join(',')
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return [
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join(':') + '.' + String(d.getMilliseconds()).slice(0, 1)
}

export function DebugOverlay() {
  const [latest, setLatest] = useState<DebugFrame | null>(null)
  const [logVersion, setLogVersion] = useState(0)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = subscribe((frame) => {
      setLatest(frame)
      const newLen = getLog().length
      setLogVersion((v) => (newLen !== getLog().length ? v + 1 : v + 0.001))
    })
    return unsub
  }, [])

  // Auto-scroll log to bottom when new entries arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logVersion])

  const handleDownload = () => {
    const entries = getLog()
    const cols = [
      'source', 'timestamp', 'hz', 'rawMidi', 'energy',
      'pitchClasses', 'stable', 'smoothedMidi', 'cents',
      'detectedString', 'target', 'correct', 'noise', 'missing',
    ]
    const headerLine = `Ukulele Debug Log — ${new Date().toISOString()}\n`
    const colLine = cols.join('\t') + '\n'
    const rows = entries
      .map((f) =>
        [
          f.source,
          formatTime(f.timestamp),
          f.hz?.toFixed(1) ?? '-',
          f.rawMidi?.toFixed(1) ?? '-',
          f.energy.toFixed(4),
          f.pitchClasses.join(',') || '-',
          String(f.stable),
          f.smoothedMidi?.toFixed(1) ?? '-',
          f.cents?.toFixed(1) ?? '-',
          f.detectedString ?? '-',
          f.targetPitchClasses.join(',') || '-',
          f.correct.join(',') || '-',
          f.noise.join(',') || '-',
          f.missing.join(',') || '-',
        ].join('\t'),
      )
      .join('\n')

    const blob = new Blob([headerLine + colLine + rows], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ukulele-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    clearLog()
    setLatest(null)
    setLogVersion((v) => v + 1)
  }

  const logEntries = getLog()
  const hasTarget = latest !== null && latest.targetPitchClasses.length > 0

  return (
    <div className="fixed bottom-4 right-4 z-[200] w-72 overflow-hidden rounded-lg bg-ink/90 shadow-lg ring-1 ring-cream/10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cream/10 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-cream/50">
          Debug
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] text-cream/40 hover:text-cream"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="text-[10px] text-cream/40 hover:text-cream"
          >
            ↓ Log ({logEntries.length})
          </button>
        </div>
      </div>

      {/* Live */}
      <div className="border-b border-cream/10 px-3 py-2 font-mono text-[10px] text-cream">
        {latest ? (
          <>
            <div className="mb-1 text-cream/40">
              LIVE · {latest.source}
            </div>
            <div>
              Hz: {latest.hz?.toFixed(1) ?? '—'} &nbsp; MIDI:{' '}
              {latest.rawMidi?.toFixed(1) ?? '—'} &nbsp; E:{' '}
              {latest.energy.toFixed(4)}
            </div>
            <div>
              PCs: [{pcsLabel(latest.pitchClasses)}] &nbsp;{' '}
              {latest.stable ? '✓' : '~'}
            </div>
            {(latest.smoothedMidi !== null || latest.cents !== null) && (
              <div>
                ↳ {latest.smoothedMidi?.toFixed(1) ?? '—'} &nbsp; Cents:{' '}
                {latest.cents !== null
                  ? (latest.cents > 0 ? '+' : '') + latest.cents.toFixed(0)
                  : '—'}{' '}
                &nbsp; {latest.detectedString ?? ''}
              </div>
            )}
            {hasTarget && (
              <div className="mt-1 border-t border-cream/10 pt-1">
                <div>Target: [{pcsLabel(latest.targetPitchClasses)}]</div>
                <div>
                  ✓ [{pcsLabel(latest.correct)}] &nbsp; ✗ [{pcsLabel(latest.noise)}] &nbsp; △ [{pcsLabel(latest.missing)}]
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-cream/30">Kein Signal</div>
        )}
      </div>

      {/* Log */}
      <div
        ref={logRef}
        className="max-h-40 overflow-y-auto px-3 py-2 font-mono text-[9px] text-cream/50"
      >
        {logEntries.length === 0 ? (
          <div className="text-cream/25">Log leer</div>
        ) : (
          logEntries.map((f, i) => (
            <div key={i} className="leading-relaxed">
              {formatTime(f.timestamp)} [{f.source[0].toUpperCase()}] E:
              {f.energy.toFixed(3)} [{f.pitchClasses.join(',')}]
              {f.targetPitchClasses.length > 0 &&
                ` ✓[${f.correct.join(',')}] ✗[${f.noise.join(',')}] △[${f.missing.join(',')}]`}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

### Schritt 2: Build + Tests

```
npm test -- --run && npm run build
```

Erwarte: alle Tests grün, Build sauber.

### Schritt 3: Commit

```
git add src/components/DebugOverlay.tsx
git commit -m "feat: add DebugOverlay component with live display and log download"
```

---

## Task 5: `App.tsx` — DebugOverlay einbinden + Push

**Files:**
- Modify: `src/App.tsx`

### Schritt 1: Import hinzufügen

Am Anfang von `src/App.tsx`, bei den bestehenden Imports:

```typescript
import { DebugOverlay } from './components/DebugOverlay'
```

### Schritt 2: DebugOverlay in JSX einfügen

Im Return-Block, nach dem `{showOnboarding && <OnboardingOverlay ... />}` Block, aber noch innerhalb von `<MicProvider>`:

```tsx
        {showOnboarding && (
          <OnboardingOverlay onClose={() => setShowOnboarding(false)} />
        )}
        <DebugOverlay />
```

Der vollständige Return-Block sieht dann so aus:

```tsx
  return (
    <ErrorBoundary>
      <MicProvider>
        <div className="flex min-h-dvh flex-col">
          <main className="flex-1">{renderContent()}</main>
          <AppTabBar activeTab={activeTab} onChange={setActiveTab} />
        </div>
        {showOnboarding && (
          <OnboardingOverlay onClose={() => setShowOnboarding(false)} />
        )}
        <DebugOverlay />
      </MicProvider>
    </ErrorBoundary>
  )
```

### Schritt 3: Build + Tests

```
npm test -- --run && npm run build
```

Erwarte: alle 74 Tests grün, Build sauber.

### Schritt 4: Commit + Push

```
git add src/App.tsx
git commit -m "feat: render DebugOverlay permanently in App"
git push origin main
```

---

## Spec-Abgleich

- ✅ `DebugFrame` mit allen Feldern (source, hz, rawMidi, energy, pitchClasses, stable, smoothedMidi, cents, detectedString, targetPitchClasses, correct, noise, missing) — Task 1
- ✅ `MIN_LOG_ENERGY = 0.0005` Filter — Task 1
- ✅ Log nur bei Änderung (pitchClasses oder |cents| > 5) — Task 1
- ✅ Max 200 Einträge — Task 1
- ✅ Subscriber werden auf JEDEM Frame benachrichtigt (nicht nur geloggte) — Task 1
- ✅ `audioDetector.ts` ruft `addDebugFrame` auf mit targetPitchClasses, correct, noise, missing — Task 2
- ✅ `tunerDetector.ts` ruft `addDebugFrame` auf mit smoothedMidi, cents, detectedString — Task 3
- ✅ Live-Bereich: Hz, MIDI, Energy, PitchClasses, Stable — Task 4
- ✅ Live-Bereich Übungsmodus: Target, ✓/✗/△ — Task 4
- ✅ Log-Bereich scrollbar, max-h-40 — Task 4
- ✅ Download als .txt mit Tab-separiertem Format — Task 4
- ✅ Clear-Button — Task 4
- ✅ Fixed bottom-right z-[200] — Task 4
- ✅ App.tsx eingebunden — Task 5

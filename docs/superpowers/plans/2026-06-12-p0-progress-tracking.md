# P0: Fortschritts-Tracking, Play-Button, Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Akkord-Trefferquoten persistent tracken, im Setup und während der Übung anzeigen, schwache Akkorde öfter zeigen, expliziten Play-Button hinzufügen, vier kritische Bugs fixen.

**Architecture:** Neues `practiceStats.ts`-Modul (reiner localStorage-Wrapper), angebunden an `usePracticeSession` (recordAttempt bei Treffer) und `useInfinitePracticeQueue` (optional gewichtetes Shuffle). UI-Änderungen in `ChordSelector`, `PracticeScreen`, `NotePracticeScreen`. Vier isolierte Bug-Fixes ohne neue Abhängigkeiten.

**Tech Stack:** React 19, TypeScript strict, Vitest, Tailwind CSS v4, localStorage

---

## File Map

| Datei | Aktion | Verantwortung |
|---|---|---|
| `src/lib/practiceStats.ts` | Neu | Trefferquoten lesen/schreiben/löschen |
| `src/lib/practiceStats.test.ts` | Neu | Tests für practiceStats |
| `src/lib/playChord.ts` | Ändern | `playNoteReference()` + `closeAudioContext()` hinzufügen |
| `src/components/ErrorBoundary.tsx` | Neu | React-Crash-Fallback |
| `src/hooks/useMicKeyboardShortcut.ts` | Ändern | `document.hidden`-Guard |
| `src/hooks/usePracticeSession.ts` | Ändern | setTimeout-Fix + recordAttempt |
| `src/hooks/useNotePracticeSession.ts` | Ändern | setTimeout-Fix |
| `src/hooks/useInfinitePracticeQueue.ts` | Ändern | Optional gewichtetes Shuffle |
| `src/screens/PracticeScreen.tsx` | Ändern | Stats-Anzeige + Play-Button |
| `src/screens/NotePracticeScreen.tsx` | Ändern | Play-Button |
| `src/components/ChordSelector.tsx` | Ändern | Accuracy-Balken pro Karte |
| `src/App.tsx` | Ändern | ErrorBoundary + visibilitychange |

---

## Task 1: `practiceStats.ts` — Modul + Tests

**Files:**
- Create: `src/lib/practiceStats.ts`
- Create: `src/lib/practiceStats.test.ts`

- [ ] **Schritt 1: Test schreiben**

```typescript
// src/lib/practiceStats.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  recordAttempt,
  getAccuracy,
  getAllStats,
  clearStats,
} from './practiceStats'

const STORAGE_KEY = 'ukulele-chord-stats'

beforeEach(() => {
  localStorage.clear()
})

describe('getAccuracy', () => {
  it('returns 0.5 for unknown chord (neutral default)', () => {
    expect(getAccuracy('C-major')).toBe(0.5)
  })

  it('returns correct ratio after attempts', () => {
    recordAttempt('C-major', true)
    recordAttempt('C-major', true)
    recordAttempt('C-major', false)
    expect(getAccuracy('C-major')).toBeCloseTo(2 / 3)
  })
})

describe('recordAttempt', () => {
  it('increments attempts on every call', () => {
    recordAttempt('Am', true)
    recordAttempt('Am', false)
    const stats = getAllStats()
    expect(stats['Am'].attempts).toBe(2)
    expect(stats['Am'].correct).toBe(1)
  })

  it('persists to localStorage', () => {
    recordAttempt('G7', true)
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed['G7'].correct).toBe(1)
  })
})

describe('clearStats', () => {
  it('removes all stats from localStorage', () => {
    recordAttempt('C', true)
    clearStats()
    expect(getAllStats()).toEqual({})
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
```

- [ ] **Schritt 2: Test ausführen — muss fehlschlagen**

```
npm test -- practiceStats
```

Erwartet: `FAIL — Cannot find module './practiceStats'`

- [ ] **Schritt 3: Implementierung schreiben**

```typescript
// src/lib/practiceStats.ts
const STORAGE_KEY = 'ukulele-chord-stats'

export type ChordStats = Record<string, { correct: number; attempts: number }>

function load(): ChordStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ChordStats) : {}
  } catch {
    return {}
  }
}

function save(stats: ChordStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
}

export function recordAttempt(chordId: string, correct: boolean): void {
  const stats = load()
  const entry = stats[chordId] ?? { correct: 0, attempts: 0 }
  stats[chordId] = {
    correct: entry.correct + (correct ? 1 : 0),
    attempts: entry.attempts + 1,
  }
  save(stats)
}

export function getAccuracy(chordId: string): number {
  const stats = load()
  const entry = stats[chordId]
  if (!entry || entry.attempts === 0) return 0.5
  return entry.correct / entry.attempts
}

export function getAllStats(): ChordStats {
  return load()
}

export function clearStats(): void {
  localStorage.removeItem(STORAGE_KEY)
}
```

- [ ] **Schritt 4: Tests ausführen — müssen grün sein**

```
npm test -- practiceStats
```

Erwartet: `PASS — 5 tests passed`

- [ ] **Schritt 5: Commit**

```
git add src/lib/practiceStats.ts src/lib/practiceStats.test.ts
git commit -m "feat: add practiceStats module with localStorage persistence"
```

---

## Task 2: Bug Fix — `document.hidden`-Guard im Keyboard-Shortcut

**Files:**
- Modify: `src/hooks/useMicKeyboardShortcut.ts`

- [ ] **Schritt 1: Guard hinzufügen**

In `src/hooks/useMicKeyboardShortcut.ts` die `handleKeyDown`-Funktion ändern. Die erste Zeile im Handler wird zur `document.hidden`-Prüfung:

```typescript
import { useEffect } from 'react'
import { isDesktopPointer, isEditableTarget } from '../lib/isDesktop'

export function useMicKeyboardShortcut(onToggle: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.hidden) return
      if (!isDesktopPointer()) return
      if (event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key !== 'm' && event.key !== 'M') return
      if (isEditableTarget(event.target)) return

      event.preventDefault()
      onToggle()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onToggle])
}
```

- [ ] **Schritt 2: Tests laufen lassen (alle)**

```
npm test
```

Erwartet: alle vorhandenen Tests weiterhin grün.

- [ ] **Schritt 3: Commit**

```
git add src/hooks/useMicKeyboardShortcut.ts
git commit -m "fix: ignore M shortcut when document is hidden (PWA background)"
```

---

## Task 3: Bug Fix — setTimeout-Leak in Practice Session Hooks

**Files:**
- Modify: `src/hooks/usePracticeSession.ts`
- Modify: `src/hooks/useNotePracticeSession.ts`

- [ ] **Schritt 1: `usePracticeSession.ts` fixen**

Den `advance`-Callback und den umgebenden Code ersetzen:

```typescript
// src/hooks/usePracticeSession.ts
// Zeilen 1-11 bleiben identisch, nur useRef-Import ergänzen (schon vorhanden)

export function usePracticeSession(
  chordIds: string[],
  tuningId: TuningId,
  getChord: (id: string) => UkuleleChord | undefined,
) {
  const { currentId, nextId, goNext, count } =
    useInfinitePracticeQueue(chordIds)
  const [micStatus, setMicStatus] = useState<MicStatus>('idle')
  const [micError, setMicError] = useState<string | null>(null)
  const [pulse, setPulse] = useState(false)
  const detectorRef = useRef<AudioDetector | null>(null)
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { micEnabled } = useMicEnabled()

  const current = currentId ? getChord(currentId) : undefined
  const next = nextId ? getChord(nextId) : undefined

  const advance = useCallback(() => {
    setPulse(true)
    goNext()
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    pulseTimeoutRef.current = setTimeout(() => setPulse(false), 300)
  }, [goNext])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    }
  }, [])

  // rest of the file unchanged from here
```

Der Rest der Datei (ab `const advanceRef = useRef(advance)`) bleibt unverändert.

- [ ] **Schritt 2: `useNotePracticeSession.ts` fixen**

Identisches Muster — `pulseTimeoutRef` hinzufügen:

```typescript
// src/hooks/useNotePracticeSession.ts
export function useNotePracticeSession(
  noteIds: string[],
  tuningId: TuningId,
  getNote: (id: string) => NoteDefinition | undefined,
) {
  const { currentId, nextId, goNext, count } =
    useInfinitePracticeQueue(noteIds)
  const [micStatus, setMicStatus] = useState<MicStatus>('idle')
  const [micError, setMicError] = useState<string | null>(null)
  const [pulse, setPulse] = useState(false)
  const detectorRef = useRef<AudioDetector | null>(null)
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { micEnabled } = useMicEnabled()

  const current = currentId ? getNote(currentId) : undefined
  const next = nextId ? getNote(nextId) : undefined

  const advance = useCallback(() => {
    setPulse(true)
    goNext()
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    pulseTimeoutRef.current = setTimeout(() => setPulse(false), 300)
  }, [goNext])

  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    }
  }, [])

  // rest of the file unchanged
```

- [ ] **Schritt 3: Tests ausführen**

```
npm test
```

Erwartet: alle Tests grün.

- [ ] **Schritt 4: Commit**

```
git add src/hooks/usePracticeSession.ts src/hooks/useNotePracticeSession.ts
git commit -m "fix: cancel pulse setTimeout on unmount to prevent state leak"
```

---

## Task 4: Bug Fix — `closeAudioContext()` + `playNoteReference()`

**Files:**
- Modify: `src/lib/playChord.ts`

- [ ] **Schritt 1: `closeAudioContext` und `playNoteReference` hinzufügen**

Am Ende von `src/lib/playChord.ts` nach der letzten Funktion anfügen:

```typescript
/** Spielt einen einzelnen Referenzton (für Noten-Übung). pitchClass: 0=C … 11=H */
export async function playNoteReference(pitchClass: number): Promise<void> {
  suppressDetection(PREVIEW_SUPPRESS_MS)
  const ctx = getContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
  const midi = 60 + pitchClass // C4=60 … H4=71
  const now = ctx.currentTime
  playString(ctx, midi, now, 0)
}

/** AudioContext schließen (z.B. wenn App in den Hintergrund geht). */
export function closeAudioContext(): void {
  if (sharedContext) {
    void sharedContext.close()
    sharedContext = null
    masterBus = null
  }
}
```

- [ ] **Schritt 2: Tests ausführen**

```
npm test
```

Erwartet: alle Tests grün.

- [ ] **Schritt 3: Commit**

```
git add src/lib/playChord.ts
git commit -m "feat: add playNoteReference and closeAudioContext to playChord"
```

---

## Task 5: ErrorBoundary + `visibilitychange` in `App.tsx`

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/App.tsx`

- [ ] **Schritt 1: ErrorBoundary schreiben**

```typescript
// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="text-base text-ink">Etwas ist schiefgelaufen.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-ink px-4 py-2 text-sm text-cream"
          >
            Neu laden
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

- [ ] **Schritt 2: `App.tsx` anpassen**

```typescript
// src/App.tsx
import { useEffect, useState } from 'react'
import { AppTabBar, type AppTab } from './components/AppTabBar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { MicProvider } from './context/MicContext'
import { closeAudioContext } from './lib/playChord'
import type { PracticeSessionConfig } from './screens/SetupScreen'
import { NotePracticeScreen } from './screens/NotePracticeScreen'
import { PracticeScreen } from './screens/PracticeScreen'
import { SetupScreen } from './screens/SetupScreen'
import { TunerScreen } from './screens/TunerScreen'

type Screen = 'setup' | 'practice'

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('practice')
  const [screen, setScreen] = useState<Screen>('setup')
  const [session, setSession] = useState<PracticeSessionConfig | null>(null)

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) closeAudioContext()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const handleStart = (config: PracticeSessionConfig) => {
    setSession(config)
    setScreen('practice')
  }

  const exitPractice = () => {
    setScreen('setup')
    setSession(null)
  }

  const renderContent = () => {
    if (activeTab === 'tuner') {
      return <TunerScreen active />
    }

    if (screen === 'practice' && session) {
      if (session.mode === 'notes') {
        return (
          <NotePracticeScreen
            tuningId={session.tuningId}
            noteIds={session.ids}
            onDone={exitPractice}
          />
        )
      }

      return (
        <PracticeScreen
          tuningId={session.tuningId}
          chordIds={session.ids}
          onDone={exitPractice}
        />
      )
    }

    return <SetupScreen onStart={handleStart} />
  }

  return (
    <ErrorBoundary>
      <MicProvider>
        <div className="flex min-h-dvh flex-col">
          <main className="flex-1">{renderContent()}</main>
          <AppTabBar activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </MicProvider>
    </ErrorBoundary>
  )
}
```

- [ ] **Schritt 3: Tests ausführen**

```
npm test
```

Erwartet: alle Tests grün.

- [ ] **Schritt 4: Commit**

```
git add src/components/ErrorBoundary.tsx src/App.tsx
git commit -m "fix: add ErrorBoundary and close AudioContext on visibilitychange"
```

---

## Task 6: Gewichtetes Shuffle in `useInfinitePracticeQueue`

**Files:**
- Modify: `src/hooks/useInfinitePracticeQueue.ts`

- [ ] **Schritt 1: Hook mit optionalem `getAccuracy`-Parameter erweitern**

```typescript
// src/hooks/useInfinitePracticeQueue.ts
import { useCallback, useEffect, useState } from 'react'
import { shuffle } from '../lib/shuffle'

function weightedShuffle(ids: string[], getAccuracy: (id: string) => number): string[] {
  const expanded: string[] = []
  for (const id of ids) {
    const acc = getAccuracy(id)
    const weight = acc > 0.8 ? 1 : acc >= 0.6 ? 2 : 3
    for (let i = 0; i < weight; i++) expanded.push(id)
  }
  return shuffle(expanded)
}

export function useInfinitePracticeQueue(
  ids: string[],
  getAccuracy?: (id: string) => number,
) {
  const buildQueue = useCallback(
    () => (getAccuracy ? weightedShuffle(ids, getAccuracy) : shuffle(ids)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, getAccuracy],
  )

  const [queue, setQueue] = useState<string[]>(() => buildQueue())
  const [index, setIndex] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    setQueue(buildQueue())
    setIndex(0)
    setCount(0)
  }, [buildQueue])

  const goNext = useCallback(() => {
    setCount((c) => c + 1)
    setIndex((i) => {
      const next = i + 1
      if (next >= queue.length) {
        setQueue(buildQueue())
        return 0
      }
      return next
    })
  }, [buildQueue, queue.length])

  const currentId = queue[index]
  const nextId =
    queue.length > 1 ? queue[(index + 1) % queue.length] : queue[0]

  return { currentId, nextId, goNext, count, queue }
}
```

- [ ] **Schritt 2: Tests ausführen**

```
npm test
```

Erwartet: alle Tests grün.

- [ ] **Schritt 3: Commit**

```
git add src/hooks/useInfinitePracticeQueue.ts
git commit -m "feat: weighted shuffle in useInfinitePracticeQueue (low accuracy = more often)"
```

---

## Task 7: `recordAttempt` in `usePracticeSession`

**Files:**
- Modify: `src/hooks/usePracticeSession.ts`

- [ ] **Schritt 1: `practiceStats` importieren und `getAccuracy` + `recordAttempt` einbinden**

Die vollständige neue Version von `src/hooks/usePracticeSession.ts`:

```typescript
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMicEnabled } from '../context/MicContext'
import type { UkuleleChord } from '../data/chords'
import type { TuningId } from '../data/tunings'
import {
  createAudioDetector,
  type AudioDetector,
  type MicStatus,
} from '../lib/audioDetector'
import { getAccuracy, recordAttempt } from '../lib/practiceStats'
import { useInfinitePracticeQueue } from './useInfinitePracticeQueue'

export function usePracticeSession(
  chordIds: string[],
  tuningId: TuningId,
  getChord: (id: string) => UkuleleChord | undefined,
) {
  const { currentId, nextId, goNext, count } =
    useInfinitePracticeQueue(chordIds, getAccuracy)
  const [micStatus, setMicStatus] = useState<MicStatus>('idle')
  const [micError, setMicError] = useState<string | null>(null)
  const [pulse, setPulse] = useState(false)
  const detectorRef = useRef<AudioDetector | null>(null)
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { micEnabled } = useMicEnabled()

  const current = currentId ? getChord(currentId) : undefined
  const next = nextId ? getChord(nextId) : undefined

  const advance = useCallback(() => {
    if (currentId) recordAttempt(currentId, true)
    setPulse(true)
    goNext()
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    pulseTimeoutRef.current = setTimeout(() => setPulse(false), 300)
  }, [goNext, currentId])

  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    }
  }, [])

  const advanceRef = useRef(advance)
  advanceRef.current = advance

  const skipToNext = useCallback(() => {
    detectorRef.current?.prepareNextTarget()
    goNext()
  }, [goNext])

  useEffect(() => {
    if (!micEnabled) {
      detectorRef.current?.stop()
      detectorRef.current = null
      setMicStatus('idle')
      setMicError(null)
      return
    }

    const detector = createAudioDetector({
      onStatusChange: setMicStatus,
      onCorrect: () => advanceRef.current(),
      onError: setMicError,
    })
    detectorRef.current = detector
    void detector.start()

    return () => {
      detector.stop()
      detectorRef.current = null
    }
  }, [micEnabled])

  useEffect(() => {
    if (!micEnabled || !current || !detectorRef.current) return
    detectorRef.current.setExpectedChord(current, tuningId)
  }, [current, tuningId, micEnabled])

  return {
    current,
    next,
    count,
    currentId,
    micStatus,
    micError,
    pulse,
    skipToNext,
  }
}
```

Hinweis: `currentId` wird jetzt im Return-Objekt mitgegeben — wird in Task 8 für die Stats-Anzeige benötigt.

- [ ] **Schritt 2: Tests ausführen**

```
npm test
```

Erwartet: alle Tests grün.

- [ ] **Schritt 3: Commit**

```
git add src/hooks/usePracticeSession.ts
git commit -m "feat: record chord accuracy on correct detection, pass getAccuracy to queue"
```

---

## Task 8: Stats-Anzeige + Play-Button in `PracticeScreen`

**Files:**
- Modify: `src/screens/PracticeScreen.tsx`

- [ ] **Schritt 1: Stats-Anzeige und Play-Button einbauen**

```typescript
// src/screens/PracticeScreen.tsx
import { useState } from 'react'
import { getChord } from '../data/chords'
import { TUNINGS, type TuningId } from '../data/tunings'
import { ChordCard } from '../components/ChordCard'
import { SpokenGuide } from '../components/SpokenGuide'
import { MicStatus } from '../components/MicStatus'
import { useMicEnabled } from '../context/MicContext'
import { usePracticeSession } from '../hooks/usePracticeSession'
import { formatChordSpokenGuide } from '../lib/chordSpokenName'
import { playChordShape } from '../lib/playChord'
import { getAccuracy, getAllStats } from '../lib/practiceStats'

interface PracticeScreenProps {
  tuningId: TuningId
  chordIds: string[]
  onDone: () => void
}

function AccuracyBar({ chordId }: { chordId: string }) {
  const stats = getAllStats()
  const entry = stats[chordId]
  const accuracy = getAccuracy(chordId)
  const hasData = entry && entry.attempts > 0

  const barColor = !hasData
    ? 'bg-ink/20'
    : accuracy > 0.8
      ? 'bg-success'
      : accuracy >= 0.6
        ? 'bg-amber-400'
        : 'bg-red-400'

  return (
    <div className="mt-3 flex flex-col items-center gap-1">
      <div className="h-2 w-40 overflow-hidden rounded-full bg-ink/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.round(accuracy * 100)}%` }}
        />
      </div>
      {hasData && (
        <span className="text-xs text-muted">
          {Math.round(accuracy * 100)}% · {entry.correct}/{entry.attempts}
        </span>
      )}
    </div>
  )
}

export function PracticeScreen({
  tuningId,
  chordIds,
  onDone,
}: PracticeScreenProps) {
  const [playing, setPlaying] = useState(false)

  const {
    current,
    next,
    count,
    currentId,
    micStatus,
    micError,
    pulse,
    skipToNext,
  } = usePracticeSession(chordIds, tuningId, getChord)

  const { micEnabled } = useMicEnabled()

  const shape = current?.shapes[tuningId]

  if (!current || !shape) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        Lädt…
      </div>
    )
  }

  const spokenGuide = formatChordSpokenGuide(current)

  const handlePlay = async () => {
    if (playing) return
    setPlaying(true)
    await playChordShape(shape, tuningId)
    setTimeout(() => setPlaying(false), 1000)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-8 pt-6 content-tab-bar-pad">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>#{count + 1}</span>
        <span className="rounded-full bg-ink/5 px-2 py-0.5">
          {TUNINGS[tuningId].shortLabel}
        </span>
        <button
          type="button"
          onClick={onDone}
          className="min-h-11 underline underline-offset-2"
        >
          Beenden
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center pt-10">
        <ChordCard
          name={current.displayName}
          shape={shape}
          transitionKey={count}
          accent={current.accent}
          size="lg"
          pulse={pulse}
          animateFingers
          showLabel
          onPlay={() => void playChordShape(shape, tuningId)}
        />

        <button
          type="button"
          onClick={() => void handlePlay()}
          disabled={playing}
          aria-label="Beispiel spielen"
          className="mt-3 flex min-h-11 min-w-11 items-center justify-center rounded-full text-xl text-muted transition-opacity active:opacity-60 disabled:opacity-30"
        >
          🔊
        </button>

        {currentId && <AccuracyBar chordId={currentId} key={currentId} />}

        <SpokenGuide text={spokenGuide} transitionKey={count} />
      </div>

      <div className="flex items-end justify-between gap-4">
        <MicStatus
          status={micStatus}
          errorMessage={micError}
          disabled={!micEnabled}
        />

        {next && (
          <button
            type="button"
            onClick={skipToNext}
            aria-label={`${next.displayName} — überspringen`}
            className="flex cursor-pointer flex-col items-end border-0 bg-transparent p-1 opacity-70 active:opacity-100"
          >
            <span className="mb-1 text-xs text-muted">Nächster</span>
            <ChordCard
              name={next.displayName}
              shape={next.shapes[tuningId]}
              accent={next.accent}
              size="xs"
            />
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Schritt 2: Tests ausführen**

```
npm test
```

Erwartet: alle Tests grün.

- [ ] **Schritt 3: Commit**

```
git add src/screens/PracticeScreen.tsx
git commit -m "feat: show accuracy bar and play-example button on practice screen"
```

---

## Task 9: Play-Button in `NotePracticeScreen`

**Files:**
- Modify: `src/screens/NotePracticeScreen.tsx`

- [ ] **Schritt 1: Play-Button und `playNoteReference` einbauen**

```typescript
// src/screens/NotePracticeScreen.tsx
import { useState } from 'react'
import { getNote } from '../data/notes'
import { TUNINGS, type TuningId } from '../data/tunings'
import { NoteCard } from '../components/NoteCard'
import { MicStatus } from '../components/MicStatus'
import { useMicEnabled } from '../context/MicContext'
import { useNotePracticeSession } from '../hooks/useNotePracticeSession'
import { getNotePositions, positionLabel } from '../lib/notePositions'
import { playNoteReference } from '../lib/playChord'

interface NotePracticeScreenProps {
  tuningId: TuningId
  noteIds: string[]
  onDone: () => void
}

export function NotePracticeScreen({
  tuningId,
  noteIds,
  onDone,
}: NotePracticeScreenProps) {
  const [playing, setPlaying] = useState(false)

  const {
    current,
    next,
    count,
    micStatus,
    micError,
    pulse,
    skipToNext,
  } = useNotePracticeSession(noteIds, tuningId, getNote)

  const { micEnabled } = useMicEnabled()

  if (!current) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        Lädt…
      </div>
    )
  }

  const positions = getNotePositions(tuningId, current.pitchClass)
  const nextPositions = next
    ? getNotePositions(tuningId, next.pitchClass)
    : []

  const handlePlay = async () => {
    if (playing) return
    setPlaying(true)
    await playNoteReference(current.pitchClass)
    setTimeout(() => setPlaying(false), 1000)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-8 pt-6 content-tab-bar-pad">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>#{count + 1}</span>
        <span className="rounded-full bg-ink/5 px-2 py-0.5">
          {TUNINGS[tuningId].shortLabel} · Ton
        </span>
        <button
          type="button"
          onClick={onDone}
          className="min-h-11 underline underline-offset-2"
        >
          Beenden
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <NoteCard
          name={current.displayName}
          tuningId={tuningId}
          positions={positions}
          accent={current.accent}
          size="lg"
          pulse={pulse}
        />

        <button
          type="button"
          onClick={() => void handlePlay()}
          disabled={playing}
          aria-label="Beispiel spielen"
          className="mt-3 flex min-h-11 min-w-11 items-center justify-center rounded-full text-xl text-muted transition-opacity active:opacity-60 disabled:opacity-30"
        >
          🔊
        </button>

        <p className="mt-4 max-w-xs text-center text-xs text-muted">
          {positions.length} Positionen (Bund 0–12)
        </p>
        <ul className="mt-2 max-w-xs text-center text-xs text-muted">
          {positions.map((p) => (
            <li key={`${p.stringIndex}-${p.fret}`}>
              {positionLabel(tuningId, p)}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-end justify-between gap-4">
        <MicStatus
          status={micStatus}
          errorMessage={micError}
          disabled={!micEnabled}
        />

        {next && (
          <button
            type="button"
            onClick={skipToNext}
            aria-label={`${next.displayName} — überspringen`}
            className="flex cursor-pointer flex-col items-end border-0 bg-transparent p-1 opacity-70 active:opacity-100"
          >
            <span className="mb-1 text-xs text-muted">Nächster</span>
            <NoteCard
              name={next.displayName}
              tuningId={tuningId}
              positions={nextPositions}
              accent={next.accent}
              size="xs"
            />
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Schritt 2: Tests ausführen**

```
npm test
```

Erwartet: alle Tests grün.

- [ ] **Schritt 3: Commit**

```
git add src/screens/NotePracticeScreen.tsx
git commit -m "feat: add play-example button to note practice screen"
```

---

## Task 10: Accuracy-Balken in `ChordSelector`

**Files:**
- Modify: `src/components/ChordSelector.tsx`

- [ ] **Schritt 1: Accuracy-Balken unter jede Karte einbauen**

```typescript
// src/components/ChordSelector.tsx
import { CHORDS_BY_ROOT } from '../data/chords'
import type { TuningId } from '../data/tunings'
import { ChordCard } from './ChordCard'
import { getAccuracy, getAllStats } from '../lib/practiceStats'

interface ChordSelectorProps {
  tuningId: TuningId
  selected: Set<string>
  onToggle: (id: string) => void
}

function MiniAccuracyBar({ chordId }: { chordId: string }) {
  const stats = getAllStats()
  const entry = stats[chordId]
  if (!entry || entry.attempts === 0) return null

  const accuracy = entry.correct / entry.attempts
  const color =
    accuracy > 0.8
      ? 'bg-success'
      : accuracy >= 0.6
        ? 'bg-amber-400'
        : 'bg-red-400'

  return (
    <div className="mt-0.5 h-[3px] w-full overflow-hidden rounded-full bg-ink/10">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.round(accuracy * 100)}%` }}
      />
    </div>
  )
}

export function ChordSelector({
  tuningId,
  selected,
  onToggle,
}: ChordSelectorProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {CHORDS_BY_ROOT.map(({ root, chords }) => (
        <section key={root}>
          <h2 className="mb-2 text-xs font-normal text-muted sm:mb-3 sm:text-sm">
            {root}
          </h2>
          <div className="grid grid-cols-4 gap-1 sm:grid-cols-4 sm:gap-2 md:grid-cols-8 md:gap-3">
            {chords.map((chord) => {
              const isSelected = selected.has(chord.id)
              return (
                <label
                  key={chord.id}
                  className={`touch-target flex cursor-pointer select-none flex-col items-center rounded p-0.5 transition-opacity active:opacity-80 sm:p-1 ${
                    isSelected ? 'opacity-100' : 'opacity-35'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(chord.id)}
                    className="sr-only"
                  />
                  <ChordCard
                    name={chord.displayName}
                    shape={chord.shapes[tuningId]}
                    accent={chord.accent}
                    size="xs"
                  />
                  <MiniAccuracyBar chordId={chord.id} />
                </label>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Schritt 2: Tests ausführen**

```
npm test
```

Erwartet: alle Tests grün.

- [ ] **Schritt 3: Build prüfen**

```
npm run build
```

Erwartet: kein TypeScript-Fehler, Build erfolgreich.

- [ ] **Schritt 4: Commit**

```
git add src/components/ChordSelector.tsx
git commit -m "feat: show accuracy mini-bar on chord cards in setup screen"
```

---

## Task 11: Gesamttest + Push

- [ ] **Schritt 1: Alle Tests ausführen**

```
npm test
```

Erwartet: alle 57+ Tests grün (neue Tests für `practiceStats` kommen dazu).

- [ ] **Schritt 2: Lokalen Dev-Server starten und manuell prüfen**

```
npm run dev
```

Prüfliste:
- [ ] Beim ersten Start: Akkord-Karten haben keinen Balken (noch keine Daten)
- [ ] Einige Akkorde üben → Balken auf den Karten erscheinen nach Reload des Setups
- [ ] Play-Button 🔊 auf Practice-Screen ist sichtbar, spielt Ton, ist kurz disabled
- [ ] Play-Button auf Note-Screen funktioniert analog
- [ ] Accuracy-Zeile unter dem Akkordnamen aktualisiert sich bei jedem Treffer
- [ ] M-Taste togglet Mikro nur wenn Tab sichtbar ist
- [ ] App stürzt nicht ab (ErrorBoundary vorhanden)

- [ ] **Schritt 3: Production-Build für GitHub Pages**

```
npm run build:pages
```

Erwartet: kein Fehler.

- [ ] **Schritt 4: Deploy**

```
git push origin main
```

GitHub Actions deployt automatisch auf https://gabiwan24.github.io/d-accord/

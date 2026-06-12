# P1: Onboarding, Fehler-Diagnostik, Session-Summary — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drei Lernfeatures: Session-Summary nach Beenden (Top 3 schwächste Akkorde), Onboarding-Overlay beim ersten Start und per ?-Button, und visuelles Dimmen fehlender Finger während der Erkennung.

**Architecture:** Unabhängige Features die alle in `App.tsx` zusammenlaufen. Fehler-Diagnostik geht durch den Audio-Stack (audioDetector → usePracticeSession → PracticeScreen → ChordDiagram). Session-Summary nutzt den bestehenden practiceStats-Store. Onboarding ist ein isoliertes Overlay-Component.

**Tech Stack:** React 19, TypeScript strict, Tailwind CSS v4, Vitest, localStorage

---

## File Map

| Datei | Aktion | Feature |
|---|---|---|
| `src/screens/SummaryScreen.tsx` | Neu | Summary |
| `src/components/OnboardingOverlay.tsx` | Neu | Onboarding |
| `src/hooks/usePracticeSession.ts` | Ändern | Summary (sessionChordIds) + Diagnostik (detectedPitchClasses) |
| `src/screens/PracticeScreen.tsx` | Ändern | Summary (onDone mit Result) + Diagnostik (missingStringIndices) |
| `src/screens/NotePracticeScreen.tsx` | Keine Änderung | — |
| `src/App.tsx` | Ändern | Summary (summary State) + Onboarding (showOnboarding State) |
| `src/screens/SetupScreen.tsx` | Ändern | Onboarding (?-Button) |
| `src/lib/audioDetector.ts` | Ändern | Diagnostik (onPartialMatch Callback) |
| `src/components/ChordDiagram.tsx` | Ändern | Diagnostik (missingStringIndices Overlay) |
| `src/components/ChordCard.tsx` | Ändern | Diagnostik (missingStringIndices Prop) |
| `src/index.css` | Ändern | Diagnostik (finger-missing Keyframe) |

---

## Task 1: `onPartialMatch` Callback in audioDetector

**Files:**
- Modify: `src/lib/audioDetector.ts`

Der Callback feuert wenn stabiles Signal erkannt wurde, aber der Akkord noch nicht vollständig matcht (`matches === false` + `data.stable` + `!isQuiet` + `expected.kind === 'chord'`).

- [ ] **Schritt 1: `DetectorCallbacks` Interface erweitern**

In `src/lib/audioDetector.ts` das Interface ändern:

```typescript
export interface DetectorCallbacks {
  onStatusChange: (status: MicStatus) => void
  onCorrect: () => void
  onError: (message: string) => void
  onPartialMatch?: (detectedPitchClasses: number[]) => void
}
```

- [ ] **Schritt 2: Callback im `onUpdate`-Handler aufrufen**

Im `onUpdate`-Block, im `else`-Zweig von `if (matches)` (aktuell Zeile ~102):

```typescript
      if (matches) {
        stableMatchCount++
        if (stableMatchCount >= STABLE_MATCHES_REQUIRED) {
          phase = 'cooldown'
          cooldownUntil = now + COOLDOWN_MS
          consecutiveQuiet = 0
          stableMatchCount = 0
          callbacks.onStatusChange('correct')
          callbacks.onCorrect()
        } else {
          callbacks.onStatusChange('almost')
        }
      } else {
        stableMatchCount = 0
        if (!isQuiet && data.stable && expected.kind === 'chord') {
          callbacks.onPartialMatch?.(data.pitchClasses)
        }
        callbacks.onStatusChange('listening')
      }
```

- [ ] **Schritt 3: Tests ausführen**

```
npm test
```

Erwartet: alle Tests grün (kein Breaking Change — Callback ist optional).

- [ ] **Schritt 4: Commit**

```
git add src/lib/audioDetector.ts
git commit -m "feat: add onPartialMatch callback to audioDetector for diagnostics"
```

---

## Task 2: `detectedPitchClasses` State in `usePracticeSession` + `sessionChordIds`

**Files:**
- Modify: `src/hooks/usePracticeSession.ts`

Zwei Ergänzungen: (a) `sessionChordIds` Set für Summary, (b) `detectedPitchClasses` State für Diagnostik.

- [ ] **Schritt 1: Vollständige neue Version von `src/hooks/usePracticeSession.ts` schreiben**

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
  const [detectedPitchClasses, setDetectedPitchClasses] = useState<number[] | null>(null)
  const [sessionChordIds, setSessionChordIds] = useState<Set<string>>(new Set())
  const detectorRef = useRef<AudioDetector | null>(null)
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { micEnabled } = useMicEnabled()

  const current = currentId ? getChord(currentId) : undefined
  const next = nextId ? getChord(nextId) : undefined

  // Track which chords appeared in this session
  useEffect(() => {
    if (currentId) {
      setSessionChordIds((prev) => {
        if (prev.has(currentId)) return prev
        const next = new Set(prev)
        next.add(currentId)
        return next
      })
    }
  }, [currentId])

  const advance = useCallback(() => {
    if (currentId) recordAttempt(currentId, true)
    setDetectedPitchClasses(null)
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
    setDetectedPitchClasses(null)
    goNext()
  }, [goNext])

  useEffect(() => {
    if (!micEnabled) {
      detectorRef.current?.stop()
      detectorRef.current = null
      setMicStatus('idle')
      setMicError(null)
      setDetectedPitchClasses(null)
      return
    }

    const detector = createAudioDetector({
      onStatusChange: (status) => {
        setMicStatus(status)
        if (status === 'idle' || status === 'correct') {
          setDetectedPitchClasses(null)
        }
      },
      onCorrect: () => advanceRef.current(),
      onError: setMicError,
      onPartialMatch: (pcs) => setDetectedPitchClasses(pcs),
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
    detectedPitchClasses,
    sessionChordIds,
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
git add src/hooks/usePracticeSession.ts
git commit -m "feat: track sessionChordIds and detectedPitchClasses in usePracticeSession"
```

---

## Task 3: `finger-missing` CSS-Animation + ChordDiagram-Overlay

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/ChordDiagram.tsx`
- Modify: `src/components/ChordCard.tsx`

Strategie: `ChordCard` erhält `missingStringIndices?: Set<number>`, reicht es an `ChordDiagram` weiter. `ChordDiagram` rendert nach den Finger-Markern ein SVG-Overlay (abgerundetes Rect pro fehlender Saite) das diese Saiten ausblendet. Die CSS-Animation lässt das Overlay pulsieren.

- [ ] **Schritt 1: CSS-Animation in `src/index.css` hinzufügen**

Am Ende von `src/index.css` anfügen:

```css
@keyframes finger-missing-pulse {
  0%, 100% { opacity: 0.65; }
  50% { opacity: 0.3; }
}
.finger-missing {
  animation: finger-missing-pulse 1.2s ease-in-out infinite;
}
```

- [ ] **Schritt 2: `ChordCard` Prop ergänzen**

In `src/components/ChordCard.tsx` das Interface und die Funktion anpassen:

```typescript
import type { AccentColor, ChordShape } from '../data/chords'
import {
  ChordDiagram,
  getDiagramContentWidth,
  getDiagramFrameSize,
  type DiagramSize,
} from './ChordDiagram'
import { ChordLabel } from './ChordLabel'

interface ChordCardProps {
  name: string
  shape: ChordShape
  transitionKey?: number
  accent: AccentColor
  size?: DiagramSize
  pulse?: boolean
  onPlay?: () => void
  animateFingers?: boolean
  showLabel?: boolean
  missingStringIndices?: Set<number> | null
}

export function ChordCard({
  name,
  shape,
  transitionKey = 0,
  accent,
  size = 'sm',
  pulse = false,
  onPlay,
  animateFingers = false,
  showLabel = true,
  missingStringIndices,
}: ChordCardProps) {
  const contentWidth = getDiagramContentWidth(size)

  const diagram = (
    <ChordDiagram
      shape={shape}
      transitionKey={transitionKey}
      size={size}
      animateFingers={animateFingers}
      missingStringIndices={missingStringIndices}
    />
  )

  const label = showLabel ? (
    <ChordLabel
      name={name}
      accent={accent}
      size={size}
      pulse={pulse}
      contentWidth={contentWidth}
      transitionKey={transitionKey}
    />
  ) : null

  const content = (
    <div
      className="flex flex-col items-center overflow-visible"
      style={{ width: contentWidth }}
    >
      {diagram}
      {label}
    </div>
  )

  if (onPlay) {
    return (
      <button
        type="button"
        onClick={onPlay}
        aria-label={`${name} abspielen`}
        className="cursor-pointer border-0 bg-transparent p-0 active:opacity-70"
      >
        {content}
      </button>
    )
  }

  return content
}

/** Nur Diagramm-Slot-Höhe (ohne Akkordname) — für Abwärtskompatibilität */
export function getPracticeDiagramSlotHeight(): number {
  return getDiagramFrameSize('lg').height
}
```

- [ ] **Schritt 3: `ChordDiagram` Prop + Overlay-Rendering ergänzen**

In `src/components/ChordDiagram.tsx`:

Das Interface `ChordDiagramProps` erweitern:

```typescript
interface ChordDiagramProps {
  shape: ChordShape
  transitionKey?: number
  size?: DiagramSize
  animateFingers?: boolean
  missingStringIndices?: Set<number> | null
}
```

Die Funktion-Signatur anpassen:

```typescript
export function ChordDiagram({
  shape,
  transitionKey = 0,
  size = 'sm',
  animateFingers = false,
  missingStringIndices,
}: ChordDiagramProps) {
```

Nach dem schließenden `</g>` der Finger-Markers (vor `</svg>`) das Overlay einfügen. Das Overlay-`<g>` kommt NACH dem bestehenden Finger-`<g>`:

```tsx
        {missingStringIndices && missingStringIndices.size > 0 && (
          <g aria-hidden>
            {shape.frets.map((fret, i) => {
              if (fret === null || !missingStringIndices.has(i)) return null
              const r = dotRadius + dotStroke
              return (
                <rect
                  key={`dim-${i}`}
                  x={stringX(i) - r}
                  y={padTop - r}
                  width={r * 2}
                  height={display.stringBottomY - padTop + r * 2}
                  fill="var(--color-cream)"
                  rx={r}
                  className="finger-missing"
                />
              )
            })}
          </g>
        )}
```

Diese Zeilen kommen unmittelbar vor `</svg>` (nach dem schließenden `</g>` der Fingermarker-Gruppe).

- [ ] **Schritt 4: Tests ausführen + Build prüfen**

```
npm test && npm run build
```

Erwartet: alle Tests grün, Build sauber.

- [ ] **Schritt 5: Commit**

```
git add src/index.css src/components/ChordCard.tsx src/components/ChordDiagram.tsx
git commit -m "feat: dim missing finger strings in chord diagram during partial match"
```

---

## Task 4: `missingStringIndices` in `PracticeScreen` berechnen und weiterleiten

**Files:**
- Modify: `src/screens/PracticeScreen.tsx`

`PracticeScreen` berechnet aus `detectedPitchClasses` + `shape` + `tuningId` welche Saiten-Indizes fehlen und übergibt sie an `ChordCard`.

- [ ] **Schritt 1: Vollständige neue Version von `src/screens/PracticeScreen.tsx`**

```typescript
import { useMemo, useState } from 'react'
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

interface SessionResult {
  count: number
  sessionChordIds: Set<string>
}

interface PracticeScreenProps {
  tuningId: TuningId
  chordIds: string[]
  onDone: (result: SessionResult) => void
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
    detectedPitchClasses,
    sessionChordIds,
  } = usePracticeSession(chordIds, tuningId, getChord)

  const { micEnabled } = useMicEnabled()

  const shape = current?.shapes[tuningId]

  const missingStringIndices = useMemo(() => {
    if (!detectedPitchClasses || detectedPitchClasses.length === 0 || !shape) return null
    const detected = new Set(detectedPitchClasses.map((pc) => ((pc % 12) + 12) % 12))
    const strings = TUNINGS[tuningId].strings
    const missing = new Set<number>()
    shape.frets.forEach((fret, i) => {
      if (fret === null) return
      const pc = ((strings[i].midi + fret) % 12 + 12) % 12
      if (!detected.has(pc)) missing.add(i)
    })
    return missing.size > 0 ? missing : null
  }, [detectedPitchClasses, shape, tuningId])

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
          onClick={() => onDone({ count, sessionChordIds })}
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
          missingStringIndices={missingStringIndices}
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

- [ ] **Schritt 2: Tests ausführen + Build**

```
npm test && npm run build
```

Erwartet: alle Tests grün, Build sauber.

- [ ] **Schritt 3: Commit**

```
git add src/screens/PracticeScreen.tsx
git commit -m "feat: compute and pass missingStringIndices from detectedPitchClasses to ChordCard"
```

---

## Task 5: `SummaryScreen` erstellen

**Files:**
- Create: `src/screens/SummaryScreen.tsx`

Zeigt Gesamtzahl gespielter Akkorde und Top 3 schwächste (nach Lifetime-Accuracy) aus der Session.

- [ ] **Schritt 1: `src/screens/SummaryScreen.tsx` erstellen**

```typescript
import { getChord } from '../data/chords'
import { getAccuracy, getAllStats } from '../lib/practiceStats'

interface SummaryScreenProps {
  count: number
  sessionChordIds: Set<string>
  onPlayAgain: () => void
  onDone: () => void
}

function AccuracyMiniBar({ accuracy }: { accuracy: number }) {
  const color =
    accuracy > 0.8
      ? 'bg-success'
      : accuracy >= 0.6
        ? 'bg-amber-400'
        : 'bg-red-400'
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink/10">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.round(accuracy * 100)}%` }}
      />
    </div>
  )
}

export function SummaryScreen({
  count,
  sessionChordIds,
  onPlayAgain,
  onDone,
}: SummaryScreenProps) {
  const stats = getAllStats()

  const weakest = [...sessionChordIds]
    .map((id) => {
      const entry = stats[id]
      const chord = getChord(id)
      if (!chord || !entry || entry.attempts === 0) return null
      return { id, name: chord.displayName, accuracy: getAccuracy(id), entry }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 content-tab-bar-pad">
      <h1 className="mb-8 text-lg font-normal text-ink">Übung beendet</h1>

      <div className="mb-8 flex items-center gap-3 text-3xl">
        <span>🎵</span>
        <span className="text-ink">
          {count} {count === 1 ? 'Akkord' : 'Akkorde'} gespielt
        </span>
      </div>

      {weakest.length > 0 && (
        <div className="mb-10 w-full max-w-xs space-y-3">
          <p className="mb-4 text-center text-xs text-muted">
            Diese brauchten am meisten Übung
          </p>
          {weakest.map(({ id, name, accuracy, entry }) => (
            <div key={id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink">{name}</span>
              <div className="flex items-center gap-2">
                <AccuracyMiniBar accuracy={accuracy} />
                <span className="w-8 text-right text-xs tabular-nums text-muted">
                  {Math.round(accuracy * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="touch-target flex min-h-12 w-full items-center justify-center rounded-lg bg-ink py-3 text-base text-cream transition-opacity active:opacity-80"
        >
          Nochmal
        </button>
        <button
          type="button"
          onClick={onDone}
          className="touch-target flex min-h-12 w-full items-center justify-center rounded-lg border border-ink/20 py-3 text-base text-ink transition-opacity active:opacity-60"
        >
          Fertig
        </button>
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
git add src/screens/SummaryScreen.tsx
git commit -m "feat: add SummaryScreen with weakest chords from session"
```

---

## Task 6: Summary in `App.tsx` verdrahten

**Files:**
- Modify: `src/App.tsx`

`App.tsx` hält einen neuen `summary`-State. Nach Beenden von `PracticeScreen` (Chord-Modus) wird `SummaryScreen` angezeigt. "Nochmal" startet die Session neu, "Fertig" geht zu Setup.

- [ ] **Schritt 1: Vollständige neue Version von `src/App.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { AppTabBar, type AppTab } from './components/AppTabBar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { MicProvider } from './context/MicContext'
import { closeAudioContext } from './lib/playChord'
import type { PracticeSessionConfig } from './screens/SetupScreen'
import { NotePracticeScreen } from './screens/NotePracticeScreen'
import { PracticeScreen } from './screens/PracticeScreen'
import { SetupScreen } from './screens/SetupScreen'
import { SummaryScreen } from './screens/SummaryScreen'
import { TunerScreen } from './screens/TunerScreen'

type Screen = 'setup' | 'practice' | 'summary'

interface SummaryData {
  count: number
  sessionChordIds: Set<string>
  config: PracticeSessionConfig
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('practice')
  const [screen, setScreen] = useState<Screen>('setup')
  const [session, setSession] = useState<PracticeSessionConfig | null>(null)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

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
    setSummary(null)
  }

  const handlePracticeDone = (result: { count: number; sessionChordIds: Set<string> }) => {
    if (!session || session.mode !== 'chords') {
      setScreen('setup')
      setSession(null)
      return
    }
    setSummary({ ...result, config: session })
    setScreen('summary')
  }

  const handlePlayAgain = () => {
    if (summary) handleStart(summary.config)
  }

  const handleSummaryDone = () => {
    setScreen('setup')
    setSession(null)
    setSummary(null)
  }

  const renderContent = () => {
    if (activeTab === 'tuner') {
      return <TunerScreen active />
    }

    if (screen === 'summary' && summary) {
      return (
        <SummaryScreen
          count={summary.count}
          sessionChordIds={summary.sessionChordIds}
          onPlayAgain={handlePlayAgain}
          onDone={handleSummaryDone}
        />
      )
    }

    if (screen === 'practice' && session) {
      if (session.mode === 'notes') {
        return (
          <NotePracticeScreen
            tuningId={session.tuningId}
            noteIds={session.ids}
            onDone={() => { setScreen('setup'); setSession(null) }}
          />
        )
      }

      return (
        <PracticeScreen
          tuningId={session.tuningId}
          chordIds={session.ids}
          onDone={handlePracticeDone}
        />
      )
    }

    return <SetupScreen onStart={handleStart} onOpenHelp={() => setShowOnboarding(true)} />
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

Hinweis: `SetupScreen` bekommt einen neuen Prop `onOpenHelp` — der wird in Task 7 implementiert. `showOnboarding` State ist vorbereitet, wird in Task 8 genutzt.

- [ ] **Schritt 2: Tests ausführen + Build**

```
npm test && npm run build
```

Der Build wird TypeScript-Fehler wegen `onOpenHelp` auf `SetupScreen` werfen — das ist erwartet und wird in Task 7 behoben.

Wenn Tests grün sind (TypeScript-Compiler-Fehler im Build sind OK für diesen Schritt):

- [ ] **Schritt 3: Commit**

```
git add src/App.tsx
git commit -m "feat: wire SummaryScreen into App after chord practice session ends"
```

---

## Task 7: ?-Button in `SetupScreen` + `onOpenHelp` Prop

**Files:**
- Modify: `src/screens/SetupScreen.tsx`

Fügt `onOpenHelp?: () => void` Prop hinzu und einen kleinen `?`-Button in der Header-Zeile neben dem Titel.

- [ ] **Schritt 1: Vollständige neue Version von `src/screens/SetupScreen.tsx`**

Ändere nur die `SetupScreenProps` und die Header-Zeile — der Rest bleibt identisch:

```typescript
import { useCallback, useState } from 'react'
import {
  getPresetChordIds,
  type ChordPresetId,
} from '../data/chordPresets'
import { NOTES, type PracticeMode } from '../data/notes'
import type { TuningId } from '../data/tunings'
import { ChordSelector } from '../components/ChordSelector'
import { ModeSelector } from '../components/ModeSelector'
import { NoteSelector } from '../components/NoteSelector'
import { PresetSelector } from '../components/PresetSelector'
import { TuningSelector } from '../components/TuningSelector'
import {
  loadChordPreset,
  loadPracticeMode,
  loadSelectedChords,
  loadSelectedNotes,
  loadTuning,
  saveChordPreset,
  savePracticeMode,
  saveSelectedChords,
  saveSelectedNotes,
  saveTuning,
} from '../lib/storage'

export interface PracticeSessionConfig {
  mode: PracticeMode
  tuningId: TuningId
  ids: string[]
}

interface SetupScreenProps {
  onStart: (config: PracticeSessionConfig) => void
  onOpenHelp?: () => void
}

export function SetupScreen({ onStart, onOpenHelp }: SetupScreenProps) {
  const [mode, setMode] = useState<PracticeMode>(() => loadPracticeMode())
  const [tuningId, setTuningId] = useState<TuningId>(() => loadTuning())
  const [chordPreset, setChordPreset] = useState<ChordPresetId>(() =>
    loadChordPreset(),
  )
  const [selectedChords, setSelectedChords] = useState<Set<string>>(
    () => new Set(loadSelectedChords()),
  )
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(
    () => new Set(loadSelectedNotes()),
  )

  const selected = mode === 'chords' ? selectedChords : selectedNotes
  const setSelected = mode === 'chords' ? setSelectedChords : setSelectedNotes

  const toggle = useCallback(
    (id: string) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      if (mode === 'chords') {
        setChordPreset('custom')
        saveChordPreset('custom')
      }
    },
    [mode, setSelected],
  )

  const handlePresetChange = (presetId: ChordPresetId) => {
    setChordPreset(presetId)
    saveChordPreset(presetId)
    if (presetId === 'custom') return
    const ids = getPresetChordIds(presetId)
    setSelectedChords(new Set(ids))
    saveSelectedChords(ids)
  }

  const selectAll = () => {
    if (mode === 'chords') {
      handlePresetChange('stufe5')
    } else {
      setSelectedNotes(new Set(NOTES.map((n) => n.id)))
    }
  }

  const selectNone = () => {
    if (mode === 'chords') {
      setChordPreset('custom')
      saveChordPreset('custom')
      setSelectedChords(new Set())
      saveSelectedChords([])
    } else {
      setSelectedNotes(new Set())
    }
  }

  const handleModeChange = (next: PracticeMode) => {
    setMode(next)
    savePracticeMode(next)
  }

  const handleTuningChange = (id: TuningId) => {
    setTuningId(id)
    saveTuning(id)
  }

  const handleStart = () => {
    if (selected.size < 2) return
    const ids = [...selected]
    saveTuning(tuningId)
    savePracticeMode(mode)
    if (mode === 'chords') {
      saveSelectedChords(ids)
      saveChordPreset(chordPreset)
    } else {
      saveSelectedNotes(ids)
    }
    onStart({ mode, tuningId, ids })
  }

  const canStart = selected.size >= 2

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="safe-top sticky top-0 z-20 border-b border-ink/10 bg-cream/95 px-3 backdrop-blur-sm sm:px-4">
        <div className="flex items-center justify-between py-2">
          <h1 className="text-base font-normal text-ink sm:text-lg">
            Ukulele Trainer
          </h1>
          {onOpenHelp && (
            <button
              type="button"
              onClick={onOpenHelp}
              aria-label="Hilfe anzeigen"
              className="touch-target flex min-h-9 min-w-9 items-center justify-center rounded-full text-sm text-muted transition-opacity active:opacity-60"
            >
              ?
            </button>
          )}
        </div>

        <div className="space-y-2 pb-3">
          <ModeSelector value={mode} onChange={handleModeChange} />
          <TuningSelector value={tuningId} onChange={handleTuningChange} />

          {mode === 'chords' && (
            <PresetSelector
              value={chordPreset}
              onChange={handlePresetChange}
            />
          )}

          <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={selectAll}
                className="touch-target underline underline-offset-2"
              >
                Alle
              </button>
              <button
                type="button"
                onClick={selectNone}
                className="touch-target underline underline-offset-2"
              >
                Keine
              </button>
            </div>
            <span className="shrink-0 tabular-nums">{selected.size} gewählt</span>
          </div>
        </div>
      </header>

      <main className="setup-scroll-pad flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
        {mode === 'chords' ? (
          <ChordSelector
            tuningId={tuningId}
            selected={selectedChords}
            onToggle={toggle}
          />
        ) : (
          <NoteSelector
            tuningId={tuningId}
            selected={selectedNotes}
            onToggle={toggle}
          />
        )}
      </main>

      <footer className="safe-bottom fixed inset-x-0 above-tab-bar z-20 border-t border-ink/10 bg-cream/95 px-3 pt-4 backdrop-blur-sm sm:px-4">
        <button
          type="button"
          onClick={handleStart}
          disabled={!canStart}
          className="touch-target mx-auto flex min-h-[3.75rem] w-full max-w-2xl items-center justify-center rounded-lg bg-ink py-4 text-base font-normal text-cream transition-opacity disabled:opacity-30 active:opacity-80 sm:min-h-[4rem] sm:py-5 sm:text-lg"
        >
          Übung starten
          {canStart && (
            <span className="ml-2 opacity-70">({selected.size})</span>
          )}
        </button>
      </footer>
    </div>
  )
}
```

- [ ] **Schritt 2: Tests ausführen + Build**

```
npm test && npm run build
```

Erwartet: alle Tests grün, Build sauber (kein TypeScript-Fehler mehr).

- [ ] **Schritt 3: Commit**

```
git add src/screens/SetupScreen.tsx
git commit -m "feat: add help button to SetupScreen header"
```

---

## Task 8: `OnboardingOverlay` erstellen + in `App.tsx` einbinden

**Files:**
- Create: `src/components/OnboardingOverlay.tsx`
- Modify: `src/App.tsx`

4-Screen Overlay. Erscheint beim ersten App-Start (localStorage-Check) und wenn ?-Button gedrückt. Zeigt auf Screen 2 ein echtes C-Dur-Diagramm.

- [ ] **Schritt 1: `src/components/OnboardingOverlay.tsx` erstellen**

```typescript
import { useState } from 'react'
import { CHORDS } from '../data/chords'
import { ChordCard } from './ChordCard'

const ONBOARDING_KEY = 'ukulele-onboarded'

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === '1'
}

export function markOnboardingSeen(): void {
  localStorage.setItem(ONBOARDING_KEY, '1')
}

interface OnboardingOverlayProps {
  onClose: () => void
}

const C_MAJOR = CHORDS.find((c) => c.id === 'C-')

const SCREENS = [
  {
    title: 'Willkommen',
    content: (
      <p className="mt-4 max-w-xs text-center text-sm leading-relaxed text-muted">
        Sehen → Spielen → Bestätigung.
        <br />
        Wähle Akkorde, spiele sie auf deiner Ukulele — die App bestätigt automatisch.
      </p>
    ),
  },
  {
    title: 'Akkord-Diagramm',
    content: (
      <div className="mt-4 flex flex-col items-center gap-3">
        {C_MAJOR && (
          <ChordCard
            name={C_MAJOR.displayName}
            shape={C_MAJOR.shapes.highG}
            accent={C_MAJOR.accent}
            size="sm"
            showLabel
          />
        )}
        <p className="max-w-xs text-center text-sm leading-relaxed text-muted">
          Tippe das Diagramm um einen Vorschau-Ton zu hören.
        </p>
      </div>
    ),
  },
  {
    title: 'Mikrofon',
    content: (
      <div className="mt-4 flex flex-col items-center gap-3">
        <span className="text-5xl">🎤</span>
        <p className="max-w-xs text-center text-sm leading-relaxed text-muted">
          Spiele den Akkord auf deiner Ukulele.
          <br />
          Die App erkennt ihn automatisch und springt weiter.
          <br />
          <br />
          Taste <strong>M</strong> schaltet das Mikrofon ein und aus.
        </p>
      </div>
    ),
  },
  {
    title: 'Los geht\'s',
    content: (
      <p className="mt-4 max-w-xs text-center text-sm leading-relaxed text-muted">
        Bereit? Wähle deine Akkorde und starte die Übung.
      </p>
    ),
  },
]

export function OnboardingOverlay({ onClose }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0)
  const isLast = step === SCREENS.length - 1

  const handleClose = () => {
    markOnboardingSeen()
    onClose()
  }

  const handleNext = () => {
    if (isLast) {
      handleClose()
    } else {
      setStep((s) => s + 1)
    }
  }

  const screen = SCREENS[step]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-cream px-6 pb-6 pt-8 shadow-lg">
        <h2 className="text-center text-lg font-normal text-ink">{screen.title}</h2>

        {screen.content}

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleNext}
            className="touch-target flex min-h-11 w-full items-center justify-center rounded-lg bg-ink text-base text-cream transition-opacity active:opacity-80"
          >
            {isLast ? 'Starten' : 'Weiter'}
          </button>

          {!isLast && (
            <button
              type="button"
              onClick={handleClose}
              className="touch-target flex min-h-9 w-full items-center justify-center text-sm text-muted transition-opacity active:opacity-60"
            >
              Überspringen
            </button>
          )}
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {SCREENS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === step ? 'w-4 bg-ink' : 'w-1.5 bg-ink/25'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
```

Hinweis: `CHORDS` muss von `../data/chords` exportiert sein. Prüfe ob `CHORDS` oder eine andere Konstante exportiert wird — alternativ kann `getChord('C-')` verwendet werden wenn `CHORDS` nicht direkt exportiert ist.

- [ ] **Schritt 2: Prüfen wie C-Dur Akkord geladen werden kann**

```
grep -n "export" src/data/chords.ts | head -20
```

Falls `CHORDS` nicht exportiert: in OnboardingOverlay statt `CHORDS.find(...)` verwenden:
```typescript
import { getChord } from '../data/chords'
const C_MAJOR = getChord('C-')
```

- [ ] **Schritt 3: `App.tsx` um Onboarding erweitern**

In `src/App.tsx` die `showOnboarding`-Logik aktivieren. Der State und `setShowOnboarding` sind bereits in Task 6 vorbereitet. Ergänze den Import und den first-launch-Check:

```typescript
import { OnboardingOverlay, hasSeenOnboarding } from './components/OnboardingOverlay'
```

Den `showOnboarding` useState-Initialwert anpassen:

```typescript
const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding())
```

Und das Overlay in den Return-Block einfügen — direkt vor dem schließenden `</MicProvider>`:

```typescript
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
      </MicProvider>
    </ErrorBoundary>
  )
```

- [ ] **Schritt 4: Tests ausführen + Build**

```
npm test && npm run build
```

Erwartet: alle Tests grün, Build sauber.

- [ ] **Schritt 5: Commit**

```
git add src/components/OnboardingOverlay.tsx src/App.tsx
git commit -m "feat: add onboarding overlay (first launch + help button)"
```

---

## Task 9: Gesamttest + Push

**Files:** keine neuen Änderungen

- [ ] **Schritt 1: Alle Tests**

```
npm test
```

Erwartet: alle 62+ Tests grün.

- [ ] **Schritt 2: Production Build**

```
npm run build:pages
```

Erwartet: kein Fehler.

- [ ] **Schritt 3: Manuelle Prüfliste** (lokaler Dev-Server: `npm run dev`)

- [ ] Onboarding erscheint beim ersten Besuch (localStorage leer)
- [ ] Onboarding zeigt 4 Screens mit Dots-Indikator
- [ ] "Überspringen" schließt Overlay und setzt localStorage
- [ ] ?-Button in SetupScreen öffnet Onboarding erneut
- [ ] Nach Beenden einer Chord-Session: SummaryScreen erscheint
- [ ] SummaryScreen zeigt Anzahl gespielter Akkorde
- [ ] Schwächste Akkorde (mit Balken und %) werden angezeigt (erst nach mehreren Sessions sichtbar)
- [ ] "Nochmal" startet gleiche Session neu
- [ ] "Fertig" geht zu Setup
- [ ] Beim Spielen mit Mikro: wenn ein Ton fehlt, dimmt der entsprechende Finger im Diagramm und pulsiert

- [ ] **Schritt 4: Push**

```
git push origin main
```

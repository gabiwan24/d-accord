# Debug-Overlay — Design Spec

**Datum:** 2026-06-13  
**Status:** Approved

---

## Übersicht

Ein permanentes, halbtransparentes Debug-Overlay (fixed bottom-right) das Echtzeit-Pitch-Erkennungsdaten anzeigt. Ziel: Noise-Töne und Erkennungsfehler analysieren und die Detektions-Parameter optimieren.

---

## 1. DebugStore (`src/lib/debugStore.ts`)

Kein React, kein Context — reines Modul mit Subscriber-Muster.

### Datenstruktur

```typescript
export interface DebugFrame {
  timestamp: number         // Date.now()
  source: 'detector' | 'tuner'
  // Rohwerte
  hz: number | null
  rawMidi: number | null
  energy: number
  pitchClasses: number[]    // erkannte Pitch-Classes (0-11)
  stable: boolean
  // Verarbeitete Werte
  smoothedMidi: number | null
  cents: number | null
  detectedString: string | null  // nur Tuner: "E4", "A4" etc.
  // Nur Übungsmodus
  targetPitchClasses: number[]   // leeres Array wenn kein Target
  correct: number[]              // erkannt UND im Target
  noise: number[]                // erkannt aber NICHT im Target
  missing: number[]              // im Target aber NICHT erkannt
}
```

### API

```typescript
export function addDebugFrame(frame: DebugFrame): void
// Logging-Filter: nur loggen wenn:
//   energy > MIN_LOG_ENERGY (0.0005)
//   UND (pitchClasses haben sich geändert ODER |cents - letzterCents| > 5)
// Max 200 Einträge im Log (älteste werden verworfen)

export function subscribe(cb: (frame: DebugFrame) => void): () => void
// Gibt unsubscribe-Funktion zurück

export function getLog(): DebugFrame[]

export function clearLog(): void

export const MIN_LOG_ENERGY = 0.0005
```

### Live vs. Log

- **Live**: jeder Frame wird an Subscriber weitergeleitet (auch wenn nicht geloggt)
- **Log**: nur gefilterte Frames (energy + Änderungsfilter)

---

## 2. Detektoren erweitern

### `src/lib/audioDetector.ts`

Im `onUpdate`-Handler, nach dem bestehenden Matching, `addDebugFrame` aufrufen:

```typescript
import { addDebugFrame } from './debugStore'

// Am Ende von onUpdate (nach allen Status-Callbacks):
const targetPCs = expected.kind === 'chord' ? expected.pitchClasses : []
const detectedPCs = data.pitchClasses ?? []
addDebugFrame({
  timestamp: Date.now(),
  source: 'detector',
  hz: data.fundMidis?.[0] ? midiToHz(data.fundMidis[0]) : null,
  rawMidi: data.fundMidis?.[0] ?? null,
  energy: data.maxEnergy,
  pitchClasses: detectedPCs,
  stable: data.stable,
  smoothedMidi: null,      // audioDetector arbeitet nicht mit smoothedMidi
  cents: null,
  detectedString: null,
  targetPitchClasses: targetPCs,
  correct: detectedPCs.filter(pc => targetPCs.includes(pc)),
  noise: detectedPCs.filter(pc => !targetPCs.includes(pc)),
  missing: targetPCs.filter(pc => !detectedPCs.includes(pc)),
})
```

### `src/lib/tunerDetector.ts`

Im `onUpdate`-Handler, nach `callbacks.onReading(reading)`:

```typescript
import { addDebugFrame } from './debugStore'

addDebugFrame({
  timestamp: Date.now(),
  source: 'tuner',
  hz: rawMidi ? midiToHz(rawMidi) : null,
  rawMidi: rawMidi ?? null,
  energy: data.maxEnergy,
  pitchClasses: [],           // Tuner arbeitet nicht mit Pitch-Classes
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

---

## 3. DebugOverlay (`src/components/DebugOverlay.tsx`)

Permanentes Overlay, fixed bottom-right. Kein Toggle.

### Layout

```
┌──────────────────────────────────┐
│ Debug  [Clear] [Log speichern]   │
├──────────────────────────────────┤
│ LIVE                             │
│ Hz: 329.6  MIDI: 64.2  E: 0.023 │
│ PCs: [4, 7, 11]  Stable: ✓      │
│ Geglättet: 64.1  Cents: +12     │
│                                  │
│ ── Übungsmodus ──                │
│ Target: [0, 4, 7]  (C, E, G)    │
│ ✓ [4, 7]  ✗ [11]  △ [0]         │
├──────────────────────────────────┤
│ LOG (47 Einträge)                │
│ 14:23:01 Hz:329 MIDI:64 E:0.02  │
│   PCs:[4,7,11] ✓[4,7] ✗[11] △[0]│
│ 14:23:01 Hz:331 MIDI:64 E:0.03  │
│ ...                              │
└──────────────────────────────────┘
```

### Technische Details

- **Position**: `fixed bottom-4 right-4 z-[200]` (über Onboarding-Overlay z-100)
- **Größe**: `w-72`, max-height `50vh`, Log-Bereich scrollbar
- **Hintergrund**: `bg-ink/90 text-cream` (dunkles Panel)
- **Schrift**: `text-[10px] font-mono` für Daten
- **Subscribe**: `useEffect` subscribt auf `debugStore`, setzt `latestFrame` state

### Pitch-Class → Notenname

Hilfsfunktion `pcToName(pc: number): string` → `['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][pc]`

### Download-Format

Beim Klick auf "Log speichern":
```
Ukulele Debug Log — 2026-06-13T14:23:01
source | timestamp | hz | rawMidi | energy | pitchClasses | stable | smoothedMidi | cents | detectedString | target | correct | noise | missing
detector | 14:23:01.456 | 329.6 | 64.2 | 0.023 | 4,7,11 | true | - | - | - | 0,4,7 | 4,7 | 11 | 0
tuner | 14:23:02.100 | 440.0 | 69.0 | 0.045 | - | false | 69.1 | +12 | A4 | - | - | - | -
```

Tab-separierte Zeilen (`.txt`), erste Zeile Header, zweite Zeile Spaltenbezeichnungen.

Implementierung:
```typescript
const blob = new Blob([content], { type: 'text/plain' })
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `ukulele-debug-${new Date().toISOString().slice(0,19)}.txt`
a.click()
URL.revokeObjectURL(url)
```

---

## 4. App.tsx

`<DebugOverlay>` direkt vor `</ErrorBoundary>` einbinden — immer gerendert, kein bedingtes Rendering.

---

## Betroffene Dateien

| Datei | Aktion |
|---|---|
| `src/lib/debugStore.ts` | Neu |
| `src/lib/audioDetector.ts` | `addDebugFrame` aufrufen |
| `src/lib/tunerDetector.ts` | `addDebugFrame` aufrufen |
| `src/components/DebugOverlay.tsx` | Neu |
| `src/App.tsx` | `<DebugOverlay>` einbinden |

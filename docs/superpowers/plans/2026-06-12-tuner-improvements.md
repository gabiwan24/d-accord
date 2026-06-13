# Stimmgerät-Verbesserungen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stimmgerät beruhigen (weniger Zittern, stabilere Saiten-Erkennung) und Anzeige verbessern (größere Cent-Zahl, Richtungshinweis, Fertig-Banner).

**Architecture:** Drei unabhängige Änderungen: (1) Konstanten in `tunerFilter.ts` und `tunerEngine.ts` anpassen, (2) `CentGauge.tsx` visuell erweitern, (3) Fertig-Banner in `TunerScreen.tsx` hinzufügen. Keine neuen Dateien, keine Architekturänderungen.

**Tech Stack:** React 19, TypeScript strict, Tailwind CSS v4, Vitest

---

## File Map

| Datei | Änderung |
|---|---|
| `src/lib/tunerFilter.ts` | `MIDI_SMOOTH_ALPHA`, `CENTS_SMOOTH_ALPHA`, `StableStringGate` Default-Parameter |
| `src/lib/tunerEngine.ts` | `IN_TUNE_CENTS` |
| `src/components/tuner/CentGauge.tsx` | Balken/Nadel dicker, Cent-Zahl, Richtungshinweis, Display-Totzone |
| `src/screens/TunerScreen.tsx` | Fertig-Banner |

---

## Task 1: Stabilisierungs-Konstanten + Tests

**Files:**
- Modify: `src/lib/tunerFilter.ts`
- Modify: `src/lib/tunerEngine.ts`
- Test: `src/lib/tunerEngine.test.ts` (existiert bereits — prüfe mit `ls src/lib/*.test.ts`)

Dieser Task ändert Zahlenwerte und verifiziert mit Unit-Tests, dass die neue `IN_TUNE_CENTS`-Schwelle korrekt greift.

- [ ] **Schritt 1: Prüfe bestehende Tests**

```
npm test -- --run
```

Erwarte: alle Tests grün. Notiere die Anzahl (z.B. 62 Tests).

- [ ] **Schritt 2: Test für neuen IN_TUNE_CENTS-Wert schreiben**

Öffne `src/lib/tunerEngine.test.ts`. Füge am Ende hinzu:

```typescript
describe('isInTune with new threshold', () => {
  it('returns true at 7 cents (below new threshold of 8)', () => {
    expect(isInTune(7)).toBe(true)
  })

  it('returns false at 9 cents (above new threshold of 8)', () => {
    expect(isInTune(9)).toBe(false)
  })

  it('returns true at -7 cents', () => {
    expect(isInTune(-7)).toBe(true)
  })

  it('old threshold 5 cents is still in tune', () => {
    expect(isInTune(5)).toBe(true)
  })
})
```

- [ ] **Schritt 3: Tests ausführen — erwarte FAIL**

```
npm test -- --run
```

Erwarte: `isInTune(7)` und `isInTune(-7)` schlagen fehl, weil `IN_TUNE_CENTS` noch 5 ist.

- [ ] **Schritt 4: `IN_TUNE_CENTS` in `tunerEngine.ts` ändern**

Finde die Zeile:
```typescript
export const IN_TUNE_CENTS = 5
```

Ändere zu:
```typescript
export const IN_TUNE_CENTS = 8
```

- [ ] **Schritt 5: Smoothing-Konstanten in `tunerFilter.ts` ändern**

Finde:
```typescript
export const MIDI_SMOOTH_ALPHA = 0.18
export const CENTS_SMOOTH_ALPHA = 0.22
```

Ändere zu:
```typescript
export const MIDI_SMOOTH_ALPHA = 0.10
export const CENTS_SMOOTH_ALPHA = 0.12
```

- [ ] **Schritt 6: `StableStringGate` Default-Parameter ändern**

Finde in `tunerFilter.ts`:
```typescript
constructor(private readonly requiredFrames = 6) {}
```

Ändere zu:
```typescript
constructor(private readonly requiredFrames = 15) {}
```

- [ ] **Schritt 7: Tests ausführen — erwarte PASS**

```
npm test -- --run
```

Erwarte: alle Tests grün, inkl. der neuen 4 Tests.

- [ ] **Schritt 8: Commit**

```
git add src/lib/tunerEngine.ts src/lib/tunerFilter.ts src/lib/tunerEngine.test.ts
git commit -m "feat: tune stabilization — slower smoothing, bigger in-tune zone, stable string gate"
```

---

## Task 2: `CentGauge` — Dicker, Cent-Zahl, Richtungshinweis, Totzone

**Files:**
- Modify: `src/components/tuner/CentGauge.tsx`

Die vollständige neue Version von `CentGauge.tsx`:

- [ ] **Schritt 1: Aktuelle Datei lesen**

Lies `src/components/tuner/CentGauge.tsx` um den aktuellen Code zu verstehen.

- [ ] **Schritt 2: Datei vollständig ersetzen**

```typescript
import { useRef } from 'react'
import { DISPLAY_CENTS_CLAMP, IN_TUNE_CENTS } from '../../lib/tunerEngine'

const DEAD_ZONE_CENTS = 2

interface CentGaugeProps {
  cents: number
  inTune: boolean
  hasSignal: boolean
}

export function CentGauge({ cents, inTune, hasSignal }: CentGaugeProps) {
  const lastDisplayedRef = useRef<number>(0)

  const clamped = Math.max(
    -DISPLAY_CENTS_CLAMP,
    Math.min(DISPLAY_CENTS_CLAMP, cents),
  )

  // Display-Totzone: Nadel bewegt sich nur wenn Änderung >= 2 Cent
  if (!hasSignal) {
    lastDisplayedRef.current = 0
  } else if (Math.abs(clamped - lastDisplayedRef.current) >= DEAD_ZONE_CENTS) {
    lastDisplayedRef.current = clamped
  }

  const displayed = hasSignal ? lastDisplayedRef.current : 0
  const position = ((displayed + DISPLAY_CENTS_CLAMP) / (DISPLAY_CENTS_CLAMP * 2)) * 100

  const roundedCents = Math.round(cents)
  const centLabel = !hasSignal
    ? '—'
    : roundedCents === 0
      ? '0 ct'
      : `${roundedCents > 0 ? '+' : ''}${roundedCents} ct`

  const directionLabel =
    !hasSignal || inTune
      ? ''
      : cents > IN_TUNE_CENTS
        ? 'zu hoch'
        : 'zu tief'

  return (
    <div className="w-full max-w-xs">
      {/* Balken */}
      <div className="relative h-4 overflow-hidden rounded-full bg-ink/10">
        {/* In-Tune-Zone */}
        <div
          className="absolute inset-y-0 rounded-full bg-success/25"
          style={{
            left: `${((-IN_TUNE_CENTS + DISPLAY_CENTS_CLAMP) / (DISPLAY_CENTS_CLAMP * 2)) * 100}%`,
            width: `${((IN_TUNE_CENTS * 2) / (DISPLAY_CENTS_CLAMP * 2)) * 100}%`,
          }}
        />
        {/* Nadel */}
        <div
          className={`absolute top-1/2 h-6 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left,background-color] duration-150 ${
            inTune && hasSignal ? 'bg-success' : 'bg-ink'
          }`}
          style={{
            left: hasSignal ? `${position}%` : '50%',
            opacity: hasSignal ? 1 : 0.25,
          }}
        />
      </div>

      {/* ±50-Labels */}
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>−{DISPLAY_CENTS_CLAMP}</span>
        <span className={inTune && hasSignal ? 'text-success' : ''}>0</span>
        <span>+{DISPLAY_CENTS_CLAMP}</span>
      </div>

      {/* Große Cent-Zahl */}
      <div className="mt-2 text-center">
        <p
          className={`text-2xl tabular-nums leading-none ${
            !hasSignal
              ? 'text-muted/40'
              : inTune
                ? 'text-success'
                : 'text-ink'
          }`}
        >
          {centLabel}
        </p>
      </div>

      {/* Richtungshinweis */}
      <div className="mt-1 min-h-[1rem] text-center">
        <p className="text-xs text-muted">{directionLabel}</p>
      </div>
    </div>
  )
}
```

- [ ] **Schritt 3: Build + Tests**

```
npm test -- --run && npm run build
```

Erwarte: alle Tests grün, Build sauber.

- [ ] **Schritt 4: Commit**

```
git add src/components/tuner/CentGauge.tsx
git commit -m "feat: improve CentGauge — bigger gauge, cent label, direction hint, display dead zone"
```

---

## Task 3: Fertig-Banner in `TunerScreen`

**Files:**
- Modify: `src/screens/TunerScreen.tsx`

- [ ] **Schritt 1: Aktuelle Datei lesen**

Lies `src/screens/TunerScreen.tsx` um den aktuellen Aufbau zu verstehen.

- [ ] **Schritt 2: `allTuned` Variable hinzufügen**

Direkt nach dem Block mit `const hasSignal = ...` und `const centsLabel = ...`:

```typescript
const allTuned =
  stringTargets.length > 0 && tunedStrings.size === stringTargets.length
```

- [ ] **Schritt 3: Banner zwischen CentGauge-Block und StringRows einfügen**

Finde den Block der mit `<div className="space-y-1">` beginnt (die StringRows). Direkt davor einfügen:

```tsx
{allTuned && (
  <div className="rounded-lg bg-success/12 px-4 py-3 text-center text-sm font-medium text-success ring-1 ring-success/30">
    ✓ Alle Saiten gestimmt
  </div>
)}
```

Der umliegende Bereich sieht dann so aus:

```tsx
      {/* ... CentGauge-Block oben ... */}

      {allTuned && (
        <div className="rounded-lg bg-success/12 px-4 py-3 text-center text-sm font-medium text-success ring-1 ring-success/30">
          ✓ Alle Saiten gestimmt
        </div>
      )}

      <div className="space-y-1">
        {stringTargets.map((target) => (
          <StringRow ... />
        ))}
      </div>
```

- [ ] **Schritt 4: Build + Tests**

```
npm test -- --run && npm run build
```

Erwarte: alle Tests grün, Build sauber.

- [ ] **Schritt 5: Push**

```
git add src/screens/TunerScreen.tsx
git commit -m "feat: show all-tuned banner when all strings are in tune"
git push origin main
```

---

## Spec-Abgleich (Selbst-Review)

**Spec coverage:**
- ✅ `MIDI_SMOOTH_ALPHA` 0.18 → 0.10 — Task 1
- ✅ `CENTS_SMOOTH_ALPHA` 0.22 → 0.12 — Task 1
- ✅ `StableStringGate.requiredFrames` 6 → 15 — Task 1
- ✅ `IN_TUNE_CENTS` 5 → 8 — Task 1
- ✅ Display-Totzone (≥2 Cent) mit `useRef` — Task 2
- ✅ Balken `h-3` → `h-4` — Task 2 (implementiert als `h-4`)
- ✅ Nadel `h-5 w-1` → `h-6 w-1.5` — Task 2
- ✅ Große Cent-Zahl `text-2xl` — Task 2
- ✅ Richtungshinweis "zu hoch" / "zu tief" — Task 2
- ✅ Fertig-Banner wenn alle Saiten gestimmt — Task 3
- ✅ `min-h-[1rem]` für Richtungshinweis (kein Layout-Sprung) — Task 2

# Stimmgerät-Verbesserungen — Design Spec

**Datum:** 2026-06-12  
**Status:** Approved

---

## Übersicht

Drei unabhängige Verbesserungen am Stimmgerät:

1. **Stabilisierung** — Nadel und Saiten-Erkennung beruhigen
2. **Anzeige** — Cent-Zahl prominenter, Richtungshinweis, Balken dicker
3. **Fertig-Banner** — Rückmeldung wenn alle 4 Saiten gestimmt

---

## 1. Stabilisierung

### Parameteränderungen

**`src/lib/tunerFilter.ts`:**

| Konstante | Alt | Neu |
|---|---|---|
| `MIDI_SMOOTH_ALPHA` | 0.18 | 0.10 |
| `CENTS_SMOOTH_ALPHA` | 0.22 | 0.12 |
| `StableStringGate` `requiredFrames` | 6 | 15 |

**`src/lib/tunerEngine.ts`:**

| Konstante | Alt | Neu |
|---|---|---|
| `IN_TUNE_CENTS` | 5 | 8 |

### Display-Totzone in `CentGauge`

`CentGauge` erhält einen `useRef<number>` der den zuletzt gerenderten Cent-Wert speichert. Die Nadel bewegt sich nur wenn `|neuerWert - letzterAngezeigterWert| >= 2`. Bei Signal-Verlust (`hasSignal === false`) wird der Ref zurückgesetzt.

Diese Totzone ist rein visuell — sie beeinflusst weder die Erkennungslogik noch den `inTune`-Zustand.

---

## 2. Anzeige (`CentGauge`)

### Balken und Nadel

- Balken: `h-3` → `h-4`
- Nadel: `h-5 w-1` → `h-6 w-1.5`

### Große Cent-Zahl

Direkt unter dem Balken (zwischen Balken und ±50-Labels), zentriert:

```
+12 ct
```

- Schriftgröße: `text-2xl tabular-nums`
- Farbe: `text-success` wenn `inTune && hasSignal`, sonst `text-ink`, ohne Signal `text-muted/40`
- Inhalt: `"+12 ct"` / `"−5 ct"` / `"0 ct"` (gerundeter Wert, immer Vorzeichen außer bei 0)
- Kein Text wenn `!hasSignal` → `"—"`

### Richtungshinweis

Kleine Zeile direkt unter der Cent-Zahl:

- `"zu hoch"` wenn `cents > IN_TUNE_CENTS`
- `"zu tief"` wenn `cents < -IN_TUNE_CENTS`
- `""` (leer, Platz bleibt) wenn `inTune || !hasSignal`
- Schriftgröße: `text-xs text-muted`
- Feste Höhe (`min-h-[1rem]`) damit kein Layout-Sprung

### Bestehende Statuszeile

Die Zeile `"Ziel: C4 · +5 Cent"` in `TunerScreen` bleibt unverändert.

---

## 3. Fertig-Banner (`TunerScreen`)

Wenn `tunedStrings.size === stringTargets.length` (alle Saiten gestimmt):

```
╔══════════════════════════╗
║  ✓  Alle Saiten gestimmt ║
╚══════════════════════════╝
```

### Implementierung

In `TunerScreen`, zwischen dem CentGauge-Block und dem `<div className="space-y-1">` der StringRows:

```tsx
{allTuned && (
  <div className="rounded-lg bg-success/12 px-4 py-3 text-center text-sm font-medium text-success ring-1 ring-success/30">
    ✓ Alle Saiten gestimmt
  </div>
)}
```

- `allTuned = tunedStrings.size === stringTargets.length && stringTargets.length > 0`
- Kein Modal, kein Overlay — im normalen Seitenfluss
- Erscheint/verschwindet ohne Animation (einfaches conditional rendering)
- Verschwindet sofort wenn eine Saite wieder verstimmt wird

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/lib/tunerFilter.ts` | `MIDI_SMOOTH_ALPHA`, `CENTS_SMOOTH_ALPHA`, `StableStringGate` Default-Parameter |
| `src/lib/tunerEngine.ts` | `IN_TUNE_CENTS` |
| `src/components/tuner/CentGauge.tsx` | Balken/Nadel dicker, Cent-Zahl, Richtungshinweis, Display-Totzone |
| `src/screens/TunerScreen.tsx` | Fertig-Banner |

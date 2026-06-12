# P1 Design: Onboarding, Fehler-Diagnostik, Session-Summary

**Datum:** 2026-06-12  
**Status:** Approved

---

## Übersicht

Drei unabhängige Features, die das Lernerlebnis strukturieren:

1. **Session-Summary** — Übersicht nach "Beenden" mit Gesamtzahl + Top 3 schwächste Akkorde
2. **Onboarding** — 4-Screen First-Launch-Flow, auch über ?-Button erreichbar
3. **Fehler-Diagnostik** — Fehlende Finger im Akkord-Diagramm ausgegraut + gepulst, wenn Töne erkannt aber Akkord noch nicht gematcht

---

## 1. Session-Summary Screen

### Datenfluss

`usePracticeSession` tracked neu:
- `sessionChordIds: Set<string>` — alle Chord-IDs die in dieser Session erschienen sind (reiner State, kein localStorage)

Das Hook gibt `sessionChordIds` und `count` (bereits vorhanden) zurück.

`onDone` in `PracticeScreen` liefert `{ count, sessionChordIds }` statt nichts.

`App.tsx` hält neuen State `summary: { count: number; sessionChordIds: Set<string> } | null`. Nach "Beenden" wird `summary` gesetzt statt direkt zu Setup zu wechseln.

### Screen-Inhalt (`src/screens/SummaryScreen.tsx`)

```
Übung beendet
──────────────────
  🎵 12 Akkorde gespielt

  Am    ██░░░░░░░░  31%
  F#m   ████░░░░░░  44%
  Bdim  █████░░░░░  50%
  
  Diese brauchten am meisten Übung

  [ Nochmal ]    [ Fertig ]
```

- "Akkorde gespielt" = `count`
- "Top 3 schwächste" = 3 Akkorde mit niedrigster Lifetime-Accuracy aus `practiceStats` unter den `sessionChordIds`
- Wenn < 3 Akkorde in Session oder alle ohne Daten: weniger als 3 anzeigen, kein Padding
- "Nochmal": startet neue Session mit gleicher Config (App.tsx ruft `handleStart(session)` erneut auf)
- "Fertig": navigiert zu Setup, löscht `summary`

### Betroffene Dateien

| Datei | Aktion |
|---|---|
| `src/screens/SummaryScreen.tsx` | Neu |
| `src/hooks/usePracticeSession.ts` | `sessionChordIds` + `count` in Return, `onDone`-Callback mit Daten |
| `src/screens/PracticeScreen.tsx` | `onDone` liefert `{ count, sessionChordIds }` |
| `src/App.tsx` | `summary` State, `SummaryScreen` rendern |

---

## 2. Onboarding Flow

### Trigger

- **Erster Start:** `localStorage.getItem('ukulele-onboarded')` fehlt → Overlay sichtbar
- **Nach Abschluss/Überspringen:** `localStorage.setItem('ukulele-onboarded', '1')`
- **?-Button:** In `SetupScreen` Header → setzt `showOnboarding: true` in `App.tsx` → Overlay sichtbar (auch wenn bereits onboarded)

### 4 Screens

| # | Titel | Inhalt |
|---|---|---|
| 1 | Willkommen | "Ukulele Akkord Trainer" + "Sehen → Spielen → Bestätigung. Wähle Akkorde, spiele sie auf deiner Ukulele — die App bestätigt automatisch." |
| 2 | Akkord-Diagramm | Kleines C-Dur-Diagramm + "Tippe das Diagramm um einen Vorschau-Ton zu hören." |
| 3 | Mikrofon | Mikrofon-Icon (🎤) + "Spiele den Akkord. Die App erkennt ihn und springt automatisch weiter." + "Taste M schaltet das Mikrofon ein/aus." |
| 4 | Los geht's | "Bereit!" + Start-Button |

### Komponente (`src/components/OnboardingOverlay.tsx`)

- Vollbild-Modal über allem (z-index über Tab-Bar)
- Kreisindikator (4 Punkte) unten
- "Weiter"-Button, "Zurück"-Button (Screen 2+), "Überspringen"-Link (Screens 1–3)
- Screen 2 zeigt ein echtes `ChordCard` (xs, C-Dur, non-interactive)
- Schließt sich bei "Starten" (Screen 4) oder "Überspringen"

### Betroffene Dateien

| Datei | Aktion |
|---|---|
| `src/components/OnboardingOverlay.tsx` | Neu |
| `src/screens/SetupScreen.tsx` | ?-Button in Header |
| `src/App.tsx` | `showOnboarding` State, `OnboardingOverlay` rendern, first-launch-Check |

---

## 3. Fehler-Diagnostik — Fehlende Finger

### Hintergrund

"Almost" im Detektor bedeutet "alle Töne klingen, aber noch nicht 5 stabile Frames" — keine fehlenden Töne.
Fehlende Töne sind relevant bei **"Listening"** wenn stabiles Signal erkannt wurde aber der Akkord noch nicht voll matcht.

### Datenfluss

**`src/lib/audioDetector.ts`:**
- `DetectorCallbacks` erhält neuen optionalen Callback: `onPartialMatch?: (detectedPitchClasses: number[]) => void`
- Wird aufgerufen wenn: `data.stable && !isQuiet && !matches && expected.kind === 'chord'`
- Liefert `data.pitchClasses` (was gerade erkannt wurde)

**`src/hooks/usePracticeSession.ts`:**
- Hält `detectedPitchClasses: number[] | null` im State
- Setzt auf `data.pitchClasses` wenn `onPartialMatch` feuert
- Leert bei `onCorrect` und wenn Status `'idle'` oder `'listening'` (ohne Sound)

**`src/screens/PracticeScreen.tsx`:**
- Übergibt `detectedPitchClasses` an `ChordCard`

**`src/components/ChordCard.tsx` / `FretboardDiagram`:**
- Neuer optionaler Prop `detectedPitchClasses?: number[] | null`
- Wenn gesetzt: Finger deren Pitch Class **nicht** in `detectedPitchClasses` → `opacity-30` + CSS-Klasse `missing-finger` mit Puls-Animation
- Pitch-Class eines Fingers = `(tuningMidi[stringIndex] + fret) % 12`
- Finger ohne Fret (null = Leersaite die nicht gespielt wird) werden nicht bewertet

### CSS-Animation (in `index.css`)

```css
@keyframes finger-missing-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}
.finger-missing {
  animation: finger-missing-pulse 1.2s ease-in-out infinite;
}
```

### Betroffene Dateien

| Datei | Aktion |
|---|---|
| `src/lib/audioDetector.ts` | `onPartialMatch` Callback in `DetectorCallbacks` |
| `src/hooks/usePracticeSession.ts` | `detectedPitchClasses` State + Callback |
| `src/screens/PracticeScreen.tsx` | Prop weiterleiten |
| `src/components/ChordCard.tsx` | `detectedPitchClasses` Prop |
| `src/components/FretboardDiagram.tsx` | Finger-Opacity nach Pitch-Class-Match |
| `src/index.css` | `finger-missing` Keyframe-Animation |

---

## Betroffene Dateien — Gesamtübersicht

| Datei | Aktion | Feature |
|---|---|---|
| `src/screens/SummaryScreen.tsx` | Neu | Summary |
| `src/components/OnboardingOverlay.tsx` | Neu | Onboarding |
| `src/hooks/usePracticeSession.ts` | Ändern | Summary + Diagnostik |
| `src/screens/PracticeScreen.tsx` | Ändern | Summary + Diagnostik |
| `src/screens/SetupScreen.tsx` | Ändern | Onboarding (?-Button) |
| `src/App.tsx` | Ändern | Summary + Onboarding |
| `src/lib/audioDetector.ts` | Ändern | Diagnostik |
| `src/components/ChordCard.tsx` | Ändern | Diagnostik |
| `src/components/FretboardDiagram.tsx` | Ändern | Diagnostik |
| `src/index.css` | Ändern | Diagnostik |

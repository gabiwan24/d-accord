# P0 Design: Fortschritts-Tracking, gewichtetes Shuffle, Play-Button, Bug Fixes

**Datum:** 2026-06-12  
**Status:** Approved

---

## Übersicht

Vier unabhängige Verbesserungen mit hoher Wirkung auf die Lerneffektivität und Code-Stabilität:

1. Fortschritts-Tracking pro Akkord (persistent, sichtbar)
2. Gewichtetes Shuffle (schwache Akkorde öfter)
3. "Beispiel hören"-Button auf dem Practice-Screen
4. Kritische Bug Fixes

---

## 1. Datenmodell & Storage (`src/lib/practiceStats.ts`)

Neues Modul, das Trefferquoten pro Akkord in localStorage hält.

**localStorage-Key:** `ukulele-chord-stats`

**Datenformat:**
```typescript
type ChordStats = Record<string, { correct: number; attempts: number }>
```

**Exports:**
```typescript
recordAttempt(chordId: string, correct: boolean): void
getAccuracy(chordId: string): number   // 0.0–1.0, default 0.5 für neue Akkorde
getAllStats(): ChordStats
clearStats(): void
```

**Startwert für neue Akkorde:** 0.5 (neutral) — verhindert, dass ungeübte Akkorde sofort als "schlecht" gewichtet werden.

---

## 2. Gewichtetes Shuffle (`useInfinitePracticeQueue.ts`)

`useInfinitePracticeQueue` liest beim Reshuffle die Stats und expandiert die ID-Liste:

| Trefferquote | Gewicht |
|---|---|
| > 80% | 1× |
| 60–80% | 2× |
| < 60% | 3× |

Neue Akkorde (0.5 default) → Gewicht 2×. Implementierung: ID-Liste expandieren, dann Fisher-Yates-Shuffle. Kein Interface-Change nötig.

---

## 3. Anzeige auf Akkord-Karten (Setup)

Schmaler Balken (3px hoch) am unteren Rand jeder Chord-Card in `ChordSelector`:

| Farbe | Bedingung |
|---|---|
| Grau | Noch nie geübt (keine Daten) |
| Rot | < 60% |
| Gelb | 60–80% |
| Grün | > 80% |

Balkenbreite = Trefferquote (0–100%). Kein Text auf der Karte — xs-Karten nicht überladen.

---

## 4. Live-Anzeige während der Übung (`PracticeScreen`)

Unter dem Akkordnamen wird ergänzt:

```
C-Dur
━━━━━━░░░░
73% · 11/15
```

- Fortschrittsbalken (~8px hoch), Farbe wie Setup-Indikator
- Textzeile: Quote + absolute Zahlen (xs, muted)
- `recordAttempt` bei jedem Erkennungs-Event: richtig → `correct: true`; "Fast!" ohne Treffer zählt **nicht** als Attempt
- Anzeige aktualisiert sich sofort nach jedem Treffer
- Beim Akkordwechsel: sofortiger Sprung auf Stats des neuen Akkords

---

## 5. "Beispiel hören"-Button (`PracticeScreen`, `NotePracticeScreen`)

Lautsprecher-Icon unter dem Akkord-Diagramm, zentriert. Touch-Target min. 44px, dezente Darstellung (muted, kein primärer CTA).

**Verhalten:**
- Klick → `playChord(shape, tuning)` + `suppressDetection(3400)`
- Immer verfügbar, unabhängig vom Mikrofon-Status
- Während Ton spielt: Button kurz disabled (verhindert Doppel-Tap)
- Bestehender Diagramm-Klick läuft durch dieselbe Suppress-Logik (keine Änderung nötig, bereits implementiert)

**Noten-Übung:** Analoger Button spielt Referenzton der Note.

---

## 6. Bug Fixes

### 6.1 setTimeout-Leak
**Dateien:** `src/hooks/usePracticeSession.ts`, `src/hooks/useNotePracticeSession.ts`  
**Fix:** Timeout-ID in `useRef` speichern, im useEffect-Cleanup canceln.

### 6.2 AudioContext nie geschlossen
**Datei:** `src/lib/playChord.ts`  
**Fix:** `closeAudioContext()` exportieren, der `sharedContext.close()` aufruft und auf `null` setzt. Aufgerufen bei `visibilitychange`-Event (App geht in Hintergrund) — nicht bei jedem Component-Unmount.

### 6.3 ErrorBoundary
**Neue Datei:** `src/components/ErrorBoundary.tsx`  
**Fix:** React Class-Component ErrorBoundary, wrапpt App-Inhalt. Bei Crash: simplen "Etwas ist schiefgelaufen — Neu laden"-Screen zeigen.

### 6.4 Keyboard-Shortcut `M` im Hintergrund
**Datei:** `src/hooks/useMicKeyboardShortcut.ts`  
**Fix:** `if (document.hidden) return` als erste Guard-Zeile im KeyDown-Handler.

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `src/lib/practiceStats.ts` | Neu |
| `src/components/ErrorBoundary.tsx` | Neu |
| `src/hooks/useInfinitePracticeQueue.ts` | Weighted shuffle |
| `src/hooks/usePracticeSession.ts` | setTimeout-Fix + recordAttempt |
| `src/hooks/useNotePracticeSession.ts` | setTimeout-Fix |
| `src/screens/PracticeScreen.tsx` | Stats-Anzeige + Play-Button |
| `src/screens/NotePracticeScreen.tsx` | Play-Button |
| `src/components/ChordSelector.tsx` | Accuracy-Balken auf Karten |
| `src/lib/playChord.ts` | closeAudioContext() |
| `src/hooks/useMicKeyboardShortcut.ts` | document.hidden check |
| `src/App.tsx` | ErrorBoundary + visibilitychange |

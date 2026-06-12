# Ukulele Akkord Trainer — Status

**Live:** [https://gabiwan24.github.io/d-accord/](https://gabiwan24.github.io/d-accord/)  
**Repo:** [github.com/gabiwan24/d-accord](https://github.com/gabiwan24/d-accord)  
**Stand:** Juni 2026

---

## Ziel der App

Die App hilft beim **Ukulele-Üben mit Mikrofon-Feedback**. Nutzer wählen Akkorde oder Noten, spielen sie auf der Ukulele und bekommen automatisch Rückmeldung, ob der Ton stimmt. Zusätzlich gibt es ein **Stimmgerät** für High-G- und Low-G-Stimmung.

Kernidee: **Sehen → Hören → Spielen → Bestätigung** — ohne manuelles Weitertippen nach jedem richtigen Versuch.

Zielgruppe: Einsteiger und Fortgeschrittene, die Akkorde und Griffe auf der Ukulele festigen wollen. Die App ist als **PWA** nutzbar (installierbar, offline-fähig nach erstem Laden).

---

## Regeln & Verhalten

### Navigation

| Bereich | Beschreibung |
|---------|--------------|
| **Üben** | Setup → Übungssession (Akkorde oder Noten) |
| **Stimmgerät** | Saiten stimmen (Auto/Manuell) |
| **Mikrofon-Button** | App-weit ein/aus, Zustand wird gespeichert |

Tab-Wechsel beendet keine Einstellungen; die Übungssession läuft im Hintergrund weiter, wenn man zum Stimmgerät wechselt und zurückkommt.

### Übungsmodus — Akkorde

- **56 Akkorde** in 7 Tonarten (C–H), je 8 Typen (Dur, Moll, 7, m7, 6, m6, sus4, dim)
- Auswahl per Preset (z. B. Stufe I–V) oder manuell; mindestens **2 Akkorde** zum Start
- Endlose **zufällige Warteschlange** — nach dem letzten Akkord wird neu gemischt
- **Deutsche Notation:** H statt B, gesprochene Hilfe z. B. „G-Dur“
- **High G / Low G** wählbar; Griffdaten passen sich an
- Klick auf Diagramm: **Vorschau-Ton** über Lautsprecher (Karplus-Strong-Synthese)
- **Finger-Animation** beim Akkordwechsel; dynamisches Bundbrett (nur benötigte Bünde)

### Übungsmodus — Noten

- **12 chromatische Noten** (C bis H/B)
- Erkennung einer einzelnen Pitch Class, wenn stabil erkannt

### Mikrofon-Erkennung (Akkorde)

1. PitchPlease analysiert live Audio (Polyphonie, FFT)
2. Match nur über **aktuelle Pitch Classes** — kein „klebender“ Chord-Name der Library
3. **Alle erwarteten Töne** des Griffes müssen klingen (bei 4-Tönen-Akkorden max. 1 fehlend)
4. **5 stabile Frames** nötig, bevor ein Treffer zählt
5. Nach Treffer: **Cooldown ~900 ms + Stille (~15 Frames)**, dann erst wieder zählen
6. **Vorschau-Ton blockiert Erkennung** für ~3,4 s (Lautsprecher→Mikrofon-Feedback)

### Mikrofon — Steuerung

- Toggle in Tab-Leiste + Shortcut **`M`** (nur Desktop mit Maus/Tastatur)
- Toast-Bestätigung: „Mikrofon ein/ausschalten“
- Shortcut ignoriert Eingabefelder (Checkboxen, Selects)

### Stimmgerät

- High G / Low G
- **Auto:** erkennt nächste gespielte Saite
- **Manuell:** eine Saite auswählen
- Cent-Anzeige (±5 Cent = grün / stimmt)
- Gestimmte Saiten bleiben **grün** bis Stimmung oder Tab wechselt
- Glättung: EMA auf MIDI/Cent, 6-Frame-Saiten-Gate

### Persistenz (localStorage)

- Stimmung, Übungsmodus, gewählte Akkorde/Noten, Preset, Mikrofon an/aus

---

## Design

### Visueller Stil

- **Hintergrund:** Cream `#F5F0E8`
- **Text:** Ink `#1A1A1A`, Muted `#888888`
- **Erfolg:** Grün `#6AAB6A`
- **Akzentfarben** pro Tonart (Pink, Purple, Mint, Peach, Blue, Sage, Lavender, Coral)
- **Fingerfarben:** Rot (1), Teal (2), Gold (3), Violett (4) — hoher Kontrast auf Griffbrett

### Typografie & Layout

- System-UI-Schrift (`system-ui, -apple-system, sans-serif`)
- Mobile-first, max. Breite ~`max-w-lg`, Touch-Targets min. 2,75 rem
- **Fixe Tab-Leiste** unten (Üben | Stimmgerät | Mikrofon)
- Safe-Area für Notch/Home-Indicator
- Kein Tap-Highlight, `overscroll-behavior: none`

### Komponenten-Prinzipien

- **ChordCard / NoteCard:** Griffbrett + Akzent-Linie + Name
- **SegmentControl:** Auto/Manuell, Akkorde/Noten
- **SpokenGuide:** deutsche Aussprache-Hilfe unter dem Diagramm
- **MicStatus / TunerStatus:** Zustandsanzeige (Hört zu / Fast / Richtig / Fehler / Aus)
- Animationen organisch (Bundhöhe, Finger, Leersaiten) — kein Layout-Springen

### PWA

- Name: „Ukulele Akkord Trainer“
- Theme/Background: Cream
- Icons 192×192, 512×512
- Service Worker mit Auto-Update

---

## Technischer Stack

| Schicht | Technologie |
|---------|-------------|
| UI | React 19, TypeScript, Tailwind CSS v4 |
| Build | Vite 8, vite-plugin-pwa |
| Audio-Erkennung | @markusstrasser/pitchplease |
| Tests | Vitest (57 Tests) |
| Hosting | GitHub Pages via GitHub Actions |

Wichtige Module:

- `audioDetector.ts` — Übungserkennung, Cooldown, Suppression
- `chordMatcher.ts` — strikte Pitch-Class-Prüfung
- `tunerEngine.ts` / `tunerFilter.ts` — Stimmgerät-Logik
- `playChord.ts` — Vorschau-Synthese
- `MicContext.tsx` — globaler Mikrofon-Zustand

---

## Aktueller Status

### ✅ Fertig & live

- Akkord- und Noten-Übung mit Mikrofon
- Stimmgerät (High G / Low G, Auto/Manuell, Cent-Anzeige)
- Finger-Animationen, dynamisches Bundbrett, deutsche Notation
- Mikrofon-Toggle (Button + `M`-Shortcut + Toast)
- GitHub-Pages-Deploy (`npm run build:pages`, Workflow bei Push auf `main`)
- PWA-Grundfunktionen
- Fixes: Sustain-Spam, falsche Treffer durch lockere Erkennung, sticky Chord-Name

### 🔄 Lokal, noch nicht gepusht

- **Vorschau-Sperre:** Mikro reagiert nicht, während der Klick-Vorschau-Ton spielt (`detectionSuppress.ts`)

### ⏳ Geplant / offen (noch nicht umgesetzt)

- Stimmgerät Phase 2: Referenzton, geführte Sequenz, A4-Kalibrierung
- Feintuning Erkennungs-Schwellwerte nach Nutzer-Feedback
- Optional: Stimmgerät während Vorschau/Wiedergabe ebenfalls sperren

### Bekannte Einschränkungen

- Mikrofon braucht **HTTPS** (GitHub Pages erfüllt das)
- Erkennung hängt von Raum, Mikrofon und Lautstärke ab
- Bei sehr leisen oder verrauschten Umgebungen kann Erkennung träge oder streng wirken
- Git-Commit-Autor lokal noch nicht auf GitHub-Identität gesetzt (kosmetisch)

---

## Entwicklung

```powershell
npm run dev          # Lokal entwickeln
npm test             # Tests
npm run build        # Produktions-Build
npm run build:pages  # Build für GitHub Pages (/d-accord/)
git push origin main # Deploy auslösen
```

---

## Commit-Historie (Auszug)

| Commit | Inhalt |
|--------|--------|
| `aa52a70` | Quellcode + GitHub-Pages-Deploy |
| `91cacb0` | Fix: Sustain löst nicht mehr hunderte Treffer aus |
| `f327ec4` | Fix: Strikte Akkorderkennung, Cooldown |
| *(lokal)* | Vorschau blockiert Mikro-Erkennung |

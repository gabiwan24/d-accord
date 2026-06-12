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
        <div className="flex items-center justify-between">
          <h1 className="py-2 text-base font-normal text-ink sm:text-lg">
            Ukulele Trainer
          </h1>
          {onOpenHelp && (
            <button
              type="button"
              onClick={onOpenHelp}
              aria-label="Hilfe anzeigen"
              className="flex min-h-9 min-w-9 items-center justify-center rounded-full text-sm text-muted transition-opacity active:opacity-60"
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

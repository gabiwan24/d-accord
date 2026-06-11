import { DEFAULT_SELECTED } from '../data/chords'
import {
  detectChordPreset,
  type ChordPresetId,
} from '../data/chordPresets'
import { DEFAULT_SELECTED_NOTES, type PracticeMode } from '../data/notes'
import type { TuningId } from '../data/tunings'

const STORAGE_TUNING = 'ukulele-tuning'
const STORAGE_CHORDS = 'ukulele-selected-chords'
const STORAGE_CHORD_PRESET = 'ukulele-chord-preset'
const STORAGE_MODE = 'ukulele-practice-mode'
const STORAGE_NOTES = 'ukulele-selected-notes'
const STORAGE_MIC_ENABLED = 'ukulele-mic-enabled'

const PRESET_IDS: ChordPresetId[] = [
  'stufe1',
  'stufe2',
  'stufe3',
  'stufe4',
  'stufe5',
  'custom',
]

export function loadTuning(): TuningId {
  const stored = localStorage.getItem(STORAGE_TUNING)
  if (stored === 'highG' || stored === 'lowG') return stored
  return 'highG'
}

export function saveTuning(tuningId: TuningId) {
  localStorage.setItem(STORAGE_TUNING, tuningId)
}

export function loadPracticeMode(): PracticeMode {
  const stored = localStorage.getItem(STORAGE_MODE)
  if (stored === 'chords' || stored === 'notes') return stored
  return 'chords'
}

export function savePracticeMode(mode: PracticeMode) {
  localStorage.setItem(STORAGE_MODE, mode)
}

export function loadSelectedChords(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_CHORDS)
    if (!stored) return DEFAULT_SELECTED
    const parsed = JSON.parse(stored) as unknown
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return parsed
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SELECTED
}

export function saveSelectedChords(ids: string[]) {
  localStorage.setItem(STORAGE_CHORDS, JSON.stringify(ids))
}

export function loadChordPreset(): ChordPresetId {
  const stored = localStorage.getItem(STORAGE_CHORD_PRESET)
  if (stored && PRESET_IDS.includes(stored as ChordPresetId)) {
    return stored as ChordPresetId
  }
  return detectChordPreset(loadSelectedChords())
}

export function saveChordPreset(presetId: ChordPresetId) {
  localStorage.setItem(STORAGE_CHORD_PRESET, presetId)
}

export function loadSelectedNotes(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_NOTES)
    if (!stored) return [...DEFAULT_SELECTED_NOTES]
    const parsed = JSON.parse(stored) as unknown
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return parsed
    }
  } catch {
    /* ignore */
  }
  return [...DEFAULT_SELECTED_NOTES]
}

export function saveSelectedNotes(ids: string[]) {
  localStorage.setItem(STORAGE_NOTES, JSON.stringify(ids))
}

export function loadMicEnabled(): boolean {
  const stored = localStorage.getItem(STORAGE_MIC_ENABLED)
  if (stored === 'false') return false
  if (stored === 'true') return true
  return true
}

export function saveMicEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_MIC_ENABLED, String(enabled))
}

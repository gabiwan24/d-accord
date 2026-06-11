import { TUNINGS, type TuningId, type TuningString } from '../data/tunings'
import {
  centsBetweenMidi,
  midiToHz,
  midiToNoteLabel,
} from './musicMath'

export const IN_TUNE_CENTS = 5
export const DISPLAY_CENTS_CLAMP = 50
export const MIN_DETECTION_ENERGY = 0.0001

export type TunerMode = 'auto' | 'manual'

export type TunerMicStatus =
  | 'idle'
  | 'listening'
  | 'detecting'
  | 'in_tune'
  | 'error'

export interface StringTarget {
  index: number
  name: string
  targetMidi: number
  label: string
}

export interface TunerReading {
  stringIndex: number
  stringName: string
  targetMidi: number
  targetLabel: string
  detectedMidi: number | null
  detectedLabel: string | null
  cents: number
  inTune: boolean
  status: TunerMicStatus
}

export function getStringTargets(tuningId: TuningId): StringTarget[] {
  return TUNINGS[tuningId].strings.map((s, index) => ({
    index,
    name: s.name,
    targetMidi: s.midi,
    label: midiToNoteLabel(s.midi),
  }))
}

export function nearestOpenStringIndex(
  detectedMidi: number,
  tuningId: TuningId,
): number {
  const strings = TUNINGS[tuningId].strings
  const detectedPc = ((Math.round(detectedMidi) % 12) + 12) % 12

  const pitchClassMatches: number[] = []
  for (let i = 0; i < strings.length; i++) {
    const pc = ((strings[i].midi % 12) + 12) % 12
    if (pc === detectedPc) pitchClassMatches.push(i)
  }

  const candidates =
    pitchClassMatches.length > 0
      ? pitchClassMatches
      : strings.map((_, i) => i)

  let bestIndex = candidates[0]
  let bestCents = Infinity

  for (const i of candidates) {
    const cents = Math.abs(centsBetweenMidi(detectedMidi, strings[i].midi))
    if (cents < bestCents) {
      bestCents = cents
      bestIndex = i
    }
  }

  return bestIndex
}

export function isInTune(cents: number, threshold = IN_TUNE_CENTS): boolean {
  return Math.abs(cents) <= threshold
}

export function clampDisplayCents(cents: number): number {
  return Math.max(-DISPLAY_CENTS_CLAMP, Math.min(DISPLAY_CENTS_CLAMP, cents))
}

export function resolveActiveStringIndex(
  mode: TunerMode,
  manualIndex: number | null,
  detectedMidi: number | null,
  tuningId: TuningId,
): number {
  if (mode === 'manual' && manualIndex !== null) return manualIndex
  if (detectedMidi !== null) return nearestOpenStringIndex(detectedMidi, tuningId)
  return manualIndex ?? 0
}

export function buildTunerReading(input: {
  tuningId: TuningId
  mode: TunerMode
  manualStringIndex: number | null
  detectedMidi: number | null
  hasSignal: boolean
  micStatus: TunerMicStatus
  /** Überschreibt die automatische Saite-Zuordnung (z. B. nach Stabilisierungsfilter) */
  activeStringIndex?: number
}): TunerReading {
  const strings = TUNINGS[input.tuningId].strings
  const activeIndex =
    input.activeStringIndex ??
    resolveActiveStringIndex(
      input.mode,
      input.manualStringIndex,
      input.detectedMidi,
      input.tuningId,
    )

  const target: TuningString = strings[activeIndex]
  const targetLabel = midiToNoteLabel(target.midi)

  if (!input.hasSignal || input.detectedMidi === null) {
    return {
      stringIndex: activeIndex,
      stringName: target.name,
      targetMidi: target.midi,
      targetLabel,
      detectedMidi: null,
      detectedLabel: null,
      cents: 0,
      inTune: false,
      status: input.micStatus === 'error' ? 'error' : 'listening',
    }
  }

  const cents = centsBetweenMidi(input.detectedMidi, target.midi)
  const inTune = isInTune(cents)

  return {
    stringIndex: activeIndex,
    stringName: target.name,
    targetMidi: target.midi,
    targetLabel,
    detectedMidi: input.detectedMidi,
    detectedLabel: midiToNoteLabel(input.detectedMidi),
    cents: clampDisplayCents(cents),
    inTune,
    status: inTune ? 'in_tune' : 'detecting',
  }
}

export function stringRowStatus(
  stringIndex: number,
  reading: TunerReading | null,
): 'idle' | 'active' | 'in_tune' {
  if (!reading || reading.stringIndex !== stringIndex) return 'idle'
  return reading.inTune ? 'in_tune' : 'active'
}

export { midiToHz }

import PitchPlease from '@markusstrasser/pitchplease'
import { chordMatches } from './chordMatcher'
import { noteMatches } from './noteMatcher'
import type { UkuleleChord } from '../data/chords'
import type { TuningId } from '../data/tunings'

export type MicStatus = 'idle' | 'listening' | 'almost' | 'correct' | 'error'

export interface DetectorCallbacks {
  onStatusChange: (status: MicStatus) => void
  onCorrect: () => void
  onError: (message: string) => void
}

type ExpectedTarget =
  | { kind: 'chord'; chord: UkuleleChord; tuningId: TuningId }
  | { kind: 'note'; pitchClass: number }

const STABLE_MATCHES_REQUIRED = 4
const MIN_ENERGY = 0.0001

export function createAudioDetector(callbacks: DetectorCallbacks) {
  let expected: ExpectedTarget | null = null
  let stableMatchCount = 0
  let consecutiveLowEnergy = 0

  const detector = PitchPlease.create({
    stabilityFrames: 5,
    onUpdate: (data) => {
      if (!expected) return

      if (data.maxEnergy < MIN_ENERGY) {
        consecutiveLowEnergy++
        if (consecutiveLowEnergy > 10) {
          callbacks.onStatusChange('listening')
        }
        stableMatchCount = 0
        return
      }
      consecutiveLowEnergy = 0

      let matches = false
      if (expected.kind === 'chord') {
        matches = chordMatches({
          detectedName: data.chord?.full ?? null,
          detectedPitchClasses: data.pitchClasses,
          expected: expected.chord,
          tuningId: expected.tuningId,
        })
      } else {
        matches = noteMatches(
          expected.pitchClass,
          data.pitchClasses,
          data.stable,
        )
      }

      if (matches && data.stable) {
        stableMatchCount++
        if (stableMatchCount >= STABLE_MATCHES_REQUIRED) {
          callbacks.onStatusChange('correct')
          stableMatchCount = 0
          callbacks.onCorrect()
        } else {
          callbacks.onStatusChange('almost')
        }
      } else {
        stableMatchCount = 0
        callbacks.onStatusChange('listening')
      }
    },
    onError: (err) => {
      callbacks.onStatusChange('error')
      callbacks.onError(err.message)
    },
  })

  return {
    async start() {
      stableMatchCount = 0
      consecutiveLowEnergy = 0
      callbacks.onStatusChange('listening')
      await detector.start()
    },
    stop() {
      detector.stop()
      callbacks.onStatusChange('idle')
    },
    setExpectedChord(chord: UkuleleChord, tuningId: TuningId) {
      expected = { kind: 'chord', chord, tuningId }
      stableMatchCount = 0
      consecutiveLowEnergy = 0
    },
    setExpectedNote(pitchClass: number) {
      expected = { kind: 'note', pitchClass }
      stableMatchCount = 0
      consecutiveLowEnergy = 0
    },
  }
}

export type AudioDetector = ReturnType<typeof createAudioDetector>

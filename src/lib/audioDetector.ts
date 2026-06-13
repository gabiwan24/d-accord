import PitchPlease from '@markusstrasser/pitchplease'
import { chordMatches } from './chordMatcher'
import { isDetectionSuppressed } from './detectionSuppress'
import { noteMatches } from './noteMatcher'
import type { UkuleleChord } from '../data/chords'
import type { TuningId } from '../data/tunings'
import { addDebugFrame } from './debugStore'
import { midiToHz } from './musicMath'

export type MicStatus = 'idle' | 'listening' | 'almost' | 'correct' | 'error'

export interface DetectorCallbacks {
  onStatusChange: (status: MicStatus) => void
  onCorrect: () => void
  onError: (message: string) => void
  onPartialMatch?: (detectedPitchClasses: number[]) => void
}

type ExpectedTarget =
  | { kind: 'chord'; chord: UkuleleChord; tuningId: TuningId }
  | { kind: 'note'; pitchClass: number }

type Phase = 'armed' | 'cooldown'

const STABLE_MATCHES_REQUIRED = 5
const MIN_ENERGY = 0.002
const COOLDOWN_MS = 900
const RELEASE_QUIET_FRAMES = 15

export function createAudioDetector(callbacks: DetectorCallbacks) {
  let expected: ExpectedTarget | null = null
  let stableMatchCount = 0
  let consecutiveQuiet = 0
  let phase: Phase = 'armed'
  let cooldownUntil = 0

  const resetMatchState = () => {
    stableMatchCount = 0
    consecutiveQuiet = 0
    phase = 'armed'
    cooldownUntil = 0
  }

  const detector = PitchPlease.create({
    stabilityFrames: 5,
    onUpdate: (data) => {
      if (!expected) return

      if (isDetectionSuppressed()) {
        stableMatchCount = 0
        consecutiveQuiet = 0
        return
      }

      const now = performance.now()
      const isQuiet = data.maxEnergy < MIN_ENERGY

      if (phase === 'cooldown') {
        if (isQuiet) consecutiveQuiet++
        else consecutiveQuiet = 0

        if (now >= cooldownUntil && consecutiveQuiet >= RELEASE_QUIET_FRAMES) {
          phase = 'armed'
          consecutiveQuiet = 0
          stableMatchCount = 0
          callbacks.onStatusChange('listening')
        } else {
          callbacks.onStatusChange('correct')
        }
        return
      }

      if (isQuiet || !data.stable) {
        stableMatchCount = 0
        if (isQuiet) callbacks.onStatusChange('listening')
        return
      }

      let matches = false
      if (expected.kind === 'chord') {
        matches = chordMatches({
          detectedName: null,
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

      if (matches) {
        stableMatchCount++
        if (stableMatchCount >= STABLE_MATCHES_REQUIRED) {
          phase = 'cooldown'
          cooldownUntil = now + COOLDOWN_MS
          consecutiveQuiet = 0
          stableMatchCount = 0
          callbacks.onStatusChange('correct')
          callbacks.onCorrect()
        } else {
          callbacks.onStatusChange('almost')
        }
      } else {
        stableMatchCount = 0
        if (!isQuiet && data.stable && expected.kind === 'chord') {
          callbacks.onPartialMatch?.(data.pitchClasses)
        }
        callbacks.onStatusChange('listening')
      }

      // Debug frame
      const fundMidi = (data as unknown as { fundMidis?: ArrayLike<number> }).fundMidis?.[0] ?? null
      const targetPCs =
        expected?.kind === 'chord'
          ? (expected.chord.shapes[expected.tuningId]?.pitchClasses ?? [])
          : []
      const detectedPCs: number[] = data.pitchClasses ?? []
      addDebugFrame({
        timestamp: Date.now(),
        source: 'detector',
        hz: fundMidi !== null ? midiToHz(fundMidi) : null,
        rawMidi: fundMidi,
        energy: data.maxEnergy,
        pitchClasses: detectedPCs,
        stable: data.stable,
        smoothedMidi: null,
        cents: null,
        detectedString: null,
        targetPitchClasses: targetPCs,
        correct: detectedPCs.filter((pc) => targetPCs.includes(pc)),
        noise: detectedPCs.filter((pc) => !targetPCs.includes(pc)),
        missing: targetPCs.filter((pc) => !detectedPCs.includes(pc)),
      })
    },
    onError: (err) => {
      callbacks.onStatusChange('error')
      callbacks.onError(err.message)
    },
  })

  return {
    async start() {
      resetMatchState()
      callbacks.onStatusChange('listening')
      await detector.start()
    },
    stop() {
      detector.stop()
      resetMatchState()
      callbacks.onStatusChange('idle')
    },
    prepareNextTarget() {
      resetMatchState()
      callbacks.onStatusChange('listening')
    },
    setExpectedChord(chord: UkuleleChord, tuningId: TuningId) {
      expected = { kind: 'chord', chord, tuningId }
      if (phase === 'armed') {
        stableMatchCount = 0
        consecutiveQuiet = 0
      }
    },
    setExpectedNote(pitchClass: number) {
      expected = { kind: 'note', pitchClass }
      if (phase === 'armed') {
        stableMatchCount = 0
        consecutiveQuiet = 0
      }
    },
  }
}

export type AudioDetector = ReturnType<typeof createAudioDetector>

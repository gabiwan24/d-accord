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

const MATCH_WINDOW = 8
const MATCHES_REQUIRED = 5
const MIN_ENERGY = 15
// Ukulele lowest note: G3 = MIDI 55 (~196 Hz, low-G tuning).
// Anything below MIDI 48 (C3, 130 Hz) is room/electrical noise.
const MIN_FUNDAMENTAL_MIDI = 48
// Frames of near-silence that count as the previous chord having been released.
const RELEASE_QUIET_FRAMES = 15
// The previous chord counts as released once its energy falls below this
// fraction of its peak. Re-arming on an onset is blocked until then, so a
// single strum (whose attack keeps rising after the match) can't re-trigger.
const RELEASE_FRACTION = 0.4
// Energy rise above the post-release floor that counts as a fresh attack.
const ONSET_RISE_ENERGY = 25

export function createAudioDetector(callbacks: DetectorCallbacks) {
  let expected: ExpectedTarget | null = null
  const matchWindow: boolean[] = new Array(MATCH_WINDOW).fill(false)
  let matchWindowIndex = 0
  let consecutiveQuiet = 0
  let phase: Phase = 'armed'
  let cooldownPeak = 0
  let cooldownReleased = false
  let cooldownFloor = Infinity

  const clearWindow = () => {
    matchWindow.fill(false)
    matchWindowIndex = 0
  }

  const resetCooldownTracking = () => {
    cooldownPeak = 0
    cooldownReleased = false
    cooldownFloor = Infinity
  }

  const resetMatchState = () => {
    clearWindow()
    consecutiveQuiet = 0
    phase = 'armed'
    resetCooldownTracking()
  }

  // After a correct detection (or a skip), wait for the previous chord to be
  // released (decay) and then a fresh attack — or genuine silence — before
  // matching again. One strum yields exactly one detection.
  const enterCooldown = () => {
    clearWindow()
    consecutiveQuiet = 0
    phase = 'cooldown'
    resetCooldownTracking()
  }

  const detector = PitchPlease.create({
    stabilityFrames: 5,
    onUpdate: (data) => {
      if (!expected) return

      if (isDetectionSuppressed()) {
        matchWindow.fill(false)
        matchWindowIndex = 0
        consecutiveQuiet = 0
        return
      }

      const fundCount = (data as unknown as { fundCount?: number }).fundCount ?? 0
      const fundMidisRaw = (data as unknown as { fundMidis?: ArrayLike<number> }).fundMidis
      const fundMidiList: number[] = []
      if (fundMidisRaw) {
        const n = Math.min(fundCount, fundMidisRaw.length)
        for (let i = 0; i < n; i++) {
          fundMidiList.push(Math.round(fundMidisRaw[i] * 10) / 10)
        }
      }
      const fundMidi = fundMidisRaw?.[0] ?? null
      const isBelowUkuleleRange = fundMidi !== null && fundMidi < MIN_FUNDAMENTAL_MIDI
      const isQuiet = data.maxEnergy < MIN_ENERGY || isBelowUkuleleRange

      if (phase === 'cooldown') {
        cooldownPeak = Math.max(cooldownPeak, data.maxEnergy)
        // The previous chord has decayed enough to count as released.
        if (!cooldownReleased && data.maxEnergy < cooldownPeak * RELEASE_FRACTION) {
          cooldownReleased = true
        }
        if (cooldownReleased) {
          cooldownFloor = Math.min(cooldownFloor, data.maxEnergy)
        }

        if (isQuiet) consecutiveQuiet++
        else consecutiveQuiet = 0

        // Genuine silence, or a fresh attack AFTER the previous chord released.
        const quietRearm = consecutiveQuiet >= RELEASE_QUIET_FRAMES
        const onsetRearm =
          cooldownReleased &&
          !isQuiet &&
          data.maxEnergy > cooldownFloor + ONSET_RISE_ENERGY

        if (quietRearm || onsetRearm) {
          phase = 'armed'
          consecutiveQuiet = 0
          resetCooldownTracking()
          clearWindow()
          callbacks.onStatusChange('listening')
        } else {
          callbacks.onStatusChange(isQuiet ? 'listening' : 'correct')
        }
        return
      }

      if (isQuiet || !data.stable) {
        if (isQuiet) callbacks.onStatusChange('listening')
        return
      }

      let matches = false
      if (expected.kind === 'chord') {
        matches = chordMatches({
          detectedName: null,
          detectedPitchClasses: data.pitchClasses,
          detectedFundMidis: fundMidiList.filter((m) => m >= MIN_FUNDAMENTAL_MIDI),
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

      matchWindow[matchWindowIndex % MATCH_WINDOW] = matches
      matchWindowIndex++
      const recentMatches = matchWindow.filter(Boolean).length

      if (recentMatches >= MATCHES_REQUIRED) {
        enterCooldown()
        callbacks.onStatusChange('correct')
        callbacks.onCorrect()
      } else if (matches) {
        callbacks.onStatusChange('almost')
      } else {
        if (!isQuiet && data.stable && expected.kind === 'chord') {
          callbacks.onPartialMatch?.(data.pitchClasses)
        }
        callbacks.onStatusChange('listening')
      }

      // Debug frame
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
        fundMidiList,
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
      // Require the previous chord to be released or a fresh attack before the
      // next target can match — prevents sustain from carrying over.
      enterCooldown()
      callbacks.onStatusChange('listening')
    },
    setExpectedChord(chord: UkuleleChord, tuningId: TuningId) {
      expected = { kind: 'chord', chord, tuningId }
      if (phase === 'armed') {
        matchWindow.fill(false)
        matchWindowIndex = 0
        consecutiveQuiet = 0
      }
    },
    setExpectedNote(pitchClass: number) {
      expected = { kind: 'note', pitchClass }
      if (phase === 'armed') {
        matchWindow.fill(false)
        matchWindowIndex = 0
        consecutiveQuiet = 0
      }
    },
  }
}

export type AudioDetector = ReturnType<typeof createAudioDetector>

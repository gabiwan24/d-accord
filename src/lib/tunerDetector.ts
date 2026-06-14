import PitchPlease from '@markusstrasser/pitchplease'
import type { TuningId } from '../data/tunings'
import {
  centsSmoother,
  midiSmoother,
  resetTunerFilters,
  StableStringGate,
} from './tunerFilter'
import {
  buildTunerReading,
  clampDisplayCents,
  firstFundInRange,
  isInTune,
  MIN_DETECTION_ENERGY,
  nearestOpenStringIndex,
  octaveFoldedCents,
  type TunerMicStatus,
  type TunerMode,
  type TunerReading,
} from './tunerEngine'
import { midiToHz } from './musicMath'
import { addDebugFrame } from './debugStore'

export interface TunerCallbacks {
  onReading: (reading: TunerReading) => void
  onStatusChange: (status: TunerMicStatus) => void
  onError: (message: string) => void
}

export interface TunerSessionConfig {
  tuningId: TuningId
  mode: TunerMode
  manualStringIndex: number | null
}

export interface TunerController {
  start: () => Promise<void>
  stop: () => void
  setConfig: (config: TunerSessionConfig) => void
}

function applySmoothedCents(reading: TunerReading): TunerReading {
  if (reading.detectedMidi === null) return reading

  const rawCents = octaveFoldedCents(reading.detectedMidi, reading.targetMidi)
  const smoothed = clampDisplayCents(centsSmoother.push(rawCents))
  const inTune = isInTune(smoothed)

  return {
    ...reading,
    cents: smoothed,
    inTune,
    status: inTune ? 'in_tune' : 'detecting',
  }
}

export function createTunerController(callbacks: TunerCallbacks): TunerController {
  let config: TunerSessionConfig = {
    tuningId: 'highG',
    mode: 'auto',
    manualStringIndex: null,
  }
  let consecutiveLowEnergy = 0
  const stringGate = new StableStringGate()

  const detector = PitchPlease.create({
    stabilityFrames: 6,
    onUpdate: (data) => {
      const hasEnergy = data.maxEnergy >= MIN_DETECTION_ENERGY
      // Strongest fundamental within the ukulele range. Rumble-only frames
      // (mains hum ≈ MIDI 31) yield null and count as "no signal" — they must
      // not feed the smoother or they make the reading jump and, via octave
      // folding, falsely read as in tune.
      const rawMidi = hasEnergy
        ? firstFundInRange(data.fundMidis, data.fundCount)
        : null

      if (rawMidi === null) {
        consecutiveLowEnergy++
        if (consecutiveLowEnergy > 12) {
          midiSmoother.reset()
          centsSmoother.reset()
          callbacks.onStatusChange('listening')
        }
        if (consecutiveLowEnergy > 8) {
          callbacks.onReading(
            buildTunerReading({
              tuningId: config.tuningId,
              mode: config.mode,
              manualStringIndex: config.manualStringIndex,
              detectedMidi: null,
              hasSignal: false,
              micStatus: 'listening',
            }),
          )
        }
        return
      }

      consecutiveLowEnergy = 0

      const detectedMidi = midiSmoother.push(rawMidi)

      let activeStringIndex: number
      if (config.mode === 'auto') {
        const nearest = nearestOpenStringIndex(detectedMidi, config.tuningId)
        activeStringIndex = stringGate.update(nearest)
      } else {
        stringGate.reset()
        activeStringIndex = config.manualStringIndex ?? 0
      }

      const reading = applySmoothedCents(
        buildTunerReading({
          tuningId: config.tuningId,
          mode: config.mode,
          manualStringIndex: config.manualStringIndex,
          detectedMidi,
          hasSignal: true,
          micStatus: 'detecting',
          activeStringIndex,
        }),
      )

      callbacks.onStatusChange(reading.status)
      callbacks.onReading(reading)
      addDebugFrame({
        timestamp: Date.now(),
        source: 'tuner',
        hz: rawMidi !== null ? midiToHz(rawMidi) : null,
        rawMidi,
        energy: data.maxEnergy,
        pitchClasses: [],
        stable: false,
        smoothedMidi: detectedMidi,
        cents: reading.cents,
        detectedString: reading.detectedLabel,
        targetPitchClasses: [],
        correct: [],
        noise: [],
        missing: [],
        fundMidiList: rawMidi !== null ? [Math.round(rawMidi * 10) / 10] : [],
      })
    },
    onError: (err) => {
      callbacks.onStatusChange('error')
      callbacks.onError(err instanceof Error ? err.message : String(err))
    },
  })

  return {
    async start() {
      consecutiveLowEnergy = 0
      resetTunerFilters()
      stringGate.reset()
      callbacks.onStatusChange('listening')
      await detector.start()
    },
    stop() {
      detector.stop()
      consecutiveLowEnergy = 0
      resetTunerFilters()
      stringGate.reset()
      callbacks.onStatusChange('idle')
    },
    setConfig(next) {
      if (next.tuningId !== config.tuningId) {
        stringGate.reset()
        resetTunerFilters()
      }
      config = next
    },
  }
}

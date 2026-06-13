import { describe, it, expect, beforeEach } from 'vitest'
import {
  addDebugFrame,
  clearLog,
  getLog,
  subscribe,
  type DebugFrame,
  MIN_LOG_ENERGY,
} from './debugStore'

function makeFrame(overrides: Partial<DebugFrame> = {}): DebugFrame {
  return {
    timestamp: Date.now(),
    source: 'detector',
    hz: 440,
    rawMidi: 69,
    energy: MIN_LOG_ENERGY + 0.001,
    pitchClasses: [4, 7],
    stable: true,
    smoothedMidi: null,
    cents: null,
    detectedString: null,
    targetPitchClasses: [],
    correct: [],
    noise: [],
    missing: [],
    fundMidiList: [],
    ...overrides,
  }
}

describe('debugStore', () => {
  beforeEach(() => clearLog())

  it('logs a frame when energy is sufficient and pitchClasses changed', () => {
    addDebugFrame(makeFrame({ pitchClasses: [4, 7] }))
    expect(getLog()).toHaveLength(1)
  })

  it('does not log when energy is below MIN_LOG_ENERGY', () => {
    addDebugFrame(makeFrame({ energy: MIN_LOG_ENERGY - 0.0001 }))
    expect(getLog()).toHaveLength(0)
  })

  it('does not log when pitchClasses unchanged and cents diff < 5', () => {
    addDebugFrame(makeFrame({ pitchClasses: [4, 7], cents: 10 }))
    addDebugFrame(makeFrame({ pitchClasses: [4, 7], cents: 13 }))
    expect(getLog()).toHaveLength(1)
  })

  it('logs when cents diff >= 5 even if pitchClasses unchanged', () => {
    addDebugFrame(makeFrame({ pitchClasses: [4, 7], cents: 10 }))
    addDebugFrame(makeFrame({ pitchClasses: [4, 7], cents: 16 }))
    expect(getLog()).toHaveLength(2)
  })

  it('logs when pitchClasses change', () => {
    addDebugFrame(makeFrame({ pitchClasses: [4, 7] }))
    addDebugFrame(makeFrame({ pitchClasses: [4, 9] }))
    expect(getLog()).toHaveLength(2)
  })

  it('caps log at 200 entries', () => {
    for (let i = 0; i < 210; i++) {
      addDebugFrame(makeFrame({ pitchClasses: [i % 12], cents: i * 10 }))
    }
    expect(getLog().length).toBeLessThanOrEqual(200)
  })

  it('notifies subscribers on every frame (not just logged)', () => {
    let callCount = 0
    const unsub = subscribe(() => { callCount++ })
    addDebugFrame(makeFrame({ energy: MIN_LOG_ENERGY - 0.0001 })) // below threshold — not logged
    addDebugFrame(makeFrame()) // above threshold — logged
    unsub()
    expect(callCount).toBe(2)
  })

  it('clearLog empties the log', () => {
    addDebugFrame(makeFrame())
    clearLog()
    expect(getLog()).toHaveLength(0)
  })
})

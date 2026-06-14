import { describe, expect, it } from 'vitest'
import {
  centsBetween,
  centsBetweenMidi,
  midiToHz,
} from './musicMath'
import {
  buildTunerReading,
  getStringTargets,
  IN_TUNE_CENTS,
  isInTune,
  nearestOpenStringIndex,
  octaveFoldedCents,
} from './tunerEngine'

describe('musicMath', () => {
  it('midiToHz: A4 = 440 Hz', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 2)
  })

  it('centsBetween: gleiche Frequenz = 0', () => {
    expect(centsBetween(440, 440)).toBe(0)
  })

  it('centsBetween: +100 Cent = Halbton höher', () => {
    const higher = 440 * 2 ** (100 / 1200)
    expect(centsBetween(higher, 440)).toBeCloseTo(100, 1)
  })

  it('centsBetweenMidi: G4 vs leicht zu hoch', () => {
    const g4 = 67
    const sharp = g4 + 0.08
    expect(centsBetweenMidi(sharp, g4)).toBeGreaterThan(0)
    expect(centsBetweenMidi(sharp, g4)).toBeLessThan(10)
  })
})

describe('tunerEngine', () => {
  it('getStringTargets für High G', () => {
    const targets = getStringTargets('highG')
    expect(targets).toHaveLength(4)
    expect(targets[0].name).toBe('G')
    expect(targets[0].label).toBe('G4')
    expect(targets[3].label).toBe('A4')
  })

  it('getStringTargets für Low G: G3 statt G4', () => {
    const targets = getStringTargets('lowG')
    expect(targets[0].label).toBe('G3')
  })

  it('nearestOpenStringIndex: High G G4', () => {
    expect(nearestOpenStringIndex(67, 'highG')).toBe(0)
    expect(nearestOpenStringIndex(60, 'highG')).toBe(1)
    expect(nearestOpenStringIndex(69, 'highG')).toBe(3)
  })

  it('nearestOpenStringIndex: Low G G3 und G4 → G-Saite', () => {
    expect(nearestOpenStringIndex(55, 'lowG')).toBe(0)
    expect(nearestOpenStringIndex(67, 'lowG')).toBe(0)
  })

  it('isInTune innerhalb ±5 Cent', () => {
    expect(isInTune(0)).toBe(true)
    expect(isInTune(IN_TUNE_CENTS)).toBe(true)
    expect(isInTune(-IN_TUNE_CENTS)).toBe(true)
    expect(isInTune(IN_TUNE_CENTS + 0.1)).toBe(false)
  })

  it('buildTunerReading: manuell C-Saite', () => {
    const reading = buildTunerReading({
      tuningId: 'highG',
      mode: 'manual',
      manualStringIndex: 1,
      detectedMidi: 60.02,
      hasSignal: true,
      micStatus: 'detecting',
    })
    expect(reading?.stringName).toBe('C')
    expect(reading?.inTune).toBe(true)
    expect(reading?.status).toBe('in_tune')
  })

  it('buildTunerReading: ohne Signal', () => {
    const reading = buildTunerReading({
      tuningId: 'highG',
      mode: 'auto',
      manualStringIndex: null,
      detectedMidi: null,
      hasSignal: false,
      micStatus: 'listening',
    })
    expect(reading?.status).toBe('listening')
    expect(reading?.detectedLabel).toBeNull()
  })
})

describe('octaveFoldedCents', () => {
  it('gleiche Note = 0 Cent', () => {
    expect(octaveFoldedCents(67, 67)).toBeCloseTo(0, 1)
  })

  it('faltet eine Oktave nach oben (F#3 erkannt, F#4 Ziel)', () => {
    // 54.1 vs Ziel 66 → +12 gefaltet auf 66.1 → ~10 Cent, NICHT -1200
    expect(octaveFoldedCents(54.1, 66)).toBeCloseTo(10, 0)
  })

  it('faltet eine Oktave nach unten (G5 erkannt, G4 Ziel)', () => {
    expect(octaveFoldedCents(79, 67)).toBeCloseTo(0, 1)
  })

  it('ein echter Halbton bleibt ein Halbton (keine Faltung)', () => {
    expect(octaveFoldedCents(66, 67)).toBeCloseTo(-100, 0)
  })

  it('zu tief und zu hoch behalten das Vorzeichen', () => {
    expect(octaveFoldedCents(66.8, 67)).toBeLessThan(0) // zu tief
    expect(octaveFoldedCents(67.2, 67)).toBeGreaterThan(0) // zu hoch
  })
})

describe('isInTune with new threshold', () => {
  it('returns true at 7 cents (below new threshold of 8)', () => {
    expect(isInTune(7)).toBe(true)
  })

  it('returns false at 9 cents (above new threshold of 8)', () => {
    expect(isInTune(9)).toBe(false)
  })

  it('returns true at -7 cents', () => {
    expect(isInTune(-7)).toBe(true)
  })

  it('old threshold 5 cents is still in tune', () => {
    expect(isInTune(5)).toBe(true)
  })
})

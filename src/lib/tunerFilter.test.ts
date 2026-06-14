import { describe, expect, it } from 'vitest'
import {
  ExponentialSmoother,
  MedianMidiSmoother,
  StableStringGate,
} from './tunerFilter'

describe('tunerFilter', () => {
  it('ExponentialSmoother glättet Sprünge', () => {
    const s = new ExponentialSmoother(0.5)
    expect(s.push(60)).toBe(60)
    expect(s.push(62)).toBe(61)
    expect(s.push(62)).toBe(61.5)
  })

  it('StableStringGate wechselt erst nach stabilen Frames', () => {
    const gate = new StableStringGate(3)
    expect(gate.update(0)).toBe(0)
    expect(gate.update(1)).toBe(0)
    expect(gate.update(1)).toBe(0)
    expect(gate.update(1)).toBe(1)
  })
})

describe('MedianMidiSmoother', () => {
  it('überstimmt seltene Oberton-Ausreißer, behält die echte Oktave', () => {
    const s = new MedianMidiSmoother(7)
    const attack = [76, 64, 83, 64, 64, 88, 64] // E4-Mehrheit + Obertöne
    let out = 0
    for (const m of attack) out = s.push(m)
    expect(out).toBeCloseTo(64) // echtes E4, NICHT auf eine Oktave gefaltet
  })

  it('behält die gespielte Oktave (G4 bleibt 67, nicht 55)', () => {
    const s = new MedianMidiSmoother(7)
    for (let i = 0; i < 7; i++) s.push(67)
    expect(s.current()).toBeCloseTo(67)
  })

  it('ist nicht stabil bei wandernden Geräuschen', () => {
    const s = new MedianMidiSmoother(7)
    for (const m of [51, 53, 46, 44, 52, 47, 55]) s.push(m)
    expect(s.isStable()).toBe(false)
  })

  it('ist stabil bei einem gehaltenen Ton', () => {
    const s = new MedianMidiSmoother(7)
    for (let i = 0; i < 5; i++) s.push(64)
    expect(s.isStable()).toBe(true)
  })

  it('ist nicht stabil bei nur einem Sample (Attack-Beginn)', () => {
    const s = new MedianMidiSmoother(7)
    s.push(76)
    expect(s.isStable()).toBe(false)
  })

  it('reset leert den Puffer', () => {
    const s = new MedianMidiSmoother(7)
    s.push(64)
    s.reset()
    expect(s.current()).toBeNull()
  })
})

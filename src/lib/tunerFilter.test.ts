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
  it('faltet Oktav-Obertöne auf eine Oktave (E5/E6 → wie E4)', () => {
    const s = new MedianMidiSmoother(7)
    s.push(64) // E4
    s.push(76) // E5 (Oktave)
    s.push(88) // E6 (zwei Oktaven)
    expect(s.current()).toBeCloseTo(64)
  })

  it('überstimmt einen einzelnen Fremdton (B-Oberton)', () => {
    const s = new MedianMidiSmoother(7)
    for (let i = 0; i < 5; i++) s.push(64)
    expect(s.push(83)).toBeCloseTo(64)
  })

  it('bleibt stabil bei verrauschtem Anschlag mit E-Mehrheit', () => {
    const s = new MedianMidiSmoother(7)
    const attack = [76, 64, 83, 64, 64, 88, 64] // Obertöne + echtes E
    let out = 0
    for (const m of attack) out = s.push(m)
    // Tonklasse E (egal welche Oktave — downstream oktav-invariant)
    expect(((out % 12) + 12) % 12).toBe(4)
  })

  it('wechselt zu einer neuen Note, sobald sie die Mehrheit stellt', () => {
    const s = new MedianMidiSmoother(7)
    for (let i = 0; i < 7; i++) s.push(64)
    let out = 64
    for (let i = 0; i < 4; i++) out = s.push(69) // A4
    expect(out).toBeCloseTo(69)
  })

  it('reset leert den Puffer', () => {
    const s = new MedianMidiSmoother(7)
    s.push(64)
    s.reset()
    expect(s.current()).toBeNull()
  })
})

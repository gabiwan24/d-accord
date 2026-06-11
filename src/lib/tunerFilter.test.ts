import { describe, expect, it } from 'vitest'
import { ExponentialSmoother, StableStringGate } from './tunerFilter'

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

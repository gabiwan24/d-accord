import { describe, it, expect, beforeEach } from 'vitest'
import {
  recordAttempt,
  getAccuracy,
  getAllStats,
  clearStats,
} from './practiceStats'

const STORAGE_KEY = 'ukulele-chord-stats'

beforeEach(() => {
  localStorage.clear()
})

describe('getAccuracy', () => {
  it('returns 0.5 for unknown chord (neutral default)', () => {
    expect(getAccuracy('C-major')).toBe(0.5)
  })

  it('returns correct ratio after attempts', () => {
    recordAttempt('C-major', true)
    recordAttempt('C-major', true)
    recordAttempt('C-major', false)
    expect(getAccuracy('C-major')).toBeCloseTo(2 / 3)
  })
})

describe('recordAttempt', () => {
  it('increments attempts on every call', () => {
    recordAttempt('Am', true)
    recordAttempt('Am', false)
    const stats = getAllStats()
    expect(stats['Am'].attempts).toBe(2)
    expect(stats['Am'].correct).toBe(1)
  })

  it('persists to localStorage', () => {
    recordAttempt('G7', true)
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed['G7'].correct).toBe(1)
  })
})

describe('clearStats', () => {
  it('removes all stats from localStorage', () => {
    recordAttempt('C', true)
    clearStats()
    expect(getAllStats()).toEqual({})
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { CHORDS, type ChordSuffix, type RootNote } from './chords'

// Pitch class of each root.
const ROOT_PC: Record<RootNote, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  H: 11,
}

// Intervals (semitones from root) that make up each chord quality.
const FULL_INTERVALS: Record<ChordSuffix, number[]> = {
  '': [0, 4, 7], // major triad
  m: [0, 3, 7], // minor triad
  '7': [0, 4, 7, 10], // dominant 7
  m7: [0, 3, 7, 10], // minor 7
  '6': [0, 4, 7, 9], // major 6
  m6: [0, 3, 7, 9], // minor 6
  sus4: [0, 5, 7], // sus4
  dim: [0, 3, 6], // diminished triad
}

// Characteristic tones that MUST be present (the perfect 5th may be omitted in
// a 4-string voicing; defining tones may not).
const REQUIRED_INTERVALS: Record<ChordSuffix, number[]> = {
  '': [0, 4],
  m: [0, 3],
  '7': [0, 4, 10],
  m7: [0, 3, 10],
  '6': [0, 4, 9],
  m6: [0, 3, 9],
  sus4: [0, 5],
  dim: [0, 3, 6],
}

const pc = (n: number) => ((n % 12) + 12) % 12

describe('Akkord-Theorie: jede Form erzeugt die richtigen Töne', () => {
  for (const chord of CHORDS) {
    const rootPc = ROOT_PC[chord.root]
    const allowed = new Set(FULL_INTERVALS[chord.suffix].map((i) => pc(rootPc + i)))
    const required = REQUIRED_INTERVALS[chord.suffix].map((i) => pc(rootPc + i))
    const actual = chord.shapes.highG.pitchClasses

    it(`${chord.displayName}: keine akkordfremden Töne (Bünde ${chord.shapes.highG.frets.join('-')} → [${actual.join(',')}])`, () => {
      const foreign = actual.filter((p) => !allowed.has(p))
      expect(foreign, `fremde Töne: ${foreign.join(',')}`).toEqual([])
    })

    it(`${chord.displayName}: enthält die charakteristischen Töne [${required.join(',')}]`, () => {
      const missing = required.filter((p) => !actual.includes(p))
      expect(missing, `fehlende Töne: ${missing.join(',')}`).toEqual([])
    })
  }
})

describe('Akkord-Finger: Konsistenz mit den Bünden', () => {
  for (const chord of CHORDS) {
    it(`${chord.displayName}: Finger passen zu den Bünden`, () => {
      const { frets, fingers } = chord.shapes.highG
      expect(fingers).toHaveLength(4)
      for (let i = 0; i < 4; i++) {
        const fret = frets[i]
        const finger = fingers[i]
        if (fret === null) {
          expect(finger, `Saite ${i}: gedämpft → Finger null`).toBeNull()
        } else if (fret === 0) {
          expect(finger, `Saite ${i}: offen → Finger 0`).toBe(0)
        } else {
          expect(
            finger !== null && finger >= 1 && finger <= 4,
            `Saite ${i}: gegriffen (Bund ${fret}) → Finger 1-4, war ${finger}`,
          ).toBe(true)
        }
      }
    })
  }
})

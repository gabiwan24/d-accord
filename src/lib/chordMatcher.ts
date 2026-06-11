import type { UkuleleChord } from '../data/chords'
import type { TuningId } from '../data/tunings'

/** Englisch B → Deutsch H (Mikrofon-Erkennung) */
const ROOT_ALIASES: Record<string, string> = {
  B: 'H',
  BMAJ: 'H',
  BMIN: 'Hm',
  'B-': 'Hm',
}

const SUFFIX_ALIASES: Record<string, string> = {
  CMAJ: 'C',
  CM: 'C',
  CMIN: 'Cm',
  'C-': 'Cm',
  DMAJ: 'D',
  DM: 'D',
  DMIN: 'Dm',
  'D-': 'Dm',
  EMAJ: 'E',
  EM: 'E',
  EMIN: 'Em',
  'E-': 'Em',
  FMAJ: 'F',
  FM: 'F',
  FMIN: 'Fm',
  'F-': 'Fm',
  GMAJ: 'G',
  GM: 'G',
  GMIN: 'Gm',
  'G-': 'Gm',
  AMAJ: 'A',
  AM: 'A',
  AMIN: 'Am',
  'A-': 'Am',
  HMAJ: 'H',
  HM: 'H',
  HMIN: 'Hm',
  'H-': 'Hm',
}

function mapBtoH(name: string): string {
  const upper = name.toUpperCase()
  if (upper === 'B') return 'H'
  if (upper.startsWith('B') && upper[1] !== 'B') {
    return 'H' + name.slice(1)
  }
  return name
}

function normalizeChordName(name: string): string {
  const trimmed = name.trim()
  const mapped = mapBtoH(trimmed)
  const upper = mapped.toUpperCase().replace(/\s+/g, '')

  if (ROOT_ALIASES[upper]) return ROOT_ALIASES[upper]
  if (SUFFIX_ALIASES[upper]) return SUFFIX_ALIASES[upper]

  if (/^[A-H]$/.test(upper)) return upper

  if (/^[A-H]M$/.test(upper) && upper.length === 2) {
    return `${upper[0]}m`
  }

  const extended = upper.match(/^([A-H])(M7|7|6|M6|SUS4|DIM)$/)
  if (extended) {
    const [, root, type] = extended
    switch (type) {
      case 'M7':
        return `${root}m7`
      case '7':
        return `${root}7`
      case '6':
        return `${root}6`
      case 'M6':
        return `${root}m6`
      case 'SUS4':
        return `${root}sus4`
      case 'DIM':
        return `${root}dim`
    }
  }

  const majMin = upper.match(/^([A-H])(MAJ7|MIN7|MAJ|MIN|SUS4|DIM|MAJ6|MIN6)$/)
  if (majMin) {
    const [, root, type] = majMin
    switch (type) {
      case 'MAJ':
        return root
      case 'MIN':
        return `${root}m`
      case 'MAJ7':
        return `${root}7`
      case 'MIN7':
        return `${root}m7`
      case 'MAJ6':
        return `${root}6`
      case 'MIN6':
        return `${root}m6`
      case 'SUS4':
        return `${root}sus4`
      case 'DIM':
        return `${root}dim`
    }
  }

  return mapped
}

function pitchClassOverlap(expected: number[], detected: number[]): number {
  const detectedSet = new Set(detected)
  return expected.filter((pc) => detectedSet.has(pc)).length
}

export interface MatchInput {
  detectedName: string | null
  detectedPitchClasses: number[]
  expected: UkuleleChord
  tuningId: TuningId
}

export function chordMatches(input: MatchInput): boolean {
  const { detectedName, detectedPitchClasses, expected, tuningId } = input
  const shape = expected.shapes[tuningId]

  if (detectedName) {
    const normalized = normalizeChordName(detectedName)
    if (expected.matchNames.some((n) => normalizeChordName(n) === normalized)) {
      return true
    }
    if (normalizeChordName(expected.displayName) === normalized) {
      return true
    }
  }

  if (detectedPitchClasses.length === 0 || shape.pitchClasses.length === 0) {
    return false
  }

  const overlap = pitchClassOverlap(shape.pitchClasses, detectedPitchClasses)
  const threshold = Math.max(2, Math.ceil((shape.pitchClasses.length * 2) / 3))
  return overlap >= threshold
}

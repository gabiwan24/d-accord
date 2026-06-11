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

function normalizePc(pc: number): number {
  return ((pc % 12) + 12) % 12
}

export function pitchClassesMatch(
  expected: number[],
  detected: number[],
): boolean {
  const expectedUnique = [...new Set(expected.map(normalizePc))]
  if (expectedUnique.length === 0 || detected.length === 0) return false

  const detectedSet = new Set(detected.map(normalizePc))
  const matched = expectedUnique.filter((pc) => detectedSet.has(pc)).length
  const allowMissing = expectedUnique.length >= 4 ? 1 : 0

  return matched >= expectedUnique.length - allowMissing
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

  if (!pitchClassesMatch(shape.pitchClasses, detectedPitchClasses)) {
    return false
  }

  if (!detectedName) return true

  const normalized = normalizeChordName(detectedName)
  if (expected.matchNames.some((n) => normalizeChordName(n) === normalized)) {
    return true
  }

  return normalizeChordName(expected.displayName) === normalized
}

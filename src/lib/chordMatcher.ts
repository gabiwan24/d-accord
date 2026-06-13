import type { UkuleleChord } from '../data/chords'
import { TUNINGS, type TuningId } from '../data/tunings'

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

// ── Octave-aware matching ────────────────────────────────────────────────
//
// PitchPlease returns `fundMidis` — fundamentals WITH octave (sub-semitone
// precision, ~±0.3 in practice). Pitch classes (octave-collapsed) cannot tell
// a real B4(71) from a wrong Bb4(70) or from a B5(83) overtone of a played E.
// Octave-aware MIDI matching can. See docs note in chordMatcher.test.ts.

/** Tolerance in semitones for a detected fundamental to count as a chord note. */
export const FUND_MATCH_TOLERANCE = 0.55
/** Highest harmonic order we accept as a legitimate overtone of a chord note. */
const MAX_HARMONIC = 4

/** Expected MIDI notes (with octave) for a chord shape in a tuning. */
export function expectedMidisFromFrets(
  frets: (number | null)[],
  tuningId: TuningId,
): number[] {
  const strings = TUNINGS[tuningId].strings
  const midis: number[] = []
  for (let i = 0; i < frets.length; i++) {
    const fret = frets[i]
    if (fret === null) continue
    const s = strings[i]
    if (!s) continue
    midis.push(s.midi + fret)
  }
  return midis
}

/**
 * A detected fundamental is "explained" by the chord if it lies within
 * tolerance of an expected note OR one of that note's harmonics (octave,
 * fifth-plus-octave, two octaves). Overtones of played strings are natural and
 * must not be treated as foreign notes.
 */
export function fundExplainedByChord(
  fund: number,
  expectedMidis: number[],
  tol = FUND_MATCH_TOLERANCE,
): boolean {
  for (const e of expectedMidis) {
    for (let n = 1; n <= MAX_HARMONIC; n++) {
      const harmonic = e + 12 * Math.log2(n)
      if (Math.abs(fund - harmonic) <= tol) return true
    }
  }
  return false
}

export interface MatchInput {
  detectedName: string | null
  detectedPitchClasses: number[]
  /** Octave-aware fundamentals from PitchPlease (raw, not rounded). */
  detectedFundMidis?: number[]
  expected: UkuleleChord
  tuningId: TuningId
}

/**
 * Pitch-class coverage. `allowMissing` how many of the chord's distinct pitch
 * classes may be absent (still requiring at least two present, so a lone note
 * can't satisfy a triad).
 */
function coverageMatch(
  expected: number[],
  detected: number[],
  allowMissing: number,
): boolean {
  const expectedUnique = [...new Set(expected.map(normalizePc))]
  if (expectedUnique.length === 0 || detected.length === 0) return false

  const detectedSet = new Set(detected.map(normalizePc))
  const matched = expectedUnique.filter((pc) => detectedSet.has(pc)).length
  const required = Math.max(2, expectedUnique.length - allowMissing)

  return matched >= required
}

/** Strict coverage (all chord pitch classes present) — used without octave data. */
export function pitchClassesMatch(
  expected: number[],
  detected: number[],
): boolean {
  return coverageMatch(expected, detected, 0)
}

export function chordMatches(input: MatchInput): boolean {
  const {
    detectedName,
    detectedPitchClasses,
    detectedFundMidis,
    expected,
    tuningId,
  } = input
  const shape = expected.shapes[tuningId]
  const hasFunds = !!(detectedFundMidis && detectedFundMidis.length > 0)

  // 1. Coverage. With octave-aware fundamentals the purity check below guards
  // precision, so one chord tone may be missing (mid strings detect
  // unreliably). Without them, fall back to strict coverage to stay safe.
  const allowMissing = hasFunds ? 1 : 0
  if (!coverageMatch(shape.pitchClasses, detectedPitchClasses, allowMissing)) {
    return false
  }

  // 2. Purity (octave-aware): no detected fundamental may be a foreign note.
  // This is what distinguishes a real B4 from a wrong Bb4 — pitch classes can't.
  if (hasFunds) {
    const expectedMidis = expectedMidisFromFrets(shape.frets, tuningId)
    for (const fund of detectedFundMidis!) {
      if (!fundExplainedByChord(fund, expectedMidis)) return false
    }
  }

  // 3. Optional name confirmation (when the detector reports a chord name).
  if (!detectedName) return true

  const normalized = normalizeChordName(detectedName)
  if (expected.matchNames.some((n) => normalizeChordName(n) === normalized)) {
    return true
  }

  return normalizeChordName(expected.displayName) === normalized
}

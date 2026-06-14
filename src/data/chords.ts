import { TUNINGS, type TuningId } from './tunings'

export interface ChordShape {
  frets: (number | null)[]
  fingers: (number | null)[]
  pitchClasses: number[]
}

export type AccentColor =
  | 'pink'
  | 'grey'
  | 'purple'
  | 'mint'
  | 'peach'
  | 'blue'
  | 'sage'
  | 'lavender'
  | 'coral'

export type ChordSuffix = '' | 'm' | '7' | 'm7' | '6' | 'm6' | 'sus4' | 'dim'

export type RootNote = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'H'

export interface UkuleleChord {
  id: string
  displayName: string
  root: RootNote
  suffix: ChordSuffix
  matchNames: string[]
  accent: AccentColor
  shapes: Record<TuningId, ChordShape>
}

const ROOT_ACCENTS: Record<RootNote, AccentColor> = {
  C: 'pink',
  D: 'purple',
  E: 'coral',
  F: 'blue',
  G: 'lavender',
  A: 'peach',
  H: 'sage',
}

const ROOT_ORDER: RootNote[] = ['C', 'D', 'E', 'F', 'G', 'A', 'H']
const SUFFIX_ORDER: ChordSuffix[] = ['', 'm', '7', 'm7', '6', 'm6', 'sus4', 'dim']

/** Bundpositionen [G, C, E, A] — null = gedämpft (X) */
const CHART: Record<RootNote, Record<ChordSuffix, (number | null)[]>> = {
  C: {
    '': [0, 0, 0, 3],
    m: [0, 3, 3, 3],
    '7': [0, 0, 0, 1],
    m7: [3, 3, 3, 3],
    '6': [0, 0, 0, 0],
    m6: [2, 3, 3, 3],
    sus4: [0, 0, 1, 3],
    dim: [null, 3, 2, 3],
  },
  D: {
    '': [2, 2, 2, 0],
    m: [2, 2, 1, 0],
    '7': [2, 2, 2, 3],
    m7: [2, 2, 1, 3],
    '6': [2, 2, 2, 2],
    m6: [2, 2, 1, 2],
    sus4: [0, 2, 3, 0],
    dim: [1, 2, 1, null],
  },
  E: {
    '': [4, 4, 4, 2],
    m: [0, 4, 3, 2],
    '7': [1, 2, 0, 2],
    m7: [0, 2, 0, 2],
    '6': [1, 1, 0, 2],
    m6: [0, 1, 0, 2],
    sus4: [4, 4, 0, 0],
    dim: [0, 4, 0, 1],
  },
  F: {
    '': [2, 0, 1, 0],
    m: [1, 0, 1, 3],
    '7': [2, 3, 1, 3],
    m7: [1, 3, 1, 3],
    '6': [2, 2, 1, 3],
    m6: [1, 2, 1, 3],
    sus4: [3, 0, 1, 1],
    dim: [null, 5, 4, 2],
  },
  G: {
    '': [0, 2, 3, 2],
    m: [0, 2, 3, 1],
    '7': [0, 2, 1, 2],
    m7: [0, 2, 1, 1],
    '6': [0, 2, 0, 2],
    m6: [0, 2, 0, 1],
    sus4: [0, 2, 3, 3],
    dim: [0, 1, 3, 1],
  },
  A: {
    '': [2, 1, 0, 0],
    m: [2, 0, 0, 0],
    '7': [0, 1, 0, 0],
    m7: [0, 0, 0, 0],
    '6': [2, 1, 2, 4],
    m6: [2, 4, 2, 3],
    sus4: [2, 2, 0, 0],
    dim: [5, 3, 5, 3],
  },
  H: {
    '': [4, 3, 2, 2],
    m: [4, 2, 2, 2],
    '7': [2, 3, 2, 2],
    m7: [2, 2, 2, 2],
    '6': [1, 3, 2, 2],
    m6: [1, 2, 2, 2],
    sus4: [4, 4, 2, 2],
    dim: [4, 2, 1, 2],
  },
}

/** Finger [G, C, E, A] — 0 = offen, null = gedämpft (X), Quelle: Ukulele-Chord-Chart */
const FINGER_CHART: Record<RootNote, Record<ChordSuffix, (number | null)[]>> = {
  C: {
    '': [0, 0, 0, 3],
    m: [0, 1, 1, 1],
    '7': [0, 0, 0, 1],
    m7: [1, 1, 1, 1],
    '6': [0, 0, 0, 0],
    m6: [1, 2, 3, 4],
    sus4: [0, 0, 1, 3],
    dim: [null, 2, 1, 3],
  },
  D: {
    '': [1, 2, 3, 0],
    m: [2, 3, 1, 0],
    '7': [1, 1, 1, 2],
    m7: [2, 3, 1, 4],
    '6': [1, 1, 1, 1],
    m6: [2, 3, 1, 4],
    sus4: [0, 1, 2, 0],
    dim: [1, 3, 2, null],
  },
  E: {
    '': [2, 3, 4, 1],
    m: [0, 3, 2, 1],
    '7': [1, 2, 0, 3],
    m7: [0, 1, 0, 2],
    '6': [1, 2, 0, 3],
    m6: [0, 1, 0, 2],
    sus4: [1, 2, 0, 0],
    dim: [0, 4, 0, 1],
  },
  F: {
    '': [2, 0, 1, 0],
    m: [1, 0, 2, 4],
    '7': [2, 3, 1, 4],
    m7: [1, 3, 1, 4],
    '6': [2, 3, 1, 4],
    m6: [1, 3, 1, 4],
    sus4: [3, 0, 1, 2],
    dim: [null, 3, 2, 1],
  },
  G: {
    '': [0, 1, 3, 2],
    m: [0, 2, 3, 1],
    '7': [0, 2, 1, 3],
    m7: [0, 3, 1, 2],
    '6': [0, 1, 0, 2],
    m6: [0, 2, 0, 1],
    sus4: [0, 1, 2, 3],
    dim: [0, 1, 3, 2],
  },
  A: {
    '': [2, 1, 0, 0],
    m: [2, 0, 0, 0],
    '7': [0, 1, 0, 0],
    m7: [0, 0, 0, 0],
    '6': [1, 2, 3, 4],
    m6: [1, 4, 2, 3],
    sus4: [1, 2, 0, 0],
    dim: [3, 1, 4, 2],
  },
  H: {
    '': [3, 2, 1, 1],
    m: [2, 1, 1, 1],
    '7': [1, 4, 2, 3],
    m7: [1, 1, 1, 1],
    '6': [1, 3, 2, 4],
    m6: [1, 2, 3, 4],
    sus4: [3, 4, 1, 1],
    dim: [4, 2, 1, 3],
  },
}

/** Englisches B für Mikrofon-Erkennung (PitchPlease) */
const ROOT_ENGLISH: Partial<Record<RootNote, string>> = { H: 'B' }

function pitchClassesFromFrets(
  frets: (number | null)[],
  tuningId: TuningId,
): number[] {
  const strings = TUNINGS[tuningId].strings
  const pcs = new Set<number>()
  for (let i = 0; i < frets.length; i++) {
    const fret = frets[i]
    if (fret === null) continue
    pcs.add((strings[i].midi + fret) % 12)
  }
  return [...pcs].sort((a, b) => a - b)
}

function makeShape(
  root: RootNote,
  suffix: ChordSuffix,
): Record<TuningId, ChordShape> {
  const frets = CHART[root][suffix]
  const fingers = FINGER_CHART[root][suffix]
  return {
    highG: {
      frets,
      fingers,
      pitchClasses: pitchClassesFromFrets(frets, 'highG'),
    },
    lowG: {
      frets,
      fingers,
      pitchClasses: pitchClassesFromFrets(frets, 'lowG'),
    },
  }
}

function displayName(root: RootNote, suffix: ChordSuffix): string {
  if (suffix === '') return root
  return `${root}${suffix}`
}

function chordId(root: RootNote, suffix: ChordSuffix): string {
  return displayName(root, suffix)
}

function buildMatchNames(root: RootNote, suffix: ChordSuffix): string[] {
  const enRoot = ROOT_ENGLISH[root] ?? root
  const deName = displayName(root, suffix)
  const enName = suffix === '' ? enRoot : `${enRoot}${suffix}`

  const names = new Set<string>([deName, enName])

  if (suffix === '') {
    names.add(`${enRoot}maj`)
    names.add(`${enRoot}M`)
  } else if (suffix === 'm') {
    names.add(`${enRoot}min`)
    names.add(`${enRoot}-`)
  }

  return [...names]
}

function buildChord(root: RootNote, suffix: ChordSuffix): UkuleleChord {
  return {
    id: chordId(root, suffix),
    displayName: displayName(root, suffix),
    root,
    suffix,
    matchNames: buildMatchNames(root, suffix),
    accent: ROOT_ACCENTS[root],
    shapes: makeShape(root, suffix),
  }
}

export const CHORDS: UkuleleChord[] = ROOT_ORDER.flatMap((root) =>
  SUFFIX_ORDER.map((suffix) => buildChord(root, suffix)),
)

export const CHORD_MAP = new Map(CHORDS.map((ch) => [ch.id, ch]))

export function getChord(id: string): UkuleleChord | undefined {
  return CHORD_MAP.get(id)
}

export const DEFAULT_SELECTED = ['C', 'G', 'Am', 'F', 'Dm', 'Em']

export const CHORDS_BY_ROOT = ROOT_ORDER.map((root) => ({
  root,
  chords: CHORDS.filter((c) => c.root === root),
}))

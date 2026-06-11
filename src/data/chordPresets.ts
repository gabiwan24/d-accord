import { CHORDS } from './chords'

export type ChordPresetId =
  | 'stufe1'
  | 'stufe2'
  | 'stufe3'
  | 'stufe4'
  | 'stufe5'
  | 'custom'

export interface ChordPreset {
  id: ChordPresetId
  label: string
  description: string
  chordIds: string[]
}

const STUFE5_IDS = CHORDS.map((c) => c.id)

export const CHORD_PRESETS: ChordPreset[] = [
  {
    id: 'stufe1',
    label: 'Stufe 1 — C-Dur-Familie',
    description:
      'C, Am, F, G — Ein-Finger-Griffe & die magische 4-Chords-Kette (z. B. Let It Be).',
    chordIds: ['C', 'Am', 'F', 'G'],
  },
  {
    id: 'stufe2',
    label: 'Stufe 2 — G- & D-Dur',
    description:
      'D, Em, A, Dm — mehr Fingerkoordination. Cluster: G – D – Em – C.',
    chordIds: ['D', 'Em', 'A', 'Dm'],
  },
  {
    id: 'stufe3',
    label: 'Stufe 3 — Dehnung & Barrés',
    description: 'H7, C7, Fm — Teil-Barré, Blues-Richtung und weite Griffe.',
    chordIds: ['H7', 'C7', 'Fm'],
  },
  {
    id: 'stufe4',
    label: 'Stufe 4 — volle Barrés',
    description: 'H, Hm, Cm — Kraft & Daumenposition, volle Barré-Griffe.',
    chordIds: ['H', 'Hm', 'Cm'],
  },
  {
    id: 'stufe5',
    label: 'Stufe 5 — alles',
    description: 'Alle 56 Akkorde aus dem Chart.',
    chordIds: STUFE5_IDS,
  },
]

const PRESET_BY_ID = new Map(CHORD_PRESETS.map((p) => [p.id, p]))

export function getPresetChordIds(id: ChordPresetId): string[] {
  if (id === 'custom') return []
  if (id === 'stufe5') return STUFE5_IDS
  return PRESET_BY_ID.get(id)?.chordIds ?? []
}

export function getChordPreset(id: ChordPresetId): ChordPreset | undefined {
  if (id === 'custom') return undefined
  return PRESET_BY_ID.get(id)
}

export function detectChordPreset(ids: string[]): ChordPresetId {
  const key = [...ids].sort().join('\0')
  for (const preset of CHORD_PRESETS) {
    if ([...preset.chordIds].sort().join('\0') === key) return preset.id
  }
  return 'custom'
}

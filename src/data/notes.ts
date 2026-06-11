export type PracticeMode = 'chords' | 'notes'

export type NoteId =
  | 'C'
  | 'C#'
  | 'D'
  | 'D#'
  | 'E'
  | 'F'
  | 'F#'
  | 'G'
  | 'G#'
  | 'A'
  | 'A#'
  | 'B'

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

export interface NoteDefinition {
  id: NoteId
  displayName: string
  pitchClass: number
  accent: AccentColor
}

const ACCENTS: AccentColor[] = [
  'pink',
  'grey',
  'purple',
  'mint',
  'peach',
  'blue',
  'sage',
  'lavender',
  'coral',
  'pink',
  'grey',
  'purple',
]

const NOTE_NAMES: NoteId[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
]

export const NOTES: NoteDefinition[] = NOTE_NAMES.map((name, i) => ({
  id: name,
  displayName: name,
  pitchClass: i,
  accent: ACCENTS[i],
}))

export const NOTE_MAP = new Map(NOTES.map((n) => [n.id, n]))

export function getNote(id: string): NoteDefinition | undefined {
  return NOTE_MAP.get(id as NoteId)
}

export const DEFAULT_SELECTED_NOTES: NoteId[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export function pitchClassToNoteId(pc: number): NoteId {
  return NOTE_NAMES[((pc % 12) + 12) % 12]
}

import { TUNINGS, type TuningId } from '../data/tunings'

export interface NotePosition {
  stringIndex: number
  fret: number
}

export const MAX_FRET = 12

export function getNotePositions(
  tuningId: TuningId,
  pitchClass: number,
  maxFret = MAX_FRET,
): NotePosition[] {
  const strings = TUNINGS[tuningId].strings
  const positions: NotePosition[] = []

  for (let stringIndex = 0; stringIndex < strings.length; stringIndex++) {
    for (let fret = 0; fret <= maxFret; fret++) {
      if ((strings[stringIndex].midi + fret) % 12 === pitchClass) {
        positions.push({ stringIndex, fret })
      }
    }
  }

  return positions
}

export function positionLabel(
  tuningId: TuningId,
  position: NotePosition,
): string {
  const stringName = TUNINGS[tuningId].strings[position.stringIndex].name
  if (position.fret === 0) return `${stringName} offen`
  return `${stringName}-Saite Bund ${position.fret}`
}

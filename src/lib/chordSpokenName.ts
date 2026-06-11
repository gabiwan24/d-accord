import type { ChordSuffix, UkuleleChord } from '../data/chords'

const SUFFIX_SHORT: Record<ChordSuffix, string> = {
  '': 'Dur',
  m: 'Moll',
  '7': 'Sieben',
  m7: 'Moll-Sieben',
  '6': 'Sechs',
  m6: 'Moll-Sechs',
  sus4: 'Sus-Vier',
  dim: 'Dim',
}

/** Deutsche Akkordbezeichnung, z. B. C-Dur */
export function formatChordSpokenGuide(chord: UkuleleChord): string {
  const root = chord.root
  const suffix = chord.suffix
  return suffix === '' ? `${root}-Dur` : `${root}-${SUFFIX_SHORT[suffix]}`
}

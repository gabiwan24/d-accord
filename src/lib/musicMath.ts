/** A4-Referenz in Hz (Standard 440) */
export const A4_HZ = 440
export const A4_MIDI = 69

export function midiToHz(midi: number): number {
  return A4_HZ * 2 ** ((midi - A4_MIDI) / 12)
}

export function hzToMidi(hz: number): number {
  return A4_MIDI + 12 * Math.log2(hz / A4_HZ)
}

/** Cent-Abweichung von detectedHz relativ zu targetHz (positiv = zu hoch) */
export function centsBetween(detectedHz: number, targetHz: number): number {
  if (detectedHz <= 0 || targetHz <= 0) return 0
  return 1200 * Math.log2(detectedHz / targetHz)
}

export function centsBetweenMidi(detectedMidi: number, targetMidi: number): number {
  return centsBetween(midiToHz(detectedMidi), midiToHz(targetMidi))
}

/** Note name with octave, e.g. G4 */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function midiToNoteLabel(midi: number, useGermanB = true): string {
  const rounded = Math.round(midi)
  const pc = ((rounded % 12) + 12) % 12
  const octave = Math.floor(rounded / 12) - 1
  let name = NOTE_NAMES[pc]
  if (useGermanB && name === 'B') name = 'H'
  if (useGermanB && name === 'A#') name = 'B'
  return `${name}${octave}`
}

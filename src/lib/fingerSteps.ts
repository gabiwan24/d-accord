import type { ChordShape } from '../data/chords'

/** Finger-Schritt 1–4 pro Saite für Animations-Reihenfolge */
export function buildFingerSteps(shape: ChordShape): (number | null)[] {
  const steps: (number | null)[] = shape.frets.map(() => null)

  const fretted = shape.frets
    .map((fret, i) => ({
      fret,
      i,
      finger: shape.fingers[i],
    }))
    .filter(
      (x): x is { fret: number; i: number; finger: number | null } =>
        x.fret !== null && x.fret > 0,
    )

  if (fretted.length === 0) return steps

  const hasFingerNumbers = fretted.some(
    (x) => x.finger !== null && x.finger > 0,
  )

  if (hasFingerNumbers) {
    for (const { i, finger } of fretted) {
      steps[i] = finger && finger > 0 ? finger : 1
    }
    return steps
  }

  const uniqueFrets = [...new Set(fretted.map((x) => x.fret))].sort(
    (a, b) => a - b,
  )
  const fretToStep = new Map(
    uniqueFrets.map((fret, idx) => [fret, Math.min(idx + 1, 4)]),
  )

  for (const { i, fret } of fretted) {
    steps[i] = fretToStep.get(fret) ?? 1
  }

  return steps
}

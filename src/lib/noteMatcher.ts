export function noteMatches(
  expectedPitchClass: number,
  detectedPitchClasses: number[],
  stable: boolean,
): boolean {
  if (!stable || detectedPitchClasses.length === 0) return false

  const normalized = ((expectedPitchClass % 12) + 12) % 12
  return detectedPitchClasses.includes(normalized)
}

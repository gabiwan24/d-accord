export type FingerNumber = 1 | 2 | 3 | 4

export interface FingerColorStyle {
  fill: string
  label: string
}

/** Kontraststark, zur Creme/Ink-Palette passend */
export const FINGER_COLOR_STYLES: Record<FingerNumber, FingerColorStyle> = {
  1: {
    fill: 'var(--color-finger-1)',
    label: 'var(--color-finger-1-label)',
  },
  2: {
    fill: 'var(--color-finger-2)',
    label: 'var(--color-finger-2-label)',
  },
  3: {
    fill: 'var(--color-finger-3)',
    label: 'var(--color-finger-3-label)',
  },
  4: {
    fill: 'var(--color-finger-4)',
    label: 'var(--color-finger-4-label)',
  },
}

export function getFingerColor(finger: number): FingerColorStyle {
  const clamped = Math.min(4, Math.max(1, finger)) as FingerNumber
  return FINGER_COLOR_STYLES[clamped]
}

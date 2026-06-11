import type { FingerDotPosition } from './chordLayout'

export interface FingerMarkerDot {
  type: 'dot'
  id: string
  finger: number
  fret: number
  x: number
  y: number
  stringIndex: number
}

export interface FingerMarkerBar {
  type: 'bar'
  id: string
  finger: number
  fret: number
  x: number
  y: number
  width: number
  minScale: number
  stringIndices: number[]
  labelOffsets: number[]
}

export type FingerMarker = FingerMarkerDot | FingerMarkerBar

export type MarkerAnimKind =
  | 'enter'
  | 'move'
  | 'pulse'
  | 'stretch'
  | 'morph'
  | 'exit'
  | 'static'

export type AnimatedFingerMarker = FingerMarker & {
  anim: MarkerAnimKind
  fromX?: number
  fromY?: number
  fromWidth?: number
}

export interface FingerAnimationFrame {
  active: AnimatedFingerMarker[]
  exiting: AnimatedFingerMarker[]
}

export function groupFingerMarkers(
  dots: FingerDotPosition[],
  dotRadius: number,
): FingerMarker[] {
  const byFinger = new Map<number, FingerDotPosition[]>()

  for (const dot of dots) {
    const group = byFinger.get(dot.finger) ?? []
    group.push(dot)
    byFinger.set(dot.finger, group)
  }

  const markers: FingerMarker[] = []

  for (const [finger, group] of byFinger) {
    group.sort((a, b) => a.stringIndex - b.stringIndex)

    if (group.length >= 2) {
      const min = group[0]
      const max = group[group.length - 1]
      const width = max.x - min.x + dotRadius * 2
      const centerX = (min.x + max.x) / 2
      markers.push({
        type: 'bar',
        id: `finger-${finger}`,
        finger,
        fret: min.fret,
        x: centerX,
        y: min.y,
        width,
        minScale: Math.min(1, (dotRadius * 2) / width),
        stringIndices: group.map((d) => d.stringIndex),
        labelOffsets: group.map((d) => d.x - centerX),
      })
    } else {
      const dot = group[0]
      markers.push({
        type: 'dot',
        id: `finger-${finger}`,
        finger: dot.finger,
        fret: dot.fret,
        x: dot.x,
        y: dot.y,
        stringIndex: dot.stringIndex,
      })
    }
  }

  return markers.sort((a, b) => a.finger - b.finger)
}

function markersByFinger(markers: FingerMarker[]): Map<number, FingerMarker> {
  return new Map(markers.map((m) => [m.finger, m]))
}

function sameMarkerGeometry(a: FingerMarker, b: FingerMarker): boolean {
  if (a.finger !== b.finger || a.fret !== b.fret || a.type !== b.type) {
    return false
  }
  if (Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5) return false
  if (a.type === 'dot' && b.type === 'dot') {
    return a.stringIndex === b.stringIndex
  }
  if (a.type === 'bar' && b.type === 'bar') {
    return (
      Math.abs(a.width - b.width) < 0.5 &&
      a.stringIndices.length === b.stringIndices.length &&
      a.stringIndices.every((s, i) => s === b.stringIndices[i])
    )
  }
  return false
}

function sameFretHeight(a: FingerMarker, b: FingerMarker): boolean {
  return a.fret === b.fret && Math.abs(a.y - b.y) < 0.5
}

function sameCenter(a: FingerMarker, b: FingerMarker): boolean {
  return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5
}

function pickActiveAnimation(
  prev: FingerMarker,
  curr: FingerMarker,
): Pick<AnimatedFingerMarker, 'anim' | 'fromX' | 'fromY' | 'fromWidth'> {
  if (sameMarkerGeometry(prev, curr)) {
    return { anim: 'pulse' }
  }

  // Regel 2 (Priorität): Finger bereits aktiv → immer von A (prev) nach B (curr)
  const origin = {
    fromX: prev.x,
    fromY: prev.y,
    fromWidth: prev.type === 'bar' ? prev.width : undefined,
  }

  const barInvolved = prev.type === 'bar' || curr.type === 'bar'
  const onlyStretch =
    barInvolved &&
    sameCenter(prev, curr) &&
    sameFretHeight(prev, curr)

  if (onlyStretch) {
    return { anim: 'stretch', ...origin }
  }

  if (barInvolved) {
    return { anim: 'morph', ...origin }
  }

  return { anim: 'move', ...origin }
}

/** Übungsmodus: Animationen pro Fingernummer (1–4) */
export function buildFingerAnimations(
  previous: FingerMarker[] | null | undefined,
  current: FingerMarker[],
): FingerAnimationFrame {
  const currByFinger = markersByFinger(current)
  const prevByFinger = markersByFinger(previous ?? [])
  const active: AnimatedFingerMarker[] = []
  const exiting: AnimatedFingerMarker[] = []

  if (!previous || previous.length === 0) {
    for (const curr of current) {
      active.push({ ...curr, anim: 'enter' })
    }
    return { active, exiting }
  }

  for (const curr of current) {
    const prev = prevByFinger.get(curr.finger)
    if (!prev) {
      active.push({ ...curr, anim: 'enter' })
      continue
    }
    active.push({ ...curr, ...pickActiveAnimation(prev, curr) })
  }

  for (const prev of previous) {
    if (!currByFinger.has(prev.finger)) {
      exiting.push({ ...prev, anim: 'exit' })
    }
  }

  return { active, exiting }
}

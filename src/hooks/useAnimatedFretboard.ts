import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ChordShape } from '../data/chords'
import {
  buildDiagramMetrics,
  type DiagramLayoutInput,
  type DiagramMetrics,
  type DiagramSize,
} from '../lib/chordLayout'
import { easeInOutSmooth } from '../lib/svgMotion'

export const FRETBOARD_ANIM_MS = 520

export interface FretLineDisplay {
  fretNumber: number
  y: number
  opacity: number
}

export interface OpenStringDisplay {
  stringIndex: number
  openOpacity: number
  mutedOpacity: number
}

export interface FretboardDisplayState {
  stringBottomY: number
  fretLines: FretLineDisplay[]
  fretLabels: Array<{ fretNumber: number; y: number; opacity: number }>
  openStrings: OpenStringDisplay[]
}

function localFretLineY(padTop: number, fretGap: number, fretNumber: number): number {
  return padTop + fretNumber * fretGap
}

function localLabelY(padTop: number, fretGap: number, fretNumber: number): number {
  return padTop + (fretNumber - 0.5) * fretGap
}

function localGridBottom(
  padTop: number,
  fretGap: number,
  visibleFretCount: number,
): number {
  return padTop + visibleFretCount * fretGap
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function fretsEqual(
  a: (number | null)[],
  b: (number | null)[],
): boolean {
  return a.length === b.length && a.every((f, i) => f === b[i])
}

function openStringsAt(
  fromFrets: (number | null)[],
  toFrets: (number | null)[],
  e: number,
): OpenStringDisplay[] {
  return fromFrets.map((fromF, i) => {
    const toF = toFrets[i] ?? null
    const fromOpen = fromF === 0 ? 1 : 0
    const toOpen = toF === 0 ? 1 : 0
    const fromMuted = fromF === null ? 1 : 0
    const toMuted = toF === null ? 1 : 0
    return {
      stringIndex: i,
      openOpacity: lerp(fromOpen, toOpen, e),
      mutedOpacity: lerp(fromMuted, toMuted, e),
    }
  })
}

function interpolateFretboard(
  from: DiagramMetrics,
  to: DiagramMetrics,
  padTop: number,
  fromFrets: (number | null)[],
  toFrets: (number | null)[],
  t: number,
): FretboardDisplayState {
  const e = easeInOutSmooth(t)
  const stringBottomY = lerp(
    localGridBottom(padTop, from.fretGap, from.visibleFretCount),
    localGridBottom(padTop, to.fretGap, to.visibleFretCount),
    e,
  )

  const maxFrets = Math.max(from.visibleFretCount, to.visibleFretCount)
  const fromBottom = localGridBottom(padTop, from.fretGap, from.visibleFretCount)
  const toBottom = localGridBottom(padTop, to.fretGap, to.visibleFretCount)

  const fretLines: FretLineDisplay[] = []
  const fretLabels: FretboardDisplayState['fretLabels'] = []

  for (let i = 1; i <= maxFrets; i++) {
    const inFrom = i <= from.visibleFretCount
    const inTo = i <= to.visibleFretCount

    const fromY = inFrom
      ? localFretLineY(padTop, from.fretGap, i)
      : fromBottom
    const toY = inTo ? localFretLineY(padTop, to.fretGap, i) : toBottom

    let opacity = 1
    if (inFrom && inTo) {
      opacity = 1
    } else if (inFrom && !inTo) {
      opacity = 1 - e
    } else if (!inFrom && inTo) {
      opacity = e
    } else {
      opacity = 0
    }

    fretLines.push({ fretNumber: i, y: lerp(fromY, toY, e), opacity })
    fretLabels.push({
      fretNumber: i,
      y: lerp(
        inFrom ? localLabelY(padTop, from.fretGap, i) : fromBottom,
        inTo ? localLabelY(padTop, to.fretGap, i) : toBottom,
        e,
      ),
      opacity,
    })
  }

  return {
    stringBottomY,
    fretLines,
    fretLabels,
    openStrings: openStringsAt(fromFrets, toFrets, e),
  }
}

export function snapFretboard(
  metrics: DiagramMetrics,
  padTop: number,
  frets: (number | null)[],
): FretboardDisplayState {
  const fretLines: FretLineDisplay[] = []
  const fretLabels: FretboardDisplayState['fretLabels'] = []

  for (let i = 1; i <= metrics.visibleFretCount; i++) {
    fretLines.push({
      fretNumber: i,
      y: localFretLineY(padTop, metrics.fretGap, i),
      opacity: 1,
    })
    fretLabels.push({
      fretNumber: i,
      y: localLabelY(padTop, metrics.fretGap, i),
      opacity: 1,
    })
  }

  return {
    stringBottomY: localGridBottom(padTop, metrics.fretGap, metrics.visibleFretCount),
    fretLines,
    fretLabels,
    openStrings: openStringsAt(frets, frets, 1),
  }
}

function displayUnchanged(
  a: FretboardDisplayState,
  b: FretboardDisplayState,
): boolean {
  return (
    a.stringBottomY === b.stringBottomY &&
    a.fretLines.length === b.fretLines.length &&
    a.fretLines.every(
      (line, i) =>
        line.fretNumber === b.fretLines[i]?.fretNumber &&
        line.y === b.fretLines[i]?.y &&
        line.opacity === b.fretLines[i]?.opacity,
    ) &&
    a.openStrings.every(
      (slot, i) =>
        slot.openOpacity === b.openStrings[i]?.openOpacity &&
        slot.mutedOpacity === b.openStrings[i]?.mutedOpacity,
    )
  )
}

function metricsAt(
  from: DiagramMetrics,
  to: DiagramMetrics,
  e: number,
  padBottom: number,
): DiagramMetrics {
  const visibleFretCount = Math.round(
    lerp(from.visibleFretCount, to.visibleFretCount, e),
  )
  const fretGap = to.fretGap
  const gridTopY = to.gridTopY
  const innerHeight = fretGap * visibleFretCount
  return {
    ...to,
    gridTopY,
    fretGap,
    visibleFretCount,
    innerHeight,
    svgHeight: gridTopY + innerHeight + padBottom,
  }
}

function boardNeedsAnimation(
  from: DiagramMetrics,
  to: DiagramMetrics,
  fromFrets: (number | null)[],
  toFrets: (number | null)[],
): boolean {
  return (
    from.visibleFretCount !== to.visibleFretCount ||
    from.fretGap !== to.fretGap ||
    !fretsEqual(fromFrets, toFrets)
  )
}

export function useAnimatedFretboard(
  shape: ChordShape,
  layout: DiagramLayoutInput & { padTop: number; padBottom: number },
  size: DiagramSize,
  transitionKey: number,
  enabled: boolean,
) {
  const { padTop, padBottom } = layout
  const targetMetrics = useMemo(
    () => buildDiagramMetrics(shape, layout, size),
    [shape, layout, size],
  )

  const liveMetricsRef = useRef(targetMetrics)
  const liveFretsRef = useRef(shape.frets)
  const prevTransitionKeyRef = useRef(transitionKey)
  const displayRef = useRef<FretboardDisplayState>(
    snapFretboard(targetMetrics, padTop, shape.frets),
  )
  const [display, setDisplay] = useState<FretboardDisplayState>(
    () => displayRef.current,
  )
  const commitDisplay = (next: FretboardDisplayState) => {
    if (displayUnchanged(displayRef.current, next)) return
    displayRef.current = next
    setDisplay(next)
  }

  useLayoutEffect(() => {
    const snap = () => {
      liveMetricsRef.current = targetMetrics
      liveFretsRef.current = shape.frets
      commitDisplay(snapFretboard(targetMetrics, padTop, shape.frets))
    }

    const keyChanged = transitionKey !== prevTransitionKeyRef.current
    prevTransitionKeyRef.current = transitionKey

    // Always snap on first render or chord change — keeps name and diagram in sync.
    // Only animate if the fretboard layout changed within the same chord (e.g. window resize).
    if (!enabled || transitionKey === 0 || keyChanged) {
      snap()
      return
    }

    const from = liveMetricsRef.current
    const to = targetMetrics
    const fromFrets = liveFretsRef.current
    const toFrets = shape.frets

    if (!boardNeedsAnimation(from, to, fromFrets, toFrets)) {
      liveMetricsRef.current = to
      liveFretsRef.current = toFrets
      return
    }

    let cancelled = false
    let rafId = 0
    const start = performance.now()

    const tick = (now: number) => {
      if (cancelled) return
      const raw = Math.min(1, (now - start) / FRETBOARD_ANIM_MS)
      liveMetricsRef.current = metricsAt(from, to, easeInOutSmooth(raw), padBottom)
      commitDisplay(
        interpolateFretboard(from, to, padTop, fromFrets, toFrets, raw),
      )
      if (raw < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        liveMetricsRef.current = to
        liveFretsRef.current = toFrets
        commitDisplay(snapFretboard(to, padTop, toFrets))
      }
    }

    commitDisplay(interpolateFretboard(from, to, padTop, fromFrets, toFrets, 0))
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    }
  }, [
    enabled,
    transitionKey,
    targetMetrics,
    shape.frets,
    padTop,
    padBottom,
  ])

  return { display, targetMetrics }
}

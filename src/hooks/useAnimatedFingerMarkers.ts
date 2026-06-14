import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChordShape } from '../data/chords'
import type { DiagramMetrics } from '../lib/chordLayout'
import { getFingerDotPositions } from '../lib/chordLayout'
import {
  buildFingerAnimations,
  groupFingerMarkers,
  type AnimatedFingerMarker,
  type FingerAnimationFrame,
  type FingerMarker,
} from '../lib/fingerMarkers'

function snapshotFromMarkers(markers: FingerMarker[]): Map<number, FingerMarker> {
  return new Map(markers.map((m) => [m.finger, m]))
}

function markersForShape(
  shape: ChordShape,
  metrics: DiagramMetrics,
  dotRadius: number,
  anchorGridTopY?: number,
): FingerMarker[] {
  return groupFingerMarkers(
    getFingerDotPositions(shape, metrics, anchorGridTopY),
    dotRadius,
  )
}

function mergeExitingMarkers(
  activeFingers: Set<number>,
  fromFrame: AnimatedFingerMarker[],
  persisted: AnimatedFingerMarker[],
): AnimatedFingerMarker[] {
  const exits = new Map<number, AnimatedFingerMarker>()
  for (const m of persisted) {
    if (!activeFingers.has(m.finger)) exits.set(m.finger, m)
  }
  for (const m of fromFrame) {
    if (!activeFingers.has(m.finger)) exits.set(m.finger, m)
  }
  return [...exits.values()]
}

export function useAnimatedFingerMarkers(
  shape: ChordShape,
  metrics: DiagramMetrics,
  dotRadius: number,
  transitionKey: number,
  enabled: boolean,
  anchorGridTopY?: number,
) {
  const slotsRef = useRef<Map<number, FingerMarker>>(new Map())
  const frameCacheRef = useRef<{
    key: number
    shape: ChordShape | null
    frame: FingerAnimationFrame | null
  }>({ key: -1, shape: null, frame: null })
  const metricsForFrameRef = useRef(metrics)
  const prevTransitionKeyRef = useRef(transitionKey)
  const [persistedExits, setPersistedExits] = useState<AnimatedFingerMarker[]>(
    [],
  )

  const frame = useMemo(() => {
    if (!enabled) return null

    // Cache is keyed on BOTH transitionKey and shape: the shape can change
    // without transitionKey (e.g. queue rebuild at mount), and a stale cache
    // would render the previous chord's fingers over the new diagram.
    if (
      frameCacheRef.current.key === transitionKey &&
      frameCacheRef.current.shape === shape
    ) {
      return frameCacheRef.current.frame
    }

    const keyChanged = transitionKey !== prevTransitionKeyRef.current
    const shapeChanged =
      frameCacheRef.current.shape !== null &&
      frameCacheRef.current.shape !== shape
    prevTransitionKeyRef.current = transitionKey

    metricsForFrameRef.current = metrics
    const current = markersForShape(
      shape,
      metricsForFrameRef.current,
      dotRadius,
      anchorGridTopY,
    )
    // Snap to new chord immediately on chord change — same logic as useAnimatedFretboard.
    // Animating fingers from old positions would briefly show the previous chord's shape.
    const inUse =
      transitionKey === 0 || keyChanged || shapeChanged
        ? null
        : [...slotsRef.current.values()]

    const result = buildFingerAnimations(
      inUse && inUse.length > 0 ? inUse : null,
      current,
    )

    slotsRef.current = snapshotFromMarkers(current)
    frameCacheRef.current = { key: transitionKey, shape, frame: result }
    return result
  }, [enabled, transitionKey, shape, dotRadius, anchorGridTopY, metrics])

  useEffect(() => {
    if (!enabled || !frame?.exiting.length) return
    setPersistedExits((prev) => {
      const merged = new Map(prev.map((m) => [m.finger, m]))
      for (const m of frame.exiting) {
        merged.set(m.finger, m)
      }
      const next = [...merged.values()]
      return next.length === prev.length ? prev : next
    })
  }, [enabled, transitionKey, frame])

  const handleExitComplete = useCallback((finger: number) => {
    slotsRef.current.delete(finger)
    setPersistedExits((prev) => prev.filter((m) => m.finger !== finger))
  }, [])

  const markers = useMemo(() => {
    if (!enabled || !frame) return null
    const activeFingers = new Set(frame.active.map((m) => m.finger))
    const exits = mergeExitingMarkers(
      activeFingers,
      frame.exiting,
      persistedExits,
    )
    return [...frame.active, ...exits]
  }, [enabled, frame, persistedExits])

  return { markers, handleExitComplete }
}

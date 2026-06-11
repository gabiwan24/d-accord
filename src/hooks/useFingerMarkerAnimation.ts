import { useLayoutEffect, useRef } from 'react'
import type { AnimatedFingerMarker } from '../lib/fingerMarkers'
import {
  animateInnerTransform,
  animatePulseGlow,
  animateTranslate,
  easeInOutSmooth,
  setGroupTranslate,
  STRETCH_EASING,
} from '../lib/svgMotion'

const MOVE_MS = 520
const STRETCH_MS = 460
const MORPH_MS = 520
const ENTER_MS = 520
const PULSE_MS = 680
const EXIT_MS = 420
const PULSE_GLOW_SCALE = 2.55
const PULSE_MARKER_SCALE = 1.28
const SNAP_EASING = 'cubic-bezier(0.9, 0, 0.1, 0.8)'

function getFromScaleX(marker: AnimatedFingerMarker): number {
  if (marker.type !== 'bar') return 1
  if (marker.fromWidth !== undefined && marker.fromWidth > 0) {
    return marker.fromWidth / marker.width
  }
  return marker.minScale
}

interface UseFingerMarkerAnimationOptions {
  marker: AnimatedFingerMarker
  transitionKey: number
  onExitComplete?: (finger: number) => void
}

export function useFingerMarkerAnimation({
  marker,
  transitionKey,
  onExitComplete,
}: UseFingerMarkerAnimationOptions) {
  const positionRef = useRef<SVGGElement>(null)
  const innerRef = useRef<SVGGElement>(null)
  const pulseGlowRef = useRef<SVGGElement>(null)
  const exitDoneRef = useRef(false)

  useLayoutEffect(() => {
    const posEl = positionRef.current
    const innerEl = innerRef.current
    const glowEl = pulseGlowRef.current
    if (!posEl || !innerEl || marker.anim === 'static') return

    if (marker.anim === 'exit') {
      exitDoneRef.current = false
    }

    if (glowEl) {
      glowEl.style.opacity = '0'
      glowEl.style.transform = 'scale(1)'
    }

    const x = marker.x
    const y = marker.y
    const fromX = marker.fromX ?? x
    const fromY = marker.fromY ?? y
    const fromScaleX = getFromScaleX(marker)

    const handles: { cancel: () => void; finished?: Promise<void> }[] = []

    const runInner = (
      keyframes: Keyframe[],
      durationMs: number,
      easing = STRETCH_EASING,
    ) => {
      const handle = animateInnerTransform(innerEl, keyframes, durationMs, easing)
      handles.push(handle)
      return handle
    }

    switch (marker.anim) {
      case 'move':
        innerEl.style.transform = ''
        setGroupTranslate(posEl, fromX, fromY)
        handles.push(
          animateTranslate(posEl, fromX, fromY, x, y, MOVE_MS),
        )
        break

      case 'morph':
        innerEl.style.transform = `scaleX(${fromScaleX})`
        setGroupTranslate(posEl, fromX, fromY)
        handles.push(
          animateTranslate(posEl, fromX, fromY, x, y, MORPH_MS, easeInOutSmooth),
        )
        runInner(
          [
            { transform: `scaleX(${fromScaleX})` },
            { transform: 'scaleX(1)' },
          ],
          MORPH_MS,
        )
        break

      case 'stretch':
        innerEl.style.transform = `scaleX(${fromScaleX})`
        setGroupTranslate(posEl, x, y)
        runInner(
          [
            { transform: `scaleX(${fromScaleX})` },
            { transform: 'scaleX(1)' },
          ],
          STRETCH_MS,
        )
        break

      case 'enter':
        innerEl.style.transform = 'scale(0)'
        setGroupTranslate(posEl, x, y)
        runInner(
          [{ transform: 'scale(0)' }, { transform: 'scale(1)' }],
          ENTER_MS,
          SNAP_EASING,
        )
        break

      case 'pulse':
        innerEl.style.transform = 'scale(1)'
        setGroupTranslate(posEl, x, y)
        runInner(
          [
            { transform: 'scale(1)' },
            { transform: `scale(${PULSE_MARKER_SCALE})` },
            { transform: 'scale(1)' },
          ],
          PULSE_MS * 0.62,
          'cubic-bezier(0.22, 1, 0.36, 1)',
        )
        if (glowEl) {
          handles.push(
            animatePulseGlow(glowEl, PULSE_MS, PULSE_GLOW_SCALE),
          )
        }
        break

      case 'exit': {
        setGroupTranslate(posEl, x, y)
        innerEl.style.transform = 'scale(1)'
        const exitHandle = runInner(
          [{ transform: 'scale(1)' }, { transform: 'scale(0)' }],
          EXIT_MS,
          STRETCH_EASING,
        )
        void exitHandle.finished.then(() => {
          if (exitDoneRef.current) return
          exitDoneRef.current = true
          onExitComplete?.(marker.finger)
        })
        break
      }

      default:
        innerEl.style.transform = ''
        setGroupTranslate(posEl, x, y)
        return
    }

    return () => {
      if (marker.anim !== 'exit') {
        handles.forEach((h) => h.cancel())
      }
    }
  }, [
    transitionKey,
    marker.finger,
    marker.anim,
    marker.x,
    marker.y,
    marker.fromX,
    marker.fromY,
    marker.fromWidth,
    marker.type === 'bar' ? marker.width : 0,
    marker.type === 'bar' ? marker.minScale : 0,
    onExitComplete,
  ])

  return { positionRef, innerRef, pulseGlowRef }
}

export { EXIT_MS }

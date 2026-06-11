/** Schnell für Einzelfinger-Bewegung */
const EASING = 'cubic-bezier(0.9, 0, 0.1, 0.8)'

/** Gleichmäßig für Barré-Stretch / Morph */
export const STRETCH_EASING = 'cubic-bezier(0.45, 0.05, 0.55, 0.95)'

export function setGroupTranslate(el: SVGGElement, x: number, y: number): void {
  el.setAttribute('transform', `translate(${x}, ${y})`)
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 2.8)
}

function easeInOutSmooth(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export interface MotionHandle {
  cancel: () => void
  finished: Promise<void>
}

export function animateTranslate(
  el: SVGGElement,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  durationMs: number,
  ease: (t: number) => number = easeOut,
): MotionHandle {
  let cancelled = false
  let rafId = 0
  const start = performance.now()

  setGroupTranslate(el, fromX, fromY)

  const finished = new Promise<void>((resolve) => {
    const tick = (now: number) => {
      if (cancelled) {
        resolve()
        return
      }
      const t = Math.min(1, (now - start) / durationMs)
      const e = ease(t)
      setGroupTranslate(
        el,
        fromX + (toX - fromX) * e,
        fromY + (toY - fromY) * e,
      )
      if (t < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        setGroupTranslate(el, toX, toY)
        resolve()
      }
    }
    rafId = requestAnimationFrame(tick)
  })

  return {
    cancel: () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    },
    finished,
  }
}

export function animateInnerTransform(
  el: SVGGElement,
  keyframes: Keyframe[],
  durationMs: number,
  easing = EASING,
): MotionHandle {
  el.style.transformBox = 'fill-box'
  el.style.transformOrigin = 'center'

  const animation = el.animate(keyframes, {
    duration: durationMs,
    easing,
    fill: 'forwards',
  })

  return {
    cancel: () => animation.cancel(),
    finished: animation.finished.then(() => undefined),
  }
}

const PULSE_GLOW_EASING = 'cubic-bezier(0.22, 0.85, 0.25, 1)'

/** Deutlicher Puls: Glow skaliert stark und fadet aus */
export function animatePulseGlow(
  el: SVGGElement,
  durationMs: number,
  maxScale = 2.55,
): MotionHandle {
  el.style.transformBox = 'fill-box'
  el.style.transformOrigin = 'center'
  el.style.pointerEvents = 'none'
  el.style.transform = 'scale(1)'
  el.style.opacity = '0.92'

  const animation = el.animate(
    [
      { transform: 'scale(0.85)', opacity: 0.92 },
      { transform: `scale(${maxScale})`, opacity: 0 },
    ],
    {
      duration: durationMs,
      easing: PULSE_GLOW_EASING,
      fill: 'forwards',
    },
  )

  void animation.finished.then(() => {
    el.style.opacity = '0'
    el.style.transform = 'scale(1)'
  })

  return {
    cancel: () => animation.cancel(),
    finished: animation.finished.then(() => undefined),
  }
}

export function animateOpacity(
  el: HTMLElement | SVGElement,
  from: number,
  to: number,
  durationMs: number,
  ease: (t: number) => number = easeInOutSmooth,
): MotionHandle {
  let cancelled = false
  let rafId = 0
  const start = performance.now()
  el.style.opacity = String(from)

  const finished = new Promise<void>((resolve) => {
    const tick = (now: number) => {
      if (cancelled) {
        resolve()
        return
      }
      const t = Math.min(1, (now - start) / durationMs)
      const e = ease(t)
      el.style.opacity = String(from + (to - from) * e)
      if (t < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        el.style.opacity = String(to)
        resolve()
      }
    }
    rafId = requestAnimationFrame(tick)
  })

  return {
    cancel: () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    },
    finished,
  }
}

export { EASING, easeInOutSmooth, easeOut }

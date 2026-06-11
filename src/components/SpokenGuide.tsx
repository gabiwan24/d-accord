import { useLayoutEffect, useRef } from 'react'
import { FRETBOARD_ANIM_MS } from '../hooks/useAnimatedFretboard'
import { animateOpacity, easeInOutSmooth } from '../lib/svgMotion'

interface SpokenGuideProps {
  text: string
  transitionKey: number
}

export function SpokenGuide({ text, transitionKey }: SpokenGuideProps) {
  const ref = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || transitionKey === 0) return

    const handle = animateOpacity(el, 0, 1, FRETBOARD_ANIM_MS, easeInOutSmooth)
    return () => handle.cancel()
  }, [transitionKey, text])

  return (
    <p
      ref={ref}
      className="mt-3 text-center text-xs leading-snug text-muted"
    >
      {text}
    </p>
  )
}

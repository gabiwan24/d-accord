import { useLayoutEffect, useRef } from 'react'
import type { AccentColor } from '../data/chords'
import { FRETBOARD_ANIM_MS } from '../hooks/useAnimatedFretboard'
import { animateOpacity, easeInOutSmooth } from '../lib/svgMotion'

const ACCENT_CLASS: Record<AccentColor, string> = {
  pink: 'bg-accent-pink',
  grey: 'bg-accent-grey',
  purple: 'bg-accent-purple',
  mint: 'bg-accent-mint',
  peach: 'bg-accent-peach',
  blue: 'bg-accent-blue',
  sage: 'bg-accent-sage',
  lavender: 'bg-accent-lavender',
  coral: 'bg-accent-coral',
}

export type ChordLabelSize = 'lg' | 'sm' | 'xs'

const NAME_SIZE: Record<ChordLabelSize, string> = {
  lg: 'text-[2.6rem] leading-none',
  sm: 'text-sm',
  xs: 'text-[10px] leading-tight',
}

interface ChordLabelProps {
  name: string
  accent: AccentColor
  size?: ChordLabelSize
  pulse?: boolean
  contentWidth?: number
  transitionKey?: number
}

export function ChordLabel({
  name,
  accent,
  size = 'sm',
  pulse = false,
  contentWidth,
  transitionKey = 0,
}: ChordLabelProps) {
  const accentClass = ACCENT_CLASS[accent]
  const blockRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = blockRef.current
    if (!el || transitionKey === 0) return

    const handle = animateOpacity(el, 0, 1, FRETBOARD_ANIM_MS, easeInOutSmooth)
    return () => handle.cancel()
  }, [transitionKey, name, accent])

  return (
    <div
      ref={blockRef}
      className="flex w-full flex-col items-center"
      style={contentWidth ? { width: contentWidth } : undefined}
    >
      <div
        className={`${size === 'lg' ? 'h-1' : 'h-0.5'} w-[80%] ${accentClass} ${pulse ? 'accent-pulse' : ''}`}
      />
      <span className={`mt-3 font-normal text-ink ${NAME_SIZE[size]}`}>
        {name}
      </span>
    </div>
  )
}

export function getChordLabelBlockHeight(size: ChordLabelSize): number {
  return size === 'lg' ? 72 : size === 'sm' ? 36 : 24
}

import { useRef } from 'react'
import { DISPLAY_CENTS_CLAMP, IN_TUNE_CENTS } from '../../lib/tunerEngine'

const DEAD_ZONE_CENTS = 2

interface CentGaugeProps {
  cents: number
  inTune: boolean
  hasSignal: boolean
}

export function CentGauge({ cents, inTune, hasSignal }: CentGaugeProps) {
  const lastDisplayedRef = useRef<number>(0)

  const clamped = Math.max(
    -DISPLAY_CENTS_CLAMP,
    Math.min(DISPLAY_CENTS_CLAMP, cents),
  )

  // Display dead zone: needle only moves when change >= 2 cents
  if (!hasSignal) {
    lastDisplayedRef.current = 0
  } else if (Math.abs(clamped - lastDisplayedRef.current) >= DEAD_ZONE_CENTS) {
    lastDisplayedRef.current = clamped
  }

  const displayed = hasSignal ? lastDisplayedRef.current : 0
  const position = ((displayed + DISPLAY_CENTS_CLAMP) / (DISPLAY_CENTS_CLAMP * 2)) * 100

  const roundedCents = Math.round(cents)
  const centLabel = !hasSignal
    ? '—'
    : roundedCents === 0
      ? '0 ct'
      : `${roundedCents > 0 ? '+' : ''}${roundedCents} ct`

  const directionLabel =
    !hasSignal || inTune
      ? ''
      : cents > IN_TUNE_CENTS
        ? 'zu hoch'
        : 'zu tief'

  return (
    <div className="w-full max-w-xs">
      {/* Balken */}
      <div className="relative h-4 overflow-hidden rounded-full bg-ink/10">
        {/* In-Tune-Zone */}
        <div
          className="absolute inset-y-0 rounded-full bg-success/25"
          style={{
            left: `${((-IN_TUNE_CENTS + DISPLAY_CENTS_CLAMP) / (DISPLAY_CENTS_CLAMP * 2)) * 100}%`,
            width: `${((IN_TUNE_CENTS * 2) / (DISPLAY_CENTS_CLAMP * 2)) * 100}%`,
          }}
        />
        {/* Nadel */}
        <div
          className={`absolute top-1/2 h-6 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left,background-color] duration-150 ${
            inTune && hasSignal ? 'bg-success' : 'bg-ink'
          }`}
          style={{
            left: hasSignal ? `${position}%` : '50%',
            opacity: hasSignal ? 1 : 0.25,
          }}
        />
      </div>

      {/* ±50-Labels */}
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>−{DISPLAY_CENTS_CLAMP}</span>
        <span className={inTune && hasSignal ? 'text-success' : ''}>0</span>
        <span>+{DISPLAY_CENTS_CLAMP}</span>
      </div>

      {/* Große Cent-Zahl */}
      <div className="mt-2 text-center">
        <p
          className={`text-2xl tabular-nums leading-none ${
            !hasSignal
              ? 'text-muted/40'
              : inTune
                ? 'text-success'
                : 'text-ink'
          }`}
        >
          {centLabel}
        </p>
      </div>

      {/* Richtungshinweis */}
      <div className="mt-1 min-h-[1rem] text-center">
        <p className="text-xs text-muted">{directionLabel}</p>
      </div>
    </div>
  )
}

import { DISPLAY_CENTS_CLAMP } from '../../lib/tunerEngine'

interface CentGaugeProps {
  cents: number
  inTune: boolean
  hasSignal: boolean
}

export function CentGauge({ cents, inTune, hasSignal }: CentGaugeProps) {
  const clamped = Math.max(
    -DISPLAY_CENTS_CLAMP,
    Math.min(DISPLAY_CENTS_CLAMP, cents),
  )
  const position = ((clamped + DISPLAY_CENTS_CLAMP) / (DISPLAY_CENTS_CLAMP * 2)) * 100

  return (
    <div className="w-full max-w-xs">
      <div className="relative h-3 overflow-hidden rounded-full bg-ink/10">
        <div
          className="absolute inset-y-0 rounded-full bg-success/25"
          style={{
            left: `${((-5 + DISPLAY_CENTS_CLAMP) / (DISPLAY_CENTS_CLAMP * 2)) * 100}%`,
            width: `${(10 / (DISPLAY_CENTS_CLAMP * 2)) * 100}%`,
          }}
        />
        <div
          className={`absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left,background-color] duration-150 ${
            inTune && hasSignal ? 'bg-success' : 'bg-ink'
          }`}
          style={{
            left: hasSignal ? `${position}%` : '50%',
            opacity: hasSignal ? 1 : 0.25,
          }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted">
        <span>−{DISPLAY_CENTS_CLAMP}</span>
        <span className={inTune && hasSignal ? 'text-success' : ''}>0</span>
        <span>+{DISPLAY_CENTS_CLAMP}</span>
      </div>
    </div>
  )
}

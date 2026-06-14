import { useEffect, useRef } from 'react'
import {
  DISPLAY_CENTS_CLAMP,
  IN_TUNE_CENTS,
  type StringTarget,
} from '../../lib/tunerEngine'

interface TunerMeterProps {
  targets: StringTarget[]
  /** Currently detected/active string, or -1 */
  activeIndex: number
  /** Signed cents of the active string (positive = too high) */
  cents: number
  inTune: boolean
  hasSignal: boolean
  tunedStrings: Set<number>
  /** Manually selected string (highlight), or null */
  selectedIndex: number | null
  onSelectString: (index: number) => void
}

// Internal canvas resolution; scaled to container width via CSS.
const W = 480
const H = 240
const LABEL_H = 52
const METER_TOP = 14
const METER_BOTTOM = H - LABEL_H
const CENTER_Y = (METER_TOP + METER_BOTTOM) / 2
const MAX_BAR = (METER_BOTTOM - METER_TOP) / 2 - 12

const CREAM = '245,240,232'
const SUCCESS = '106,171,106'
const AMBER = '232,168,92'

export function TunerMeter(props: TunerMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef(props)
  stateRef.current = props
  const dispCentsRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0

    const draw = () => {
      const s = stateRef.current
      const colW = W / s.targets.length
      const inTuneHalf = (IN_TUNE_CENTS / DISPLAY_CENTS_CLAMP) * MAX_BAR

      // Ease the needle toward the live value to damp jitter.
      const targetCents = s.hasSignal
        ? Math.max(-DISPLAY_CENTS_CLAMP, Math.min(DISPLAY_CENTS_CLAMP, s.cents))
        : 0
      dispCentsRef.current += (targetCents - dispCentsRef.current) * 0.25
      const dispCents = dispCentsRef.current

      ctx.clearRect(0, 0, W, H)

      // Column dividers
      ctx.lineWidth = 1
      ctx.strokeStyle = `rgba(${CREAM},0.10)`
      for (let i = 1; i < s.targets.length; i++) {
        ctx.beginPath()
        ctx.moveTo(i * colW, METER_TOP)
        ctx.lineTo(i * colW, METER_BOTTOM)
        ctx.stroke()
      }

      // Center reference line (= in tune)
      ctx.lineWidth = 2
      ctx.strokeStyle = `rgba(${CREAM},0.22)`
      ctx.beginPath()
      ctx.moveTo(0, CENTER_Y)
      ctx.lineTo(W, CENTER_Y)
      ctx.stroke()

      for (let i = 0; i < s.targets.length; i++) {
        const t = s.targets[i]
        const cx = i * colW + colW / 2
        const isActive = i === s.activeIndex && s.hasSignal
        const isTuned = s.tunedStrings.has(i)
        const isSelected = s.selectedIndex === i

        // Manual-selection highlight
        if (isSelected) {
          ctx.fillStyle = `rgba(${CREAM},0.06)`
          ctx.fillRect(i * colW, 0, colW, H)
        }

        // In-tune target window (green band) on the active column
        if (isActive) {
          ctx.fillStyle = `rgba(${SUCCESS},0.14)`
          ctx.fillRect(
            i * colW + 4,
            CENTER_Y - inTuneHalf,
            colW - 8,
            inTuneHalf * 2,
          )
        }

        // Center tick for the column
        ctx.lineWidth = 2
        ctx.strokeStyle = isTuned
          ? `rgba(${SUCCESS},0.6)`
          : `rgba(${CREAM},0.3)`
        ctx.beginPath()
        ctx.moveTo(cx - colW * 0.22, CENTER_Y)
        ctx.lineTo(cx + colW * 0.22, CENTER_Y)
        ctx.stroke()

        // Deviation bar (active string only)
        if (isActive) {
          const devPx = (dispCents / DISPLAY_CENTS_CLAMP) * MAX_BAR
          const barW = colW * 0.36
          const top = Math.min(CENTER_Y, CENTER_Y - devPx)
          const height = Math.max(2, Math.abs(devPx))
          const col = s.inTune ? SUCCESS : AMBER
          ctx.fillStyle = `rgba(${col},0.5)`
          ctx.fillRect(cx - barW / 2, top, barW, height)
          // Tip marker
          ctx.fillStyle = `rgba(${col},0.95)`
          ctx.fillRect(cx - barW * 0.7, CENTER_Y - devPx - 1.5, barW * 1.4, 3)
        }

        // Tuned check at top
        if (isTuned) {
          ctx.fillStyle = `rgba(${SUCCESS},0.9)`
          ctx.font = '600 18px ui-sans-serif, system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('✓', cx, METER_TOP + 10)
        }

        // String name (big)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.font = '600 34px ui-sans-serif, system-ui, sans-serif'
        ctx.fillStyle = isTuned
          ? `rgba(${SUCCESS},0.95)`
          : isActive
            ? `rgba(${CREAM},0.95)`
            : `rgba(${CREAM},0.4)`
        ctx.fillText(t.name, cx, METER_BOTTOM + 20)

        // Note label (small, e.g. G4)
        ctx.font = '13px ui-monospace, monospace'
        ctx.fillStyle = isTuned ? `rgba(${SUCCESS},0.7)` : `rgba(${CREAM},0.4)`
        ctx.fillText(t.label, cx, METER_BOTTOM + 42)
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const frac = (e.clientX - rect.left) / rect.width
    const n = props.targets.length
    const col = Math.max(0, Math.min(n - 1, Math.floor(frac * n)))
    props.onSelectString(col)
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-ink/90 p-3 shadow-sm ring-1 ring-ink/10">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onClick={handleClick}
        aria-hidden
        className="block w-full cursor-pointer"
      />
    </div>
  )
}

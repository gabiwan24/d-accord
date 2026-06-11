import type { NotePosition } from '../lib/notePositions'
import { TUNINGS, type TuningId } from '../data/tunings'

export type FretboardSize = 'sm' | 'lg' | 'xs'

const SIZE_MAP: Record<FretboardSize, { width: number; fretCount: number }> = {
  xs: { width: 88, fretCount: 12 },
  sm: { width: 160, fretCount: 12 },
  lg: { width: 280, fretCount: 12 },
}

interface FretboardDiagramProps {
  tuningId: TuningId
  positions: NotePosition[]
  size?: FretboardSize
}

export function FretboardDiagram({
  tuningId,
  positions,
  size = 'sm',
}: FretboardDiagramProps) {
  const { width, fretCount } = SIZE_MAP[size]
  const paddingLeft = size === 'lg' ? 20 : size === 'xs' ? 8 : 12
  const paddingTop = size === 'lg' ? 20 : size === 'xs' ? 8 : 12
  const paddingRight = size === 'lg' ? 12 : size === 'xs' ? 6 : 8
  const paddingBottom = size === 'lg' ? 16 : size === 'xs' ? 8 : 10
  const stringCount = 4
  const innerWidth = width - paddingLeft - paddingRight
  const innerHeight = innerWidth * 1.35
  const height = innerHeight + paddingTop + paddingBottom
  const stringGap = innerWidth / (stringCount - 1)
  const fretGap = innerHeight / fretCount

  const nutY = paddingTop
  const stringX = (i: number) => paddingLeft + i * stringGap
  const dotRadius = size === 'lg' ? 7 : size === 'sm' ? 5 : 4
  const stroke = size === 'lg' ? 1.5 : 1
  const nutStroke = size === 'lg' ? 3 : 2
  const fontSize = size === 'lg' ? 9 : size === 'sm' ? 7 : 6

  const strings = TUNINGS[tuningId].strings
  const positionSet = new Set(
    positions.map((p) => `${p.stringIndex}-${p.fret}`),
  )

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
      className="block max-w-full"
    >
      {/* Saiten-Labels */}
      {strings.map((s, i) => (
        <text
          key={`sl-${i}`}
          x={stringX(i)}
          y={nutY - 6}
          textAnchor="middle"
          fontSize={fontSize}
          fill="currentColor"
        >
          {s.name}
        </text>
      ))}

      {/* Sattel */}
      <line
        x1={paddingLeft}
        y1={nutY}
        x2={paddingLeft + innerWidth}
        y2={nutY}
        stroke="currentColor"
        strokeWidth={nutStroke}
      />

      {/* Bünde */}
      {Array.from({ length: fretCount }, (_, i) => (
        <line
          key={`f-${i}`}
          x1={paddingLeft}
          y1={nutY + (i + 1) * fretGap}
          x2={paddingLeft + innerWidth}
          y2={nutY + (i + 1) * fretGap}
          stroke="currentColor"
          strokeWidth={stroke}
        />
      ))}

      {/* Bund-Nummern (3, 5, 7, 9, 12) */}
      {[3, 5, 7, 9, 12].map((fretNum) => (
        <text
          key={`fn-${fretNum}`}
          x={paddingLeft - 4}
          y={nutY + (fretNum - 0.5) * fretGap}
          textAnchor="end"
          fontSize={fontSize - 1}
          fill="currentColor"
          opacity={0.6}
        >
          {fretNum}
        </text>
      ))}

      {/* Saiten */}
      {Array.from({ length: stringCount }, (_, i) => (
        <line
          key={`s-${i}`}
          x1={stringX(i)}
          y1={nutY}
          x2={stringX(i)}
          y2={nutY + fretCount * fretGap}
          stroke="currentColor"
          strokeWidth={stroke}
        />
      ))}

      {/* Open-string markers + fretted positions */}
      {positions.map((p) => {
        if (p.fret === 0) {
          return (
            <text
              key={`p-${p.stringIndex}-${p.fret}`}
              x={stringX(p.stringIndex)}
              y={nutY - 2}
              textAnchor="middle"
              fontSize={fontSize + 1}
              fill="currentColor"
            >
              ○
            </text>
          )
        }
        const cy = nutY + (p.fret - 0.5) * fretGap
        return (
          <circle
            key={`p-${p.stringIndex}-${p.fret}`}
            cx={stringX(p.stringIndex)}
            cy={cy}
            r={dotRadius}
            fill="currentColor"
          />
        )
      })}

      {/* Highlight wenn keine Position (sollte nicht vorkommen) */}
      {positionSet.size === 0 && (
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fontSize={fontSize}
          fill="currentColor"
        >
          —
        </text>
      )}
    </svg>
  )
}

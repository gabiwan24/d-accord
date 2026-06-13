import type { AccentColor, ChordShape } from '../data/chords'
import {
  ChordDiagram,
  getDiagramContentWidth,
  getDiagramFrameSize,
  type DiagramSize,
} from './ChordDiagram'
import { ChordLabel } from './ChordLabel'

interface ChordCardProps {
  name: string
  shape: ChordShape
  transitionKey?: number
  accent: AccentColor
  size?: DiagramSize
  pulse?: boolean
  onPlay?: () => void
  animateFingers?: boolean
  showLabel?: boolean
  correctStringIndices?: Set<number> | null
}

export function ChordCard({
  name,
  shape,
  transitionKey = 0,
  accent,
  size = 'sm',
  pulse = false,
  onPlay,
  animateFingers = false,
  showLabel = true,
  correctStringIndices,
}: ChordCardProps) {
  const contentWidth = getDiagramContentWidth(size)

  const diagram = (
    <ChordDiagram
      shape={shape}
      transitionKey={transitionKey}
      size={size}
      animateFingers={animateFingers}
      correctStringIndices={correctStringIndices}
    />
  )

  const label = showLabel ? (
    <ChordLabel
      name={name}
      accent={accent}
      size={size}
      pulse={pulse}
      contentWidth={contentWidth}
      transitionKey={transitionKey}
    />
  ) : null

  const content = (
    <div
      className="flex flex-col items-center overflow-visible"
      style={{ width: contentWidth }}
    >
      {diagram}
      {label}
    </div>
  )

  if (onPlay) {
    return (
      <button
        type="button"
        onClick={onPlay}
        aria-label={`${name} abspielen`}
        className="cursor-pointer border-0 bg-transparent p-0 active:opacity-70"
      >
        {content}
      </button>
    )
  }

  return content
}

/** Nur Diagramm-Slot-Höhe (ohne Akkordname) — für Abwärtskompatibilität */
export function getPracticeDiagramSlotHeight(): number {
  return getDiagramFrameSize('lg').height
}

import type { AnimatedFingerMarker } from '../lib/fingerMarkers'
import { useFingerMarkerAnimation } from '../hooks/useFingerMarkerAnimation'
import { getFingerColor } from '../lib/fingerColors'

interface FingerMarkerGraphicProps {
  marker: AnimatedFingerMarker
  transitionKey: number
  dotRadius: number
  dotStroke: number
  fingerFontSize: number
  labelYOffset: number
  glowFilterId: string
  onExitComplete?: (finger: number) => void
}

function PulseGlowShape({
  marker,
  dotRadius,
  fill,
  filterId,
}: {
  marker: AnimatedFingerMarker
  dotRadius: number
  fill: string
  filterId: string
}) {
  const filter = `url(#${filterId})`

  if (marker.type === 'bar') {
    return (
      <rect
        x={-marker.width / 2}
        y={-dotRadius}
        width={marker.width}
        height={dotRadius * 2}
        rx={dotRadius}
        ry={dotRadius}
        fill={fill}
        filter={filter}
      />
    )
  }

  return (
    <circle cx={0} cy={0} r={dotRadius} fill={fill} filter={filter} />
  )
}

function MarkerShape({
  marker,
  dotRadius,
  dotStroke,
  fingerFontSize,
  labelYOffset,
  colors,
}: {
  marker: AnimatedFingerMarker
  dotRadius: number
  dotStroke: number
  fingerFontSize: number
  labelYOffset: number
  colors: ReturnType<typeof getFingerColor>
}) {
  const labels = marker.type === 'bar' ? marker.labelOffsets : [0]

  return (
    <>
      {marker.type === 'bar' ? (
        <rect
          x={-marker.width / 2}
          y={-dotRadius}
          width={marker.width}
          height={dotRadius * 2}
          rx={dotRadius}
          ry={dotRadius}
          fill={colors.fill}
          stroke="var(--color-ink)"
          strokeOpacity={0.14}
          strokeWidth={dotStroke}
        />
      ) : (
        <circle
          cx={0}
          cy={0}
          r={dotRadius}
          fill={colors.fill}
          stroke="var(--color-ink)"
          strokeOpacity={0.14}
          strokeWidth={dotStroke}
        />
      )}
      {labels.map((offset, i) => (
        <text
          key={i}
          x={offset}
          y={labelYOffset}
          dominantBaseline="central"
          textAnchor="middle"
          className="chord-finger-label"
          fontSize={fingerFontSize}
          fontWeight={600}
          fill={colors.label}
        >
          {marker.finger}
        </text>
      ))}
    </>
  )
}

export function FingerMarkerGraphic({
  marker,
  transitionKey,
  dotRadius,
  dotStroke,
  fingerFontSize,
  labelYOffset,
  glowFilterId,
  onExitComplete,
}: FingerMarkerGraphicProps) {
  const colors = getFingerColor(marker.finger)
  const { positionRef, innerRef, pulseGlowRef } = useFingerMarkerAnimation({
    marker,
    transitionKey,
    onExitComplete,
  })

  const initialX =
    marker.anim === 'move' || marker.anim === 'morph'
      ? (marker.fromX ?? marker.x)
      : marker.x
  const initialY =
    marker.anim === 'move' || marker.anim === 'morph'
      ? (marker.fromY ?? marker.y)
      : marker.y

  return (
    <g
      ref={positionRef}
      transform={`translate(${initialX}, ${initialY})`}
    >
      <g ref={pulseGlowRef} className="finger-pulse-glow" aria-hidden>
        <PulseGlowShape
          marker={marker}
          dotRadius={dotRadius}
          fill={colors.fill}
          filterId={glowFilterId}
        />
      </g>
      <g ref={innerRef}>
        <MarkerShape
          marker={marker}
          dotRadius={dotRadius}
          dotStroke={dotStroke}
          fingerFontSize={fingerFontSize}
          labelYOffset={labelYOffset}
          colors={colors}
        />
      </g>
    </g>
  )
}

export function StaticFingerMarkerGraphic({
  marker,
  dotRadius,
  dotStroke,
  fingerFontSize,
  labelYOffset,
}: Omit<FingerMarkerGraphicProps, 'transitionKey' | 'onExitComplete' | 'glowFilterId'>) {
  const colors = getFingerColor(marker.finger)

  return (
    <g transform={`translate(${marker.x}, ${marker.y})`}>
      <MarkerShape
        marker={marker}
        dotRadius={dotRadius}
        dotStroke={dotStroke}
        fingerFontSize={fingerFontSize}
        labelYOffset={labelYOffset}
        colors={colors}
      />
    </g>
  )
}

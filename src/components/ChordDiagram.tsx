import { useMemo } from 'react'
import type { ChordShape } from '../data/chords'
import {
  BASE_FRET_COUNT,
  buildDiagramMetrics,
  getFingerDotPositions,
  getMaxDiagramSvgHeight,
  type DiagramSize,
} from '../lib/chordLayout'
import { groupFingerMarkers } from '../lib/fingerMarkers'
import { useAnimatedFingerMarkers } from '../hooks/useAnimatedFingerMarkers'
import {
  snapFretboard,
  useAnimatedFretboard,
  type FretboardDisplayState,
} from '../hooks/useAnimatedFretboard'
import {
  FingerMarkerGraphic,
  StaticFingerMarkerGraphic,
} from './FingerMarkerGraphic'

export type { DiagramSize }

export interface DiagramOverflow {
  top: number
  right: number
  bottom: number
  left: number
}

interface DiagramLayout {
  width: number
  height: number
  padTop: number
  padSide: number
  padBottom: number
  innerWidth: number
  baseInnerHeight: number
  dotRadius: number
  dotStroke: number
  openNutGap: number
  stroke: number
  nutStroke: number
  fontSize: number
  fingerFontSize: number
  fretLabelFontSize: number
  labelYOffset: number
  overflow: DiagramOverflow
}

function getFretLabelX(
  size: DiagramSize,
  padSide: number,
  dotRadius: number,
): number {
  const gap = size === 'lg' ? 40 : size === 'sm' ? 20 : 14
  return padSide - dotRadius - gap
}

function getDiagramOverflow(size: DiagramSize, dotRadius: number): DiagramOverflow {
  const glow = Math.ceil(dotRadius * 2.55 + dotRadius * 0.62 * 4)
  const bar = size === 'lg' ? 12 : size === 'sm' ? 6 : 5
  const labelCol = size === 'lg' ? 44 : size === 'sm' ? 22 : 16
  return {
    top: glow + (size === 'lg' ? 6 : 3),
    right: glow + bar,
    bottom: glow + bar,
    left: glow + labelCol,
  }
}

function viewportSize(
  layout: DiagramLayout,
  contentHeight: number,
): { width: number; height: number } {
  const { overflow } = layout
  return {
    width: layout.width + overflow.left + overflow.right,
    height: contentHeight + overflow.top + overflow.bottom,
  }
}

function getDiagramLayout(size: DiagramSize): DiagramLayout {
  const dotRadius = size === 'lg' ? 13 : size === 'sm' ? 6 : 5
  const dotStroke = size === 'lg' ? 1.5 : 1
  const dotExtent = dotRadius + dotStroke
  const openNutGap = size === 'lg' ? 7 : 4
  const width = size === 'lg' ? 280 : size === 'sm' ? 96 : 64

  const padSide = dotExtent + (size === 'lg' ? 4 : 2)
  const padBottom = dotExtent + (size === 'lg' ? 4 : 2)
  const padTop = openNutGap + dotExtent * 2 + (size === 'lg' ? 3 : 2)

  const innerWidth = width - padSide * 2
  const baseInnerHeight = innerWidth * 1.1
  const overflow = getDiagramOverflow(size, dotRadius)
  const height = baseInnerHeight + padTop + padBottom

  return {
    width,
    height,
    padTop,
    padSide,
    padBottom,
    innerWidth,
    baseInnerHeight,
    dotRadius,
    dotStroke,
    openNutGap,
    stroke: size === 'lg' ? 2 : 1,
    nutStroke: size === 'lg' ? 4 : 2,
    fontSize: size === 'lg' ? 15 : size === 'sm' ? 8 : 7,
    fingerFontSize: size === 'lg' ? 13 : size === 'sm' ? 7 : 6,
    fretLabelFontSize: size === 'lg' ? 14 : size === 'sm' ? 7 : 6,
    labelYOffset: size === 'lg' ? -0.75 : size === 'sm' ? -0.4 : -0.25,
    overflow,
  }
}

export function getDiagramContentWidth(size: DiagramSize): number {
  return getDiagramLayout(size).width
}

export function getDiagramFrameSize(
  size: DiagramSize,
  shape?: ChordShape,
): { width: number; height: number } {
  const layout = getDiagramLayout(size)
  if (!shape) {
    return viewportSize(layout, layout.height)
  }
  const metrics = buildDiagramMetrics(shape, layout, size)
  return viewportSize(layout, metrics.svgHeight)
}

export function getDiagramMaxFrameSize(size: DiagramSize): {
  width: number
  height: number
} {
  const layout = getDiagramLayout(size)
  return viewportSize(layout, getMaxDiagramSvgHeight(layout))
}

interface ChordDiagramProps {
  shape: ChordShape
  transitionKey?: number
  size?: DiagramSize
  animateFingers?: boolean
}

export function ChordDiagram({
  shape,
  transitionKey = 0,
  size = 'sm',
  animateFingers = false,
}: ChordDiagramProps) {
  const layout = useMemo(() => getDiagramLayout(size), [size])
  const {
    width: contentWidth,
    padTop,
    padSide,
    padBottom,
    innerWidth,
    dotRadius,
    dotStroke,
    openNutGap,
    stroke,
    nutStroke,
    fingerFontSize,
    fretLabelFontSize,
    labelYOffset,
  } = layout

  const stringCount = 4

  const staticMetrics = useMemo(
    () => buildDiagramMetrics(shape, layout, size),
    [shape, layout, size],
  )

  const { display: animatedDisplay, targetMetrics } = useAnimatedFretboard(
    shape,
    layout,
    size,
    transitionKey,
    animateFingers,
  )

  const metrics = animateFingers ? targetMetrics : staticMetrics

  const display: FretboardDisplayState = animateFingers
    ? animatedDisplay
    : snapFretboard(staticMetrics, padTop, shape.frets)

  const stringX = (i: number) => padSide + i * metrics.stringGap
  const fretLabelX = getFretLabelX(size, padSide, dotRadius)
  const openCircleY = padTop - openNutGap - dotRadius - dotStroke / 2
  const fingerAnchorY = animateFingers ? padTop : undefined

  const fingerMarkers = useMemo(() => {
    const dots = getFingerDotPositions(shape, metrics, fingerAnchorY)
    return groupFingerMarkers(dots, dotRadius)
  }, [shape, metrics, dotRadius, fingerAnchorY])

  const { markers: animatedMarkers, handleExitComplete } =
    useAnimatedFingerMarkers(
      shape,
      metrics,
      dotRadius,
      transitionKey,
      animateFingers,
      fingerAnchorY,
    )

  const glowFilterId = `finger-pulse-glow-${size}`
  const glowBlur = dotRadius * 0.62
  const { overflow } = layout

  const contentHeight = animateFingers
    ? display.stringBottomY + padBottom
    : staticMetrics.svgHeight

  const viewport = viewportSize(layout, contentHeight)
  const viewBox = `${-overflow.left} ${-overflow.top} ${viewport.width} ${viewport.height}`

  return (
    <div
      className="relative overflow-visible"
      style={{ width: contentWidth }}
    >
      <svg
        viewBox={viewBox}
        width={viewport.width}
        height={viewport.height}
        aria-hidden
        overflow="visible"
        className="block shrink-0 overflow-visible"
        style={{ marginLeft: -overflow.left }}
      >
        <defs>
          <filter
            id={glowFilterId}
            x="-120%"
            y="-120%"
            width="340%"
            height="340%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation={glowBlur} />
          </filter>
        </defs>

        <line
          x1={padSide}
          y1={padTop}
          x2={padSide + innerWidth}
          y2={padTop}
          stroke="currentColor"
          strokeWidth={nutStroke}
        />

        {display.openStrings.map(({ stringIndex, openOpacity, mutedOpacity }) => (
          <g key={`open-slot-${stringIndex}`}>
            {openOpacity > 0.01 && (
              <circle
                cx={stringX(stringIndex)}
                cy={openCircleY}
                r={dotRadius}
                fill="none"
                stroke="var(--color-ink)"
                strokeWidth={dotStroke}
                opacity={openOpacity}
              />
            )}
            {mutedOpacity > 0.01 && (
              <g opacity={mutedOpacity}>
                <circle
                  cx={stringX(stringIndex)}
                  cy={openCircleY}
                  r={dotRadius}
                  fill="none"
                  stroke="var(--color-ink)"
                  strokeWidth={dotStroke}
                />
                <text
                  x={stringX(stringIndex)}
                  y={openCircleY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={layout.fontSize}
                  fill="currentColor"
                >
                  ×
                </text>
              </g>
            )}
          </g>
        ))}

        {display.fretLabels.map(({ fretNumber, y, opacity }) =>
          opacity > 0.01 ? (
            <text
              key={`fret-label-${fretNumber}`}
              x={fretLabelX}
              y={y}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={fretLabelFontSize}
              fill="currentColor"
              opacity={opacity}
            >
              {fretNumber}
            </text>
          ) : null,
        )}

        <g>
          {display.fretLines.map(({ fretNumber, y, opacity }) =>
            opacity > 0.01 ? (
              <line
                key={`fret-${fretNumber}`}
                x1={padSide}
                y1={y}
                x2={padSide + innerWidth}
                y2={y}
                stroke="currentColor"
                strokeWidth={stroke}
                opacity={opacity}
              />
            ) : null,
          )}

          {Array.from({ length: stringCount }, (_, i) => (
            <line
              key={i}
              x1={stringX(i)}
              y1={padTop}
              x2={stringX(i)}
              y2={display.stringBottomY}
              stroke="currentColor"
              strokeWidth={stroke}
            />
          ))}

          {animatedMarkers
            ? animatedMarkers.map((marker) => (
                <FingerMarkerGraphic
                  key={
                    marker.anim === 'exit'
                      ? `exit-${marker.finger}`
                      : `finger-${transitionKey}-${marker.finger}`
                  }
                  marker={marker}
                  transitionKey={transitionKey}
                  dotRadius={dotRadius}
                  dotStroke={dotStroke}
                  fingerFontSize={fingerFontSize}
                  labelYOffset={labelYOffset}
                  glowFilterId={glowFilterId}
                  onExitComplete={handleExitComplete}
                />
              ))
            : fingerMarkers.map((marker) => (
                <StaticFingerMarkerGraphic
                  key={marker.id}
                  marker={{ ...marker, anim: 'static' }}
                  dotRadius={dotRadius}
                  dotStroke={dotStroke}
                  fingerFontSize={fingerFontSize}
                  labelYOffset={labelYOffset}
                />
              ))}
        </g>
      </svg>
    </div>
  )
}

export { BASE_FRET_COUNT }

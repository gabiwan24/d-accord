import type { ChordShape } from '../data/chords'
import { buildFingerSteps } from './fingerSteps'

export type DiagramSize = 'sm' | 'lg' | 'xs'

export const BASE_FRET_COUNT = 4
/** Maximale Bundanzahl — dynamisch erweiterbar per Animation */
export const MAX_FRET_COUNT = BASE_FRET_COUNT + 2

export interface FingerDotPosition {
  stringIndex: number
  fret: number
  finger: number
  x: number
  y: number
}

export interface DiagramMetrics {
  padTop: number
  padSide: number
  innerWidth: number
  /** Höhe des Bundrasters (fretGap × visibleFretCount) */
  innerHeight: number
  stringGap: number
  /** Fester Bundabstand — identisch für alle Akkorde */
  fretGap: number
  /** Oberkante des sichtbaren Bundrasters (Sattel) */
  gridTopY: number
  visibleFretCount: number
  svgHeight: number
}

export function getMaxPlayedFret(frets: (number | null)[]): number {
  const played = frets.filter((f): f is number => f !== null && f > 0)
  return played.length ? Math.max(...played) : 0
}

/** Nur benötigte Bünde (1…max+1), max. 6; bei nur Leersaiten mindestens 3 */
export function getVisibleFretCount(frets: (number | null)[]): number {
  const maxFret = getMaxPlayedFret(frets)
  const needed = maxFret === 0 ? 3 : maxFret + 1
  return Math.min(MAX_FRET_COUNT, needed)
}

export function hasOpenStrings(frets: (number | null)[]): boolean {
  return frets.some((f) => f === 0)
}

export function getFretNumberLabelY(
  gridTopY: number,
  fretGap: number,
  fretNumber: number,
): number {
  return gridTopY + (fretNumber - 0.5) * fretGap
}

/** Sattel bleibt immer an padTop — kein Hochschieben ohne Leersaiten */
export function getFretGridTop(padTop: number): number {
  return padTop
}

export interface DiagramLayoutInput {
  padTop: number
  padSide: number
  padBottom: number
  innerWidth: number
  /** Referenzhöhe für 4 Bünde — bestimmt den festen fretGap */
  baseInnerHeight: number
  openNutGap: number
  dotRadius: number
  dotStroke: number
}

export function buildDiagramMetrics(
  shape: ChordShape,
  layout: DiagramLayoutInput,
  _size: DiagramSize,
): DiagramMetrics {
  const visibleFretCount = getVisibleFretCount(shape.frets)
  const fretGap = layout.baseInnerHeight / BASE_FRET_COUNT
  const innerHeight = fretGap * visibleFretCount
  const gridTopY = getFretGridTop(layout.padTop)
  const svgHeight = gridTopY + visibleFretCount * fretGap + layout.padBottom

  return {
    padTop: layout.padTop,
    padSide: layout.padSide,
    innerWidth: layout.innerWidth,
    innerHeight,
    stringGap: layout.innerWidth / 3,
    fretGap,
    gridTopY,
    visibleFretCount,
    svgHeight,
  }
}

/** Höchstmögliche Diagrammhöhe (6 Bünde) für Animations-Reserve */
export function getMaxDiagramSvgHeight(layout: DiagramLayoutInput): number {
  const fretGap = layout.baseInnerHeight / BASE_FRET_COUNT
  const gridTopY = getFretGridTop(layout.padTop)
  return gridTopY + MAX_FRET_COUNT * fretGap + layout.padBottom
}

export function getFingerDotPositions(
  shape: ChordShape,
  metrics: DiagramMetrics,
  /** Feste Sattel-Referenz — Finger bewegen sich mit dem Raster-Transform */
  anchorGridTopY?: number,
): FingerDotPosition[] {
  const { padSide, stringGap, fretGap, gridTopY } = metrics
  const originY = anchorGridTopY ?? gridTopY
  const fingerSteps = buildFingerSteps(shape)
  const dots: FingerDotPosition[] = []

  for (let i = 0; i < shape.frets.length; i++) {
    const fret = shape.frets[i]
    const finger = fingerSteps[i]
    if (fret === null || fret === 0 || finger === null) continue

    dots.push({
      stringIndex: i,
      fret,
      finger,
      x: padSide + i * stringGap,
      y: originY + (fret - 0.5) * fretGap,
    })
  }

  return dots
}

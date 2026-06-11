import { describe, expect, it } from 'vitest'
import { getChord, CHORDS, CHORDS_BY_ROOT } from '../data/chords'
import {
  detectChordPreset,
  getPresetChordIds,
} from '../data/chordPresets'
import { formatChordSpokenGuide } from './chordSpokenName'
import {
  buildFingerAnimations,
  groupFingerMarkers,
} from './fingerMarkers'
import {
  buildDiagramMetrics,
  getFingerDotPositions,
  getFretGridTop,
  getVisibleFretCount,
} from './chordLayout'
import { snapFretboard } from '../hooks/useAnimatedFretboard'
import { buildFingerSteps } from './fingerSteps'
import { getNotePositions } from './notePositions'
import { chordMatches } from './chordMatcher'
import { noteMatches } from './noteMatcher'
import { shuffle } from './shuffle'

describe('getNotePositions', () => {
  it('findet C auf allen 4 Saiten (High G, Bund 0–12)', () => {
    const positions = getNotePositions('highG', 0)
    expect(positions).toContainEqual({ stringIndex: 1, fret: 0 })
    expect(positions).toContainEqual({ stringIndex: 0, fret: 5 })
    expect(positions).toContainEqual({ stringIndex: 3, fret: 3 })
    expect(positions.length).toBeGreaterThanOrEqual(4)
  })

  it('liefert gleiche Bundpositionen für High G und Low G (Pitch Class)', () => {
    for (let pc = 0; pc < 12; pc++) {
      expect(getNotePositions('highG', pc)).toEqual(
        getNotePositions('lowG', pc),
      )
    }
  })

  it('findet nur Positionen im Bereich Bund 0–12 (inkl. Oktav-Wiederholungen)', () => {
    for (let pc = 0; pc < 12; pc++) {
      const positions = getNotePositions('highG', pc)
      for (const p of positions) {
        expect(p.fret).toBeGreaterThanOrEqual(0)
        expect(p.fret).toBeLessThanOrEqual(12)
        expect(p.stringIndex).toBeGreaterThanOrEqual(0)
        expect(p.stringIndex).toBeLessThan(4)
      }
      expect(positions.length).toBeGreaterThanOrEqual(4)
    }
  })
})

describe('buildFingerSteps', () => {
  it('nutzt Chart-Fingerzahlen für G-Dur', () => {
    const g = getChord('G')!
    expect(g.shapes.highG.fingers).toEqual([0, 1, 3, 2])
    expect(buildFingerSteps(g.shapes.highG)).toEqual([null, 1, 3, 2])
  })

  it('nutzt Chart-Fingerzahlen für C-Dur', () => {
    const c = getChord('C')!
    expect(c.shapes.highG.fingers).toEqual([0, 0, 0, 3])
    expect(buildFingerSteps(c.shapes.highG)).toEqual([null, null, null, 3])
  })

  it('unterstützt Barré-Fingerzahlen', () => {
    const cm = getChord('Cm')!
    expect(cm.shapes.highG.fingers).toEqual([0, 1, 1, 1])
    expect(buildFingerSteps(cm.shapes.highG)).toEqual([null, 1, 1, 1])
  })
})

describe('formatChordSpokenGuide', () => {
  it('formatiert deutsche Aussprache', () => {
    expect(formatChordSpokenGuide(getChord('C')!)).toBe('C-Dur')
    expect(formatChordSpokenGuide(getChord('Cm7')!)).toBe('C-Moll-Sieben')
    expect(formatChordSpokenGuide(getChord('Csus4')!)).toBe('C-Sus-Vier')
    expect(formatChordSpokenGuide(getChord('H')!)).toContain('H-Dur')
  })
})

describe('buildFingerAnimations', () => {
  const metrics = {
    padTop: 39,
    padSide: 18.5,
    innerWidth: 243,
    innerHeight: 267.3,
    stringGap: 81,
    fretGap: 66.825,
    gridTopY: 39,
    visibleFretCount: 4,
    svgHeight: 323.8,
  }

  it('pulsiert bei gleicher Position (Regel 3)', () => {
    const shape = getChord('G')!.shapes.highG
    const markers = groupFingerMarkers(getFingerDotPositions(shape, metrics), 13)
    const { active } = buildFingerAnimations(markers, markers)
    expect(active.every((d) => d.anim === 'pulse')).toBe(true)
  })

  it('bewegt bei gleicher Fingernummer auf neuer Position (Regel 2)', () => {
    const g = getChord('G')!.shapes.highG
    const c = getChord('C')!.shapes.highG
    const from = groupFingerMarkers(getFingerDotPositions(g, metrics), 13)
    const to = groupFingerMarkers(getFingerDotPositions(c, metrics), 13)
    const { active } = buildFingerAnimations(from, to)
    const finger3 = active.find((d) => d.finger === 3)
    expect(finger3?.anim).toBe('move')
    expect(finger3?.fromX).toBeDefined()
    expect(
      finger3?.fromX !== finger3?.x || finger3?.fromY !== finger3?.y,
    ).toBe(true)
  })

  it('blendet neue Finger ein (Regel 1)', () => {
    const g = getChord('G')!.shapes.highG
    const { active } = buildFingerAnimations(null, groupFingerMarkers(
      getFingerDotPositions(g, metrics),
      13,
    ))
    expect(active.every((d) => d.anim === 'enter')).toBe(true)
  })

  it('blendet nicht mehr benötigte Finger aus (Regel 5)', () => {
    const g = getChord('G')!.shapes.highG
    const c = getChord('C')!.shapes.highG
    const from = groupFingerMarkers(getFingerDotPositions(g, metrics), 13)
    const to = groupFingerMarkers(getFingerDotPositions(c, metrics), 13)
    const { exiting } = buildFingerAnimations(from, to)
    expect(exiting.length).toBeGreaterThan(0)
    expect(exiting.every((d) => d.anim === 'exit')).toBe(true)
  })
})

describe('groupFingerMarkers', () => {
  const metrics = {
    padTop: 39,
    padSide: 18.5,
    innerWidth: 243,
    innerHeight: 267.3,
    stringGap: 81,
    fretGap: 66.825,
    gridTopY: 39,
    visibleFretCount: 4,
    svgHeight: 323.8,
  }

  it('bildet Barré-Balken bei gleichem Finger und Bund', () => {
    const hm = getChord('Hm')!.shapes.highG
    const markers = groupFingerMarkers(getFingerDotPositions(hm, metrics), 13)
    const bar = markers.find((m) => m.type === 'bar')
    const dot = markers.find((m) => m.type === 'dot')
    expect(markers).toHaveLength(2)
    expect(bar?.finger).toBe(1)
    expect(bar?.stringIndices).toEqual([1, 2, 3])
    expect(bar?.labelOffsets).toHaveLength(3)
    expect(dot?.finger).toBe(2)
  })

  it('morpht von Einzelpunkt zu Barré (Regel 4)', () => {
    const g = getChord('G')!.shapes.highG
    const cm = getChord('Cm')!.shapes.highG
    const from = groupFingerMarkers(getFingerDotPositions(g, metrics), 13)
    const to = groupFingerMarkers(getFingerDotPositions(cm, metrics), 13)
    const bar = to.find((m) => m.type === 'bar')
    expect(bar).toBeDefined()
    const { active } = buildFingerAnimations(from, to)
    const barAnim = active.find((m) => m.finger === bar!.finger)
    expect(barAnim?.anim === 'morph' || barAnim?.anim === 'stretch').toBe(true)
  })
})

describe('Referenz-Chart Korrekturen', () => {
  const expectShape = (id: string, frets: (number | null)[], fingers: (number | null)[]) => {
    const chord = getChord(id)!
    expect(chord.shapes.highG.frets).toEqual(frets)
    expect(chord.shapes.highG.fingers).toEqual(fingers)
  }

  it('Cdim', () => {
    expectShape('Cdim', [2, 3, 2, null], [2, 3, 1, null])
  })

  it('Dsus4', () => {
    expectShape('Dsus4', [0, 2, 3, 0], [0, 1, 2, 0])
  })

  it('Ddim', () => {
    expectShape('Ddim', [1, 2, 1, null], [1, 3, 2, null])
  })

  it('A7', () => {
    expectShape('A7', [0, 1, 0, 0], [0, 1, 0, 0])
  })

  it('A6', () => {
    expectShape('A6', [2, 1, 2, 4], [1, 2, 3, 4])
  })

  it('Am6', () => {
    expectShape('Am6', [2, 4, 2, 3], [1, 4, 2, 3])
  })

  it('Adim', () => {
    expectShape('Adim', [5, 3, 5, 3], [3, 1, 4, 2])
  })

  it('Gsus4', () => {
    expectShape('Gsus4', [0, 3, 3, 5], [0, 1, 1, 2])
  })

  it('Gdim', () => {
    expectShape('Gdim', [0, 1, 3, 1], [0, 1, 3, 2])
  })

  it('Hdim', () => {
    expectShape('Hdim', [4, 2, 1, 2], [4, 2, 1, 3])
  })

  it('Adim erweitert das Board auf 6 Bünde', () => {
    const adim = getChord('Adim')!
    expect(getVisibleFretCount(adim.shapes.highG.frets)).toBe(6)
  })

  it('Gsus4 erweitert bei Bund 5 auf 6 Bünde', () => {
    const gsus4 = getChord('Gsus4')!
    expect(getVisibleFretCount(gsus4.shapes.highG.frets)).toBe(6)
  })

  it('F und Am teilen gridShiftY 0 bei Leersaiten', () => {
    const layout = {
      padTop: 39,
      padSide: 18.5,
      padBottom: 17.5,
      innerWidth: 243,
      baseInnerHeight: 267.3,
      openNutGap: 7,
      dotRadius: 13,
      dotStroke: 1.5,
    }
    const f = getChord('F')!.shapes.highG
    const am = getChord('Am')!.shapes.highG
    const fMetrics = buildDiagramMetrics(f, layout, 'lg')
    const amMetrics = buildDiagramMetrics(am, layout, 'lg')
    expect(fMetrics.gridTopY).toBe(layout.padTop)
    expect(amMetrics.gridTopY).toBe(layout.padTop)
    expect(fMetrics.gridTopY - layout.padTop).toBe(0)
    expect(amMetrics.gridTopY - layout.padTop).toBe(0)
  })

  it('G und Em teilen dieselbe Sattel-Position bei Leersaiten', () => {
    const layout = {
      padTop: 39,
      padSide: 18.5,
      padBottom: 17.5,
      innerWidth: 243,
      baseInnerHeight: 267.3,
      openNutGap: 7,
      dotRadius: 13,
      dotStroke: 1.5,
    }
    const g = getChord('G')!.shapes.highG
    const em = getChord('Em')!.shapes.highG
    expect(buildDiagramMetrics(g, layout, 'lg').gridTopY).toBe(
      buildDiagramMetrics(em, layout, 'lg').gridTopY,
    )
  })

  it('Sattel bleibt immer an padTop — auch ohne Leersaiten', () => {
    const padTop = 39
    expect(getFretGridTop(padTop)).toBe(padTop)
  })

  it('zeigt nur benötigte Bünde — F hat 3, C hat 4', () => {
    const f = getChord('F')!.shapes.highG
    const c = getChord('C')!.shapes.highG
    expect(getVisibleFretCount(f.frets)).toBe(3)
    expect(getVisibleFretCount(c.frets)).toBe(4)
  })

  it('dynamisches Raster: geschlossener Boden je Akkord', () => {
    const layout = {
      padTop: 39,
      padSide: 18.5,
      padBottom: 17.5,
      innerWidth: 243,
      baseInnerHeight: 267.3,
      openNutGap: 7,
      dotRadius: 13,
      dotStroke: 1.5,
    }
    const f = buildDiagramMetrics(getChord('F')!.shapes.highG, layout, 'lg')
    const em = buildDiagramMetrics(getChord('Em')!.shapes.highG, layout, 'lg')
    const fBoard = snapFretboard(f, layout.padTop, getChord('F')!.shapes.highG.frets)
    const emBoard = snapFretboard(em, layout.padTop, getChord('Em')!.shapes.highG.frets)

    expect(f.visibleFretCount).toBe(3)
    expect(em.visibleFretCount).toBe(5)
    expect(fBoard.stringBottomY).toBeLessThan(emBoard.stringBottomY)
    expect(fBoard.fretLines).toHaveLength(3)
    expect(emBoard.fretLines).toHaveLength(5)
  })

  it('behält festen Bundabstand bei Erweiterung', () => {
    const adim = getChord('Adim')!.shapes.highG
    const layout = {
      padTop: 39,
      padSide: 18.5,
      padBottom: 17.5,
      innerWidth: 243,
      baseInnerHeight: 267.3,
      openNutGap: 7,
      dotRadius: 13,
      dotStroke: 1.5,
    }
    const metrics = buildDiagramMetrics(adim, layout, 'lg')
    const dots = getFingerDotPositions(adim, metrics)
    expect(metrics.fretGap).toBeCloseTo(267.3 / 4, 2)
    expect(metrics.visibleFretCount).toBe(6)
    expect(metrics.innerHeight).toBeCloseTo(metrics.fretGap * 6, 2)
    expect(metrics.svgHeight).toBeGreaterThan(
      layout.padTop + layout.baseInnerHeight + layout.padBottom,
    )
    expect(dots.some((d) => d.fret === 5)).toBe(true)
  })
})

describe('chordPresets', () => {
  it('Stufe 1 enthält C-Dur-Familie', () => {
    expect(getPresetChordIds('stufe1').sort()).toEqual(
      ['Am', 'C', 'F', 'G'].sort(),
    )
    expect(detectChordPreset(['C', 'Am', 'F', 'G'])).toBe('stufe1')
  })

  it('Stufe 5 enthält alle Akkorde', () => {
    expect(getPresetChordIds('stufe5')).toHaveLength(56)
  })

  it('erkennt eigene Auswahl', () => {
    expect(detectChordPreset(['C', 'G'])).toBe('custom')
  })
})

describe('FINGER_CHART', () => {
  it('hat für jeden Akkord gültige Finger je Saite', () => {
    for (const chord of CHORDS) {
      const { frets, fingers } = chord.shapes.highG
      expect(fingers).toHaveLength(4)
      for (let i = 0; i < 4; i++) {
        const fret = frets[i]
        const finger = fingers[i]
        if (fret === null) {
          expect(finger).toBeNull()
        } else if (fret === 0) {
          expect(finger).toBe(0)
        } else {
          expect(finger).toBeGreaterThanOrEqual(1)
          expect(finger).toBeLessThanOrEqual(4)
        }
      }
    }
  })
})

describe('chordMatches', () => {
  it('erkennt Am per Name', () => {
    const am = getChord('Am')!
    expect(
      chordMatches({
        detectedName: 'Am',
        detectedPitchClasses: [],
        expected: am,
        tuningId: 'highG',
      }),
    ).toBe(true)
  })

  it('erkennt H-Dur wenn Library B meldet', () => {
    const h = getChord('H')!
    expect(
      chordMatches({
        detectedName: 'B',
        detectedPitchClasses: [],
        expected: h,
        tuningId: 'highG',
      }),
    ).toBe(true)
  })

  it('enthält 56 Akkorde in 7 Tonarten', () => {
    expect(CHORDS.length).toBe(56)
    expect(CHORDS_BY_ROOT.length).toBe(7)
    expect(CHORDS_BY_ROOT[6].root).toBe('H')
  })

  it('erkennt C per Pitch-Class-Fallback', () => {
    const c = getChord('C')!
    expect(
      chordMatches({
        detectedName: null,
        detectedPitchClasses: [0, 4, 7],
        expected: c,
        tuningId: 'highG',
      }),
    ).toBe(true)
  })
})

describe('noteMatches', () => {
  it('matcht erwartete Pitch Class wenn stabil', () => {
    expect(noteMatches(0, [0], true)).toBe(true)
    expect(noteMatches(9, [9, 0], true)).toBe(true)
  })

  it('matcht nicht ohne Stabilität oder falschen Ton', () => {
    expect(noteMatches(0, [0], false)).toBe(false)
    expect(noteMatches(0, [2, 5], true)).toBe(false)
  })
})

describe('shuffle', () => {
  it('behält alle Elemente', () => {
    const input = ['C', 'G', 'Am', 'F']
    const result = shuffle(input)
    expect(result.sort()).toEqual(input.sort())
    expect(result).not.toBe(input)
  })
})

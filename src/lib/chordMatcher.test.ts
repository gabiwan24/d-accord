import { describe, expect, it } from 'vitest'
import { getChord } from '../data/chords'
import {
  chordMatches,
  expectedMidisFromFrets,
  fundExplainedByChord,
} from './chordMatcher'

// These tests are grounded in a real PitchPlease debug capture (2026-06-13):
// Em [0,4,3,2] = G4(67), E4(64), G4(67), B4(71). The detector reliably reports
// G4 (~66.8) and B4 (~70.9), often missing E4. Playing the A string at fret 1
// instead of 2 gives Bb4(70) — one semitone below B4 — which must be rejected.

describe('expectedMidisFromFrets', () => {
  it('berechnet die MIDI-Noten für Em (high G)', () => {
    const em = getChord('Em')!
    // [0,4,3,2] on [G67, C60, E64, A69] → G4, E4, G4, B4
    expect(expectedMidisFromFrets(em.shapes.highG.frets, 'highG')).toEqual([
      67, 64, 67, 71,
    ])
  })

  it('berechnet die MIDI-Noten für C-Dur (high G)', () => {
    const c = getChord('C')!
    // [0,0,0,3] → G4, C4, E4, C5
    expect(expectedMidisFromFrets(c.shapes.highG.frets, 'highG')).toEqual([
      67, 60, 64, 72,
    ])
  })

  it('überspringt gedämpfte Saiten (null)', () => {
    const cdim = getChord('Cdim')! // [2,3,2,null]
    const midis = expectedMidisFromFrets(cdim.shapes.highG.frets, 'highG')
    expect(midis).toHaveLength(3)
  })
})

describe('fundExplainedByChord', () => {
  const emMidis = [67, 64, 67, 71] // G4, E4, B4

  it('akzeptiert exakt getroffene Akkordtöne', () => {
    expect(fundExplainedByChord(71.0, emMidis)).toBe(true)
    expect(fundExplainedByChord(66.8, emMidis)).toBe(true)
  })

  it('akzeptiert leicht verstimmte Töne innerhalb der Toleranz', () => {
    expect(fundExplainedByChord(70.9, emMidis)).toBe(true) // B4 leicht zu tief
    expect(fundExplainedByChord(64.5, emMidis)).toBe(true) // E4 grenzwertig
  })

  it('akzeptiert Oktav-Obertöne gespielter Saiten', () => {
    expect(fundExplainedByChord(78.9, emMidis)).toBe(true) // G5 = Oktave von G4
    expect(fundExplainedByChord(83.0, emMidis)).toBe(true) // B5 = Oktave von B4
  })

  it('lehnt einen falschen Halbton ab (Bb4 statt B4)', () => {
    expect(fundExplainedByChord(70.0, emMidis)).toBe(false) // Bb4 — der Fehler
  })

  it('lehnt akkordfremde Töne ab', () => {
    expect(fundExplainedByChord(60.0, emMidis)).toBe(false) // C4 — nicht in Em
  })
})

describe('chordMatches — oktav-bewusst', () => {
  const em = getChord('Em')!

  it('erkennt korrektes Em aus G4+B4 (E4 fehlt — wie real)', () => {
    expect(
      chordMatches({
        detectedName: null,
        detectedPitchClasses: [7, 11],
        detectedFundMidis: [67.0, 70.9],
        expected: em,
        tuningId: 'highG',
      }),
    ).toBe(true)
  })

  it('erkennt Em auch mit Oktav-Oberton G5', () => {
    expect(
      chordMatches({
        detectedName: null,
        detectedPitchClasses: [7, 11],
        detectedFundMidis: [70.9, 78.9],
        expected: em,
        tuningId: 'highG',
      }),
    ).toBe(true)
  })

  it('LEHNT falsch gespieltes Em ab (Bb4 statt B4)', () => {
    expect(
      chordMatches({
        detectedName: null,
        // Falsch [0,4,3,1]: G4, E4, G4, Bb4 → PCs {4,7,10}, fund Bb4(70.0)
        detectedPitchClasses: [4, 7, 10],
        detectedFundMidis: [64.0, 67.0, 70.0],
        expected: em,
        tuningId: 'highG',
      }),
    ).toBe(false)
  })

  it('LEHNT falsches Em auch ab wenn nur G4+Bb4 erkannt werden', () => {
    expect(
      chordMatches({
        detectedName: null,
        detectedPitchClasses: [7, 10],
        detectedFundMidis: [67.0, 70.0],
        expected: em,
        tuningId: 'highG',
      }),
    ).toBe(false)
  })

  it('LEHNT ab wenn akkordfremder Ton mitklingt (z.B. offene C-Saite)', () => {
    expect(
      chordMatches({
        detectedName: null,
        detectedPitchClasses: [0, 7, 11],
        detectedFundMidis: [59.6, 67.0, 71.0], // C4 ist fremd in Em
        expected: em,
        tuningId: 'highG',
      }),
    ).toBe(false)
  })

  it('LEHNT einen einzelnen korrekten Ton ab (zu wenig Deckung)', () => {
    expect(
      chordMatches({
        detectedName: null,
        detectedPitchClasses: [7],
        detectedFundMidis: [67.0],
        expected: em,
        tuningId: 'highG',
      }),
    ).toBe(false)
  })
})

describe('chordMatches — C vs Am Verwechslung', () => {
  it('LEHNT C ab wenn A (statt G) mitklingt', () => {
    const c = getChord('C')! // C4, E4, G4
    expect(
      chordMatches({
        detectedName: null,
        // Am-artig: C4, E4, A4 — teilt {0,4} mit C, aber A(69) ist fremd
        detectedPitchClasses: [0, 4, 9],
        detectedFundMidis: [60.0, 64.0, 69.0],
        expected: c,
        tuningId: 'highG',
      }),
    ).toBe(false)
  })

  it('erkennt korrektes C-Dur (C4, E4, G4)', () => {
    const c = getChord('C')!
    expect(
      chordMatches({
        detectedName: null,
        detectedPitchClasses: [0, 4, 7],
        detectedFundMidis: [60.0, 64.0, 67.0],
        expected: c,
        tuningId: 'highG',
      }),
    ).toBe(true)
  })
})

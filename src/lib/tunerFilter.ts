/** Exponentieller Gleitwert — kleiner = ruhiger, größer = reaktiver */
export const MIDI_SMOOTH_ALPHA = 0.10
export const CENTS_SMOOTH_ALPHA = 0.12
export const MIDI_MEDIAN_WINDOW = 7

/**
 * Median filter that folds each sample to the octave nearest the running
 * estimate before storing.
 *
 * During a pluck's attack the detector reports octave/overtone jumps of the
 * played note (E5, E6 of an E4) plus sparse off-pitch partials. Folding makes
 * every octave of the note collapse onto one value, so the reading no longer
 * flutters between octaves; the median then outvotes the sparse off-pitch
 * spikes instead of averaging them in (as an EMA did). Which octave it locks
 * to is irrelevant — cents and string assignment are octave-invariant.
 */
export class MedianMidiSmoother {
  private buf: number[] = []

  constructor(private readonly size = MIDI_MEDIAN_WINDOW) {}

  reset(): void {
    this.buf = []
  }

  current(): number | null {
    return this.buf.length ? this.median() : null
  }

  push(sample: number): number {
    const ref = this.buf.length ? this.median() : sample
    let folded = sample
    while (folded - ref > 6) folded -= 12
    while (folded - ref < -6) folded += 12
    this.buf.push(folded)
    if (this.buf.length > this.size) this.buf.shift()
    return this.median()
  }

  private median(): number {
    const sorted = [...this.buf].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
  }
}

export class ExponentialSmoother {
  private value: number | null = null

  constructor(private alpha: number) {}

  reset(): void {
    this.value = null
  }

  push(sample: number): number {
    if (this.value === null) {
      this.value = sample
      return sample
    }
    this.value += this.alpha * (sample - this.value)
    return this.value
  }

  current(): number | null {
    return this.value
  }
}

/** Wechselt die Saite erst nach mehreren stabilen Frames */
export class StableStringGate {
  private candidate: number | null = null
  private stableCount = 0
  private locked: number | null = null

  constructor(private readonly requiredFrames = 15) {}

  reset(): void {
    this.candidate = null
    this.stableCount = 0
    this.locked = null
  }

  update(nextIndex: number): number {
    if (this.locked === null) {
      this.locked = nextIndex
      return nextIndex
    }

    if (nextIndex === this.candidate) {
      this.stableCount++
    } else {
      this.candidate = nextIndex
      this.stableCount = 1
    }

    if (this.stableCount >= this.requiredFrames) {
      this.locked = nextIndex
    }

    return this.locked
  }
}

export const midiSmoother = new MedianMidiSmoother()
export const centsSmoother = new ExponentialSmoother(CENTS_SMOOTH_ALPHA)

export function resetTunerFilters(): void {
  midiSmoother.reset()
  centsSmoother.reset()
}

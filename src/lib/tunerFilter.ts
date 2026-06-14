/** Exponentieller Gleitwert — kleiner = ruhiger, größer = reaktiver */
export const MIDI_SMOOTH_ALPHA = 0.10
export const CENTS_SMOOTH_ALPHA = 0.12
export const MIDI_MEDIAN_WINDOW = 7
// How close (semitones) a sample must be to the median to "agree" with it.
const AGREE_TOLERANCE = 0.6
// Agreeing samples required for the reading to count as a settled pitch.
const STABLE_MIN_AGREE = 4

/**
 * Median filter over the recent MIDI samples.
 *
 * The median outvotes the sparse octave/overtone spikes a pluck's attack
 * produces (E5/E6 of an E4) and the wandering values room noise produces,
 * while preserving the true octave — which matters for tuning (low-G's G3 vs a
 * mistakenly played G4). `isStable()` reports whether a clear majority agrees,
 * so the UI can stay neutral during the attack transient and on noise instead
 * of chasing it.
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
    this.buf.push(sample)
    if (this.buf.length > this.size) this.buf.shift()
    return this.median()
  }

  /** A clear majority of recent samples agree with the median pitch. */
  isStable(): boolean {
    if (!this.buf.length) return false
    const med = this.median()
    const agree = this.buf.filter(
      (v) => Math.abs(v - med) <= AGREE_TOLERANCE,
    ).length
    return agree >= STABLE_MIN_AGREE
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

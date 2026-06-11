/** Exponentieller Gleitwert — kleiner = ruhiger, größer = reaktiver */
export const MIDI_SMOOTH_ALPHA = 0.18
export const CENTS_SMOOTH_ALPHA = 0.22

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

  constructor(private readonly requiredFrames = 6) {}

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

export const midiSmoother = new ExponentialSmoother(MIDI_SMOOTH_ALPHA)
export const centsSmoother = new ExponentialSmoother(CENTS_SMOOTH_ALPHA)

export function resetTunerFilters(): void {
  midiSmoother.reset()
  centsSmoother.reset()
}

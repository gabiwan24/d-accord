export const MIN_LOG_ENERGY = 0.0005
const MAX_LOG_ENTRIES = 200
const MIN_CENTS_DELTA = 5

export interface DebugFrame {
  timestamp: number
  source: 'detector' | 'tuner'
  hz: number | null
  rawMidi: number | null
  energy: number
  pitchClasses: number[]
  stable: boolean
  smoothedMidi: number | null
  cents: number | null
  detectedString: string | null
  targetPitchClasses: number[]
  correct: number[]
  noise: number[]
  missing: number[]
  /** All detected fundamentals this frame, octave-aware MIDI (rounded to 0.1) */
  fundMidiList: number[]
}

const log: DebugFrame[] = []
const subscribers = new Set<(frame: DebugFrame) => void>()

let lastLoggedPCKey = ''
let lastLoggedCents: number | null = null

function pcKey(pcs: number[]): string {
  return [...pcs].sort((a, b) => a - b).join(',')
}

export function addDebugFrame(frame: DebugFrame): void {
  // Notify all subscribers on every frame (for live display)
  for (const cb of subscribers) cb(frame)

  // Filter: only log significant frames
  if (frame.energy < MIN_LOG_ENERGY) return

  const currentPCKey =
    pcKey(frame.pitchClasses) +
    '|' +
    frame.fundMidiList.map((m) => m.toFixed(1)).join(',')
  const centsDelta =
    frame.cents !== null && lastLoggedCents !== null
      ? Math.abs(frame.cents - lastLoggedCents)
      : Infinity

  const pitchClassesChanged = currentPCKey !== lastLoggedPCKey
  const centsJumped = centsDelta >= MIN_CENTS_DELTA

  if (!pitchClassesChanged && !centsJumped) return

  lastLoggedPCKey = currentPCKey
  if (frame.cents !== null) lastLoggedCents = frame.cents

  if (log.length >= MAX_LOG_ENTRIES) log.shift()
  log.push(frame)
}

export function subscribe(cb: (frame: DebugFrame) => void): () => void {
  subscribers.add(cb)
  return () => subscribers.delete(cb)
}

export function getLog(): DebugFrame[] {
  return log
}

export function clearLog(): void {
  log.length = 0
  lastLoggedPCKey = ''
  lastLoggedCents = null
}

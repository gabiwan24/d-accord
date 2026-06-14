const STORAGE_KEY = 'ukulele-chord-stats'

export interface ChordStatEntry {
  correct: number
  attempts: number
  /** Sum of time-to-correct in ms (the practice yardstick) */
  totalMs?: number
  /** Number of timed attempts (denominator for the average) */
  timedCount?: number
  /** Fastest time-to-correct in ms */
  bestMs?: number
}

export type ChordStats = Record<string, ChordStatEntry>

function load(): ChordStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ChordStats) : {}
  } catch {
    return {}
  }
}

function save(stats: ChordStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
}

export function recordAttempt(chordId: string, correct: boolean): void {
  const stats = load()
  const entry = stats[chordId] ?? { correct: 0, attempts: 0 }
  stats[chordId] = {
    correct: entry.correct + (correct ? 1 : 0),
    attempts: entry.attempts + 1,
  }
  save(stats)
}

/** Record how long (ms) it took to play this chord correctly. */
export function recordTime(chordId: string, ms: number): void {
  const stats = load()
  const entry = stats[chordId] ?? { correct: 0, attempts: 0 }
  stats[chordId] = {
    ...entry,
    totalMs: (entry.totalMs ?? 0) + ms,
    timedCount: (entry.timedCount ?? 0) + 1,
    bestMs: entry.bestMs === undefined ? ms : Math.min(entry.bestMs, ms),
  }
  save(stats)
}

/** Average time-to-correct in ms, or null if never timed. */
export function getAverageTime(chordId: string): number | null {
  const entry = load()[chordId]
  if (!entry || !entry.timedCount) return null
  return (entry.totalMs ?? 0) / entry.timedCount
}

export function getAccuracy(chordId: string): number {
  const stats = load()
  const entry = stats[chordId]
  if (!entry || entry.attempts === 0) return 0.5
  return entry.correct / entry.attempts
}

export function getAllStats(): ChordStats {
  return load()
}

export function clearStats(): void {
  localStorage.removeItem(STORAGE_KEY)
}

const STORAGE_KEY = 'ukulele-chord-stats'

export type ChordStats = Record<string, { correct: number; attempts: number }>

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

import { getChord } from '../data/chords'
import type { SessionTimings } from '../hooks/usePracticeSession'

interface SummaryScreenProps {
  count: number
  sessionChordIds: Set<string>
  sessionTimings: SessionTimings
  onPlayAgain: () => void
  onDone: () => void
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`
}

// Faster is better; thresholds tuned for chord changes.
function barColor(ms: number): string {
  if (ms < 2500) return 'bg-success'
  if (ms < 5000) return 'bg-amber-400'
  return 'bg-red-400'
}

export function SummaryScreen({
  count,
  sessionTimings,
  onPlayAgain,
  onDone,
}: SummaryScreenProps) {
  const rows = Object.entries(sessionTimings)
    .map(([id, times]) => {
      const chord = getChord(id)
      if (!chord || times.length === 0) return null
      return { id, name: chord.displayName, avg: mean(times), plays: times.length }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    // Slowest first — those need the most practice.
    .sort((a, b) => b.avg - a.avg)

  const maxAvg = rows.length > 0 ? Math.max(...rows.map((r) => r.avg)) : 1

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-6 pb-8 pt-10">
      <h1 className="mb-6 text-center text-lg font-normal text-ink">
        Übung beendet
      </h1>

      <div className="mb-6 flex items-center justify-center gap-3 text-3xl">
        <span>🎵</span>
        <span className="text-ink">
          {count} {count === 1 ? 'Akkord' : 'Akkorde'} gespielt
        </span>
      </div>

      {rows.length > 0 && (
        <div className="mb-6 flex min-h-0 flex-1 flex-col">
          <p className="mb-3 text-center text-xs text-muted">
            Zeit bis richtig gespielt — langsamste zuerst
          </p>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {rows.map(({ id, name, avg, plays }) => (
              <div key={id} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-sm text-ink">{name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                  <div
                    className={`h-full rounded-full ${barColor(avg)}`}
                    style={{ width: `${Math.max(6, Math.round((avg / maxAvg) * 100))}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted">
                  {formatSeconds(avg)}
                  {plays > 1 && (
                    <span className="text-muted/60"> ·{plays}×</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex w-full flex-col gap-3 pt-4">
        <button
          type="button"
          onClick={onPlayAgain}
          className="flex min-h-12 w-full items-center justify-center rounded-lg bg-ink py-3 text-base text-cream transition-opacity active:opacity-80"
        >
          Nochmal
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex min-h-12 w-full items-center justify-center rounded-lg border border-ink/20 py-3 text-base text-ink transition-opacity active:opacity-60"
        >
          Fertig
        </button>
      </div>
    </div>
  )
}

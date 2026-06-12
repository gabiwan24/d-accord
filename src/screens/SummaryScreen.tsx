import { getChord } from '../data/chords'
import { getAccuracy, getAllStats } from '../lib/practiceStats'

interface SummaryScreenProps {
  count: number
  sessionChordIds: Set<string>
  onPlayAgain: () => void
  onDone: () => void
}

function AccuracyMiniBar({ accuracy }: { accuracy: number }) {
  const color =
    accuracy > 0.8
      ? 'bg-success'
      : accuracy >= 0.6
        ? 'bg-amber-400'
        : 'bg-red-400'
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ink/10">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.round(accuracy * 100)}%` }}
      />
    </div>
  )
}

export function SummaryScreen({
  count,
  sessionChordIds,
  onPlayAgain,
  onDone,
}: SummaryScreenProps) {
  const stats = getAllStats()

  const weakest = [...sessionChordIds]
    .map((id) => {
      const entry = stats[id]
      const chord = getChord(id)
      if (!chord || !entry || entry.attempts === 0) return null
      return { id, name: chord.displayName, accuracy: getAccuracy(id), entry }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6">
      <h1 className="mb-8 text-lg font-normal text-ink">Übung beendet</h1>

      <div className="mb-8 flex items-center gap-3 text-3xl">
        <span>🎵</span>
        <span className="text-ink">
          {count} {count === 1 ? 'Akkord' : 'Akkorde'} gespielt
        </span>
      </div>

      {weakest.length > 0 && (
        <div className="mb-10 w-full max-w-xs space-y-3">
          <p className="mb-4 text-center text-xs text-muted">
            Diese brauchten am meisten Übung
          </p>
          {weakest.map(({ id, name, accuracy }) => (
            <div key={id} className="flex items-center justify-between gap-3">
              <span className="text-sm text-ink">{name}</span>
              <div className="flex items-center gap-2">
                <AccuracyMiniBar accuracy={accuracy} />
                <span className="w-8 text-right text-xs tabular-nums text-muted">
                  {Math.round(accuracy * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex w-full max-w-xs flex-col gap-3">
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

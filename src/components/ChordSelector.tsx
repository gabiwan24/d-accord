import { CHORDS_BY_ROOT } from '../data/chords'
import type { TuningId } from '../data/tunings'
import { ChordCard } from './ChordCard'
import { getAllStats } from '../lib/practiceStats'

interface ChordSelectorProps {
  tuningId: TuningId
  selected: Set<string>
  onToggle: (id: string) => void
}

function MiniAccuracyBar({ chordId }: { chordId: string }) {
  const stats = getAllStats()
  const entry = stats[chordId]
  if (!entry || entry.attempts === 0) return null

  const accuracy = entry.correct / entry.attempts
  const color =
    accuracy > 0.8
      ? 'bg-success'
      : accuracy >= 0.6
        ? 'bg-amber-400'
        : 'bg-red-400'

  return (
    <div className="mt-0.5 h-[3px] w-full overflow-hidden rounded-full bg-ink/10">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${Math.round(accuracy * 100)}%` }}
      />
    </div>
  )
}

export function ChordSelector({
  tuningId,
  selected,
  onToggle,
}: ChordSelectorProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {CHORDS_BY_ROOT.map(({ root, chords }) => (
        <section key={root}>
          <h2 className="mb-2 text-xs font-normal text-muted sm:mb-3 sm:text-sm">
            {root}
          </h2>
          <div className="grid grid-cols-4 gap-1 sm:grid-cols-4 sm:gap-2 md:grid-cols-8 md:gap-3">
            {chords.map((chord) => {
              const isSelected = selected.has(chord.id)
              return (
                <label
                  key={chord.id}
                  className={`touch-target flex cursor-pointer select-none flex-col items-center rounded p-0.5 transition-opacity active:opacity-80 sm:p-1 ${
                    isSelected ? 'opacity-100' : 'opacity-35'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(chord.id)}
                    className="sr-only"
                  />
                  <ChordCard
                    name={chord.displayName}
                    shape={chord.shapes[tuningId]}
                    accent={chord.accent}
                    size="xs"
                  />
                  <MiniAccuracyBar chordId={chord.id} />
                </label>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

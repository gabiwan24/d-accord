import { NOTES } from '../data/notes'
import type { TuningId } from '../data/tunings'
import { getNotePositions } from '../lib/notePositions'
import { NoteCard } from './NoteCard'

interface NoteSelectorProps {
  tuningId: TuningId
  selected: Set<string>
  onToggle: (id: string) => void
}

export function NoteSelector({
  tuningId,
  selected,
  onToggle,
}: NoteSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
      {NOTES.map((note) => {
        const isSelected = selected.has(note.id)
        const positions = getNotePositions(tuningId, note.pitchClass)
        return (
          <label
            key={note.id}
            className={`touch-target flex cursor-pointer select-none flex-col items-center rounded p-0.5 transition-opacity active:opacity-80 sm:p-1 ${
              isSelected ? 'opacity-100' : 'opacity-35'
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(note.id)}
              className="sr-only"
            />
            <NoteCard
              name={note.displayName}
              tuningId={tuningId}
              positions={positions}
              accent={note.accent}
              size="xs"
            />
          </label>
        )
      })}
    </div>
  )
}

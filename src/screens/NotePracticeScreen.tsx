import { useState } from 'react'
import { getNote } from '../data/notes'
import { TUNINGS, type TuningId } from '../data/tunings'
import { NoteCard } from '../components/NoteCard'
import { MicStatus } from '../components/MicStatus'
import { useMicEnabled } from '../context/MicContext'
import { useNotePracticeSession } from '../hooks/useNotePracticeSession'
import { getNotePositions, positionLabel } from '../lib/notePositions'
import { playNoteReference } from '../lib/playChord'

interface NotePracticeScreenProps {
  tuningId: TuningId
  noteIds: string[]
  onDone: () => void
}

export function NotePracticeScreen({
  tuningId,
  noteIds,
  onDone,
}: NotePracticeScreenProps) {
  const [playing, setPlaying] = useState(false)

  const {
    current,
    next,
    count,
    micStatus,
    micError,
    pulse,
    skipToNext,
  } = useNotePracticeSession(noteIds, tuningId, getNote)

  const { micEnabled } = useMicEnabled()

  if (!current) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        Lädt…
      </div>
    )
  }

  const positions = getNotePositions(tuningId, current.pitchClass)
  const nextPositions = next
    ? getNotePositions(tuningId, next.pitchClass)
    : []

  const handlePlay = async () => {
    if (playing) return
    setPlaying(true)
    await playNoteReference(current.pitchClass)
    setTimeout(() => setPlaying(false), 1000)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-8 pt-6 content-tab-bar-pad">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>#{count + 1}</span>
        <span className="rounded-full bg-ink/5 px-2 py-0.5">
          {TUNINGS[tuningId].shortLabel} · Ton
        </span>
        <button
          type="button"
          onClick={onDone}
          className="min-h-11 underline underline-offset-2"
        >
          Beenden
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        <NoteCard
          name={current.displayName}
          tuningId={tuningId}
          positions={positions}
          accent={current.accent}
          size="lg"
          pulse={pulse}
        />

        <button
          type="button"
          onClick={() => void handlePlay()}
          disabled={playing}
          aria-label="Beispiel spielen"
          className="mt-3 flex min-h-11 min-w-11 items-center justify-center rounded-full text-xl text-muted transition-opacity active:opacity-60 disabled:opacity-30"
        >
          🔊
        </button>

        <p className="mt-4 max-w-xs text-center text-xs text-muted">
          {positions.length} Positionen (Bund 0–12)
        </p>
        <ul className="mt-2 max-w-xs text-center text-xs text-muted">
          {positions.map((p) => (
            <li key={`${p.stringIndex}-${p.fret}`}>
              {positionLabel(tuningId, p)}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-end justify-between gap-4">
        <MicStatus
          status={micStatus}
          errorMessage={micError}
          disabled={!micEnabled}
        />

        {next && (
          <button
            type="button"
            onClick={skipToNext}
            aria-label={`${next.displayName} — überspringen`}
            className="flex cursor-pointer flex-col items-end border-0 bg-transparent p-1 opacity-70 active:opacity-100"
          >
            <span className="mb-1 text-xs text-muted">Nächster</span>
            <NoteCard
              name={next.displayName}
              tuningId={tuningId}
              positions={nextPositions}
              accent={next.accent}
              size="xs"
            />
          </button>
        )}
      </div>
    </div>
  )
}

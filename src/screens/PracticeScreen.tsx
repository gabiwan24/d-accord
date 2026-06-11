import { getChord } from '../data/chords'
import { TUNINGS, type TuningId } from '../data/tunings'
import { ChordCard } from '../components/ChordCard'
import { SpokenGuide } from '../components/SpokenGuide'
import { MicStatus } from '../components/MicStatus'
import { useMicEnabled } from '../context/MicContext'
import { usePracticeSession } from '../hooks/usePracticeSession'
import { formatChordSpokenGuide } from '../lib/chordSpokenName'
import { playChordShape } from '../lib/playChord'

interface PracticeScreenProps {
  tuningId: TuningId
  chordIds: string[]
  onDone: () => void
}

export function PracticeScreen({
  tuningId,
  chordIds,
  onDone,
}: PracticeScreenProps) {
  const {
    current,
    next,
    count,
    micStatus,
    micError,
    pulse,
    skipToNext,
  } = usePracticeSession(chordIds, tuningId, getChord)

  const { micEnabled } = useMicEnabled()

  const shape = current?.shapes[tuningId]

  if (!current || !shape) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        Lädt…
      </div>
    )
  }

  const spokenGuide = formatChordSpokenGuide(current)

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-8 pt-6 content-tab-bar-pad">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>#{count + 1}</span>
        <span className="rounded-full bg-ink/5 px-2 py-0.5">
          {TUNINGS[tuningId].shortLabel}
        </span>
        <button
          type="button"
          onClick={onDone}
          className="min-h-11 underline underline-offset-2"
        >
          Beenden
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center pt-10">
        <ChordCard
          name={current.displayName}
          shape={shape}
          transitionKey={count}
          accent={current.accent}
          size="lg"
          pulse={pulse}
          animateFingers
          showLabel
          onPlay={() => void playChordShape(shape, tuningId)}
        />
        <SpokenGuide text={spokenGuide} transitionKey={count} />
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
            <ChordCard
              name={next.displayName}
              shape={next.shapes[tuningId]}
              accent={next.accent}
              size="xs"
            />
          </button>
        )}
      </div>
    </div>
  )
}

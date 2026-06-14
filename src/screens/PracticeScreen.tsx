import { useMemo, useState } from 'react'
import { getChord } from '../data/chords'
import { TUNINGS, type TuningId } from '../data/tunings'
import { ChordCard } from '../components/ChordCard'
import { SpokenGuide } from '../components/SpokenGuide'
import { MicStatus } from '../components/MicStatus'
import { useMicEnabled } from '../context/MicContext'
import {
  usePracticeSession,
  type SessionTimings,
} from '../hooks/usePracticeSession'
import { formatChordSpokenGuide } from '../lib/chordSpokenName'
import { playChordShape } from '../lib/playChord'
import { getAccuracy, getAllStats } from '../lib/practiceStats'

interface PracticeScreenProps {
  tuningId: TuningId
  chordIds: string[]
  onDone: (result: {
    count: number
    sessionChordIds: Set<string>
    sessionTimings: SessionTimings
  }) => void
}

function AccuracyBar({ chordId }: { chordId: string }) {
  const stats = getAllStats()
  const entry = stats[chordId]
  const accuracy = getAccuracy(chordId)
  const hasData = entry && entry.attempts > 0

  const barColor = !hasData
    ? 'bg-ink/20'
    : accuracy > 0.8
      ? 'bg-success'
      : accuracy >= 0.6
        ? 'bg-amber-400'
        : 'bg-red-400'

  return (
    <div className="mt-3 flex flex-col items-center gap-1">
      <div className="h-2 w-40 overflow-hidden rounded-full bg-ink/10">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.round(accuracy * 100)}%` }}
        />
      </div>
      {hasData && (
        <span className="text-xs text-muted">
          {Math.round(accuracy * 100)}% · {entry.correct}/{entry.attempts}
        </span>
      )}
    </div>
  )
}

export function PracticeScreen({
  tuningId,
  chordIds,
  onDone,
}: PracticeScreenProps) {
  const [playing, setPlaying] = useState(false)

  const {
    current,
    next,
    count,
    currentId,
    micStatus,
    micError,
    pulse,
    skipToNext,
    detectedPitchClasses,
    sessionChordIds,
    sessionTimings,
  } = usePracticeSession(chordIds, tuningId, getChord)

  const { micEnabled } = useMicEnabled()

  const shape = current?.shapes[tuningId]

  const correctStringIndices = useMemo(() => {
    if (!detectedPitchClasses || detectedPitchClasses.length === 0 || !shape) return null
    const detected = new Set(detectedPitchClasses.map((pc) => ((pc % 12) + 12) % 12))
    const strings = TUNINGS[tuningId].strings
    const correct = new Set<number>()
    shape.frets.forEach((fret, i) => {
      if (fret === null) return
      const pc = ((strings[i].midi + fret) % 12 + 12) % 12
      if (detected.has(pc)) correct.add(i)
    })
    return correct.size > 0 ? correct : null
  }, [detectedPitchClasses, shape, tuningId])

  if (!current || !shape) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted">
        Lädt…
      </div>
    )
  }

  const spokenGuide = formatChordSpokenGuide(current)

  const handlePlay = async () => {
    if (playing) return
    setPlaying(true)
    await playChordShape(shape, tuningId)
    setTimeout(() => setPlaying(false), 1000)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-8 pt-6 content-tab-bar-pad">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>#{count + 1}</span>
        <span className="rounded-full bg-ink/5 px-2 py-0.5">
          {TUNINGS[tuningId].shortLabel}
        </span>
        <button
          type="button"
          onClick={() => onDone({ count, sessionChordIds, sessionTimings })}
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
          correctStringIndices={correctStringIndices}
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

        {currentId && <AccuracyBar chordId={currentId} key={currentId} />}

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

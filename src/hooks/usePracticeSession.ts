import { useCallback, useEffect, useRef, useState } from 'react'
import { useMicEnabled } from '../context/MicContext'
import type { UkuleleChord } from '../data/chords'
import type { TuningId } from '../data/tunings'
import {
  createAudioDetector,
  type AudioDetector,
  type MicStatus,
} from '../lib/audioDetector'
import { getAccuracy, recordAttempt, recordTime } from '../lib/practiceStats'
import { useInfinitePracticeQueue } from './useInfinitePracticeQueue'

/** Per-chord list of time-to-correct (ms) for the current session. */
export type SessionTimings = Record<string, number[]>

export function usePracticeSession(
  chordIds: string[],
  tuningId: TuningId,
  getChord: (id: string) => UkuleleChord | undefined,
) {
  const { currentId, nextId, goNext, count } =
    useInfinitePracticeQueue(chordIds, getAccuracy)
  const [micStatus, setMicStatus] = useState<MicStatus>('idle')
  const [micError, setMicError] = useState<string | null>(null)
  const [pulse, setPulse] = useState(false)
  const [detectedPitchClasses, setDetectedPitchClasses] = useState<number[] | null>(null)
  const [sessionChordIds, setSessionChordIds] = useState<Set<string>>(new Set())
  const [sessionTimings, setSessionTimings] = useState<SessionTimings>({})
  const detectorRef = useRef<AudioDetector | null>(null)
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // When the current chord was first shown — basis for time-to-correct.
  const shownAtRef = useRef<number>(performance.now())
  const { micEnabled } = useMicEnabled()

  const current = currentId ? getChord(currentId) : undefined
  const next = nextId ? getChord(nextId) : undefined

  // Track which chords appeared this session; (re)start the timer on each chord.
  useEffect(() => {
    if (!currentId) return
    shownAtRef.current = performance.now()
    setSessionChordIds((prev) => {
      if (prev.has(currentId)) return prev
      const next = new Set(prev)
      next.add(currentId)
      return next
    })
  }, [currentId])

  const advance = useCallback(() => {
    if (currentId) {
      const elapsed = performance.now() - shownAtRef.current
      recordAttempt(currentId, true)
      recordTime(currentId, elapsed)
      setSessionTimings((prev) => ({
        ...prev,
        [currentId]: [...(prev[currentId] ?? []), elapsed],
      }))
    }
    detectorRef.current?.prepareNextTarget()
    setDetectedPitchClasses(null)
    setPulse(true)
    goNext()
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    pulseTimeoutRef.current = setTimeout(() => setPulse(false), 300)
  }, [goNext, currentId])

  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    }
  }, [])

  const advanceRef = useRef(advance)
  advanceRef.current = advance

  const skipToNext = useCallback(() => {
    detectorRef.current?.prepareNextTarget()
    setDetectedPitchClasses(null)
    goNext()
  }, [goNext])

  useEffect(() => {
    if (!micEnabled) {
      detectorRef.current?.stop()
      detectorRef.current = null
      setMicStatus('idle')
      setMicError(null)
      setDetectedPitchClasses(null)
      return
    }

    const detector = createAudioDetector({
      onStatusChange: (status) => {
        setMicStatus(status)
        if (status === 'idle' || status === 'correct') {
          setDetectedPitchClasses(null)
        }
      },
      onCorrect: () => advanceRef.current(),
      onError: setMicError,
      onPartialMatch: (pcs) => setDetectedPitchClasses(pcs),
    })
    detectorRef.current = detector
    void detector.start()

    return () => {
      detector.stop()
      detectorRef.current = null
    }
  }, [micEnabled])

  useEffect(() => {
    if (!micEnabled || !current || !detectorRef.current) return
    detectorRef.current.setExpectedChord(current, tuningId)
  }, [current, tuningId, micEnabled])

  return {
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
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMicEnabled } from '../context/MicContext'
import type { UkuleleChord } from '../data/chords'
import type { TuningId } from '../data/tunings'
import {
  createAudioDetector,
  type AudioDetector,
  type MicStatus,
} from '../lib/audioDetector'
import { getAccuracy, recordAttempt } from '../lib/practiceStats'
import { useInfinitePracticeQueue } from './useInfinitePracticeQueue'

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
  const detectorRef = useRef<AudioDetector | null>(null)
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { micEnabled } = useMicEnabled()

  const current = currentId ? getChord(currentId) : undefined
  const next = nextId ? getChord(nextId) : undefined

  // Track which chords appeared in this session
  useEffect(() => {
    if (currentId) {
      setSessionChordIds((prev) => {
        if (prev.has(currentId)) return prev
        const next = new Set(prev)
        next.add(currentId)
        return next
      })
    }
  }, [currentId])

  const advance = useCallback(() => {
    if (currentId) recordAttempt(currentId, true)
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
  }
}

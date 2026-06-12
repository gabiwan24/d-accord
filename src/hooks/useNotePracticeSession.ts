import { useCallback, useEffect, useRef, useState } from 'react'
import { useMicEnabled } from '../context/MicContext'
import type { NoteDefinition } from '../data/notes'
import type { TuningId } from '../data/tunings'
import {
  createAudioDetector,
  type AudioDetector,
  type MicStatus,
} from '../lib/audioDetector'
import { useInfinitePracticeQueue } from './useInfinitePracticeQueue'

export function useNotePracticeSession(
  noteIds: string[],
  tuningId: TuningId,
  getNote: (id: string) => NoteDefinition | undefined,
) {
  const { currentId, nextId, goNext, count } =
    useInfinitePracticeQueue(noteIds)
  const [micStatus, setMicStatus] = useState<MicStatus>('idle')
  const [micError, setMicError] = useState<string | null>(null)
  const [pulse, setPulse] = useState(false)
  const detectorRef = useRef<AudioDetector | null>(null)
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { micEnabled } = useMicEnabled()

  const current = currentId ? getNote(currentId) : undefined
  const next = nextId ? getNote(nextId) : undefined

  const advance = useCallback(() => {
    setPulse(true)
    goNext()
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    pulseTimeoutRef.current = setTimeout(() => setPulse(false), 300)
  }, [goNext])

  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    }
  }, [])

  const advanceRef = useRef(advance)
  advanceRef.current = advance

  const skipToNext = useCallback(() => {
    detectorRef.current?.prepareNextTarget()
    goNext()
  }, [goNext])

  useEffect(() => {
    if (!micEnabled) {
      detectorRef.current?.stop()
      detectorRef.current = null
      setMicStatus('idle')
      setMicError(null)
      return
    }

    const detector = createAudioDetector({
      onStatusChange: setMicStatus,
      onCorrect: () => advanceRef.current(),
      onError: setMicError,
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
    detectorRef.current.setExpectedNote(current.pitchClass)
  }, [current, micEnabled])

  return {
    current,
    next,
    count,
    micStatus,
    micError,
    pulse,
    skipToNext,
    tuningId,
  }
}

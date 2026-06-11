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
  const { micEnabled } = useMicEnabled()

  const current = currentId ? getNote(currentId) : undefined
  const next = nextId ? getNote(nextId) : undefined

  const advance = useCallback(() => {
    setPulse(true)
    setTimeout(() => {
      setPulse(false)
      goNext()
    }, 300)
  }, [goNext])

  const skipToNext = useCallback(() => {
    goNext()
  }, [goNext])

  useEffect(() => {
    if (!current) return

    if (!micEnabled) {
      detectorRef.current?.stop()
      detectorRef.current = null
      setMicStatus('idle')
      setMicError(null)
      return
    }

    const detector = createAudioDetector({
      onStatusChange: setMicStatus,
      onCorrect: advance,
      onError: setMicError,
    })
    detectorRef.current = detector
    detector.setExpectedNote(current.pitchClass)
    void detector.start()

    return () => {
      detector.stop()
      detectorRef.current = null
    }
  }, [current, advance, micEnabled])

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

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMicEnabled } from '../context/MicContext'
import type { UkuleleChord } from '../data/chords'
import type { TuningId } from '../data/tunings'
import {
  createAudioDetector,
  type AudioDetector,
  type MicStatus,
} from '../lib/audioDetector'
import { useInfinitePracticeQueue } from './useInfinitePracticeQueue'

export function usePracticeSession(
  chordIds: string[],
  tuningId: TuningId,
  getChord: (id: string) => UkuleleChord | undefined,
) {
  const { currentId, nextId, goNext, count } =
    useInfinitePracticeQueue(chordIds)
  const [micStatus, setMicStatus] = useState<MicStatus>('idle')
  const [micError, setMicError] = useState<string | null>(null)
  const [pulse, setPulse] = useState(false)
  const detectorRef = useRef<AudioDetector | null>(null)
  const { micEnabled } = useMicEnabled()

  const current = currentId ? getChord(currentId) : undefined
  const next = nextId ? getChord(nextId) : undefined

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
    detector.setExpectedChord(current, tuningId)
    void detector.start()

    return () => {
      detector.stop()
      detectorRef.current = null
    }
  }, [current, tuningId, advance, micEnabled])

  return {
    current,
    next,
    count,
    micStatus,
    micError,
    pulse,
    skipToNext,
  }
}

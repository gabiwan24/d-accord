import { useCallback, useEffect, useRef, useState } from 'react'
import { useMicEnabled } from '../context/MicContext'
import type { TuningId } from '../data/tunings'
import { loadTuning, saveTuning } from '../lib/storage'
import {
  createTunerController,
  type TunerController,
} from '../lib/tunerDetector'
import {
  buildTunerReading,
  getStringTargets,
  type TunerMicStatus,
  type TunerMode,
  type TunerReading,
} from '../lib/tunerEngine'

interface UseTunerOptions {
  active: boolean
}

export function useTuner({ active }: UseTunerOptions) {
  const [tuningId, setTuningIdState] = useState<TuningId>(() => loadTuning())
  const [mode, setMode] = useState<TunerMode>('auto')
  const [manualStringIndex, setManualStringIndex] = useState<number | null>(
    null,
  )
  const [micStatus, setMicStatus] = useState<TunerMicStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [tunedStrings, setTunedStrings] = useState<Set<number>>(
    () => new Set(),
  )
  const [reading, setReading] = useState<TunerReading>(() =>
    buildTunerReading({
      tuningId: loadTuning(),
      mode: 'auto',
      manualStringIndex: null,
      detectedMidi: null,
      hasSignal: false,
      micStatus: 'idle',
    }),
  )

  const controllerRef = useRef<TunerController | null>(null)
  const { micEnabled } = useMicEnabled()

  const handleReading = useCallback((next: TunerReading) => {
    setReading(next)
    if (next.inTune) {
      setTunedStrings((prev) => {
        if (prev.has(next.stringIndex)) return prev
        const updated = new Set(prev)
        updated.add(next.stringIndex)
        return updated
      })
    }
  }, [])

  const setTuningId = useCallback((id: TuningId) => {
    setTuningIdState(id)
    saveTuning(id)
    setTunedStrings(new Set())
  }, [])

  const selectString = useCallback((index: number) => {
    setMode('manual')
    setManualStringIndex(index)
  }, [])

  const enableAuto = useCallback(() => {
    setMode('auto')
    setManualStringIndex(null)
  }, [])

  useEffect(() => {
    const controller = createTunerController({
      onReading: handleReading,
      onStatusChange: setMicStatus,
      onError: (message) => {
        setErrorMessage(message)
        setMicStatus('error')
      },
    })
    controllerRef.current = controller

    return () => {
      controller.stop()
      controllerRef.current = null
    }
  }, [handleReading])

  useEffect(() => {
    controllerRef.current?.setConfig({
      tuningId,
      mode,
      manualStringIndex,
    })
  }, [tuningId, mode, manualStringIndex])

  useEffect(() => {
    const controller = controllerRef.current
    if (!controller) return

    if (active && micEnabled) {
      setErrorMessage(null)
      setTunedStrings(new Set())
      void controller.start().catch((err: unknown) => {
        setErrorMessage(err instanceof Error ? err.message : String(err))
        setMicStatus('error')
      })
      return () => {
        controller.stop()
      }
    }

    controller.stop()
    setMicStatus('idle')
    setTunedStrings(new Set())
    setReading(
      buildTunerReading({
        tuningId,
        mode,
        manualStringIndex,
        detectedMidi: null,
        hasSignal: false,
        micStatus: 'idle',
      }),
    )
  }, [active, micEnabled])

  const stringTargets = getStringTargets(tuningId)

  return {
    tuningId,
    setTuningId,
    mode,
    enableAuto,
    selectString,
    manualStringIndex,
    micStatus,
    errorMessage,
    reading,
    stringTargets,
    tunedStrings,
  }
}

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { MicFeedbackToast } from '../components/MicFeedbackToast'
import { useMicKeyboardShortcut } from '../hooks/useMicKeyboardShortcut'
import { loadMicEnabled, saveMicEnabled } from '../lib/storage'

interface MicContextValue {
  micEnabled: boolean
  toggleMic: () => void
  setMicEnabled: (enabled: boolean) => void
}

const MicContext = createContext<MicContextValue | null>(null)

const FEEDBACK_MS = 2000

export function MicProvider({ children }: { children: ReactNode }) {
  const [micEnabled, setMicEnabledState] = useState(() => loadMicEnabled())
  const [feedback, setFeedback] = useState<string | null>(null)
  const feedbackTimerRef = useRef<number | null>(null)

  const showFeedback = useCallback((enabled: boolean) => {
    setFeedback(enabled ? 'Mikrofon eingeschaltet' : 'Mikrofon ausgeschaltet')
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current)
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null)
      feedbackTimerRef.current = null
    }, FEEDBACK_MS)
  }, [])

  const setMicEnabled = useCallback(
    (enabled: boolean) => {
      setMicEnabledState((prev) => {
        if (prev === enabled) return prev
        saveMicEnabled(enabled)
        showFeedback(enabled)
        return enabled
      })
    },
    [showFeedback],
  )

  const toggleMic = useCallback(() => {
    setMicEnabledState((prev) => {
      const next = !prev
      saveMicEnabled(next)
      showFeedback(next)
      return next
    })
  }, [showFeedback])

  useMicKeyboardShortcut(toggleMic)

  const value = useMemo(
    () => ({ micEnabled, toggleMic, setMicEnabled }),
    [micEnabled, toggleMic, setMicEnabled],
  )

  return (
    <MicContext.Provider value={value}>
      {children}
      <MicFeedbackToast message={feedback} />
    </MicContext.Provider>
  )
}

export function useMicEnabled(): MicContextValue {
  const ctx = useContext(MicContext)
  if (!ctx) {
    throw new Error('useMicEnabled must be used within MicProvider')
  }
  return ctx
}

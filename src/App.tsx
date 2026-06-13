import { useEffect, useState } from 'react'
import { AppTabBar, type AppTab } from './components/AppTabBar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OnboardingOverlay, hasSeenOnboarding } from './components/OnboardingOverlay'
import { DebugOverlay } from './components/DebugOverlay'
import { MicProvider } from './context/MicContext'
import { closeAudioContext } from './lib/playChord'
import type { PracticeSessionConfig } from './screens/SetupScreen'
import { NotePracticeScreen } from './screens/NotePracticeScreen'
import { PracticeScreen } from './screens/PracticeScreen'
import { SetupScreen } from './screens/SetupScreen'
import { SummaryScreen } from './screens/SummaryScreen'
import { TunerScreen } from './screens/TunerScreen'

type Screen = 'setup' | 'practice' | 'summary'

interface SummaryData {
  count: number
  sessionChordIds: Set<string>
  config: PracticeSessionConfig
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('practice')
  const [screen, setScreen] = useState<Screen>('setup')
  const [session, setSession] = useState<PracticeSessionConfig | null>(null)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding())

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) closeAudioContext()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const handleStart = (config: PracticeSessionConfig) => {
    setSession(config)
    setScreen('practice')
  }

  const exitPractice = () => {
    setScreen('setup')
    setSession(null)
  }

  const handlePracticeDone = (result: { count: number; sessionChordIds: Set<string> }) => {
    if (!session || session.mode !== 'chords') {
      setScreen('setup')
      setSession(null)
      return
    }
    setSummary({ ...result, config: session })
    setScreen('summary')
  }

  const handlePlayAgain = () => {
    if (summary) handleStart(summary.config)
  }

  const handleSummaryDone = () => {
    setScreen('setup')
    setSession(null)
    setSummary(null)
  }

  const handleOpenHelp = () => setShowOnboarding(true)

  const renderContent = () => {
    if (activeTab === 'tuner') {
      return <TunerScreen active />
    }

    if (screen === 'summary' && summary) {
      return (
        <SummaryScreen
          count={summary.count}
          sessionChordIds={summary.sessionChordIds}
          onPlayAgain={handlePlayAgain}
          onDone={handleSummaryDone}
        />
      )
    }

    if (screen === 'practice' && session) {
      if (session.mode === 'notes') {
        return (
          <NotePracticeScreen
            tuningId={session.tuningId}
            noteIds={session.ids}
            onDone={exitPractice}
          />
        )
      }

      return (
        <PracticeScreen
          tuningId={session.tuningId}
          chordIds={session.ids}
          onDone={handlePracticeDone}
        />
      )
    }

    return <SetupScreen onStart={handleStart} onOpenHelp={handleOpenHelp} />
  }

  return (
    <ErrorBoundary>
      <MicProvider>
        <div className="flex min-h-dvh flex-col">
          <main className="flex-1">{renderContent()}</main>
          <AppTabBar activeTab={activeTab} onChange={setActiveTab} />
        </div>
        {showOnboarding && (
          <OnboardingOverlay onClose={() => setShowOnboarding(false)} />
        )}
        <DebugOverlay />
      </MicProvider>
    </ErrorBoundary>
  )
}

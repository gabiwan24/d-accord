import { useEffect, useState } from 'react'
import { AppTabBar, type AppTab } from './components/AppTabBar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { MicProvider } from './context/MicContext'
import { closeAudioContext } from './lib/playChord'
import type { PracticeSessionConfig } from './screens/SetupScreen'
import { NotePracticeScreen } from './screens/NotePracticeScreen'
import { PracticeScreen } from './screens/PracticeScreen'
import { SetupScreen } from './screens/SetupScreen'
import { TunerScreen } from './screens/TunerScreen'

type Screen = 'setup' | 'practice'

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('practice')
  const [screen, setScreen] = useState<Screen>('setup')
  const [session, setSession] = useState<PracticeSessionConfig | null>(null)

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

  const renderContent = () => {
    if (activeTab === 'tuner') {
      return <TunerScreen active />
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
          onDone={exitPractice}
        />
      )
    }

    return <SetupScreen onStart={handleStart} />
  }

  return (
    <ErrorBoundary>
      <MicProvider>
        <div className="flex min-h-dvh flex-col">
          <main className="flex-1">{renderContent()}</main>
          <AppTabBar activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </MicProvider>
    </ErrorBoundary>
  )
}

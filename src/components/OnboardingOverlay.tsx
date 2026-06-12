import { useState } from 'react'
import { ChordCard } from './ChordCard'
import { getChord } from '../data/chords'

const ONBOARDING_KEY = 'ukulele-onboarded'

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1'
  } catch {
    return false
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1')
  } catch {
    // ignore
  }
}

function CChordScreen() {
  const chord = getChord('C')
  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      {chord && (
        <ChordCard
          name={chord.displayName}
          shape={chord.shapes.highG}
          accent={chord.accent}
          size="sm"
          showLabel
        />
      )}
      <p className="max-w-xs text-center text-sm leading-relaxed text-muted">
        Tippe das Diagramm um einen Vorschau-Ton zu hören.
      </p>
    </div>
  )
}

interface OnboardingOverlayProps {
  onClose: () => void
}

export function OnboardingOverlay({ onClose }: OnboardingOverlayProps) {
  const [step, setStep] = useState(0)
  const isLast = step === 3

  const handleClose = () => {
    markOnboardingSeen()
    onClose()
  }

  const handleNext = () => {
    if (isLast) {
      handleClose()
    } else {
      setStep((s) => s + 1)
    }
  }

  const screens = [
    {
      title: 'Willkommen',
      body: (
        <p className="mt-4 max-w-xs text-center text-sm leading-relaxed text-muted">
          Sehen → Spielen → Bestätigung.
          <br />
          Wähle Akkorde, spiele sie auf deiner Ukulele — die App bestätigt automatisch.
        </p>
      ),
    },
    {
      title: 'Akkord-Diagramm',
      body: <CChordScreen />,
    },
    {
      title: 'Mikrofon',
      body: (
        <div className="mt-4 flex flex-col items-center gap-3">
          <span className="text-5xl">🎤</span>
          <p className="max-w-xs text-center text-sm leading-relaxed text-muted">
            Spiele den Akkord auf deiner Ukulele.
            <br />
            Die App erkennt ihn automatisch und springt weiter.
            <br />
            <br />
            Taste <strong>M</strong> schaltet das Mikrofon ein und aus.
          </p>
        </div>
      ),
    },
    {
      title: "Los geht's",
      body: (
        <p className="mt-4 max-w-xs text-center text-sm leading-relaxed text-muted">
          Bereit? Wähle deine Akkorde und starte die Übung.
        </p>
      ),
    },
  ]

  const screen = screens[step]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-cream px-6 pb-6 pt-8 shadow-lg">
        <h2 className="text-center text-lg font-normal text-ink">{screen.title}</h2>

        {screen.body}

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleNext}
            className="flex min-h-11 w-full items-center justify-center rounded-lg bg-ink text-base text-cream transition-opacity active:opacity-80"
          >
            {isLast ? 'Starten' : 'Weiter'}
          </button>

          {!isLast && (
            <button
              type="button"
              onClick={handleClose}
              className="flex min-h-9 w-full items-center justify-center text-sm text-muted transition-opacity active:opacity-60"
            >
              Überspringen
            </button>
          )}
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === step ? 'w-4 bg-ink' : 'w-1.5 bg-ink/25'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

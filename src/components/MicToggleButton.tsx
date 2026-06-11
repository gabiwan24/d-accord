import { useMicEnabled } from '../context/MicContext'
import { useIsDesktopPointer } from '../hooks/useIsDesktopPointer'

function MicIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
      {muted && <path d="M4 4l16 16" />}
    </svg>
  )
}

export function MicToggleButton() {
  const { micEnabled, toggleMic } = useMicEnabled()
  const isDesktop = useIsDesktopPointer()
  const actionLabel = micEnabled ? 'Mikrofon ausschalten' : 'Mikrofon einschalten'
  const shortcutHint = isDesktop ? ' (M)' : ''

  return (
    <button
      type="button"
      onClick={toggleMic}
      aria-pressed={micEnabled}
      aria-keyshortcuts={isDesktop ? 'M' : undefined}
      aria-label={`${actionLabel}${shortcutHint}`}
      title={`${actionLabel}${shortcutHint}`}
      className={`touch-target flex shrink-0 items-center justify-center border-l border-ink/10 px-4 transition-colors ${
        micEnabled
          ? 'text-ink active:bg-ink/5'
          : 'bg-ink/5 text-muted active:bg-ink/10'
      }`}
    >
      <MicIcon muted={!micEnabled} />
    </button>
  )
}

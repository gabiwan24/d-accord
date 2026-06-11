import type { MicStatus } from '../lib/audioDetector'

const STATUS_LABEL: Record<MicStatus, string> = {
  idle: '',
  listening: 'Hört zu…',
  almost: 'Fast!',
  correct: 'Richtig!',
  error: 'Mikrofon-Fehler',
}

interface MicStatusProps {
  status: MicStatus
  errorMessage?: string | null
  disabled?: boolean
}

export function MicStatus({ status, errorMessage, disabled }: MicStatusProps) {
  if (disabled) {
    return <p className="text-sm text-muted">Mikrofon aus</p>
  }

  if (status === 'idle') return null

  if (status === 'error') {
    return (
      <div className="text-center">
        <p className="text-sm text-ink">{STATUS_LABEL.error}</p>
        {errorMessage && (
          <p className="mt-1 text-xs text-muted">{errorMessage}</p>
        )}
        <p className="mt-2 text-xs text-muted">
          Mikrofon-Berechtigung in den Browser-Einstellungen prüfen.
        </p>
      </div>
    )
  }

  return (
    <p
      className={`text-sm ${
        status === 'correct'
          ? 'text-success'
          : status === 'almost'
            ? 'text-ink'
            : 'text-muted'
      }`}
    >
      {STATUS_LABEL[status]}
    </p>
  )
}

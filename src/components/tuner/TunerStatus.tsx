import type { TunerMicStatus } from '../../lib/tunerEngine'

const STATUS_LABEL: Record<TunerMicStatus, string> = {
  idle: '',
  listening: 'Hört zu…',
  detecting: 'Stimme die Saite…',
  in_tune: 'Stimmt!',
  error: 'Mikrofon-Fehler',
}

interface TunerStatusProps {
  status: TunerMicStatus
  errorMessage?: string | null
  disabled?: boolean
}

export function TunerStatus({ status, errorMessage, disabled }: TunerStatusProps) {
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
        status === 'in_tune'
          ? 'text-success'
          : status === 'detecting'
            ? 'text-ink'
            : 'text-muted'
      }`}
    >
      {STATUS_LABEL[status]}
    </p>
  )
}

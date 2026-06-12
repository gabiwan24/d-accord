import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="text-base text-ink">Etwas ist schiefgelaufen.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-ink px-4 py-2 text-sm text-cream"
          >
            Neu laden
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

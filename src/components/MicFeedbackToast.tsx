interface MicFeedbackToastProps {
  message: string | null
}

export function MicFeedbackToast({ message }: MicFeedbackToastProps) {
  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center above-tab-bar px-4"
    >
      <p className="rounded-full border border-ink/10 bg-cream/95 px-4 py-2 text-sm font-medium text-ink shadow-sm backdrop-blur-sm">
        {message}
      </p>
    </div>
  )
}

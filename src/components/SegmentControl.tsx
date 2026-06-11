interface SegmentOption<T extends string> {
  id: T
  label: string
}

interface SegmentControlProps<T extends string> {
  value: T
  options: SegmentOption<T>[]
  onChange: (id: T) => void
  'aria-label': string
}

export function SegmentControl<T extends string>({
  value,
  options,
  onChange,
  'aria-label': ariaLabel,
}: SegmentControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={`touch-target rounded px-1 py-2.5 text-center text-xs leading-tight transition-colors sm:text-sm ${
              active
                ? 'bg-ink text-cream'
                : 'bg-ink/5 text-muted active:bg-ink/10'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

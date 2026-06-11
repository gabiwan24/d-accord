interface StringRowProps {
  name: string
  label: string
  isActive: boolean
  isTuned: boolean
  selected: boolean
  onSelect: () => void
}

export function StringRow({
  name,
  label,
  isActive,
  isTuned,
  selected,
  onSelect,
}: StringRowProps) {
  const showGreen = isTuned
  const showActive = isActive && !isTuned

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        showGreen
          ? 'bg-success/12 ring-1 ring-success/35'
          : showActive
            ? 'bg-ink/8 ring-1 ring-ink/15'
            : selected
              ? 'bg-ink/5 ring-1 ring-ink/10'
              : 'bg-transparent active:bg-ink/5'
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
          showGreen
            ? 'bg-success text-cream'
            : showActive
              ? 'bg-ink text-cream'
              : 'bg-ink/10 text-muted'
        }`}
      >
        {name}
      </span>
      <span className={`flex-1 text-sm ${showGreen ? 'text-success' : ''}`}>
        {label}
      </span>
      <span
        className={`min-w-[3.25rem] text-right text-xs ${
          showGreen
            ? 'font-medium text-success'
            : showActive
              ? 'text-ink'
              : 'text-muted'
        }`}
      >
        {showGreen ? 'stimmt' : showActive ? '…' : '\u00A0'}
      </span>
    </button>
  )
}

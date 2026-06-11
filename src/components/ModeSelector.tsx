import type { PracticeMode } from '../data/notes'
import { SegmentControl } from './SegmentControl'

interface ModeSelectorProps {
  value: PracticeMode
  onChange: (mode: PracticeMode) => void
}

const MODES = [
  { id: 'chords' as const, label: 'Akkorde' },
  { id: 'notes' as const, label: 'Einzeltöne' },
]

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <SegmentControl
      aria-label="Übungsmodus"
      value={value}
      options={MODES}
      onChange={onChange}
    />
  )
}

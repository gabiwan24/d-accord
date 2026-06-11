import { TUNING_LIST, type TuningId } from '../data/tunings'
import { SegmentControl } from './SegmentControl'

interface TuningSelectorProps {
  value: TuningId
  onChange: (id: TuningId) => void
}

const OPTIONS = TUNING_LIST.map((t) => ({
  id: t.id,
  label: t.shortLabel === 'High G' ? 'High G' : t.label,
}))

export function TuningSelector({ value, onChange }: TuningSelectorProps) {
  return (
    <SegmentControl
      aria-label="Stimmung"
      value={value}
      options={OPTIONS}
      onChange={onChange}
    />
  )
}

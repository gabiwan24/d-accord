import type { AccentColor } from '../data/notes'
import type { NotePosition } from '../lib/notePositions'
import type { TuningId } from '../data/tunings'
import { FretboardDiagram, type FretboardSize } from './FretboardDiagram'

const ACCENT_CLASS: Record<AccentColor, string> = {
  pink: 'bg-accent-pink',
  grey: 'bg-accent-grey',
  purple: 'bg-accent-purple',
  mint: 'bg-accent-mint',
  peach: 'bg-accent-peach',
  blue: 'bg-accent-blue',
  sage: 'bg-accent-sage',
  lavender: 'bg-accent-lavender',
  coral: 'bg-accent-coral',
}

interface NoteCardProps {
  name: string
  tuningId: TuningId
  positions: NotePosition[]
  accent: AccentColor
  size?: FretboardSize
  pulse?: boolean
}

const NAME_SIZE: Record<FretboardSize, string> = {
  lg: 'text-3xl mt-3',
  sm: 'text-sm mt-1.5',
  xs: 'text-[10px] mt-0.5 leading-tight',
}

export function NoteCard({
  name,
  tuningId,
  positions,
  accent,
  size = 'sm',
  pulse = false,
}: NoteCardProps) {
  const accentClass = ACCENT_CLASS[accent]

  return (
    <div className="flex flex-col items-center">
      <FretboardDiagram tuningId={tuningId} positions={positions} size={size} />
      <div
        className={`mt-2 h-0.5 w-full max-w-[90%] ${accentClass} ${pulse ? 'accent-pulse' : ''}`}
      />
      <span className={`font-normal text-ink ${NAME_SIZE[size]}`}>{name}</span>
    </div>
  )
}

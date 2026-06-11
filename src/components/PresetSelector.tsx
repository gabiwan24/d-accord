import type { ChordPresetId } from '../data/chordPresets'
import { CHORD_PRESETS, getChordPreset } from '../data/chordPresets'

interface PresetSelectorProps {
  value: ChordPresetId
  onChange: (id: ChordPresetId) => void
}

const CUSTOM_LABEL = 'Eigene Auswahl'

export function PresetSelector({ value, onChange }: PresetSelectorProps) {
  const active = value === 'custom' ? undefined : getChordPreset(value)

  return (
    <div>
      <label htmlFor="chord-preset" className="sr-only">
        Akkord-Preset
      </label>
      <select
        id="chord-preset"
        value={value}
        onChange={(e) => onChange(e.target.value as ChordPresetId)}
        className="touch-target w-full appearance-none rounded border border-ink/10 bg-ink/5 px-3 py-2.5 text-sm text-ink outline-none focus:border-ink/25"
      >
        {CHORD_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
        <option value="custom">{CUSTOM_LABEL}</option>
      </select>
      <p className="mt-1.5 text-xs leading-snug text-muted">
        {active?.description ??
          'Akkorde manuell gewählt — Preset wechseln setzt die Auswahl zurück.'}
      </p>
    </div>
  )
}

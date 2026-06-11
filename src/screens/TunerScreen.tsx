import { CentGauge } from '../components/tuner/CentGauge'
import { StringRow } from '../components/tuner/StringRow'
import { TunerStatus } from '../components/tuner/TunerStatus'
import { SegmentControl } from '../components/SegmentControl'
import { TuningSelector } from '../components/TuningSelector'
import { useMicEnabled } from '../context/MicContext'
import { useTuner } from '../hooks/useTuner'

interface TunerScreenProps {
  active: boolean
}

export function TunerScreen({ active }: TunerScreenProps) {
  const {
    tuningId,
    setTuningId,
    mode,
    enableAuto,
    selectString,
    manualStringIndex,
    micStatus,
    errorMessage,
    reading,
    stringTargets,
    tunedStrings,
  } = useTuner({ active })

  const { micEnabled } = useMicEnabled()

  const hasSignal = reading.detectedMidi !== null
  const centsLabel = hasSignal
    ? `${reading.cents > 0 ? '+' : ''}${Math.round(reading.cents)} Cent`
    : '—'

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col px-4 pt-6 content-tab-bar-pad">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-lg font-medium">Stimmgerät</h1>
        <div className="w-40 shrink-0">
          <TuningSelector value={tuningId} onChange={setTuningId} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 py-6">
        <CentGauge
          cents={reading.cents}
          inTune={reading.inTune}
          hasSignal={hasSignal}
        />
        <div className="flex h-[4.75rem] w-full max-w-xs flex-col items-center justify-center text-center">
          <p
            className={`min-h-[2.25rem] text-2xl leading-none tabular-nums ${
              hasSignal
                ? reading.inTune
                  ? 'text-success'
                  : 'text-ink'
                : 'text-muted/40'
            }`}
          >
            {hasSignal ? reading.detectedLabel : '—'}
          </p>
          <p className="mt-2 min-h-[1.25rem] text-sm text-muted tabular-nums">
            Ziel: {reading.targetLabel} · {centsLabel}
          </p>
        </div>
      </div>

      <div className="space-y-1">
        {stringTargets.map((target) => (
          <StringRow
            key={target.index}
            name={target.name}
            label={target.label}
            isActive={reading.stringIndex === target.index && hasSignal}
            isTuned={tunedStrings.has(target.index)}
            selected={mode === 'manual' && manualStringIndex === target.index}
            onSelect={() => selectString(target.index)}
          />
        ))}
      </div>

      <div className="mt-6">
        <SegmentControl
          aria-label="Stimm-Modus"
          value={mode}
          options={[
            { id: 'auto' as const, label: 'Auto' },
            {
              id: 'manual' as const,
              label:
                mode === 'manual' && manualStringIndex !== null
                  ? `Manuell: ${stringTargets[manualStringIndex]?.name ?? '?'}`
                  : 'Manuell',
            },
          ]}
          onChange={(next) => {
            if (next === 'auto') enableAuto()
            else selectString(manualStringIndex ?? 0)
          }}
        />
      </div>

      <div className="mt-6 flex min-h-[3rem] justify-center">
        <TunerStatus
          status={micStatus}
          errorMessage={errorMessage}
          disabled={!micEnabled}
        />
      </div>
    </div>
  )
}

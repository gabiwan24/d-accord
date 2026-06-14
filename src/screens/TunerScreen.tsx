import { TunerMeter } from '../components/tuner/TunerMeter'
import { TunerStatus } from '../components/tuner/TunerStatus'
import { SegmentControl } from '../components/SegmentControl'
import { TuningSelector } from '../components/TuningSelector'
import { useMicEnabled } from '../context/MicContext'
import { useTuner } from '../hooks/useTuner'
import { IN_TUNE_CENTS } from '../lib/tunerEngine'

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
  const roundedCents = Math.round(reading.cents)

  const allTuned =
    stringTargets.length > 0 && tunedStrings.size === stringTargets.length

  // Direction + cents readout for the active string.
  let readout: string
  let readoutClass: string
  if (!hasSignal) {
    readout = `Ziel: ${reading.targetLabel} · spiel eine Saite`
    readoutClass = 'text-muted'
  } else if (reading.inTune) {
    readout = `${reading.targetLabel} · gestimmt ✓`
    readoutClass = 'text-success'
  } else {
    const dir = reading.cents > IN_TUNE_CENTS ? 'zu hoch' : 'zu tief'
    const sign = roundedCents > 0 ? '+' : ''
    readout = `${reading.targetLabel} · ${dir} (${sign}${roundedCents} ct)`
    readoutClass = 'text-ink'
  }

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col px-4 pt-6 content-tab-bar-pad">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-lg font-medium">Stimmgerät</h1>
        <div className="w-40 shrink-0">
          <TuningSelector value={tuningId} onChange={setTuningId} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 py-2">
        <TunerMeter
          targets={stringTargets}
          activeIndex={hasSignal ? reading.stringIndex : -1}
          cents={reading.cents}
          inTune={reading.inTune}
          hasSignal={hasSignal}
          tunedStrings={tunedStrings}
          selectedIndex={mode === 'manual' ? manualStringIndex : null}
          onSelectString={selectString}
        />

        <div className="flex h-12 flex-col items-center justify-center text-center">
          <p
            className={`text-3xl leading-none tabular-nums ${
              hasSignal ? (reading.inTune ? 'text-success' : 'text-ink') : 'text-muted/40'
            }`}
          >
            {hasSignal ? reading.detectedLabel : '—'}
          </p>
        </div>
        <p className={`-mt-2 text-sm tabular-nums ${readoutClass}`}>{readout}</p>
      </div>

      {allTuned && (
        <div className="mt-2 rounded-lg bg-success/12 px-4 py-3 text-center text-sm font-medium text-success ring-1 ring-success/30">
          ✓ Alle Saiten gestimmt
        </div>
      )}

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
        {mode === 'manual' && (
          <p className="mt-2 text-center text-xs text-muted">
            Tippe im Meter auf eine Saite, um sie auszuwählen
          </p>
        )}
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

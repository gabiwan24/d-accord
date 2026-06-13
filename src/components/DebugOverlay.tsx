import { useEffect, useRef, useState } from 'react'
import { clearLog, getLog, subscribe, type DebugFrame } from '../lib/debugStore'

const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function pcName(pc: number): string {
  return PC_NAMES[pc] ?? String(pc)
}

function pcsLabel(pcs: number[]): string {
  return pcs.length === 0 ? '—' : pcs.map(pcName).join(',')
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return [
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join(':') + '.' + String(d.getMilliseconds()).slice(0, 1)
}

export function DebugOverlay() {
  const [latest, setLatest] = useState<DebugFrame | null>(null)
  const [logVersion, setLogVersion] = useState(0)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = subscribe((frame) => {
      setLatest(frame)
      setLogVersion((v) => v + 1)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logVersion])

  const handleDownload = () => {
    const entries = getLog()
    const cols = [
      'source', 'timestamp', 'hz', 'rawMidi', 'energy',
      'pitchClasses', 'stable', 'smoothedMidi', 'cents',
      'detectedString', 'target', 'correct', 'noise', 'missing',
    ]
    const headerLine = `Ukulele Debug Log — ${new Date().toISOString()}\n`
    const colLine = cols.join('\t') + '\n'
    const rows = entries
      .map((f) =>
        [
          f.source,
          formatTime(f.timestamp),
          f.hz?.toFixed(1) ?? '-',
          f.rawMidi?.toFixed(1) ?? '-',
          f.energy.toFixed(4),
          f.pitchClasses.join(',') || '-',
          String(f.stable),
          f.smoothedMidi?.toFixed(1) ?? '-',
          f.cents?.toFixed(1) ?? '-',
          f.detectedString ?? '-',
          f.targetPitchClasses.join(',') || '-',
          f.correct.join(',') || '-',
          f.noise.join(',') || '-',
          f.missing.join(',') || '-',
        ].join('\t'),
      )
      .join('\n')

    const blob = new Blob([headerLine + colLine + rows], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ukulele-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    clearLog()
    setLatest(null)
    setLogVersion((v) => v + 1)
  }

  const logEntries = getLog()
  const hasTarget = latest !== null && latest.targetPitchClasses.length > 0

  return (
    <div className="fixed bottom-4 right-4 z-[200] w-72 overflow-hidden rounded-lg bg-ink/90 shadow-lg ring-1 ring-cream/10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cream/10 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-cream/50">
          Debug
        </span>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] text-cream/40 hover:text-cream"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="text-[10px] text-cream/40 hover:text-cream"
          >
            ↓ Log ({logEntries.length})
          </button>
        </div>
      </div>

      {/* Live */}
      <div className="border-b border-cream/10 px-3 py-2 font-mono text-[10px] text-cream">
        {latest ? (
          <>
            <div className="mb-1 text-cream/40">
              LIVE · {latest.source}
            </div>
            <div>
              Hz: {latest.hz?.toFixed(1) ?? '—'} &nbsp; MIDI:{' '}
              {latest.rawMidi?.toFixed(1) ?? '—'} &nbsp; E:{' '}
              {latest.energy.toFixed(4)}
            </div>
            <div>
              PCs: [{pcsLabel(latest.pitchClasses)}] &nbsp;{' '}
              {latest.stable ? '✓' : '~'}
            </div>
            {(latest.smoothedMidi !== null || latest.cents !== null) && (
              <div>
                ↳ {latest.smoothedMidi?.toFixed(1) ?? '—'} &nbsp; Cents:{' '}
                {latest.cents !== null
                  ? (latest.cents > 0 ? '+' : '') + latest.cents.toFixed(0)
                  : '—'}{' '}
                &nbsp; {latest.detectedString ?? ''}
              </div>
            )}
            {hasTarget && (
              <div className="mt-1 border-t border-cream/10 pt-1">
                <div>Target: [{pcsLabel(latest.targetPitchClasses)}]</div>
                <div>
                  ✓ [{pcsLabel(latest.correct)}] &nbsp; ✗ [{pcsLabel(latest.noise)}] &nbsp; △ [{pcsLabel(latest.missing)}]
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-cream/30">Kein Signal</div>
        )}
      </div>

      {/* Log */}
      <div
        ref={logRef}
        className="max-h-40 overflow-y-auto px-3 py-2 font-mono text-[9px] text-cream/50"
      >
        {logEntries.length === 0 ? (
          <div className="text-cream/25">Log leer</div>
        ) : (
          logEntries.map((f, i) => (
            <div key={i} className="leading-relaxed">
              {formatTime(f.timestamp)} [{f.source[0].toUpperCase()}] E:
              {f.energy.toFixed(3)} [{f.pitchClasses.join(',')}]
              {f.targetPitchClasses.length > 0 &&
                ` ✓[${f.correct.join(',')}] ✗[${f.noise.join(',')}] △[${f.missing.join(',')}]`}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { clearLog, getLog, subscribe, type DebugFrame } from '../lib/debugStore'

const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'H']

// Half-life of ~180ms at 60fps: 0.9^(60*0.18) ≈ 0.5
const CHROMAGRAM_HALF_LIFE_MS = 180

function PitchChromagram() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const strength = new Float32Array(12)
    const targetSet = new Set<number>()
    let lastTs = performance.now()
    let rafId = 0

    const unsub = subscribe((frame) => {
      if (frame.source !== 'detector') return
      targetSet.clear()
      for (const pc of frame.targetPitchClasses) targetSet.add(((pc % 12) + 12) % 12)
      for (const pc of frame.pitchClasses) {
        const n = ((pc % 12) + 12) % 12
        strength[n] = Math.min(1, strength[n] + 0.55)
      }
    })

    const draw = () => {
      const now = performance.now()
      const dt = now - lastTs
      lastTs = now
      const decay = Math.pow(0.5, dt / CHROMAGRAM_HALF_LIFE_MS)
      for (let i = 0; i < 12; i++) strength[i] *= decay

      const W = canvas.width
      const H = canvas.height
      const labelH = 11
      const barAreaH = H - labelH
      const bW = Math.floor(W / 12)
      const gap = 1

      ctx.clearRect(0, 0, W, H)

      for (let i = 0; i < 12; i++) {
        const x = i * bW
        const s = strength[i]
        const isTarget = targetSet.has(i)

        // dim background for target slots
        if (isTarget) {
          ctx.fillStyle = 'rgba(100,210,130,0.12)'
          ctx.fillRect(x, 0, bW - gap, barAreaH)
        }

        // filled bar
        const barH = Math.round(s * barAreaH)
        if (barH > 0) {
          ctx.fillStyle = isTarget
            ? `rgba(100,210,130,${0.4 + s * 0.6})`
            : `rgba(180,160,255,${0.3 + s * 0.7})`
          ctx.fillRect(x, barAreaH - barH, bW - gap, barH)
        }

        // label
        ctx.fillStyle = isTarget
          ? `rgba(120,220,140,${0.5 + s * 0.5})`
          : `rgba(200,200,200,${0.35 + s * 0.35})`
        ctx.font = '7px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(PC_NAMES[i], x + (bW - gap) / 2, H - 1)
      }

      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)
    return () => {
      unsub()
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={288}
      height={68}
      className="block w-full"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

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

      {/* Chromagram */}
      <div className="border-b border-cream/10 px-3 pt-2 pb-1">
        <PitchChromagram />
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

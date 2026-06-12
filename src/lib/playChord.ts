import type { ChordShape } from '../data/chords'
import { TUNINGS, type TuningId } from '../data/tunings'
import { suppressDetection } from './detectionSuppress'
import { midiToHz } from './musicMath'

let sharedContext: AudioContext | null = null
let masterBus: GainNode | null = null

const PLUCK_CACHE_KEY = 'v3-warm'
const pluckCache = new Map<string, AudioBuffer>()

function getContext(): AudioContext {
  if (!sharedContext) {
    sharedContext = new AudioContext()
  }
  return sharedContext
}

function getMasterBus(ctx: AudioContext): GainNode {
  if (!masterBus) {
    masterBus = ctx.createGain()
    masterBus.gain.value = 0.9
    masterBus.connect(ctx.destination)
  }
  return masterBus
}

/**
 * Karplus-Strong mit weicher Anregung und stärkerer Tiefenfilterung.
 */
function makePluckBuffer(ctx: AudioContext, midi: number): AudioBuffer {
  const cacheKey = `${PLUCK_CACHE_KEY}-${midi}`
  const cached = pluckCache.get(cacheKey)
  if (cached) return cached

  const frequency = midiToHz(midi)
  const sampleRate = ctx.sampleRate
  const period = Math.max(2, Math.round(sampleRate / frequency))
  const duration = 3.2
  const totalSamples = Math.floor(sampleRate * duration)

  const ring = new Float32Array(period)
  for (let i = 0; i < period; i++) {
    const envelope = Math.sin((i / period) * Math.PI)
    ring[i] = (Math.random() * 2 - 1) * 0.32 * envelope
  }

  const output = new Float32Array(totalSamples)
  const damping = midi < 60 ? 0.9982 : 0.9988

  let pos = 0
  for (let i = 0; i < totalSamples; i++) {
    const current = ring[pos]
    const neighbor = ring[(pos + 1) % period]
    const neighbor2 = ring[(pos + 2) % period]
    output[i] = current
    const next = ((current + neighbor + neighbor2) / 3) * damping
    ring[pos] = next
    pos = (pos + 1) % period
  }

  const buffer = ctx.createBuffer(1, totalSamples, sampleRate)
  buffer.copyToChannel(output, 0)
  pluckCache.set(cacheKey, buffer)
  return buffer
}

function playString(
  ctx: AudioContext,
  midi: number,
  startTime: number,
  stringIndex: number,
) {
  const source = ctx.createBufferSource()
  source.buffer = makePluckBuffer(ctx, midi)

  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 2800 + stringIndex * 120
  lowpass.Q.value = 0.55

  const warmth = ctx.createBiquadFilter()
  warmth.type = 'lowshelf'
  warmth.frequency.value = 240
  warmth.gain.value = 5

  const body = ctx.createBiquadFilter()
  body.type = 'peaking'
  body.frequency.value = 420 + stringIndex * 90
  body.Q.value = 0.6
  body.gain.value = 1.5

  const gain = ctx.createGain()
  const level = 0.38 + Math.random() * 0.08
  gain.gain.setValueAtTime(level, startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.9)

  source.connect(lowpass)
  lowpass.connect(warmth)
  warmth.connect(body)
  body.connect(gain)
  gain.connect(getMasterBus(ctx))

  source.start(startTime)
}

/** Saiten klingen ~3 s; etwas Puffer für Lautsprecher→Mikrofon. */
const PREVIEW_SUPPRESS_MS = 3400

export async function playChordShape(
  shape: ChordShape,
  tuningId: TuningId,
): Promise<void> {
  suppressDetection(PREVIEW_SUPPRESS_MS)

  const ctx = getContext()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }

  const strings = TUNINGS[tuningId].strings
  const now = ctx.currentTime
  const strumDelay = 0.038 + Math.random() * 0.012
  let strumIndex = 0

  for (let i = 0; i < shape.frets.length; i++) {
    const fret = shape.frets[i]
    if (fret === null) continue
    playString(ctx, strings[i].midi + fret, now + strumIndex * strumDelay, i)
    strumIndex++
  }
}

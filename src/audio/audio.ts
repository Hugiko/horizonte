/**
 * Audio procedural con Web Audio: efectos y música ambiental sintetizados en tiempo real.
 * No usa archivos externos, así que no hay licencias que gestionar y no pesa nada.
 */
import { useGame } from '../state/store'

let ctx: AudioContext | null = null
let master: GainNode
let musicBus: GainNode
let sfxBus: GainNode
let reverb: ConvolverNode

function ensure() {
  if (ctx) return ctx
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = useGame.getState().volumen
  master.connect(ctx.destination)
  // reverberación sintética (ruido con caída exponencial)
  reverb = ctx.createConvolver()
  const len = ctx.sampleRate * 3.5
  const ir = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
  }
  reverb.buffer = ir
  const rvGain = ctx.createGain()
  rvGain.gain.value = 0.35
  reverb.connect(rvGain).connect(master)
  musicBus = ctx.createGain()
  musicBus.gain.value = 0.32
  musicBus.connect(master)
  musicBus.connect(reverb)
  sfxBus = ctx.createGain()
  sfxBus.gain.value = 0.55
  sfxBus.connect(master)
  sfxBus.connect(reverb)
  useGame.subscribe((s) => { master.gain.setTargetAtTime(s.volumen, ctx!.currentTime, 0.1) })
  return ctx
}

/** El navegador exige un gesto del usuario para activar el audio. */
export function unlockAudio() {
  const c = ensure()
  if (c && c.state === 'suspended') void c.resume()
}
if (typeof window !== 'undefined') {
  const once = () => { unlockAudio(); window.removeEventListener('pointerdown', once); window.removeEventListener('keydown', once) }
  window.addEventListener('pointerdown', once)
  window.addEventListener('keydown', once)
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
  const c = ensure()
  if (!c || c.state !== 'running') return
  const t = c.currentTime + delay
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(sfxBus)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function noise(dur: number, vol: number, filterFreq: number, delay = 0) {
  const c = ensure()
  if (!c || c.state !== 'running') return
  const t = c.currentTime + delay
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = filterFreq
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(sfxBus)
  src.start(t)
}

export const sfx = {
  hover: () => tone(1800, 0.05, 'sine', 0.04),
  click: () => { tone(900, 0.06, 'triangle', 0.12); tone(1350, 0.05, 'sine', 0.06, 0.02) },
  back: () => tone(600, 0.08, 'triangle', 0.1, 0, 400),
  open: () => { tone(420, 0.25, 'sine', 0.08, 0, 840); noise(0.25, 0.05, 3000) },
  correct: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.13, i * 0.07)) },
  wrong: () => { tone(220, 0.25, 'sawtooth', 0.07); tone(207, 0.3, 'sawtooth', 0.07, 0.08) },
  hint: () => { tone(1200, 0.15, 'sine', 0.08); tone(1600, 0.2, 'sine', 0.07, 0.08) },
  alarm: () => { for (let i = 0; i < 3; i++) tone(880, 0.18, 'square', 0.05, i * 0.3, 660) },
  star: (i = 0) => tone(1047 * Math.pow(1.26, i), 0.5, 'sine', 0.14, 0),
  levelUp: () => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.6, 'triangle', 0.1, i * 0.09)) },
  zap: () => { noise(0.3, 0.15, 5000); tone(120, 0.3, 'sawtooth', 0.08, 0, 60) },
  launch: () => { noise(2.5, 0.25, 400); tone(80, 2.5, 'sawtooth', 0.06, 0, 200) },
  type: () => tone(2400 + Math.random() * 400, 0.02, 'square', 0.015),
  step: () => noise(0.06, 0.04, 900),
  /** Golpe grave de tráiler ("braam"). */
  braam: () => {
    const c = ensure()
    if (!c || c.state !== 'running') return
    const t = c.currentTime
    const f = c.createBiquadFilter()
    f.type = 'lowpass'; f.frequency.setValueAtTime(180, t); f.frequency.exponentialRampToValueAtTime(1400, t + 0.35); f.frequency.exponentialRampToValueAtTime(120, t + 3.5)
    const g = c.createGain()
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 4)
    f.connect(g).connect(sfxBus)
    for (const [fr, det] of [[43.65, 0], [43.65, 9], [87.3, -6], [65.4, 4]]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = det
      o.connect(f); o.start(t); o.stop(t + 4.2)
    }
    noise(1.2, 0.18, 120)
  },
  /** Subida de tensión (riser). */
  riser: (dur = 4) => {
    const c = ensure()
    if (!c || c.state !== 'running') return
    const t = c.currentTime
    const o = c.createOscillator(); o.type = 'sawtooth'
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + dur)
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(4000, t + dur)
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.05)
    o.connect(f).connect(g).connect(sfxBus); o.start(t); o.stop(t + dur + 0.1)
  },
  /** Pulso de reloj (tic tac de tensión). */
  tick: () => tone(1500, 0.03, 'square', 0.03),
}

/* ---------- Voz del narrador (síntesis de voz del navegador) ---------- */
let voz: SpeechSynthesisVoice | null = null
function elegirVoz() {
  if (typeof speechSynthesis === 'undefined') return null
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'))
  voz = vs.find((v) => /es-ES/i.test(v.lang) && /natural|neural|online/i.test(v.name)) ?? vs.find((v) => /es-ES/i.test(v.lang)) ?? vs[0] ?? null
  return voz
}
if (typeof speechSynthesis !== 'undefined') speechSynthesis.onvoiceschanged = () => elegirVoz()

export function narrar(texto: string, quien: 'NARRADOR' | 'VERA' | 'DIRECTORA' | 'RADIO' = 'NARRADOR', onEnd?: () => void) {
  if (typeof speechSynthesis === 'undefined' || useGame.getState().volumen === 0) { onEnd?.(); return false }
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(texto)
  u.voice = voz ?? elegirVoz()
  u.lang = 'es-ES'
  u.rate = quien === 'NARRADOR' ? 0.92 : quien === 'RADIO' ? 1.08 : 1
  u.pitch = quien === 'VERA' ? 1.25 : quien === 'NARRADOR' ? 0.78 : 1
  u.volume = Math.min(1, useGame.getState().volumen * 1.3)
  if (onEnd) { u.onend = onEnd; u.onerror = onEnd }
  speechSynthesis.speak(u)
  return true
}
export const callar = () => { if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel() }

/* ---------- Música ambiental generativa ---------- */
export type Ambiente = 'base' | 'espacio' | 'tension' | 'victoria' | 'teoria' | null
const ESCALAS: Record<Exclude<Ambiente, null>, { notas: number[]; tempo: number; tipo: OscillatorType; brillo: number }> = {
  base: { notas: [220, 246.9, 277.2, 329.6, 370, 440, 493.9], tempo: 2.6, tipo: 'sine', brillo: 1400 },
  espacio: { notas: [110, 146.8, 164.8, 220, 293.7, 329.6], tempo: 4, tipo: 'sine', brillo: 900 },
  tension: { notas: [110, 116.5, 146.8, 155.6, 220, 233.1], tempo: 1.2, tipo: 'sawtooth', brillo: 700 },
  victoria: { notas: [261.6, 329.6, 392, 523.3, 659.3], tempo: 1.6, tipo: 'triangle', brillo: 2200 },
  teoria: { notas: [196, 246.9, 293.7, 370, 392, 493.9], tempo: 3.2, tipo: 'sine', brillo: 1200 },
}
let actual: Ambiente = null
let timer: ReturnType<typeof setTimeout> | undefined
let drone: { stop: () => void } | null = null

function startDrone(root: number, tipo: OscillatorType, brillo: number) {
  const c = ensure()!
  const g = c.createGain()
  g.gain.value = 0
  g.gain.linearRampToValueAtTime(0.09, c.currentTime + 3)
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = brillo * 0.4
  const lfo = c.createOscillator()
  const lfoG = c.createGain()
  lfo.frequency.value = 0.07
  lfoG.gain.value = brillo * 0.25
  lfo.connect(lfoG).connect(f.frequency)
  const oscs = [root / 2, root / 2 * 1.005, root * 0.75].map((fr) => {
    const o = c.createOscillator()
    o.type = tipo === 'sawtooth' ? 'sawtooth' : 'triangle'
    o.frequency.value = fr
    o.connect(f)
    o.start()
    return o
  })
  f.connect(g).connect(musicBus)
  lfo.start()
  return {
    stop: () => {
      const t = c.currentTime
      g.gain.cancelScheduledValues(t)
      g.gain.setValueAtTime(g.gain.value, t)
      g.gain.linearRampToValueAtTime(0, t + 2)
      setTimeout(() => { oscs.forEach((o) => o.stop()); lfo.stop() }, 2200)
    },
  }
}

export function setAmbiente(a: Ambiente) {
  if (a === actual) return
  actual = a
  clearTimeout(timer)
  drone?.stop()
  drone = null
  if (!a) return
  const c = ensure()
  if (!c) return
  const run = () => {
    if (actual !== a) return
    if (c.state !== 'running') { timer = setTimeout(run, 500); return }
    const e = ESCALAS[a]
    if (!drone) drone = startDrone(e.notas[0], e.tipo, e.brillo)
    const nota = e.notas[Math.floor(Math.random() * e.notas.length)] * (Math.random() < 0.3 ? 2 : 1)
    const t = c.currentTime
    const o = c.createOscillator()
    const g = c.createGain()
    const f = c.createBiquadFilter()
    o.type = a === 'tension' ? 'triangle' : 'sine'
    o.frequency.value = nota
    f.type = 'lowpass'
    f.frequency.value = e.brillo
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.07, t + e.tempo * 0.3)
    g.gain.exponentialRampToValueAtTime(0.0001, t + e.tempo * 2.2)
    o.connect(f).connect(g).connect(musicBus)
    o.start(t)
    o.stop(t + e.tempo * 2.4)
    timer = setTimeout(run, e.tempo * 1000 * (0.6 + Math.random() * 0.8))
  }
  run()
}

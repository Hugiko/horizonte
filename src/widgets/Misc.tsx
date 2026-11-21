import { useEffect, useRef, useState } from 'react'
import { sfx } from '../audio/audio'
import { COL, arrow, glowDot, label, useCanvas } from './useCanvas'

/* ------------------------------------------------------------------ Reactor (factor k) */
export function Reactor({ k0 = 1.08, alfa = 0.002 }: { k0?: number; alfa?: number }) {
  const [barras, setBarras] = useState(0)
  const N = useRef(1)
  const hist = useRef<number[]>([])
  const estable = useRef(0)
  const [estado, setEstado] = useState('')
  const k = k0 - barras * alfa
  const ref = useCanvas((ctx, w, h, _t, dt) => {
    N.current *= Math.pow(k, dt * 8)
    N.current = Math.min(50, Math.max(0.02, N.current))
    hist.current.push(N.current); if (hist.current.length > 300) hist.current.shift()
    const ok = N.current > 0.7 && N.current < 1.4 && Math.abs(k - 1) < 0.004
    estable.current = ok ? estable.current + dt : 0
    const txt = N.current >= 50 ? 'SUPERCRÍTICO · ¡inserta barras!' : N.current <= 0.02 ? 'SUBCRÍTICO · el reactor se apaga' : estable.current > 3 ? 'RÉGIMEN CRÍTICO ESTABLE ✓' : ''
    if (txt !== estado) setEstado(txt)
    // núcleo
    const cx = w * 0.22, cy = h / 2
    const glow = Math.min(1, N.current / 3)
    const g = ctx.createRadialGradient(cx, cy, 5, cx, cy, h * 0.45)
    g.addColorStop(0, `rgba(80,180,255,${0.4 + glow * 0.6})`); g.addColorStop(1, 'rgba(80,180,255,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, h * 0.45, 0, Math.PI * 2); ctx.fill()
    for (let i = 0; i < 5; i++) { ctx.fillStyle = 'rgba(200,210,220,.85)'; ctx.fillRect(cx - 40 + i * 20, cy - h * 0.38, 8, h * 0.76 * (barras / 100)) }
    for (let i = 0; i < Math.min(80, N.current * 15); i++) glowDot(ctx, cx + (Math.random() - 0.5) * h * 0.6, cy + (Math.random() - 0.5) * h * 0.6, 1.4, COL.holo)
    // gráfica
    const x0 = w * 0.45, gw = w * 0.52
    ctx.strokeStyle = 'rgba(63,224,255,.3)'; ctx.strokeRect(x0, 14, gw, h - 40)
    const Y = (v: number) => h - 26 - (Math.log10(v) + 2) / (Math.log10(50) + 2) * (h - 40)
    ctx.fillStyle = 'rgba(93,255,168,.12)'; ctx.fillRect(x0, Y(1.4), gw, Y(0.7) - Y(1.4))
    ctx.strokeStyle = COL.alert; ctx.lineWidth = 2; ctx.beginPath()
    hist.current.forEach((v, i) => { const px = x0 + (i / 300) * gw; i ? ctx.lineTo(px, Y(v)) : ctx.moveTo(px, Y(v)) }); ctx.stroke()
    label(ctx, `k = ${k.toFixed(4)}`, x0 + 6, 26, Math.abs(k - 1) < 0.004 ? COL.good : COL.alert, 13)
    label(ctx, 'población de neutrones (escala log)', x0 + gw, h - 12, COL.dim, 10, 'right')
  }, [k, estado])
  return (
    <div>
      <canvas ref={ref} className="widget-canvas" />
      <div className="sliders">
        <label>Inserción de barras de control: <b>{barras}%</b><input type="range" min={0} max={100} step={1} value={barras} onChange={(e) => { setBarras(Number(e.target.value)); sfx.type() }} /></label>
        <button className="link-btn" onClick={() => { N.current = 1; hist.current = [] }}>Reiniciar población</button>
        {estado && <b className={estado.includes('✓') ? 'ok' : 'bad'}>{estado}</b>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Árbol de probabilidad */
interface Rama { label: string; p: string; hijos?: { label: string; p: string }[] }
export function Arbol({ ramas }: { ramas: Rama[] }) {
  const W = 520, H = 60 + ramas.reduce((s, r) => s + Math.max(1, r.hijos?.length ?? 1), 0) * 46
  let fila = 0
  return (
    <svg className="arbol" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Árbol de probabilidades">
      <circle cx={30} cy={H / 2} r={6} fill={COL.holo} />
      {ramas.map((r, i) => {
        const n = Math.max(1, r.hijos?.length ?? 1)
        const yC = 30 + (fila + n / 2) * 46
        const out = (
          <g key={i}>
            <line x1={30} y1={H / 2} x2={210} y2={yC} stroke={COL.holo} strokeOpacity=".6" strokeWidth={2} />
            <text x={120} y={(H / 2 + yC) / 2 - 6} fill={COL.alert} fontSize={13} textAnchor="middle">{r.p}</text>
            <circle cx={210} cy={yC} r={5} fill={COL.alert} />
            <text x={222} y={yC + 4} fill={COL.ceramic} fontSize={14}>{r.label}</text>
            {r.hijos?.map((hj, j) => {
              const y2 = 30 + (fila + j + 0.5) * 46
              return (
                <g key={j}>
                  <line x1={260} y1={yC} x2={420} y2={y2} stroke={COL.holo} strokeOpacity=".5" strokeWidth={1.6} />
                  <text x={340} y={(yC + y2) / 2 - 6} fill={COL.alert} fontSize={12} textAnchor="middle">{hj.p}</text>
                  <text x={428} y={y2 + 4} fill={COL.ceramic} fontSize={13}>{hj.label}</text>
                </g>
              )
            })}
          </g>
        )
        fila += n
        return out
      })}
    </svg>
  )
}

/* ------------------------------------------------------------------ Espira (inducción) */
export function Espira({ B = 0.5, A = 0.02, N = 100, omega = 50, ajuste }: { B?: number; A?: number; N?: number; omega?: number; ajuste?: { valor: number; disparo: number } }) {
  const w0 = ajuste && ajuste.disparo > 0 ? ajuste.valor : omega
  const hist = useRef<[number, number][]>([])
  useEffect(() => { hist.current = [] }, [w0])
  const ref = useCanvas((ctx, w, h, t) => {
    const ang = w0 * t * 0.05 // cámara lenta
    const cx = w * 0.22, cy = h / 2
    // imanes
    ctx.fillStyle = '#c0392b'; ctx.fillRect(cx - 110, cy - 50, 30, 100); ctx.fillStyle = '#2c6fbb'; ctx.fillRect(cx + 80, cy - 50, 30, 100)
    label(ctx, 'N', cx - 95, cy, '#fff', 14, 'center'); label(ctx, 'S', cx + 95, cy, '#fff', 14, 'center')
    for (let y = -40; y <= 40; y += 20) arrow(ctx, cx - 76, cy + y, cx + 76, cy + y, 'rgba(63,224,255,.25)', 1, 5)
    const wv = 60 * Math.abs(Math.cos(ang))
    ctx.strokeStyle = COL.alert; ctx.lineWidth = 4; ctx.strokeRect(cx - wv / 2, cy - 45, wv, 90)
    // gráficas
    const phi = N * B * A * Math.cos(ang), fem = N * B * A * w0 * Math.sin(ang)
    hist.current.push([phi, fem]); if (hist.current.length > 260) hist.current.shift()
    const x0 = w * 0.45, gw = w * 0.53
    const draw = (idx: 0 | 1, col: string, max: number, off: number, name: string) => {
      ctx.strokeStyle = 'rgba(63,224,255,.2)'; ctx.beginPath(); ctx.moveTo(x0, off); ctx.lineTo(x0 + gw, off); ctx.stroke()
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath()
      hist.current.forEach((v, i) => { const px = x0 + (i / 260) * gw, py = off - (v[idx] / max) * h * 0.18; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py) }); ctx.stroke()
      label(ctx, name, x0 + 4, off - h * 0.2, col, 11)
    }
    draw(0, COL.holo, N * B * A, h * 0.28, `Φ(t) · máx ${(N * B * A).toPrecision(3)} Wb`)
    draw(1, COL.alert, N * B * A * w0, h * 0.74, `ε(t) · máx ${(N * B * A * w0).toPrecision(3)} V`)
  }, [w0, B, A, N])
  return <canvas ref={ref} className="widget-canvas" />
}

/* ------------------------------------------------------------------ Onda / MAS */
export function Onda({ A = 0.05, lambda = 2, f = 1, puntos = [], modo = 'onda', explorar }: { A?: number; lambda?: number; f?: number; puntos?: number[]; modo?: 'onda' | 'mas'; explorar?: boolean }) {
  const [ff, setFf] = useState(f)
  const [ll, setLl] = useState(lambda)
  const ref = useCanvas((ctx, w, h, t) => {
    const ts = t * 0.25 // cámara lenta
    const cy = h / 2
    if (modo === 'mas') {
      const x = Math.cos(2 * Math.PI * ff * ts)
      const cx = w * 0.18
      ctx.strokeStyle = COL.dim; ctx.lineWidth = 2; ctx.beginPath()
      const top = 14, bot = cy + x * h * 0.25
      for (let i = 0; i <= 20; i++) { const yy = top + ((bot - top) * i) / 20; ctx.lineTo(cx + (i % 2 ? 10 : -10), yy) } ctx.stroke()
      ctx.fillStyle = COL.alert; ctx.fillRect(cx - 18, bot, 36, 26)
      ctx.strokeStyle = COL.holo; ctx.beginPath()
      for (let px = 0; px < w * 0.6; px++) { const tt = ts - (w * 0.6 - px) / 120; const yy = cy + 13 + Math.cos(2 * Math.PI * ff * tt) * h * 0.25; px ? ctx.lineTo(w * 0.35 + px, yy) : ctx.moveTo(w * 0.35 + px, yy) } ctx.stroke()
      label(ctx, 'x(t) = A cos(ωt + φ₀)', w - 10, 14, COL.ceramic, 12, 'right')
      return
    }
    const sx = w / (ll * 2.5)
    ctx.strokeStyle = COL.holo; ctx.lineWidth = 2.5; ctx.shadowColor = COL.holo; ctx.shadowBlur = 6; ctx.beginPath()
    for (let px = 0; px < w; px++) { const x = px / sx; const y = Math.sin(2 * Math.PI * (ff * ts - x / ll)); px ? ctx.lineTo(px, cy - y * h * 0.32) : ctx.moveTo(px, cy - y * h * 0.32) }
    ctx.stroke(); ctx.shadowBlur = 0
    puntos.forEach((x, i) => { const y = Math.sin(2 * Math.PI * (ff * ts - x / ll)); glowDot(ctx, x * sx, cy - y * h * 0.32, 4, i ? COL.alert : COL.good); label(ctx, `x = ${x} m`, x * sx, h - 12, i ? COL.alert : COL.good, 11, 'center') })
    arrow(ctx, 10, 18, 10 + ll * sx, 18, COL.ceramic, 1.2, 6); label(ctx, `λ = ${ll} m`, 14 + ll * sx / 2, 30, COL.ceramic, 11, 'center')
    label(ctx, `A = ${A} m · f = ${ff} Hz · v = ${(ff * ll).toPrecision(3)} m/s (animación ralentizada)`, w - 10, h - 12, COL.dim, 10, 'right')
  }, [ff, ll, A, puntos, modo])
  return (
    <div>
      <canvas ref={ref} className="widget-canvas" />
      {explorar && <div className="sliders">
        <label>f = <b>{ff} Hz</b><input type="range" min={0.2} max={3} step={0.1} value={ff} onChange={(e) => setFf(Number(e.target.value))} /></label>
        {modo === 'onda' && <label>λ = <b>{ll} m</b><input type="range" min={0.5} max={5} step={0.1} value={ll} onChange={(e) => setLl(Number(e.target.value))} /></label>}
      </div>}
    </div>
  )
}

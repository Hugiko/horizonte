import { useMemo, useRef, useState } from 'react'
import { plain } from '../missions/fmt'
import { arrow, COL, glowDot, grid, label, useCanvas } from './useCanvas'

export interface Fuente { x: number; y: number; q: number }
interface Props {
  fuentes: Fuente[]
  tipo?: 'gravitatorio' | 'electrico' | 'magnetico'
  escala?: number // mitad del ancho visible en unidades del mundo
  sonda?: number[]
  puntos?: number[][]
  linea?: boolean
  editable?: boolean // permite arrastrar las fuentes (modo teoría)
}

const K = { gravitatorio: 6.674e-11, electrico: 8.99e9, magnetico: 2e-7 }

/** Campo en un punto: gravitatorio (atractivo), eléctrico (q con signo) o magnético de hilos ⊥ al plano (I con signo). */
export function campoEn(fuentes: Fuente[], tipo: Props['tipo'], x: number, y: number): [number, number] {
  let ex = 0, ey = 0
  for (const f of fuentes) {
    const dx = x - f.x, dy = y - f.y
    const r2 = dx * dx + dy * dy
    if (r2 < 1e-6) continue
    const r = Math.sqrt(r2)
    if (tipo === 'magnetico') {
      const b = (K.magnetico * f.q) / r
      ex += (-dy / r) * b; ey += (dx / r) * b
    } else {
      const s = tipo === 'gravitatorio' ? -Math.abs(f.q) * K.gravitatorio : f.q * K.electrico
      ex += (s * dx) / (r2 * r); ey += (s * dy) / (r2 * r)
    }
  }
  return [ex, ey]
}

export function Campo({ fuentes: f0, tipo = 'gravitatorio', escala = 12, sonda: s0, puntos, linea, editable }: Props) {
  const [fuentes, setFuentes] = useState(f0)
  const [sonda, setSonda] = useState<number[]>(s0 ?? [0, 0])
  const drag = useRef<number | 'sonda' | null>(null)
  const particles = useMemo(() => Array.from({ length: 220 }, () => ({ x: (Math.random() * 2 - 1) * escala * 1.6, y: (Math.random() * 2 - 1) * escala, life: Math.random() })), [escala])
  const unidad = tipo === 'magnetico' ? 'T' : tipo === 'electrico' ? 'N/C' : 'N/kg'

  const ref = useCanvas((ctx, w, h, t, dt) => {
    const s = (Math.min(w, h * 1.6) / 2) / escala
    const toPx = (x: number, y: number) => [w / 2 + x * s, h / 2 - y * s]
    grid(ctx, w, h, s * 2 > 12 ? s * 2 : 24)
    // ejes
    ctx.strokeStyle = 'rgba(63,224,255,.25)'
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke()
    if (linea && fuentes.length >= 2) {
      const [a, b] = [toPx(fuentes[0].x, fuentes[0].y), toPx(fuentes[1].x, fuentes[1].y)]
      ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,138,61,.5)'
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([])
    }
    // malla de flechas (longitud logarítmica)
    const step = 34
    const mags: number[] = []
    const vecs: [number, number, number, number][] = []
    for (let px = step / 2; px < w; px += step) for (let py = step / 2; py < h; py += step) {
      const x = (px - w / 2) / s, y = (h / 2 - py) / s
      const [ex, ey] = campoEn(fuentes, tipo, x, y)
      const m = Math.hypot(ex, ey)
      if (m > 0) { mags.push(Math.log10(m)); vecs.push([px, py, ex / m, -ey / m]) }
    }
    const lo = Math.min(...mags), hi = Math.max(...mags)
    vecs.forEach(([px, py, ux, uy], i) => {
      const k = hi > lo ? (mags[i] - lo) / (hi - lo) : 0.5
      const len = 6 + k * 10
      const a = 0.15 + k * 0.55
      arrow(ctx, px - ux * len / 2, py - uy * len / 2, px + ux * len / 2, py + uy * len / 2, `rgba(63,224,255,${a})`, 1.2, 4)
    })
    // partículas que siguen el campo
    ctx.fillStyle = tipo === 'gravitatorio' ? 'rgba(255,190,120,.8)' : 'rgba(150,240,255,.8)'
    for (const p of particles) {
      const [ex, ey] = campoEn(fuentes, tipo, p.x, p.y)
      const m = Math.hypot(ex, ey) || 1
      p.x += (ex / m) * dt * escala * 0.25
      p.y += (ey / m) * dt * escala * 0.25
      p.life -= dt * 0.35
      const near = fuentes.some((f) => Math.hypot(f.x - p.x, f.y - p.y) < escala * 0.04)
      if (p.life <= 0 || near || Math.abs(p.x) > escala * 1.7 || Math.abs(p.y) > escala * 1.1) {
        p.x = (Math.random() * 2 - 1) * escala * 1.6; p.y = (Math.random() * 2 - 1) * escala; p.life = 1
      }
      const [px, py] = toPx(p.x, p.y)
      ctx.globalAlpha = Math.min(1, p.life * 2) * 0.8
      ctx.fillRect(px - 1, py - 1, 2, 2)
    }
    ctx.globalAlpha = 1
    // fuentes
    const maxQ = Math.max(...fuentes.map((f) => Math.abs(f.q)))
    fuentes.forEach((f, i) => {
      const [px, py] = toPx(f.x, f.y)
      const r = 5 + 7 * Math.sqrt(Math.abs(f.q) / maxQ)
      const col = tipo === 'gravitatorio' ? COL.alert : f.q > 0 ? COL.pos : COL.neg
      glowDot(ctx, px, py, r * (1 + 0.05 * Math.sin(t * 3 + i)), col)
      if (tipo === 'magnetico') label(ctx, f.q > 0 ? '⊙' : '⊗', px, py, '#fff', 14, 'center')
      else if (tipo === 'electrico') label(ctx, f.q > 0 ? '+' : '−', px, py, '#fff', 13, 'center')
      label(ctx, `${i + 1}`, px + r + 6, py - r - 2, COL.ceramic, 11)
    })
    // puntos
    puntos?.forEach((pt, i) => {
      const [px, py] = toPx(pt[0], pt[1])
      ctx.strokeStyle = COL.good; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(px, py, 7 + Math.sin(t * 4) * 1.5, 0, Math.PI * 2); ctx.stroke()
      label(ctx, `P${i + 1}`, px + 10, py - 10, COL.good, 12)
    })
    // sonda
    const [sx, sy] = toPx(sonda[0], sonda[1])
    const [ex, ey] = campoEn(fuentes, tipo, sonda[0], sonda[1])
    const m = Math.hypot(ex, ey)
    if (m > 0) arrow(ctx, sx, sy, sx + (ex / m) * 34, sy - (ey / m) * 34, COL.ceramic, 2.5, 8)
    ctx.strokeStyle = COL.ceramic; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(sx - 10, sy); ctx.lineTo(sx + 10, sy); ctx.moveTo(sx, sy - 10); ctx.lineTo(sx, sy + 10); ctx.stroke()
    label(ctx, `sonda (${sonda[0].toFixed(1)}, ${sonda[1].toFixed(1)})  |campo| = ${plain(m, 3)} ${unidad}`, 10, h - 14, COL.ceramic, 12)
    label(ctx, 'Arrastra la sonda para medir', w - 10, 14, COL.dim, 11, 'right')
  }, [fuentes, sonda, tipo, escala])

  const toWorld = (e: React.PointerEvent) => {
    const c = ref.current!
    const r = c.getBoundingClientRect()
    const w = r.width, h = r.height
    const s = (Math.min(w, h * 1.6) / 2) / escala
    return [(e.clientX - r.left - w / 2) / s, (h / 2 - (e.clientY - r.top)) / s]
  }
  return (
    <canvas ref={ref} className="widget-canvas"
      onPointerDown={(e) => {
        const [x, y] = toWorld(e)
        if (editable) {
          const i = fuentes.findIndex((f) => Math.hypot(f.x - x, f.y - y) < escala * 0.08)
          if (i >= 0) { drag.current = i; return }
        }
        drag.current = 'sonda'; setSonda([x, y]);
        (e.target as HTMLElement).setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (drag.current === null) return
        const [x, y] = toWorld(e)
        if (drag.current === 'sonda') setSonda([x, y])
        else setFuentes(fuentes.map((f, i) => (i === drag.current ? { ...f, x, y } : f)))
      }}
      onPointerUp={() => { drag.current = null }} />
  )
}

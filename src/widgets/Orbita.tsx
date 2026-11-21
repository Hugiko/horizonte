import { useEffect, useRef, useState } from 'react'
import { ASTRO, CONST } from '../data/constants'
import { simulate, type Vec2 } from '../sims/orbit'
import { COL, glowDot, label, useCanvas } from './useCanvas'

const GM = CONST.G * ASTRO.earth.mass
const RT = ASTRO.earth.radius

interface Props {
  r0: number // radio de inyección (m)
  objetivo?: number // radio de la órbita objetivo (m)
  vInicial?: number // m/s (si no hay ajuste)
  ajuste?: { valor: number; disparo: number }
  unidad?: 'kms' | 'ms'
  apogeo?: number // dibuja una elipse de transferencia hasta este radio
}

/** Lanzamiento orbital con integración RK4: cae, orbita o escapa. */
export function Orbita({ r0, objetivo, vInicial, ajuste, unidad = 'kms', apogeo }: Props) {
  const [path, setPath] = useState<Vec2[]>([])
  const [outcome, setOutcome] = useState<string>('')
  const prog = useRef(0)

  useEffect(() => {
    const v = ajuste && ajuste.disparo > 0 ? ajuste.valor * (unidad === 'kms' ? 1000 : 1) : vInicial
    if (!v) { setPath([]); setOutcome(''); return }
    const T = 2 * Math.PI * Math.sqrt(r0 ** 3 / GM)
    const res = simulate({ r: [r0, 0], v: [0, v] }, GM, RT, T / 500, 1400)
    setPath(res.path.filter((_, i) => i % 2 === 0))
    prog.current = 0
    const rmax = Math.max(...res.path.map((p) => Math.hypot(p[0], p[1])))
    const rmin = Math.min(...res.path.map((p) => Math.hypot(p[0], p[1])))
    setOutcome(res.outcome === 'cae' ? 'IMPACTO: el satélite cae a la Tierra' : res.outcome === 'escapa' ? 'ESCAPE: trayectoria abierta' : (rmax - rmin) / r0 < 0.02 ? 'ÓRBITA CIRCULAR estable' : `ÓRBITA ELÍPTICA (${Math.round((rmin - RT) / 1000)} – ${Math.round((rmax - RT) / 1000)} km de altura)`)
  }, [ajuste?.disparo, ajuste?.valor, vInicial, r0, unidad]) // eslint-disable-line react-hooks/exhaustive-deps

  const ref = useCanvas((ctx, w, h, t, dt) => {
    const maxR = Math.max(r0, objetivo ?? 0, apogeo ?? 0) * 1.35
    const s = Math.min(w, h) / 2 / maxR
    const cx = w / 2, cy = h / 2
    // estrellas
    for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + ((i * 37) % 10) / 20})`; ctx.fillRect((i * 97) % w, (i * 53) % h, 1, 1) }
    // Tierra
    const grd = ctx.createRadialGradient(cx - RT * s * 0.3, cy - RT * s * 0.3, RT * s * 0.1, cx, cy, RT * s)
    grd.addColorStop(0, '#5fa8ff'); grd.addColorStop(0.7, '#1d4f9a'); grd.addColorStop(1, '#0b2147')
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, cy, RT * s, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(120,200,255,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, RT * s + 2, 0, Math.PI * 2); ctx.stroke()
    if (objetivo) {
      ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(93,255,168,.6)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(cx, cy, objetivo * s, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([])
      label(ctx, 'órbita objetivo', cx + objetivo * s * 0.72, cy - objetivo * s * 0.72, COL.good, 11)
    }
    if (apogeo) {
      const a = (r0 + apogeo) / 2, c = (apogeo - r0) / 2, b = Math.sqrt(a * a - c * c)
      ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(255,138,61,.7)'
      ctx.beginPath(); ctx.ellipse(cx - c * s, cy, a * s, b * s, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([])
      label(ctx, 'perigeo', cx + r0 * s + 6, cy, COL.alert, 11); label(ctx, 'apogeo', cx - apogeo * s - 6, cy, COL.alert, 11, 'right')
    }
    ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.arc(cx, cy, r0 * s, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([])
    if (path.length) {
      prog.current = Math.min(path.length - 1, prog.current + dt * 220)
      const n = Math.floor(prog.current)
      ctx.strokeStyle = COL.holo; ctx.lineWidth = 2; ctx.shadowColor = COL.holo; ctx.shadowBlur = 8
      ctx.beginPath()
      for (let i = 0; i <= n; i++) { const [x, y] = path[i]; const px = cx + x * s, py = cy - y * s; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py) }
      ctx.stroke(); ctx.shadowBlur = 0
      const [x, y] = path[n]
      glowDot(ctx, cx + x * s, cy - y * s, 4, COL.ceramic)
      if (n >= path.length - 1 && outcome) label(ctx, outcome, w / 2, h - 18, outcome.startsWith('IMPACTO') || outcome.startsWith('ESCAPE') ? COL.alert : COL.good, 13, 'center')
    } else {
      glowDot(ctx, cx + r0 * s, cy, 4 + Math.sin(t * 4), COL.ceramic)
      label(ctx, 'Calcula la velocidad y ejecuta el lanzamiento', w / 2, h - 18, COL.dim, 12, 'center')
    }
  }, [path, outcome, r0, objetivo, apogeo])
  return <canvas ref={ref} className="widget-canvas tall" />
}

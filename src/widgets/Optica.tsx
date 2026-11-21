import { useState } from 'react'
import { COL, arrow, glowDot, label, useCanvas } from './useCanvas'

interface Props {
  modo: 'lente' | 'fibra' | 'snell' | 'rendija' | 'espejo'
  f?: number // cm (lente/espejo; negativa = divergente/convexo)
  so?: number // cm, distancia objeto (positiva)
  n1?: number
  n2?: number
  angulo?: number // grados
  lambda?: number // nm
  d?: number // separación rendijas (mm)
  D?: number // distancia a pantalla (m)
  explorar?: boolean
}

/** Óptica: lente delgada con trazado de rayos, fibra (reflexión total), Snell y doble rendija. */
export function Optica(props: Props) {
  const [f, setF] = useState(props.f ?? 10)
  const [so, setSo] = useState(props.so ?? 25)
  const [ang, setAng] = useState(props.angulo ?? 30)
  const { modo, n1 = 1.5, n2 = 1.0, lambda = 633, d = 0.25, D = 2, explorar } = props

  const ref = useCanvas((ctx, w, h, t) => {
    const cx = w / 2, cy = h / 2
    if (modo === 'lente' || modo === 'espejo') {
      const esc = (w / 2 - 20) / Math.max(40, so * 1.3, Math.abs(f) * 3)
      ctx.strokeStyle = 'rgba(63,224,255,.4)'; ctx.beginPath(); ctx.moveTo(10, cy); ctx.lineTo(w - 10, cy); ctx.stroke()
      // lente
      ctx.strokeStyle = COL.holo; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(cx, cy - h * 0.4); ctx.lineTo(cx, cy + h * 0.4); ctx.stroke()
      arrow(ctx, cx, cy, cx, cy - h * 0.4, COL.holo, 3, f > 0 ? 9 : -9); arrow(ctx, cx, cy, cx, cy + h * 0.4, COL.holo, 3, f > 0 ? 9 : -9)
      ;[f, -f].forEach((ff, i) => { ctx.fillStyle = COL.alert; ctx.beginPath(); ctx.arc(cx + ff * esc, cy, 3.5, 0, Math.PI * 2); ctx.fill(); label(ctx, i ? "F" : "F'", cx + ff * esc, cy + 14, COL.alert, 11, 'center') })
      const ho = 1, yo = h * 0.22
      const xo = cx - so * esc
      arrow(ctx, xo, cy, xo, cy - yo, COL.ceramic, 2.5, 8)
      label(ctx, 'objeto', xo, cy + 14, COL.ceramic, 11, 'center')
      // imagen: 1/s' - 1/s = 1/f' con s = -so → s' = 1/(1/f + 1/(-so))
      const si = 1 / (1 / f - 1 / so)
      const m = -si / so
      const xi = cx + si * esc
      const yi = yo * m * ho
      const rays: [number, number, number, number][] = []
      // rayo paralelo → pasa por F'
      rays.push([xo, cy - yo, cx, cy - yo])
      const k = (t * 0.6) % 1
      ctx.lineWidth = 1.6
      const ray = (x1: number, y1: number, x2: number, y2: number, ext = false) => { ctx.strokeStyle = ext ? 'rgba(255,210,61,.45)' : 'rgba(255,210,61,.9)'; ctx.setLineDash(ext ? [5, 5] : []); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]) }
      const extend = (x1: number, y1: number, x2: number, y2: number, toX: number) => { const s = (y2 - y1) / (x2 - x1); return [toX, y1 + s * (toX - x1)] as const }
      ray(xo, cy - yo, cx, cy - yo)
      const [ex1, ey1] = extend(cx, cy - yo, cx + f * esc, cy, w)
      ray(cx, cy - yo, ex1, ey1)
      // rayo por el centro
      const [ex2, ey2] = extend(xo, cy - yo, cx, cy, w)
      ray(xo, cy - yo, ex2, ey2)
      if (si < 0) { const [bx, by] = extend(cx, cy - yo, cx + f * esc, cy, 0); ray(cx, cy - yo, bx, by, true); const [bx2, by2] = extend(xo, cy - yo, cx, cy, 0); ray(cx, cy, bx2, by2, true) }
      if (Number.isFinite(si) && Math.abs(xi - cx) < w) {
        arrow(ctx, xi, cy, xi, cy - yi, si > 0 ? COL.good : 'rgba(93,255,168,.5)', 2.5, 8)
        label(ctx, si > 0 ? 'imagen real' : 'imagen virtual', xi, cy + 26, COL.good, 11, 'center')
      }
      label(ctx, `s = −${so.toFixed(1)} cm   f' = ${f.toFixed(1)} cm   s' = ${Number.isFinite(si) ? si.toFixed(1) : '∞'} cm   aumento = ${Number.isFinite(m) ? m.toFixed(2) : '∞'}`, 10, h - 12, COL.ceramic, 11)
      glowDot(ctx, xo + (cx - xo) * k, cy - yo, 2.5, '#ffd23d')
    } else if (modo === 'fibra') {
      const core = h * 0.22
      ctx.fillStyle = 'rgba(63,224,255,.08)'; ctx.fillRect(40, cy - core * 1.8, w - 50, core * 3.6)
      ctx.fillStyle = 'rgba(63,224,255,.18)'; ctx.fillRect(40, cy - core, w - 50, core * 2)
      label(ctx, `núcleo n₁ = ${n1}`, 50, cy - core + 12, COL.holo, 11); label(ctx, `revestimiento n₂ = ${n2}`, 50, cy - core * 1.8 + 12, COL.dim, 11)
      const lim = Math.asin(n2 / n1) * 180 / Math.PI
      // ángulo de incidencia en la pared = 90 - ángulo de propagación
      const prop = ang
      const inc = 90 - prop
      ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2; ctx.shadowColor = '#ff5a5a'; ctx.shadowBlur = 10
      ctx.beginPath()
      let x = 40, y = cy, dir = -1
      ctx.moveTo(x, y)
      const tan = Math.tan(prop * Math.PI / 180)
      for (let i = 0; i < 30 && x < w - 10; i++) {
        const dy = dir < 0 ? (y - (cy - core)) : ((cy + core) - y)
        const dx = dy / Math.max(tan, 1e-3)
        x += dx; y += dir * dy
        ctx.lineTo(Math.min(x, w - 10), y)
        if (inc < lim) { // se escapa
          const ref = Math.asin(Math.min(1, n1 * Math.sin(inc * Math.PI / 180) / n2))
          ctx.lineTo(x + 60 * Math.sin(ref), y + dir * 60 * Math.cos(ref))
          break
        }
        dir *= -1
      }
      ctx.stroke(); ctx.shadowBlur = 0
      label(ctx, `ángulo con el eje: ${prop.toFixed(1)}°  ·  incidencia en la pared: ${inc.toFixed(1)}°  ·  ángulo límite: ${lim.toFixed(1)}°`, 10, h - 12, inc >= lim ? COL.good : COL.alert, 11)
      label(ctx, inc >= lim ? 'REFLEXIÓN TOTAL: la luz queda guiada' : 'La luz escapa de la fibra', w - 10, 14, inc >= lim ? COL.good : COL.alert, 12, 'right')
    } else if (modo === 'snell') {
      ctx.fillStyle = 'rgba(63,224,255,.12)'; ctx.fillRect(0, cy, w, h / 2)
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(cx, 10); ctx.lineTo(cx, h - 10); ctx.stroke(); ctx.setLineDash([])
      label(ctx, `n₁ = ${n1}`, 12, cy - 14, COL.ceramic, 12); label(ctx, `n₂ = ${n2}`, 12, cy + 16, COL.holo, 12)
      const a = ang * Math.PI / 180, L = Math.min(w, h) * 0.42
      const sr = (n1 * Math.sin(a)) / n2
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffd23d'
      ctx.beginPath(); ctx.moveTo(cx - L * Math.sin(a), cy - L * Math.cos(a)); ctx.lineTo(cx, cy); ctx.stroke()
      ctx.strokeStyle = 'rgba(255,210,61,.4)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + L * Math.sin(a), cy - L * Math.cos(a)); ctx.stroke()
      if (sr <= 1) { const r = Math.asin(sr); ctx.strokeStyle = '#ffd23d'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + L * Math.sin(r), cy + L * Math.cos(r)); ctx.stroke(); label(ctx, `refracción: ${(r * 180 / Math.PI).toFixed(1)}°`, cx + 10, cy + 30, COL.holo, 11) }
      else label(ctx, 'REFLEXIÓN TOTAL', cx + 10, cy + 30, COL.alert, 12)
      label(ctx, `incidencia: ${ang.toFixed(1)}°`, cx - 120, cy - 30, '#ffd23d', 11)
    } else if (modo === 'rendija') {
      const L = lambda * 1e-9, dd = d * 1e-3
      const fr = (L * D) / dd
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h)
      const span = fr * 6
      for (let px = 0; px < w; px++) {
        const yy = ((px - w / 2) / w) * span
        const I = Math.cos((Math.PI * dd * yy) / (L * D)) ** 2
        const col = lambda < 495 ? [80, 140, 255] : lambda < 570 ? [90, 255, 120] : lambda < 590 ? [255, 230, 80] : [255, 60, 50]
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${I})`
        ctx.fillRect(px, h * 0.15, 1, h * 0.55)
      }
      ctx.strokeStyle = COL.ceramic; ctx.lineWidth = 1
      const pxPerM = w / span
      arrow(ctx, w / 2, h * 0.82, w / 2 + fr * pxPerM, h * 0.82, COL.ceramic, 1.5, 6)
      label(ctx, `separación entre franjas: ${(fr * 1000).toFixed(2)} mm`, w / 2, h * 0.92, COL.ceramic, 12, 'center')
    }
  }, [modo, f, so, ang, n1, n2, lambda, d, D])

  return (
    <div>
      <canvas ref={ref} className="widget-canvas" />
      {explorar && (
        <div className="sliders">
          {(modo === 'lente' || modo === 'espejo') && <>
            <label>Focal f' = <b>{f} cm</b><input type="range" min={-20} max={20} step={0.5} value={f} onChange={(e) => setF(Number(e.target.value) || 0.5)} /></label>
            <label>Objeto a <b>{so} cm</b><input type="range" min={2} max={60} step={0.5} value={so} onChange={(e) => setSo(Number(e.target.value))} /></label>
          </>}
          {(modo === 'fibra' || modo === 'snell') && <label>Ángulo = <b>{ang}°</b><input type="range" min={0} max={89} step={0.5} value={ang} onChange={(e) => setAng(Number(e.target.value))} /></label>}
        </div>
      )}
    </div>
  )
}

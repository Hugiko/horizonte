import { compile, type EvalFunction } from 'mathjs'
import { useMemo, useState } from 'react'
import { COL, glowDot, label, useCanvas } from './useCanvas'

interface Serie { expr?: string; puntos?: number[][]; color?: string; label?: string; dash?: boolean; barras?: boolean }
interface Props {
  series: Serie[]
  x: [number, number]
  y: [number, number]
  xLabel?: string
  yLabel?: string
  area?: { expr: string; expr2?: string; a: number; b: number }
  sliders?: { name: string; label: string; min: number; max: number; step: number; value: number }[]
  vlines?: { x: number; label?: string }[]
  hlines?: { y: number; label?: string }[]
  animar?: boolean // tiempo t como variable
}

const PALETA = [COL.holo, COL.alert, COL.good, '#c08bff', '#ffd23d']

/** Gráfica de funciones y datos, con deslizadores y área sombreada. */
export function Plot({ series, x, y, xLabel, yLabel, area, sliders, vlines, hlines, animar }: Props) {
  const [vals, setVals] = useState<Record<string, number>>(() => Object.fromEntries((sliders ?? []).map((s) => [s.name, s.value])))
  const fns = useMemo(() => series.map((s) => (s.expr ? safeCompile(s.expr) : null)), [series])
  const areaFns = useMemo(() => (area ? [safeCompile(area.expr), area.expr2 ? safeCompile(area.expr2) : null] : null), [area])

  const ref = useCanvas((ctx, w, h, t) => {
    const pad = { l: 46, r: 14, t: 14, b: 32 }
    const X = (v: number) => pad.l + ((v - x[0]) / (x[1] - x[0])) * (w - pad.l - pad.r)
    const Y = (v: number) => h - pad.b - ((v - y[0]) / (y[1] - y[0])) * (h - pad.t - pad.b)
    // ejes y rejilla
    ctx.font = '11px Inter'; ctx.fillStyle = COL.dim; ctx.strokeStyle = 'rgba(63,224,255,.08)'
    const ticks = (a: number, b: number) => { const step = niceStep((b - a) / 6); const out = []; for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(Number(v.toPrecision(10))); return out }
    for (const v of ticks(x[0], x[1])) { ctx.beginPath(); ctx.moveTo(X(v), pad.t); ctx.lineTo(X(v), h - pad.b); ctx.stroke(); label(ctx, fmtTick(v), X(v), h - pad.b + 12, COL.dim, 10, 'center') }
    for (const v of ticks(y[0], y[1])) { ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(w - pad.r, Y(v)); ctx.stroke(); label(ctx, fmtTick(v), pad.l - 6, Y(v), COL.dim, 10, 'right') }
    ctx.strokeStyle = 'rgba(63,224,255,.45)'; ctx.lineWidth = 1.2
    if (y[0] < 0 && y[1] > 0) { ctx.beginPath(); ctx.moveTo(pad.l, Y(0)); ctx.lineTo(w - pad.r, Y(0)); ctx.stroke() }
    if (x[0] < 0 && x[1] > 0) { ctx.beginPath(); ctx.moveTo(X(0), pad.t); ctx.lineTo(X(0), h - pad.b); ctx.stroke() }
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, h - pad.b); ctx.lineTo(w - pad.r, h - pad.b); ctx.stroke()
    if (xLabel) label(ctx, xLabel, w - pad.r, h - 8, COL.ceramic, 11, 'right')
    if (yLabel) label(ctx, yLabel, pad.l + 4, pad.t + 4, COL.ceramic, 11)
    const scope = (xx: number) => ({ ...vals, x: xx, t: animar ? t : 0, pi: Math.PI, e: Math.E })
    // área
    if (areaFns?.[0]) {
      ctx.fillStyle = 'rgba(255,138,61,.22)'
      ctx.beginPath()
      const N = 120
      for (let i = 0; i <= N; i++) { const xx = area!.a + ((area!.b - area!.a) * i) / N; const v = ev(areaFns[0], scope(xx)); i ? ctx.lineTo(X(xx), Y(v)) : ctx.moveTo(X(xx), Y(v)) }
      for (let i = N; i >= 0; i--) { const xx = area!.a + ((area!.b - area!.a) * i) / N; const v = areaFns[1] ? ev(areaFns[1], scope(xx)) : 0; ctx.lineTo(X(xx), Y(v)) }
      ctx.closePath(); ctx.fill()
    }
    vlines?.forEach((l) => { ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,210,61,.6)'; ctx.beginPath(); ctx.moveTo(X(l.x), pad.t); ctx.lineTo(X(l.x), h - pad.b); ctx.stroke(); ctx.setLineDash([]); if (l.label) label(ctx, l.label, X(l.x) + 4, pad.t + 10, '#ffd23d', 10) })
    hlines?.forEach((l) => { ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,210,61,.6)'; ctx.beginPath(); ctx.moveTo(pad.l, Y(l.y)); ctx.lineTo(w - pad.r, Y(l.y)); ctx.stroke(); ctx.setLineDash([]); if (l.label) label(ctx, l.label, w - pad.r - 4, Y(l.y) - 8, '#ffd23d', 10, 'right') })
    // series
    series.forEach((s, i) => {
      const col = s.color ?? PALETA[i % PALETA.length]
      ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.setLineDash(s.dash ? [6, 5] : [])
      const f = fns[i]
      if (f) {
        ctx.beginPath()
        let pen = false
        const N = Math.max(200, Math.floor(w))
        for (let k = 0; k <= N; k++) {
          const xx = x[0] + ((x[1] - x[0]) * k) / N
          const v = ev(f, scope(xx))
          if (!Number.isFinite(v) || v < y[0] - (y[1] - y[0]) * 2 || v > y[1] + (y[1] - y[0]) * 2) { pen = false; continue }
          if (pen) ctx.lineTo(X(xx), Y(v)); else { ctx.moveTo(X(xx), Y(v)); pen = true }
        }
        ctx.stroke()
      }
      ctx.setLineDash([])
      if (s.puntos) {
        if (s.barras) s.puntos.forEach(([a, b]) => { ctx.fillStyle = col + '99'; const bw = (w - pad.l - pad.r) / ((x[1] - x[0]) * 1.4); ctx.fillRect(X(a) - bw / 2, Y(b), bw, Y(y[0]) - Y(b)) })
        else s.puntos.forEach(([a, b]) => glowDot(ctx, X(a), Y(b), 3.2, col))
      }
      if (s.label) label(ctx, s.label, w - pad.r - 6, pad.t + 12 + i * 16, col, 11, 'right')
    })
  }, [vals, series, x, y, area])

  return (
    <div>
      <canvas ref={ref} className="widget-canvas" />
      {sliders && (
        <div className="sliders">
          {sliders.map((s) => (
            <label key={s.name}>{s.label} = <b>{vals[s.name]}</b>
              <input type="range" min={s.min} max={s.max} step={s.step} value={vals[s.name]} onChange={(e) => setVals({ ...vals, [s.name]: Number(e.target.value) })} />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function safeCompile(e: string): EvalFunction | null { try { return compile(e) } catch { return null } }
function ev(f: EvalFunction | null, scope: Record<string, number>): number { if (!f) return NaN; try { const v = f.evaluate(scope); return typeof v === 'number' ? v : NaN } catch { return NaN } }
function niceStep(raw: number) { const p = 10 ** Math.floor(Math.log10(raw)); const m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p }
function fmtTick(v: number) { const a = Math.abs(v); if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(0); return String(Number(v.toPrecision(4))).replace('.', ',') }

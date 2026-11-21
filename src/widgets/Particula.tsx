import { useEffect, useRef } from 'react'
import { COL, glowDot, label, useCanvas } from './useCanvas'

interface Props {
  modo: 'placas' | 'magnetico' | 'espectrometro' | 'selector' | 'trazas'
  // placas: deflexión vertical y (m) tras recorrer L (m); se dibuja escalado
  L?: number
  yFinal?: number
  separacion?: number
  radios?: { r: number; label: string; color?: string }[] // espectrómetro / trazas (m)
  signo?: number
  ajuste?: { valor: number; disparo: number }
  objetivo?: number // y del blanco (m)
  calcY?: (v: number) => number // deflexión en función del valor ajustado
  etiquetaAjuste?: string
}

/** Partículas cargadas en campos: placas deflectoras, espectrómetro de masas, cámara de trazas. */
export function Particula(props: Props) {
  const { modo, separacion = 0.04, radios = [], signo = 1, ajuste, objetivo, calcY } = props
  const yRef = useRef<number | null>(props.yFinal ?? null)
  const prog = useRef(0)
  useEffect(() => {
    if (ajuste && ajuste.disparo > 0 && calcY) { yRef.current = calcY(ajuste.valor); prog.current = 0 }
  }, [ajuste?.disparo]) // eslint-disable-line react-hooks/exhaustive-deps

  const ref = useCanvas((ctx, w, h, t, dt) => {
    const cy = h / 2
    if (modo === 'placas') {
      const x0 = 50, x1 = w * 0.62, xs = w - 30
      const sy = (h * 0.32) / (separacion / 2)
      ctx.fillStyle = 'rgba(255,90,90,.6)'; ctx.fillRect(x0, cy - h * 0.34, x1 - x0, 6)
      ctx.fillStyle = 'rgba(74,168,255,.6)'; ctx.fillRect(x0, cy + h * 0.34 - 6, x1 - x0, 6)
      label(ctx, '+ + + + +', (x0 + x1) / 2, cy - h * 0.34 - 10, COL.pos, 12, 'center'); label(ctx, '− − − − −', (x0 + x1) / 2, cy + h * 0.34 + 12, COL.neg, 12, 'center')
      ctx.fillStyle = 'rgba(244,241,234,.15)'; ctx.fillRect(xs, 10, 6, h - 20)
      if (objetivo !== undefined) { const yb = cy - objetivo * sy; ctx.fillStyle = COL.good; ctx.fillRect(xs - 2, yb - 6, 10, 12); label(ctx, 'blanco', xs - 6, yb - 14, COL.good, 11, 'right') }
      const yf = yRef.current
      if (yf !== null) {
        prog.current = Math.min(1, prog.current + dt * 0.8)
        // parábola dentro de las placas y recta fuera (deflexión total escalada)
        const yEnd = yf
        ctx.strokeStyle = COL.ceramic; ctx.lineWidth = 2; ctx.shadowColor = COL.holo; ctx.shadowBlur = 8
        ctx.beginPath(); ctx.moveTo(10, cy)
        const N = 80
        let px = 10, py = cy
        for (let i = 0; i <= N * prog.current; i++) {
          const u = i / N
          const x = 10 + u * (xs - 10)
          let y: number
          const fracIn = (x1 - x0) / (xs - x0)
          if (x < x0) y = 0
          else if (x < x1) { const s = (x - x0) / (x1 - x0); y = yEnd * (s * s * fracIn) / (fracIn * (2 - fracIn)) }
          else { const yIn = yEnd * fracIn / (2 - fracIn); const slope = (2 * yIn) / (x1 - x0); y = yIn + slope * (x - x1) }
          px = x; py = cy - y * sy
          if (Math.abs(y) > separacion / 2 && x < x1) { ctx.lineTo(px, py); label(ctx, 'choca con la placa', px, py - 14, COL.alert, 11, 'center'); break }
          ctx.lineTo(px, py)
        }
        ctx.stroke(); ctx.shadowBlur = 0
        glowDot(ctx, px, py, 3.5, COL.holo)
      } else label(ctx, 'Ajusta el valor y dispara', w / 2, h - 12, COL.dim, 12, 'center')
    } else {
      // campo magnético saliente/entrante: puntos o cruces
      ctx.fillStyle = 'rgba(63,224,255,.25)'
      for (let x = 20; x < w; x += 28) for (let y = 16; y < h; y += 28) { if (signo > 0) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill() } else { label(ctx, '×', x, y, 'rgba(63,224,255,.3)', 11, 'center') } }
      const maxR = Math.max(...radios.map((r) => r.r), 1e-9)
      const s = (Math.min(w * 0.42, h * 0.85)) / maxR
      const ox = modo === 'trazas' ? w / 2 : 60, oy = modo === 'trazas' ? h * 0.85 : h - 20
      ctx.fillStyle = 'rgba(244,241,234,.2)'; ctx.fillRect(0, oy - 2, modo === 'trazas' ? w : ox, 4)
      radios.forEach((r, i) => {
        const col = r.color ?? [COL.holo, COL.alert, COL.good, '#c08bff'][i % 4]
        const R = r.r * s
        const k = ((t * 0.4 + i * 0.2) % 1)
        ctx.strokeStyle = col; ctx.lineWidth = 2
        ctx.beginPath()
        if (modo === 'trazas') { const dir = i % 2 ? 1 : -1; ctx.arc(ox + dir * R, oy, R, dir > 0 ? Math.PI : 0, dir > 0 ? Math.PI * 1.5 : -Math.PI * 0.5, dir < 0) }
        else ctx.arc(ox + R, oy, R, Math.PI, Math.PI * (1 + k), false)
        ctx.stroke()
        label(ctx, r.label, modo === 'trazas' ? ox + (i % 2 ? 1 : -1) * R * 1.1 : ox + 2 * R, modo === 'trazas' ? oy - R - 10 : oy - 12, col, 11, 'center')
      })
      label(ctx, signo > 0 ? 'B saliente ⊙' : 'B entrante ⊗', w - 10, 14, COL.holo, 11, 'right')
    }
  }, [modo, radios, objetivo])
  return <canvas ref={ref} className="widget-canvas" />
}

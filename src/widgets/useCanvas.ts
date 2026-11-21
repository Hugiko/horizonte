import { useEffect, useRef } from 'react'

/**
 * Canvas 2D nítido (respeta devicePixelRatio) con bucle de animación.
 * `draw(ctx, w, h, t)` recibe tamaño en píxeles CSS y tiempo en segundos.
 */
export function useCanvas(draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => void, deps: unknown[] = []) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  drawRef.current = draw
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    let raf = 0
    let last = performance.now()
    const start = last
    const loop = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = c.clientWidth, h = c.clientHeight
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr) }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      drawRef.current(ctx, w, h, (now - start) / 1000, Math.min(0.05, (now - last) / 1000))
      last = now
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

export const COL = {
  holo: '#3fe0ff', alert: '#ff8a3d', ceramic: '#f4f1ea', dim: 'rgba(138,164,180,.6)', grid: 'rgba(63,224,255,.08)',
  pos: '#ff5a5a', neg: '#4aa8ff', good: '#5dffa8',
}

export function grid(ctx: CanvasRenderingContext2D, w: number, h: number, step = 32) {
  ctx.strokeStyle = COL.grid
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = (w / 2) % step; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h) }
  for (let y = (h / 2) % step; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y) }
  ctx.stroke()
}

export function glowDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6)
  g.addColorStop(0, color)
  g.addColorStop(0.35, color + 'aa')
  g.addColorStop(1, color + '00')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2); ctx.fill()
}

export function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width = 1.5, head = 6) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4))
  ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4))
  ctx.closePath(); ctx.fill()
}

export function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = COL.ceramic, size = 12, align: CanvasTextAlign = 'left') {
  ctx.font = `600 ${size}px "Exo 2", sans-serif`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}

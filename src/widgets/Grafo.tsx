import { COL, glowDot, label, useCanvas } from './useCanvas'

/** Red de antenas: nodos en círculo, enlaces con pulsos de datos. */
export function Grafo({ A, nombres }: { A: number[][]; nombres: string[] }) {
  const ref = useCanvas((ctx, w, h, t) => {
    const n = A.length
    const R = Math.min(w, h) * 0.36
    const pos = A.map((_, i) => [w / 2 + R * Math.cos((i / n) * Math.PI * 2 - Math.PI / 2), h / 2 + R * Math.sin((i / n) * Math.PI * 2 - Math.PI / 2)])
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (A[i][j]) {
      const [a, b] = [pos[i], pos[j]]
      ctx.strokeStyle = 'rgba(63,224,255,.35)'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke()
      const k = (t * 0.5 + (i * 7 + j * 3) * 0.13) % 1
      const dir = (i + j) % 2 ? k : 1 - k
      glowDot(ctx, a[0] + (b[0] - a[0]) * dir, a[1] + (b[1] - a[1]) * dir, 2.5, COL.holo)
    }
    pos.forEach(([x, y], i) => {
      ctx.fillStyle = 'rgba(5,10,20,.9)'; ctx.strokeStyle = COL.alert; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.strokeStyle = `rgba(255,138,61,${0.3 + 0.3 * Math.sin(t * 2 + i)})`
      ctx.beginPath(); ctx.arc(x, y, 24 + 3 * Math.sin(t * 2 + i), 0, Math.PI * 2); ctx.stroke()
      label(ctx, nombres[i], x, y, COL.ceramic, 15, 'center')
    })
  }, [A])
  return <canvas ref={ref} className="widget-canvas" />
}

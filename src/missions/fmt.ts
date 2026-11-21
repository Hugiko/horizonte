/** Formateo de números para enunciados y resoluciones (estilo español, KaTeX). */

/** Notación científica en TeX con coma decimal: 6{,}67\cdot10^{-11} */
export function sci(x: number, sig = 3): string {
  if (!Number.isFinite(x)) return '?'
  if (x === 0) return '0'
  const e = Math.floor(Math.log10(Math.abs(x)))
  if (e >= -2 && e <= 4) return num(x, sig)
  let m = x / 10 ** e
  m = Number(m.toPrecision(sig))
  let ee = e
  if (Math.abs(m) >= 10) { m /= 10; ee++ }
  return `${String(Number(m.toPrecision(sig))).replace('.', '{,}')}\\cdot10^{${ee}}`
}

/** Número "normal" con `sig` cifras significativas (sin notación científica), coma decimal. */
export function num(x: number, sig = 3): string {
  if (!Number.isFinite(x)) return '?'
  if (x === 0) return '0'
  const e = Math.floor(Math.log10(Math.abs(x)))
  if (e > 6 || e < -3) return sci(x, sig)
  const dec = Math.max(0, sig - 1 - e)
  const s = Number(x.toFixed(Math.min(dec, 10))).toString()
  return s.replace('-', '−').replace('.', '{,}')
}

/** Número con decimales fijos. */
export const fix = (x: number, d = 2) => Number(x.toFixed(d)).toString().replace('.', '{,}').replace('-', '−')

/** Para texto plano (fuera de TeX). */
export const plain = (x: number, sig = 3) => {
  const s = sci(x, sig)
  return s.replace(/\{,\}/g, ',').replace(/\\cdot10\^\{(-?\d+)\}/, '·10^$1')
}

/** Signo para escribir ecuaciones: + 3, − 2 */
export const sg = (x: number, first = false) => {
  const v = num(Math.abs(x), 6)
  if (first) return x < 0 ? `-${v}` : v
  return x < 0 ? `- ${v}` : `+ ${v}`
}

/** Matriz en TeX */
export const texMat = (m: number[][]) => `\\begin{pmatrix}${m.map((f) => f.map((x) => num(x, 6)).join(' & ')).join(' \\\\ ')}\\end{pmatrix}`
export const texVec = (v: number[], sig = 4) => `(${v.map((x) => num(x, sig)).join(',\\ ')})`

/** Ecuación de plano bonita: 2x - y + 3z - 4 = 0 */
export function texPlano([a, b, c, d]: number[]): string {
  const t: string[] = []
  const term = (k: number, v: string) => {
    if (Math.abs(k) < 1e-12) return
    const abs = Math.abs(k)
    const coef = abs === 1 && v ? '' : num(abs, 6)
    t.push(`${t.length ? (k < 0 ? ' - ' : ' + ') : k < 0 ? '-' : ''}${coef}${v}`)
  }
  term(a, 'x'); term(b, 'y'); term(c, 'z'); term(d, '')
  return `${t.join('')} = 0`
}

export function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]
  let s = seed || 1
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

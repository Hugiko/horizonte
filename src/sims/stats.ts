/** Funciones de probabilidad: normal, binomial, combinatoria. */

/** Función de distribución de la normal estándar Φ(z) (aprox. de Abramowitz-Stegun 26.2.17, error < 7,5·10⁻⁸). */
export function phi(z: number): number {
  if (z < 0) return 1 - phi(-z)
  const t = 1 / (1 + 0.2316419 * z)
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2)
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return 1 - p
}

/** Valor de Φ tal como sale en la tabla (4 decimales, z redondeado a centésimas). */
export const phiTabla = (z: number) => Number(phi(Math.round(z * 100) / 100).toFixed(4))

/** Inversa de Φ por bisección. */
export function phiInv(p: number): number {
  let lo = -8, hi = 8
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (phi(mid) < p) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return Math.round(r)
}

export const binom = (n: number, k: number, p: number) => comb(n, k) * p ** k * (1 - p) ** (n - k)
export const binomAcum = (n: number, k: number, p: number) => {
  let s = 0
  for (let i = 0; i <= k; i++) s += binom(n, i, p)
  return s
}

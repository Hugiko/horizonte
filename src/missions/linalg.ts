/** Álgebra lineal pequeña para generar y resolver misiones. */
export const matMul = (A: number[][], B: number[][]) =>
  A.map((fila) => B[0].map((_, j) => fila.reduce((s, x, k) => s + x * B[k][j], 0)))

export const matPow = (A: number[][], n: number): number[][] => {
  let R: number[][] = A.map((f, i) => f.map((_, j) => (i === j ? 1 : 0)))
  for (let i = 0; i < n; i++) R = matMul(R, A)
  return R
}

export function det(M: number[][]): number {
  const n = M.length
  if (n === 1) return M[0][0]
  if (n === 2) return M[0][0] * M[1][1] - M[0][1] * M[1][0]
  return M[0].reduce((s, x, j) => s + (j % 2 ? -1 : 1) * x * det(M.slice(1).map((f) => f.filter((_, c) => c !== j))), 0)
}

export const transpose = (M: number[][]) => M[0].map((_, j) => M.map((f) => f[j]))

export function inverse(M: number[][]): number[][] {
  const n = M.length
  const d = det(M)
  const adj = M.map((_, i) => M.map((__, j) => {
    const menor = M.filter((_, r) => r !== j).map((f) => f.filter((_, c) => c !== i))
    return ((i + j) % 2 ? -1 : 1) * (n === 1 ? 1 : det(menor))
  }))
  return adj.map((f) => f.map((x) => x / d))
}

export function rank(M: number[][], eps = 1e-9): number {
  const A = M.map((f) => f.slice())
  let r = 0
  const rows = A.length, cols = A[0].length
  for (let c = 0; c < cols && r < rows; c++) {
    let piv = r
    for (let i = r + 1; i < rows; i++) if (Math.abs(A[i][c]) > Math.abs(A[piv][c])) piv = i
    if (Math.abs(A[piv][c]) < eps) continue
    ;[A[r], A[piv]] = [A[piv], A[r]]
    for (let i = 0; i < rows; i++) if (i !== r) {
      const f = A[i][c] / A[r][c]
      for (let k = c; k < cols; k++) A[i][k] -= f * A[r][k]
    }
    r++
  }
  return r
}

/** Resuelve A x = b (Gauss con pivote). */
export function solve(A: number[][], b: number[]): number[] {
  const n = A.length
  const M = A.map((f, i) => [...f, b[i]])
  for (let c = 0; c < n; c++) {
    let piv = c
    for (let i = c + 1; i < n; i++) if (Math.abs(M[i][c]) > Math.abs(M[piv][c])) piv = i
    ;[M[c], M[piv]] = [M[piv], M[c]]
    for (let i = 0; i < n; i++) if (i !== c) {
      const f = M[i][c] / M[c][c]
      for (let k = c; k <= n; k++) M[i][k] -= f * M[c][k]
    }
  }
  return M.map((f, i) => f[n] / f[i])
}

export const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0)
export const sub = (a: number[], b: number[]) => a.map((x, i) => x - b[i])
export const add = (a: number[], b: number[]) => a.map((x, i) => x + b[i])
export const scale = (a: number[], k: number) => a.map((x) => x * k)
export const norm = (a: number[]) => Math.hypot(...a)

/** Generador pseudoaleatorio con semilla (mulberry32): mismos datos para la misma semilla. */
export interface Rng {
  next(): number // [0, 1)
  range(min: number, max: number): number
  int(min: number, max: number): number // ambos incluidos
  pick<T>(arr: readonly T[]): T
  /** Número en [min, max] redondeado a `sig` cifras significativas (datos "de enunciado"). */
  nice(min: number, max: number, sig?: number): number
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const range = (min: number, max: number) => min + (max - min) * next()
  return {
    next,
    range,
    int: (min, max) => Math.floor(range(min, max + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    nice: (min, max, sig = 3) => Number(range(min, max).toPrecision(sig)),
  }
}

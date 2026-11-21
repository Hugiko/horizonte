import { describe, expect, it } from 'vitest'
import { ASTRO, CONST } from '../data/constants'
import { circularSpeed, escapeSpeed, simulate, specificEnergy } from './orbit'
import { createRng } from './rng'

const GM = CONST.G * ASTRO.earth.mass
const R = ASTRO.earth.radius

describe('simulación de órbitas (RK4)', () => {
  it('la velocidad orbital de la ISS está entre 7 y 8 km/s', () => {
    const v = circularSpeed(GM, R + ASTRO.iss.altitude)
    expect(v).toBeGreaterThan(7000)
    expect(v).toBeLessThan(8000)
  })

  it('la velocidad de escape en la superficie es ≈ 11,2 km/s', () => {
    expect(escapeSpeed(GM, R) / 1000).toBeCloseTo(11.2, 1)
  })

  it('conserva la energía mecánica en una órbita circular (cientos de radios aleatorios)', () => {
    const rng = createRng(2071)
    for (let i = 0; i < 200; i++) {
      const r = R + rng.range(2e5, 3.6e7)
      const v = circularSpeed(GM, r)
      const s0 = { r: [r, 0] as [number, number], v: [0, v] as [number, number] }
      const period = 2 * Math.PI * Math.sqrt(r ** 3 / GM)
      const res = simulate(s0, GM, R, period / 400, 400)
      expect(res.outcome).toBe('orbita')
      const e0 = specificEnergy(s0, GM)
      expect(Math.abs((specificEnergy(res.final, GM) - e0) / e0)).toBeLessThan(1e-6)
      // tras un periodo vuelve al punto de partida
      expect(Math.hypot(res.final.r[0] - r, res.final.r[1]) / r).toBeLessThan(1e-4)
    }
  })

  it('clasifica caída y escape', () => {
    const r = R + 4e5
    const lenta = simulate({ r: [r, 0], v: [0, 0.8 * circularSpeed(GM, r)] }, GM, R, 5, 20000)
    expect(lenta.outcome).toBe('cae')
    const rapida = simulate({ r: [r, 0], v: [0, 1.05 * escapeSpeed(GM, r)] }, GM, R, 5, 2000)
    expect(rapida.outcome).toBe('escapa')
  })
})

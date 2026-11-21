/**
 * Simulación de órbitas alrededor de un cuerpo central con integración RK4.
 * Se usa en las misiones de lanzamiento (F2.1) para enseñar el resultado real:
 * caída, órbita cerrada o trayectoria abierta.
 */
export type Vec2 = [number, number]

export interface OrbitState { r: Vec2; v: Vec2 }

export function acceleration(r: Vec2, GM: number): Vec2 {
  const d = Math.hypot(r[0], r[1])
  const f = -GM / (d * d * d)
  return [f * r[0], f * r[1]]
}

export function rk4Step(s: OrbitState, GM: number, dt: number): OrbitState {
  const deriv = (st: OrbitState) => ({ dr: st.v, dv: acceleration(st.r, GM) })
  const add = (st: OrbitState, k: { dr: Vec2; dv: Vec2 }, h: number): OrbitState => ({
    r: [st.r[0] + k.dr[0] * h, st.r[1] + k.dr[1] * h],
    v: [st.v[0] + k.dv[0] * h, st.v[1] + k.dv[1] * h],
  })
  const k1 = deriv(s)
  const k2 = deriv(add(s, k1, dt / 2))
  const k3 = deriv(add(s, k2, dt / 2))
  const k4 = deriv(add(s, k3, dt))
  const comb = (i: 'dr' | 'dv', j: 0 | 1) => (k1[i][j] + 2 * k2[i][j] + 2 * k3[i][j] + k4[i][j]) / 6
  return {
    r: [s.r[0] + comb('dr', 0) * dt, s.r[1] + comb('dr', 1) * dt],
    v: [s.v[0] + comb('dv', 0) * dt, s.v[1] + comb('dv', 1) * dt],
  }
}

/** Energía mecánica específica (por unidad de masa): v²/2 − GM/r. */
export function specificEnergy(s: OrbitState, GM: number): number {
  return 0.5 * (s.v[0] ** 2 + s.v[1] ** 2) - GM / Math.hypot(s.r[0], s.r[1])
}

export type OrbitOutcome = 'cae' | 'orbita' | 'escapa'

/**
 * Integra la trayectoria y clasifica el resultado.
 * `bodyRadius`: si la distancia baja de este valor, el objeto choca.
 */
export function simulate(s0: OrbitState, GM: number, bodyRadius: number, dt: number, maxSteps: number) {
  const path: Vec2[] = [s0.r]
  let s = s0
  for (let i = 0; i < maxSteps; i++) {
    s = rk4Step(s, GM, dt)
    path.push(s.r)
    if (Math.hypot(s.r[0], s.r[1]) < bodyRadius) return { outcome: 'cae' as OrbitOutcome, path, final: s }
  }
  const outcome: OrbitOutcome = specificEnergy(s0, GM) >= 0 ? 'escapa' : 'orbita'
  return { outcome, path, final: s }
}

export const circularSpeed = (GM: number, r: number) => Math.sqrt(GM / r)
export const escapeSpeed = (GM: number, r: number) => Math.sqrt((2 * GM) / r)

/**
 * Constantes físicas y datos astronómicos usados en todo el juego.
 * Valores CODATA 2018 / IAU, redondeados como en las tablas de la PAU.
 * Cada dato lleva su fuente para poder revisarlo.
 */
export const CONST = {
  G: 6.674e-11, // N·m²/kg² · CODATA 2018
  k: 8.988e9, // N·m²/C² · 1/(4π ε0)
  eps0: 8.854e-12, // C²/(N·m²)
  mu0: 4 * Math.PI * 1e-7, // T·m/A
  c: 2.998e8, // m/s
  h: 6.626e-34, // J·s
  e: 1.602e-19, // C
  me: 9.109e-31, // kg
  mp: 1.673e-27, // kg
  mn: 1.675e-27, // kg
  u: 1.661e-27, // kg (unidad de masa atómica)
  NA: 6.022e23, // mol⁻¹
  g0: 9.81, // m/s²
} as const

export const ASTRO = {
  earth: { mass: 5.972e24, radius: 6.371e6, siderealDay: 86164 }, // kg, m (radio medio), s · NASA Earth Fact Sheet
  moon: { mass: 7.342e22, radius: 1.737e6, orbitRadius: 3.844e8, period: 27.32 * 86400 }, // NASA Moon Fact Sheet
  sun: { mass: 1.989e30, radius: 6.957e8, earthDistance: 1.496e11 }, // NASA Sun Fact Sheet / IAU
  iss: { altitude: 4.2e5 }, // m · altitud típica 400–420 km (NASA)
} as const

/** Etiquetas para la tabla de constantes dentro del juego. */
export const CONST_TABLE: { symbol: string; name: string; value: string }[] = [
  { symbol: 'G', name: 'Constante de gravitación', value: '6,674·10⁻¹¹ N·m²/kg²' },
  { symbol: 'k', name: 'Constante de Coulomb', value: '8,99·10⁹ N·m²/C²' },
  { symbol: 'μ₀', name: 'Permeabilidad del vacío', value: '4π·10⁻⁷ T·m/A' },
  { symbol: 'c', name: 'Velocidad de la luz', value: '3,00·10⁸ m/s' },
  { symbol: 'h', name: 'Constante de Planck', value: '6,63·10⁻³⁴ J·s' },
  { symbol: 'e', name: 'Carga elemental', value: '1,60·10⁻¹⁹ C' },
  { symbol: 'mₑ', name: 'Masa del electrón', value: '9,11·10⁻³¹ kg' },
  { symbol: 'mₚ', name: 'Masa del protón', value: '1,67·10⁻²⁷ kg' },
  { symbol: 'M_T', name: 'Masa de la Tierra', value: '5,97·10²⁴ kg' },
  { symbol: 'R_T', name: 'Radio de la Tierra', value: '6,37·10⁶ m' },
  { symbol: 'M_L', name: 'Masa de la Luna', value: '7,34·10²² kg' },
  { symbol: 'd_TL', name: 'Distancia Tierra–Luna', value: '3,84·10⁸ m' },
]

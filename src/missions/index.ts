import c1 from './c1'
import c1pau from './c1-pau'
import type { Mision } from './types'

const TODAS: Mision[] = [...c1pau, ...c1]

export const MISIONES: Record<string, Mision> = Object.fromEntries(TODAS.map((m) => [m.id, m]))

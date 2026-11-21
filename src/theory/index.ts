import t1 from './t1'
import type { Teoria } from './types'

export const TEORIA: Record<number, Teoria> = Object.fromEntries([t1].map((t) => [t.cap, t]))

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CURRICULUM, DEFAULTS } from '../data/curriculum'

export type Calidad = 'baja' | 'media' | 'alta'
export type Personaje = 'chica' | 'chico'
export const RANGOS = ['Becario', 'Técnico', 'Ingeniero/a', 'Ingeniero/a Senior', 'Jefe/a de Misión', 'Director/a de Operaciones'] as const
export const XP_RANGO = [0, 900, 2400, 4800, 8000, 12500]

export interface MisionProgreso {
  estrellas: number // mejor resultado (0–3)
  superada: boolean
  intentos: number // veces jugada
  fallos: number // respuestas incorrectas acumuladas
  ayudas: number // ayudas usadas acumuladas
  errores: Record<string, number> // errores típicos detectados (mensaje → veces)
  tiempo: number // segundos acumulados
  pendienteRepetir?: boolean // se rindió: hay que repetir con datos nuevos
}

export interface Simulacro {
  materia: 'fisica' | 'matematicas'
  nota: number
  fecha: string
  bloques: Record<string, number>
}

/** Datos que forman la partida (lo que se guarda en el servidor). */
export interface SaveData {
  version: number
  iniciada: boolean
  personaje: Personaje | null
  xp: number
  componentes: number
  creditos: number
  misiones: Record<string, MisionProgreso>
  teoriaCompletada: number[]
  modulosVistos: string[]
  cinematicas: string[]
  mejoras: Record<string, number>
  logros: string[]
  simulacros: Simulacro[]
  desbloqueoProfesor: Record<string, boolean> // capítulo → true (abrir) / false (cerrar)
  profesorVersion: number // sube cada vez que el profesor modifica la partida
  estetica: { holo: string; traje: string }
  tiempoJugado: number
}

export const PARTIDA_VACIA: SaveData = {
  version: 2,
  iniciada: false,
  personaje: null,
  xp: 0,
  componentes: 0,
  creditos: DEFAULTS.creditosIniciales,
  misiones: {},
  teoriaCompletada: [],
  modulosVistos: [],
  cinematicas: [],
  mejoras: {},
  logros: [],
  simulacros: [],
  desbloqueoProfesor: {},
  profesorVersion: 0,
  estetica: { holo: 'cian', traje: 'estandar' },
  tiempoJugado: 0,
}
const SAVE_KEYS = Object.keys(PARTIDA_VACIA) as (keyof SaveData)[]

export interface ResultadoMision {
  id: string
  resuelta: boolean
  rendida: boolean
  estrellas: number
  fallos: number
  ayudas: number
  errores: string[]
  tiempo: number
  recompensas: { xp: number; componentes: number; creditos: number }
}

interface GameState extends SaveData {
  calidad: Calidad
  volumen: number
  ajustes: typeof DEFAULTS
  nuevaPartida: (personaje: Personaje) => void
  setCalidad: (c: Calidad) => void
  setVolumen: (v: number) => void
  aplicarPartida: (save: Partial<SaveData> | null) => void
  setAjustes: (a: Partial<typeof DEFAULTS>) => void
  gastarCreditos: (n: number) => boolean
  registrarMision: (r: ResultadoMision) => string[] // devuelve logros nuevos
  completarTeoria: (cap: number) => void
  verModulo: (id: string) => void
  verCinematica: (id: string) => void
  comprarMejora: (id: string, coste: number) => boolean
  registrarSimulacro: (s: Simulacro) => string[]
  setEstetica: (e: Partial<SaveData['estetica']>) => void
  sumarTiempo: (s: number) => void
}

/** Extrae solo los datos de la partida del estado completo. */
export function snapshot(s: GameState = useGame.getState()): SaveData {
  const out = {} as Record<string, unknown>
  for (const k of SAVE_KEYS) out[k] = s[k]
  return out as unknown as SaveData
}

export const rangoDe = (xp: number) => XP_RANGO.reduce((r, umbral, i) => (xp >= umbral ? i : r), 0)

/* ---------- Reglas de progreso ---------- */
export function estrellasCapitulo(s: SaveData, cap: number) {
  const c = CURRICULUM.find((x) => x.id === cap)
  if (!c) return { tiene: 0, max: 0 }
  const ids = [...c.misiones.filter((m) => !m.startsWith('X')), c.jefe].filter((v, i, a) => a.indexOf(v) === i)
  return { tiene: ids.reduce((a, id) => a + (s.misiones[id]?.estrellas ?? 0), 0), max: ids.length * 3 }
}

export function capituloSuperado(s: SaveData, cap: number, umbral: number) {
  const c = CURRICULUM.find((x) => x.id === cap)
  if (!c) return false
  const { tiene, max } = estrellasCapitulo(s, cap)
  return !!s.misiones[c.jefe]?.superada && tiene >= Math.ceil(max * umbral)
}

export function capituloDesbloqueado(s: SaveData, cap: number, umbral: number): boolean {
  const forzado = s.desbloqueoProfesor[String(cap)]
  if (forzado !== undefined) return forzado
  if (cap === CURRICULUM[0].id) return true
  const idx = CURRICULUM.findIndex((c) => c.id === cap)
  if (idx <= 0) return false
  const prev = CURRICULUM[idx - 1].id
  return capituloDesbloqueado(s, prev, umbral) && capituloSuperado(s, prev, umbral)
}

/* ---------- Logros ---------- */
export const LOGROS: { id: string; nombre: string; desc: string; check: (s: SaveData) => boolean }[] = [
  { id: 'primer-dia', nombre: 'Primer día', desc: 'Supera tu primera misión.', check: (s) => Object.values(s.misiones).some((m) => m.superada) },
  { id: 'kepler', nombre: 'Kepler estaría orgulloso', desc: 'Supera el capítulo de órbitas.', check: (s) => !!s.misiones['J2']?.superada },
  { id: 'triple', nombre: 'Precisión de laboratorio', desc: 'Consigue 3 estrellas en 10 misiones.', check: (s) => Object.values(s.misiones).filter((m) => m.estrellas === 3).length >= 10 },
  { id: 'sin-red', nombre: 'Sin red', desc: 'Completa todas las misiones de un capítulo sin ayudas.', check: (s) => CURRICULUM.some((c) => c.id < 10 && [...c.misiones.filter((m) => !m.startsWith('X')), c.jefe].every((id) => s.misiones[id]?.superada && s.misiones[id].ayudas === 0)) },
  { id: 'experto', nombre: 'Por encima del examen', desc: 'Supera una misión de experto.', check: (s) => Object.entries(s.misiones).some(([id, m]) => id.startsWith('X') && m.superada) },
  { id: 'erudito', nombre: 'Archivo completo', desc: 'Completa el Archivo Técnico de 5 capítulos.', check: (s) => s.teoriaCompletada.length >= 5 },
  { id: 'faraday', nombre: 'La corriente vuelve', desc: 'Supera el capítulo de inducción.', check: (s) => !!s.misiones['J5']?.superada },
  { id: 'luz', nombre: 'Hágase la luz', desc: 'Supera el capítulo de óptica.', check: (s) => !!s.misiones['J7']?.superada },
  { id: 'nucleo', nombre: 'Criticidad controlada', desc: 'Rearranca el reactor.', check: (s) => !!s.misiones['J9']?.superada },
  { id: 'aprobado', nombre: 'Tormenta superada', desc: 'Saca un 5 o más en un simulacro.', check: (s) => s.simulacros.some((x) => x.nota >= 5) },
  { id: 'sobresaliente', nombre: 'Matrícula', desc: 'Saca un 9 o más en un simulacro.', check: (s) => s.simulacros.some((x) => x.nota >= 9) },
  { id: 'director', nombre: 'Director/a de Operaciones', desc: 'Alcanza el rango máximo.', check: (s) => rangoDe(s.xp) === RANGOS.length - 1 },
]

function nuevosLogros(s: SaveData): string[] {
  return LOGROS.filter((l) => !s.logros.includes(l.id) && l.check(s)).map((l) => l.id)
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...PARTIDA_VACIA,
      calidad: 'media',
      volumen: 0.7,
      ajustes: DEFAULTS,
      nuevaPartida: (personaje) => set({ ...structuredClone(PARTIDA_VACIA), iniciada: true, personaje, creditos: get().ajustes.creditosIniciales }),
      setCalidad: (calidad) => set({ calidad }),
      setVolumen: (volumen) => set({ volumen }),
      aplicarPartida: (save) => {
        const limpio: Partial<SaveData> = {}
        if (save) for (const k of SAVE_KEYS) if (k in save) (limpio as Record<string, unknown>)[k] = save[k]
        set({ ...structuredClone(PARTIDA_VACIA), ...limpio, version: PARTIDA_VACIA.version })
      },
      setAjustes: (a) => set((s) => ({ ajustes: { ...s.ajustes, ...a } })),
      gastarCreditos: (n) => {
        if (get().creditos < n) return false
        set((s) => ({ creditos: s.creditos - n }))
        return true
      },
      registrarMision: (r) => {
        const s = get()
        const prev = s.misiones[r.id]
        const errores = { ...(prev?.errores ?? {}) }
        for (const e of r.errores) errores[e] = (errores[e] ?? 0) + 1
        const yaSuperada = !!prev?.superada
        const superada = yaSuperada || (r.resuelta && !r.rendida)
        const m: MisionProgreso = {
          estrellas: Math.max(prev?.estrellas ?? 0, r.rendida ? 0 : r.estrellas),
          superada,
          intentos: (prev?.intentos ?? 0) + 1,
          fallos: (prev?.fallos ?? 0) + r.fallos,
          ayudas: (prev?.ayudas ?? 0) + r.ayudas,
          errores,
          tiempo: (prev?.tiempo ?? 0) + r.tiempo,
          pendienteRepetir: !superada && r.rendida,
        }
        // Repetir una misión ya superada da menos recompensa
        const f = r.rendida ? 0 : yaSuperada ? 0.25 : 1
        const mejoraCreditos = s.mejoras['creditos'] ?? 0
        const next: SaveData = {
          ...snapshot(s),
          misiones: { ...s.misiones, [r.id]: m },
          xp: s.xp + Math.round(r.recompensas.xp * f),
          componentes: s.componentes + Math.round(r.recompensas.componentes * f),
          creditos: s.creditos + Math.round(r.recompensas.creditos * f) + (f > 0 ? mejoraCreditos : 0),
        }
        const nuevos = nuevosLogros(next)
        next.logros = [...next.logros, ...nuevos]
        set(next)
        return nuevos
      },
      completarTeoria: (cap) => set((s) => {
        if (s.teoriaCompletada.includes(cap)) return {}
        const next = { ...snapshot(s), teoriaCompletada: [...s.teoriaCompletada, cap], xp: s.xp + 150, creditos: s.creditos + 3 }
        return { ...next, logros: [...next.logros, ...nuevosLogros(next)] }
      }),
      verModulo: (id) => set((s) => (s.modulosVistos.includes(id) ? {} : { modulosVistos: [...s.modulosVistos, id], xp: s.xp + 20 })),
      verCinematica: (id) => set((s) => (s.cinematicas.includes(id) ? {} : { cinematicas: [...s.cinematicas, id] })),
      comprarMejora: (id, coste) => {
        if (get().componentes < coste) return false
        set((s) => ({ componentes: s.componentes - coste, mejoras: { ...s.mejoras, [id]: (s.mejoras[id] ?? 0) + 1 } }))
        return true
      },
      registrarSimulacro: (sim) => {
        const s = get()
        const next = { ...snapshot(s), simulacros: [...s.simulacros, sim], xp: s.xp + Math.round(sim.nota * 120) }
        const nuevos = nuevosLogros(next)
        next.logros = [...next.logros, ...nuevos]
        set(next)
        return nuevos
      },
      setEstetica: (e) => set((s) => ({ estetica: { ...s.estetica, ...e } })),
      sumarTiempo: (sec) => set((s) => ({ tiempoJugado: s.tiempoJugado + sec })),
    }),
    {
      name: 'horizonte-partida',
      version: 2,
      partialize: (s) => ({ ...snapshot(s as GameState), calidad: s.calidad, volumen: s.volumen }),
      migrate: (old) => old as GameState,
    },
  ),
)

/** Ajustes globales del profesor (servidor) → ajustes del juego. */
export function aplicarConfigServidor(cfg: Partial<typeof DEFAULTS>) {
  const permitido: (keyof typeof DEFAULTS)[] = ['umbralEstrellas', 'tolerancia', 'intentosAntesDeRendirse', 'creditosIniciales', 'fechaPAU', 'duracionSimulacro']
  const limpio: Partial<typeof DEFAULTS> = {}
  for (const k of permitido) if (cfg[k] !== undefined) (limpio as Record<string, unknown>)[k] = cfg[k]
  useGame.getState().setAjustes(limpio)
}

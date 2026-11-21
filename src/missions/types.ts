/**
 * Definición de datos de una misión (sección 13 del documento de diseño).
 * Las misiones se escriben como datos; el motor (MissionPlayer) las ejecuta.
 * Todos los textos admiten fórmulas KaTeX entre $...$ y $$...$$.
 */
import type { Rng } from '../sims/rng'

export type Materia = 'fisica' | 'matematicas'
export type TipoPAU = 'C' | 'R' | 'E' | 'N'
export type TipoMision = 'ajuste' | 'calculo' | 'razonamiento' | 'exploracion' | 'decision' | 'crisis'
export type Dificultad = 'PAU' | 'experto' | 'jefe'
export type TipoEntrada = 'numero' | 'vector' | 'matriz' | 'opcion' | 'orden' | 'expresion' | 'primitiva' | 'plano' | 'recta' | 'ajuste'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Params = Record<string, any>

export interface Opcion { texto: string; correcta: boolean; feedback?: string }
export interface RectaResp { punto: number[]; dir: number[] }

export interface ErrorTipico<P extends Params = Params> {
  detectar: (resp: unknown, p: P) => boolean
  mensaje: string
}

export interface Parte<P extends Params = Params> {
  etiqueta?: string // "a)", "b)"…
  enunciado: (p: P) => string
  tipo: TipoEntrada
  /**
   * numero/ajuste → number · vector → number[] · matriz → number[][] · expresion/primitiva → string (mathjs)
   * plano → [A, B, C, D] de Ax+By+Cz+D=0 · recta → { punto, dir } · opcion/orden → no se usa (ver opciones/pasos)
   */
  respuesta: (p: P) => unknown
  unidades?: string
  tolerancia?: number // relativa (por defecto, la del profesor: 2 %)
  absTol?: number // absoluta, para resultados cercanos a 0
  dim?: number | [number, number]
  variables?: string[] // expresion/primitiva (por defecto ['x'])
  opciones?: (p: P) => Opcion[]
  pasos?: (p: P) => string[] // orden correcto; se muestran desordenados
  rango?: (p: P) => { min: number; max: number; paso: number } // ajuste
  primitivaEjemplo?: (p: P) => string // primitiva: una primitiva válida (para los tests)
  maxIntentos?: number // ajuste: intentos limitados (combustible…)
  errores?: ErrorTipico<P>[]
  ayuda1?: string
  ayuda2?: string
  ayuda3?: (p: P) => string
}

export interface Mision<P extends Params = Params> {
  id: string
  capitulo: number
  materia: Materia
  titulo: string
  bloquePAU: string
  saberes: string[]
  tipoPAU: TipoPAU[]
  tipoMision: TipoMision
  dificultad: Dificultad
  datoReal?: { descripcion: string; fuente: string; verificado: boolean }
  generar: (rng: Rng) => P
  contexto: (p: P) => string
  partes: Parte<P>[]
  ayudas: { nivel1: string; nivel2: string; nivel3: (p: P) => string }
  resolucion: (p: P) => string
  escena: string
  widget?: { id: string; props: (p: P) => Record<string, unknown> }
  tiempoLimite?: number // segundos (jefes): al agotarse se pierde una estrella, no la misión
  recompensas: { xp: number; componentes: number; creditos: number }
  /** Guion del tráiler cinematográfico previo (texto plano, sin fórmulas: se narra en voz alta). */
  trailer?: { lema: string; lineas: [QuienTrailer, string][] }
}

export type QuienTrailer = 'NARRADOR' | 'VERA' | 'DIRECTORA' | 'RADIO'

/** Ayuda para escribir misiones con tipos inferidos. */
export const defineMision = <P extends Params>(m: Mision<P>) => m as unknown as Mision

/**
 * Corrección de respuestas: números con tolerancia, vectores, matrices y respuestas
 * simbólicas por EQUIVALENCIA (no por texto): expresiones, primitivas (derivando),
 * planos (cualquier ecuación proporcional) y rectas (cualquier punto y vector director válidos).
 */
import { compile, derivative, evaluate, parse } from 'mathjs'
import type { Parte, RectaResp } from './types'

/** Convierte lo que escribe el alumno en número: "6,67·10^-11", "6.67e-11", "2/3", "sqrt(2)", "3π"… */
export function parseNumero(raw: string): number | null {
  if (typeof raw !== 'string') return null
  let s = raw.trim().toLowerCase()
  if (!s) return null
  s = s.replace(/−/g, '-').replace(/\s+/g, '')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[·×x*]10\^\(?([+-]?\d+)\)?/g, 'e$1')
    .replace(/π/g, 'pi')
    .replace(/(\d)(pi)/g, '$1*$2')
    .replace(/√/g, 'sqrt')
  if (!/^[0-9e.+\-*/^()a-z]+$/.test(s)) return null
  try {
    const v = evaluate(s)
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}

export function numIgual(a: number, b: number, rel = 0.02, abs = 0): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  const diff = Math.abs(a - b)
  return diff <= Math.max(abs, Math.abs(b) * rel, 1e-12)
}

/** Para errores típicos: ¿la respuesta coincide (±tol) con un valor erróneo concreto? */
export function cerca(resp: unknown, valor: number, tol = 0.02): boolean {
  return typeof resp === 'number' && Number.isFinite(valor) && numIgual(resp, valor, tol)
}

const muestras = (vars: string[], n = 7, seed = 1) => {
  let a = seed
  const r = () => { a = (a * 16807) % 2147483647; return a / 2147483647 }
  return Array.from({ length: n }, () => Object.fromEntries(vars.map((v) => [v, 0.3 + r() * 2.2])))
}

function normaliza(expr: string) {
  return expr.replace(/−/g, '-').replace(/·/g, '*').replace(/(\d),(\d)/g, '$1.$2').replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/\bln\(/g, 'log(').replace(/\bsen\(/g, 'sin(')
}

export function exprEquivalentes(user: string, esperado: string, vars: string[] = ['x']): boolean {
  try {
    const fu = compile(normaliza(user))
    const fe = compile(normaliza(esperado))
    let validas = 0
    for (const scope of muestras(vars)) {
      const a = fu.evaluate({ ...scope })
      const b = fe.evaluate({ ...scope })
      if (typeof b !== 'number' || !Number.isFinite(b)) continue
      if (typeof a !== 'number' || !numIgual(a, b, 1e-6, 1e-9)) return false
      validas++
    }
    return validas >= 3
  } catch {
    return false
  }
}

/** Una primitiva es correcta si al derivarla se obtiene el integrando (la constante da igual). */
export function primitivaCorrecta(user: string, integrando: string, variable = 'x'): boolean {
  try {
    const d = derivative(parse(normaliza(user)), variable).toString()
    return exprEquivalentes(d, integrando, [variable])
  } catch {
    return false
  }
}

/** Lee "2x - y + 3z = 4" (o "2*x-y+3*z-4") y devuelve [A,B,C,D] de Ax+By+Cz+D=0, o null si no es un plano. */
export function parsePlano(texto: string): number[] | null {
  try {
    const t = normaliza(texto).replace(/(\d)([xyz])/g, '$1*$2')
    const [lhs, rhs = '0'] = t.split('=')
    if (t.split('=').length > 2) return null
    const f = compile(`(${lhs}) - (${rhs})`)
    const ev = (x: number, y: number, z: number) => f.evaluate({ x, y, z }) as number
    const D = ev(0, 0, 0)
    const A = ev(1, 0, 0) - D
    const B = ev(0, 1, 0) - D
    const C = ev(0, 0, 1) - D
    // comprobar que es lineal
    for (const [x, y, z] of [[2, -1, 3], [-1.5, 2.5, 0.5], [3, 3, -2]]) if (!numIgual(ev(x, y, z), A * x + B * y + C * z + D, 1e-9, 1e-9)) return null
    if (Math.abs(A) + Math.abs(B) + Math.abs(C) < 1e-12) return null
    return [A, B, C, D]
  } catch {
    return null
  }
}

export function proporcionales(u: number[], v: number[], tol = 1e-3): boolean {
  const nu = Math.hypot(...u)
  const nv = Math.hypot(...v)
  if (nu < 1e-12 || nv < 1e-12) return false
  const a = u.map((x) => x / nu)
  const b = v.map((x) => x / nv)
  const dot = a.reduce((s, x, i) => s + x * b[i], 0)
  return Math.abs(Math.abs(dot) - 1) < tol
}

export function planoEquivalente(user: number[], esperado: number[]): boolean {
  return proporcionales(user, esperado, 1e-4)
}

export function rectaEquivalente(user: RectaResp, esp: RectaResp): boolean {
  if (!proporcionales(user.dir, esp.dir, 1e-4)) return false
  const d = user.punto.map((x, i) => x - esp.punto[i])
  if (Math.hypot(...d) < 1e-6) return true
  return proporcionales(d, esp.dir, 1e-4)
}

export type Veredicto = { ok: boolean; aviso?: string }

/** Comprueba la respuesta de una parte. `resp` ya viene parseada por la interfaz. */
export function comprobar(parte: Parte, p: Record<string, unknown>, resp: unknown, tolGlobal: number): Veredicto {
  const esperado = parte.respuesta(p)
  const rel = parte.tolerancia ?? tolGlobal
  const abs = parte.absTol ?? 0
  switch (parte.tipo) {
    case 'numero':
      // respuestas ENTERAS: vale el entero redondeado (±0,5) o cualquier valor a ±tolerancia del exacto
      return { ok: typeof resp === 'number' && numIgual(resp, esperado as number, rel, Math.max(abs, 0.5 + 1e-9)) }
    case 'ajuste':
      return { ok: typeof resp === 'number' && numIgual(resp, esperado as number, rel, abs) }
    case 'vector': {
      const e = esperado as number[]
      const r = resp as number[]
      return { ok: Array.isArray(r) && r.length === e.length && r.every((x, i) => numIgual(x, e[i], rel, Math.max(abs, 1e-9 + Math.hypot(...e) * rel * 0.5))) }
    }
    case 'matriz': {
      const e = esperado as number[][]
      const r = resp as number[][]
      return { ok: Array.isArray(r) && e.every((fila, i) => fila.every((x, j) => numIgual(r[i]?.[j], x, Math.max(rel, 1e-6), Math.max(abs, 1e-6)))) }
    }
    case 'expresion':
      return { ok: typeof resp === 'string' && exprEquivalentes(resp, esperado as string, parte.variables) }
    case 'primitiva':
      return { ok: typeof resp === 'string' && primitivaCorrecta(resp, esperado as string, parte.variables?.[0]) }
    case 'plano': {
      const pl = typeof resp === 'string' ? parsePlano(resp) : null
      if (!pl) return { ok: false, aviso: 'No reconozco la ecuación de un plano. Escríbela como Ax + By + Cz + D = 0, por ejemplo: 2x - y + 3z = 4' }
      return { ok: planoEquivalente(pl, esperado as number[]) }
    }
    case 'recta':
      return { ok: rectaEquivalente(resp as RectaResp, esperado as RectaResp) }
    case 'opcion': {
      const ops = parte.opciones!(p)
      return { ok: typeof resp === 'number' && !!ops[resp]?.correcta, aviso: typeof resp === 'number' ? ops[resp]?.feedback : undefined }
    }
    case 'orden': {
      const pasos = parte.pasos!(p)
      const r = resp as string[]
      return { ok: Array.isArray(r) && r.length === pasos.length && r.every((x, i) => x === pasos[i]) }
    }
  }
}

/** Analizador de unidades (mejora del taller): detecta desfases de potencias de 10. */
export function desfasePotencia(resp: number, esperado: number): number | null {
  if (!resp || !esperado) return null
  const r = Math.log10(Math.abs(resp / esperado))
  const k = Math.round(r)
  if (k !== 0 && Math.abs(r - k) < 0.01 && Math.abs(k) % 3 === 0) return k
  return null
}

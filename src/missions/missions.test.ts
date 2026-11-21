import { describe, expect, it } from 'vitest'
import { CURRICULUM } from '../data/curriculum'
import { createRng } from '../sims/rng'
import { comprobar } from './check'
import { sci, texPlano } from './fmt'
import { MISIONES } from './index'
import type { Mision, Parte } from './types'

const SEMILLAS = 150
/** Misiones antiguas aún sin rehacer a partir de un ejercicio PAU real (no cumplen el formato entero). */
const LEGADO = new Set(['F1.2', 'F1.3', 'M1.2', 'X1.1', 'J1'])
const MALO = /NaN|undefined|Infinity|\[object|null/

function respuestaCorrecta(parte: Parte, p: Record<string, unknown>): unknown {
  switch (parte.tipo) {
    case 'opcion': return parte.opciones!(p).findIndex((o) => o.correcta)
    case 'orden': return parte.pasos!(p)
    case 'plano': return texPlano(parte.respuesta(p) as number[]).replace(/\{,\}/g, '.').replace(/−/g, '-')
    case 'primitiva': return parte.primitivaEjemplo!(p)
    // el alumno escribe el entero redondeado
    case 'numero': return Math.round(parte.respuesta(p) as number)
    default: return parte.respuesta(p)
  }
}

describe('todas las misiones', () => {
  it('el currículo solo referencia misiones que existen', () => {
    for (const c of CURRICULUM) for (const id of [...c.misiones, c.jefe]) expect(MISIONES[id], `falta ${id}`).toBeDefined()
  })

  it('las misiones nuevas citan su ejercicio PAU de origen', () => {
    for (const m of Object.values(MISIONES) as Mision[]) if (!LEGADO.has(m.id)) expect(m.datoReal?.descripcion ?? '', m.id).toMatch(/PAU/)
  })

  for (const m of Object.values(MISIONES) as Mision[]) {
    it(`${m.id} · ${m.titulo}: ${SEMILLAS} juegos de datos válidos y coherentes`, () => {
      for (let seed = 1; seed <= SEMILLAS; seed++) {
        const p = m.generar(createRng(seed * 7919 + m.id.length))
        const ctx = m.contexto(p)
        expect(ctx, `contexto seed ${seed}`).not.toMatch(MALO)
        expect(m.resolucion(p), `resolución seed ${seed}`).not.toMatch(MALO)
        expect(m.ayudas.nivel3(p)).not.toMatch(MALO)
        for (const parte of m.partes) {
          expect(parte.enunciado(p)).not.toMatch(MALO)
          if (parte.tipo === 'opcion') {
            const ops = parte.opciones!(p)
            expect(ops.filter((o) => o.correcta).length, `${m.id} ${parte.etiqueta} seed ${seed}: una sola opción correcta`).toBe(1)
            for (const o of ops) expect(o.texto).not.toMatch(MALO)
          }
          if (['numero', 'ajuste'].includes(parte.tipo)) {
            const v = parte.respuesta(p) as number
            expect(Number.isFinite(v), `${m.id} ${parte.etiqueta} seed ${seed}: respuesta finita`).toBe(true)
            if (parte.tipo === 'numero' && !LEGADO.has(m.id)) {
              // formato entero: o es un entero exacto, o la escala da al menos 2 cifras (redondear no pierde precisión)
              const exacto = Number.isInteger(v)
              expect(exacto || Math.abs(v) >= 10, `${m.id} ${parte.etiqueta} seed ${seed}: la escala elegida da ${v}; debe dar un entero de 2+ cifras`).toBe(true)
              expect(parte.unidades !== undefined || exacto, `${m.id} ${parte.etiqueta}: falta indicar la unidad/escala`).toBe(true)
            }
            if (parte.ayuda3 && Math.abs(v) > 1e-9 && !Number.isInteger(v)) {
              expect(parte.ayuda3(p).includes(sci(v, 3)), `${m.id} ${parte.etiqueta}: la ayuda 3 no puede dar el resultado`).toBe(false)
            }
          }
          if (parte.ayuda3) expect(parte.ayuda3(p)).not.toMatch(MALO)
          const resp = respuestaCorrecta(parte, p)
          const v = comprobar(parte, p, resp, 0.02)
          expect(v.ok, `${m.id} ${parte.etiqueta} seed ${seed}: la respuesta correcta debe aceptarse`).toBe(true)
          for (const e of parte.errores ?? []) {
            expect(e.detectar(resp, p), `${m.id} ${parte.etiqueta} seed ${seed}: el error típico «${e.mensaje.slice(0, 40)}» salta con la respuesta correcta`).toBe(false)
          }
        }
      }
    })
  }
})

import { useEffect, useMemo, useRef, useState } from 'react'
import { setAmbiente, sfx } from '../audio/audio'
import { comprobar } from '../missions/check'
import { MISIONES } from '../missions/index'
import type { Mision } from '../missions/types'
import { createRng } from '../sims/rng'
import { LOGROS, useGame } from '../state/store'
import { useUI } from '../state/ui'
import { PartInput } from '../ui/inputs'
import { Tex } from '../ui/Tex'
import { ToolButtons, ToolPanel } from '../ui/tools'
import { VeraBubble } from '../ui/Vera'

interface BloqueDef { nombre: string; puntos: number; caps: number[]; materia: 'fisica' | 'matematicas'; obligatorio: boolean }
const ESTRUCTURA: Record<'fisica' | 'matematicas', BloqueDef[]> = {
  fisica: [
    { nombre: 'Campo gravitatorio', puntos: 2, caps: [1, 2], materia: 'fisica', obligatorio: true },
    { nombre: 'Campo electromagnético', puntos: 3, caps: [3, 4, 5], materia: 'fisica', obligatorio: false },
    { nombre: 'Vibraciones y ondas', puntos: 3, caps: [6, 7], materia: 'fisica', obligatorio: false },
    { nombre: 'Física relativista, cuántica, nuclear y de partículas', puntos: 2, caps: [8, 9], materia: 'fisica', obligatorio: false },
  ],
  matematicas: [
    { nombre: 'Probabilidad y Estadística', puntos: 2.5, caps: [9], materia: 'matematicas', obligatorio: true },
    { nombre: 'Álgebra', puntos: 2.5, caps: [1, 2, 3], materia: 'matematicas', obligatorio: false },
    { nombre: 'Geometría', puntos: 2.5, caps: [4, 5], materia: 'matematicas', obligatorio: false },
    { nombre: 'Análisis', puntos: 2.5, caps: [6, 7, 8], materia: 'matematicas', obligatorio: false },
  ],
}

function pool(b: BloqueDef): Mision[] {
  return Object.values(MISIONES).filter((m) => m.dificultad === 'PAU' && m.materia === b.materia && b.caps.includes(m.capitulo) && !m.partes.some((p) => p.tipo === 'ajuste'))
}

export function Exam({ materia }: { materia: 'fisica' | 'matematicas' }) {
  const ir = useUI((s) => s.ir)
  const toast = useUI((s) => s.toast)
  const { ajustes, registrarSimulacro } = useGame()
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31))
  const examen = useMemo(() => {
    const rng = createRng(seed)
    return ESTRUCTURA[materia].map((b) => {
      const pl = pool(b)
      const a = rng.pick(pl)
      const restantes = pl.filter((m) => m.id !== a.id)
      const opciones = b.obligatorio || !restantes.length ? [a] : [a, rng.pick(restantes)]
      return { b, opciones: opciones.map((m) => ({ m, p: m.generar(createRng(rng.int(1, 2 ** 30))) })) }
    })
  }, [materia, seed])
  const [fase, setFase] = useState<'intro' | 'examen' | 'resultado'>('intro')
  const [eleccion, setEleccion] = useState<(number | null)[]>([])
  const [bloque, setBloque] = useState(0)
  const [parte, setParte] = useState(0)
  const [resp, setResp] = useState<Record<string, unknown>>({})
  const inicio = useRef(0)
  const [ahora, setAhora] = useState(Date.now())
  const [resultado, setResultado] = useState<null | { nota: number; bloques: { nombre: string; puntos: number; obtenidos: number; aciertos: boolean[] }[] }>(null)
  const duracion = ajustes.duracionSimulacro * 60

  useEffect(() => { setAmbiente(fase === 'examen' ? 'tension' : 'teoria') }, [fase])
  useEffect(() => {
    if (fase !== 'examen') return
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [fase])
  const restante = Math.max(0, duracion - Math.floor((ahora - inicio.current) / 1000))
  useEffect(() => { if (fase === 'examen' && restante === 0) entregar() }) // eslint-disable-line react-hooks/exhaustive-deps

  const empezar = () => {
    setEleccion(examen.map((e) => (e.opciones.length === 1 ? 0 : null)))
    setBloque(0); setParte(0); setResp({}); inicio.current = Date.now(); setAhora(Date.now()); setFase('examen'); sfx.alarm()
  }

  function entregar() {
    if (fase !== 'examen') return
    const bloques = examen.map((e, bi) => {
      const k = eleccion[bi] ?? 0
      const { m, p } = e.opciones[k]
      const aciertos = m.partes.map((pt, pi) => {
        const r = resp[`${bi}-${pi}`]
        if (r === undefined || eleccion[bi] === null) return false
        try { return comprobar(pt, p, r, ajustes.tolerancia).ok } catch { return false }
      })
      const obtenidos = (e.b.puntos * aciertos.filter(Boolean).length) / m.partes.length
      return { nombre: e.b.nombre, puntos: e.b.puntos, obtenidos, aciertos }
    })
    const nota = Math.round(bloques.reduce((s, b) => s + b.obtenidos, 0) * 100) / 100
    setResultado({ nota, bloques })
    const nuevos = registrarSimulacro({ materia, nota, fecha: new Date().toISOString(), bloques: Object.fromEntries(bloques.map((b) => [b.nombre, Math.round(b.obtenidos * 100) / 100])) })
    nuevos.forEach((lid) => { const l = LOGROS.find((x) => x.id === lid); if (l) toast(`Logro: ${l.nombre}`, l.desc, 'logro') })
    setFase('resultado')
    setAmbiente(nota >= 5 ? 'victoria' : 'teoria')
    if (nota >= 5) sfx.levelUp(); else sfx.wrong()
  }

  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const titulo = materia === 'fisica' ? 'Física' : 'Matemáticas II'

  const header = (
    <header className="mission-bar glass">
      <button className="link-btn" onClick={() => { if (fase !== 'examen' || confirm('Si sales ahora, el simulacro no contará. ¿Salir?')) { sfx.back(); ir({ id: 'capitulo', cap: 10 }) } }}>← Salir</button>
      <div className="mb-title"><span className="badge jefe">SIMULACRO PAU</span> {titulo}</div>
      <div className="mb-right">
        {fase === 'examen' && <span className={`timer ${restante < 300 ? 'low' : ''}`}>⏱ {mm(restante)}</span>}
        <ToolButtons />
      </div>
    </header>
  )

  if (fase === 'intro') {
    return (
      <div className="screen exam">
        {header}
        <div className="exam-intro glass">
          <h2>Simulacro de {titulo} · PAU Comunitat Valenciana</h2>
          <VeraBubble>{`**Modo examen.** Tienes **${ajustes.duracionSimulacro} minutos**. No hay ayudas ni corrección hasta que entregues. Tienes calculadora, tabla de constantes y tabla de la normal. ${materia === 'fisica' ? 'El primer apartado no tiene optatividad; en los otros tres eliges entre dos opciones.' : 'El ejercicio 1 (Probabilidad) es obligatorio; en los otros tres eliges entre dos opciones.'}`}</VeraBubble>
          <table className="data-table">
            <thead><tr><th>{materia === 'fisica' ? 'Apartado' : 'Ejercicio'}</th><th>Bloque</th><th>Puntos</th><th>Opciones</th></tr></thead>
            <tbody>{examen.map((e, i) => <tr key={i}><td>{i + 1}</td><td>{e.b.nombre}</td><td>{String(e.b.puntos).replace('.', ',')}</td><td>{e.opciones.length === 1 ? 'Obligatorio' : 'A elegir entre 2'}</td></tr>)}</tbody>
          </table>
          <button className="primary-btn" onClick={empezar}>Empezar el simulacro</button>
        </div>
      </div>
    )
  }

  if (fase === 'resultado' && resultado) {
    return (
      <div className="screen exam">
        {header}
        <div className="exam-result glass">
          <div className="eyebrow">RESULTADO DEL SIMULACRO · {titulo.toUpperCase()}</div>
          <div className={`grade ${resultado.nota >= 5 ? 'pass' : 'fail'}`}>{resultado.nota.toFixed(2).replace('.', ',')}<span>/10</span></div>
          <table className="data-table">
            <thead><tr><th>Bloque</th><th>Partes correctas</th><th>Puntuación</th></tr></thead>
            <tbody>{resultado.bloques.map((b) => <tr key={b.nombre}><td>{b.nombre}</td><td>{b.aciertos.map((a, i) => <span key={i} className={a ? 'ok' : 'bad'}>{a ? '✓' : '✗'}</span>)}</td><td>{b.obtenidos.toFixed(2).replace('.', ',')} / {String(b.puntos).replace('.', ',')}</td></tr>)}</tbody>
          </table>
          <h3>Resoluciones</h3>
          {examen.map((e, bi) => {
            const { m, p } = e.opciones[eleccion[bi] ?? 0]
            return <details key={bi} className="th-example glass"><summary>{bi + 1}. {e.b.nombre} · {m.titulo}</summary><Tex>{m.resolucion(p)}</Tex></details>
          })}
          <div className="end-actions">
            <button className="primary-btn" onClick={() => { setSeed(Math.floor(Math.random() * 2 ** 31)); setFase('intro'); setResultado(null) }}>Repetir con datos nuevos</button>
            <button className="link-btn" onClick={() => ir({ id: 'capitulo', cap: 10 })}>Volver</button>
            {resultado.nota >= 5 && <button className="primary-btn" onClick={() => ir({ id: 'cinematica', cine: 'final', despues: { id: 'creditos' } })}>Ver el final →</button>}
          </div>
        </div>
        <ToolPanel />
      </div>
    )
  }

  const e = examen[bloque]
  const k = eleccion[bloque]
  return (
    <div className="screen exam">
      {header}
      <div className="exam-body">
        <nav className="exam-nav glass">
          {examen.map((ex, i) => {
            const elegido = eleccion[i]
            const m = elegido !== null ? ex.opciones[elegido].m : null
            const hechas = m ? m.partes.filter((_, pi) => resp[`${i}-${pi}`] !== undefined).length : 0
            return (
              <button key={i} className={i === bloque ? 'on' : ''} onClick={() => { setBloque(i); setParte(0) }}>
                <b>{i + 1}. {ex.b.nombre}</b><span>{String(ex.b.puntos).replace('.', ',')} pt · {m ? `${hechas}/${m.partes.length} respondidas` : 'sin elegir'}</span>
              </button>
            )
          })}
          <button className="primary-btn" onClick={() => { if (confirm('¿Entregar el examen? Ya no podrás cambiar las respuestas.')) entregar() }}>Entregar examen</button>
        </nav>
        <section className="exam-main glass">
          {k === null ? (
            <div className="exam-choice">
              <h3>{bloque + 1}. {e.b.nombre} · elige una opción</h3>
              <div className="sim-cards">
                {e.opciones.map((o, i) => (
                  <button key={i} className="sim-card glass" onClick={() => { const el = [...eleccion]; el[bloque] = i; setEleccion(el); setParte(0); sfx.click() }}>
                    <h3>Opción {String.fromCharCode(65 + i)}</h3>
                    <p className="choice-title">{o.m.titulo}</p>
                    <Tex className="choice-preview">{o.m.contexto(o.p).split('\n\n')[0]}</Tex>
                  </button>
                ))}
              </div>
            </div>
          ) : (() => {
            const { m, p } = e.opciones[k]
            const pt = m.partes[parte]
            const key = `${bloque}-${parte}`
            return (
              <div className="exam-q">
                <div className="eyebrow">{bloque + 1}. {e.b.nombre} · Opción {String.fromCharCode(65 + k)}{e.opciones.length > 1 && <button className="link-btn" onClick={() => { const el = [...eleccion]; el[bloque] = null; setEleccion(el) }}> (cambiar)</button>}</div>
                <Tex>{m.contexto(p)}</Tex>
                <div className="steps">
                  {m.partes.map((x, i) => <button key={i} className={`step ${i === parte ? 'on' : ''} ${resp[`${bloque}-${i}`] !== undefined ? 'done' : ''}`} onClick={() => setParte(i)}>{x.etiqueta ?? i + 1}</button>)}
                </div>
                <div className="part-q"><span className="part-label">{pt.etiqueta}</span><Tex>{pt.enunciado(p)}</Tex></div>
                <PartInput key={key + seed} parte={pt} p={p} seed={seed + bloque * 10 + parte} examen valorInicial={resp[key]}
                  onSubmit={(r) => { setResp({ ...resp, [key]: r }); sfx.click(); if (parte < m.partes.length - 1) setParte(parte + 1) }} />
                {resp[key] !== undefined && <p className="hint-note">Respuesta guardada. Puedes cambiarla hasta entregar.</p>}
              </div>
            )
          })()}
        </section>
      </div>
      <ToolPanel />
    </div>
  )
}

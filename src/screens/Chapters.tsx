import { useEffect } from 'react'
import { setAmbiente, sfx } from '../audio/audio'
import { CURRICULUM } from '../data/curriculum'
import { MISIONES } from '../missions/index'
import { capituloDesbloqueado, capituloSuperado, estrellasCapitulo, useGame } from '../state/store'
import { useUI } from '../state/ui'
import { VeraBubble } from '../ui/Vera'

export function ChapterMap() {
  const ir = useUI((s) => s.ir)
  const g = useGame()
  useEffect(() => setAmbiente('base'), [])
  return (
    <div className="screen chapter-map">
      <header className="mission-bar glass">
        <button className="link-btn" onClick={() => { sfx.back(); ir({ id: 'base' }) }}>← Base</button>
        <div className="mb-title"><span className="badge">MESA HOLOGRÁFICA</span> Plan de reconstrucción</div>
        <div className="mb-right" />
      </header>
      <div className="map-grid">
        {CURRICULUM.map((c, idx) => {
          const abierto = capituloDesbloqueado(g, c.id, g.ajustes.umbralEstrellas)
          const hecho = capituloSuperado(g, c.id, g.ajustes.umbralEstrellas)
          const { tiene, max } = estrellasCapitulo(g, c.id)
          return (
            <button key={c.id} className={`chapter-card glass ${abierto ? '' : 'locked'} ${hecho ? 'done' : ''}`} style={{ animationDelay: `${idx * 0.05}s` }}
              disabled={!abierto} onMouseEnter={() => abierto && sfx.hover()}
              onClick={() => {
                sfx.open()
                const cine = `c${c.id}-inicio`
                if (!g.cinematicas.includes(cine)) ir({ id: 'cinematica', cine, despues: { id: 'capitulo', cap: c.id } })
                else ir({ id: 'capitulo', cap: c.id })
              }}>
              <div className="cc-num">{String(c.id).padStart(2, '0')}</div>
              <div className="cc-body">
                <div className="cc-epoca">{c.epoca}</div>
                <h3>{c.titulo}</h3>
                <p>{c.fisica.tema}</p>
                <p className="dim">{c.matematicas.tema}</p>
              </div>
              <div className="cc-foot">
                {abierto ? <><span className="cc-stars">★ {tiene}/{max}</span><div className="mini-bar"><div style={{ width: `${max ? (tiene / max) * 100 : 0}%` }} /></div></> : <span className="lock">🔒 Supera el jefe del capítulo anterior</span>}
                {hecho && <span className="cc-done">SUPERADO</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ChapterScreen({ cap }: { cap: number }) {
  const ir = useUI((s) => s.ir)
  const g = useGame()
  const c = CURRICULUM.find((x) => x.id === cap)!
  useEffect(() => setAmbiente(cap === 10 ? 'tension' : 'base'), [cap])
  const teoriaHecha = g.teoriaCompletada.includes(cap) || cap === 10
  const { tiene, max } = estrellasCapitulo(g, cap)
  const umbral = Math.ceil(max * g.ajustes.umbralEstrellas)
  const normales = c.misiones.filter((id) => !id.startsWith('X') && id !== c.jefe)
  const expertas = c.misiones.filter((id) => id.startsWith('X'))
  const jefeAbierto = normales.every((id) => g.misiones[id]?.superada)
  const superado = capituloSuperado(g, cap, g.ajustes.umbralEstrellas)
  const volver = { id: 'capitulo' as const, cap }

  if (cap === 10) {
    return (
      <div className="screen chapter">
        <header className="mission-bar glass">
          <button className="link-btn" onClick={() => { sfx.back(); ir({ id: 'mapa' }) }}>← Mapa</button>
          <div className="mb-title"><span className="badge jefe">CAPÍTULO 10</span> La segunda tormenta · Simulacro final</div>
          <div className="mb-right" />
        </header>
        <div className="chapter-body">
          <section className="glass ch-intro">
            <VeraBubble>{'Dos simulacros con la **estructura real de la PAU de la Comunitat Valenciana**: 90 minutos por materia, sin ayudas, con calculadora y tablas. Al final verás tu **nota sobre 10** y un informe por bloques. Puedes repetirlos con datos nuevos tantas veces como quieras.'}</VeraBubble>
            <div className="sim-cards">
              {(['fisica', 'matematicas'] as const).map((mat) => {
                const notas = g.simulacros.filter((s) => s.materia === mat)
                const mejor = notas.length ? Math.max(...notas.map((s) => s.nota)) : null
                return (
                  <button key={mat} className="sim-card glass" onClick={() => { sfx.open(); ir({ id: 'simulacro', materia: mat }) }}>
                    <h3>{mat === 'fisica' ? 'Física' : 'Matemáticas II'}</h3>
                    <p>{mat === 'fisica' ? '4 apartados · gravitatorio 2 pt · electromagnético 3 pt · ondas 3 pt · moderna 2 pt' : '4 ejercicios de 2,5 pt · probabilidad (obligatorio) · álgebra · geometría · análisis'}</p>
                    <div className="sim-best">{mejor !== null ? `Mejor nota: ${mejor.toFixed(2).replace('.', ',')} · ${notas.length} intento(s)` : 'Sin intentos todavía'}</div>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    )
  }

  const tarjeta = (id: string, bloqueada = false, motivo = '') => {
    const m = MISIONES[id]
    if (!m) return null
    const pr = g.misiones[id]
    return (
      <button key={id} className={`mission-card ${m.dificultad} ${bloqueada ? 'locked' : ''} ${pr?.superada ? 'done' : ''}`} disabled={bloqueada}
        onMouseEnter={() => !bloqueada && sfx.hover()}
        onClick={() => { sfx.open(); ir({ id: 'trailer', mision: id, volver }) }}>
        <div className="mc-top"><span className="mc-id">{id}</span><span className="mc-stars">{[0, 1, 2].map((k) => <span key={k} className={k < (pr?.estrellas ?? 0) ? 'on' : ''}>★</span>)}</span></div>
        <h4>{m.titulo.replace(/^(JEFE|Experto) · /, '')}</h4>
        <p className="mc-meta">{m.materia === 'fisica' ? 'Física' : 'Matemáticas'} · {m.tipoMision} · {m.partes.length} partes</p>
        {pr?.pendienteRepetir && <p className="mc-warn">Repetir con datos nuevos</p>}
        {bloqueada && <p className="mc-warn">{motivo}</p>}
      </button>
    )
  }

  return (
    <div className="screen chapter">
      <header className="mission-bar glass">
        <button className="link-btn" onClick={() => { sfx.back(); ir({ id: 'mapa' }) }}>← Mapa</button>
        <div className="mb-title"><span className="badge">CAPÍTULO {cap}</span> {c.titulo} <span className="mb-type">{c.epoca}</span></div>
        <div className="mb-right"><span className="credits">★ {tiene}/{max} · necesitas {umbral}</span></div>
      </header>
      <div className="chapter-body">
        <section className="glass ch-intro">
          <p className="ch-story">{c.historia}</p>
          <div className="ch-topics"><span className="dot fisica" /> {c.fisica.tema} <span className="dot matematicas" /> {c.matematicas.tema}</div>
          <button className={`theory-btn ${teoriaHecha ? 'done' : 'pulse'}`} onClick={() => { sfx.open(); ir({ id: 'teoria', cap }) }}>
            ❖ Archivo Técnico {teoriaHecha ? '· repasar' : '· obligatorio antes de las misiones'}
          </button>
          {superado && <div className="cc-done big">CAPÍTULO SUPERADO</div>}
        </section>
        <section className="missions-grid">
          <h3>Misiones</h3>
          <div className="cards">{normales.map((id) => tarjeta(id, !teoriaHecha, 'Completa antes el Archivo Técnico'))}</div>
          {expertas.length > 0 && <><h3>Misiones de experto <span className="dim">· opcionales, por encima del nivel PAU</span></h3><div className="cards">{expertas.map((id) => tarjeta(id, !teoriaHecha, 'Completa antes el Archivo Técnico'))}</div></>}
          <h3>Jefe del capítulo</h3>
          <div className="cards">{tarjeta(c.jefe, !teoriaHecha || !jefeAbierto, !teoriaHecha ? 'Completa antes el Archivo Técnico' : 'Supera todas las misiones del capítulo')}</div>
          {superado && !g.cinematicas.includes(`c${cap}-fin`) && (
            <button className="primary-btn" onClick={() => ir({ id: 'cinematica', cine: `c${cap}-fin`, despues: { id: 'mapa' } })}>Ver final del capítulo →</button>
          )}
        </section>
      </div>
    </div>
  )
}

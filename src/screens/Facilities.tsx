import { useEffect } from 'react'
import { setAmbiente, sfx } from '../audio/audio'
import { CURRICULUM } from '../data/curriculum'
import { MISIONES } from '../missions/index'
import { RANK_COLORS, TRAJES } from '../scenes/Player'
import { estrellasCapitulo, LOGROS, RANGOS, rangoDe, useGame, type SaveData } from '../state/store'
import { useUI } from '../state/ui'
import { TEORIA } from '../theory'
import { Tex } from '../ui/Tex'
import { VeraBubble } from '../ui/Vera'
import { AgentPanel } from './BaseHUD'

function Shell({ titulo, badge, children, volver = { id: 'base' as const } }: { titulo: string; badge: string; children: React.ReactNode; volver?: { id: 'base' } }) {
  const ir = useUI((s) => s.ir)
  useEffect(() => setAmbiente('base'), [])
  return (
    <div className="screen facility">
      <header className="mission-bar glass">
        <button className="link-btn" onClick={() => { sfx.back(); ir(volver) }}>← Base</button>
        <div className="mb-title"><span className="badge">{badge}</span> {titulo}</div>
        <div className="mb-right" />
      </header>
      <div className="facility-body">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ Taller */
export const MEJORAS = [
  { id: 'escaner', rama: 'Equipo', nombre: 'Escáner del dron', desc: 'Cada nivel da una pista conceptual (nivel 1) gratis por misión.', costes: [60, 120, 200] },
  { id: 'unidades', rama: 'Equipo', nombre: 'Analizador de unidades', desc: 'Avisa cuando tu resultado se desvía exactamente una potencia de 10³ (km/m, nm/m…).', costes: [90] },
  { id: 'creditos', rama: 'Equipo', nombre: 'Enlace de soporte ampliado', desc: '+1 crédito de soporte extra por cada misión superada, por nivel.', costes: [80, 150, 240] },
  { id: 'tiempo', rama: 'Equipo', nombre: 'Sistemas de emergencia', desc: '+25 % de tiempo en las crisis contrarreloj, por nivel.', costes: [100, 180] },
]
const VEHICULOS = [
  { nombre: 'Dron de inspección', rango: 0, desc: 'Escanea restos y mide distancias.' },
  { nombre: 'Rover de superficie', rango: 1, desc: 'Llega a subestaciones y centrales.' },
  { nombre: 'Lanzadera orbital', rango: 2, desc: 'Pone satélites en órbita.' },
  { nombre: 'Nave de reparación', rango: 4, desc: 'Opera en órbita geoestacionaria y más allá.' },
]
const HOLOS: Record<string, string> = { cian: '#3fe0ff', naranja: '#ff8a3d', verde: '#5dffa8', violeta: '#c08bff', oro: '#ffd23d' }
export const holoColor = (id: string) => HOLOS[id] ?? HOLOS.cian

export function Workshop() {
  const g = useGame()
  const r = rangoDe(g.xp)
  return (
    <Shell titulo="Taller de mejoras" badge="TALLER">
      <AgentPanel />
      <VeraBubble>{'Las mejoras te dan **ventajas de juego**, nunca respuestas. Los componentes ⚙ se ganan superando misiones.'}</VeraBubble>
      <h3 className="sec">Equipo</h3>
      <div className="upgrade-grid">
        {MEJORAS.map((m) => {
          const nivel = g.mejoras[m.id] ?? 0
          const coste = m.costes[nivel]
          return (
            <div key={m.id} className="upgrade glass">
              <h4>{m.nombre}</h4>
              <p>{m.desc}</p>
              <div className="lvl">{m.costes.map((_, i) => <span key={i} className={i < nivel ? 'on' : ''} />)}</div>
              {coste !== undefined ? (
                <button className="primary-btn" disabled={g.componentes < coste} onClick={() => { if (g.comprarMejora(m.id, coste)) sfx.levelUp(); else sfx.wrong() }}>Mejorar · ⚙ {coste}</button>
              ) : <span className="maxed">NIVEL MÁXIMO</span>}
            </div>
          )
        })}
      </div>
      <h3 className="sec">Vehículos <span className="dim">· se desbloquean con el rango</span></h3>
      <div className="upgrade-grid">
        {VEHICULOS.map((v) => (
          <div key={v.nombre} className={`upgrade glass ${r >= v.rango ? '' : 'locked'}`}>
            <h4>{v.nombre}</h4><p>{v.desc}</p>
            <span className={r >= v.rango ? 'ok' : 'maxed'}>{r >= v.rango ? 'EN EL HANGAR' : `Requiere rango ${RANGOS[v.rango]}`}</span>
          </div>
        ))}
      </div>
      <h3 className="sec">Estética</h3>
      <div className="aesthetic">
        <div>
          <h4>Traje</h4>
          <div className="swatches">
            {Object.entries(TRAJES).map(([id, t], i) => {
              const ok = r >= Math.min(i, RANGOS.length - 1)
              return <button key={id} disabled={!ok} title={ok ? t.nombre : `Requiere ${RANGOS[i]}`} className={`swatch ${g.estetica.traje === id ? 'on' : ''}`} style={{ background: t.color }} onClick={() => { g.setEstetica({ traje: id }); sfx.click() }} />
            })}
          </div>
        </div>
        <div>
          <h4>Color de los hologramas</h4>
          <div className="swatches">
            {Object.entries(HOLOS).map(([id, c], i) => {
              const ok = r >= Math.min(i, RANGOS.length - 1)
              return <button key={id} disabled={!ok} title={ok ? id : `Requiere ${RANGOS[i]}`} className={`swatch ${g.estetica.holo === id ? 'on' : ''}`} style={{ background: c }} onClick={() => { g.setEstetica({ holo: id }); sfx.click() }} />
            })}
          </div>
        </div>
      </div>
    </Shell>
  )
}

/* ------------------------------------------------------------------ Estadísticas */
export function StatsView({ s, compact }: { s: SaveData; compact?: boolean }) {
  const misiones = Object.entries(s.misiones)
  const errores: Record<string, number> = {}
  misiones.forEach(([, m]) => Object.entries(m.errores ?? {}).forEach(([e, n]) => { errores[e] = (errores[e] ?? 0) + n }))
  const topErrores = Object.entries(errores).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const porBloque: Record<string, { sup: number; tot: number; fallos: number; ayudas: number; estrellas: number }> = {}
  for (const [id, pr] of misiones) {
    const m = MISIONES[id]
    if (!m) continue
    const k = `${m.materia === 'fisica' ? 'Física' : 'Matemáticas'} · ${m.bloquePAU}`
    porBloque[k] ??= { sup: 0, tot: 0, fallos: 0, ayudas: 0, estrellas: 0 }
    porBloque[k].tot++
    if (pr.superada) porBloque[k].sup++
    porBloque[k].fallos += pr.fallos
    porBloque[k].ayudas += pr.ayudas
    porBloque[k].estrellas += pr.estrellas
  }
  const h = Math.floor(s.tiempoJugado / 3600), mi = Math.floor((s.tiempoJugado % 3600) / 60)
  return (
    <div className="stats">
      <div className="stat-tiles">
        <div className="tile glass"><b>{misiones.filter(([, m]) => m.superada).length}</b><span>misiones superadas</span></div>
        <div className="tile glass"><b>{misiones.reduce((a, [, m]) => a + m.estrellas, 0)}</b><span>estrellas</span></div>
        <div className="tile glass"><b>{s.teoriaCompletada.length}</b><span>archivos técnicos</span></div>
        <div className="tile glass"><b>{h} h {mi} min</b><span>tiempo de juego</span></div>
        <div className="tile glass"><b>{s.simulacros.length ? Math.max(...s.simulacros.map((x) => x.nota)).toFixed(2).replace('.', ',') : '—'}</b><span>mejor simulacro</span></div>
      </div>
      <h3 className="sec">Progreso por capítulo</h3>
      <div className="chapter-bars">
        {CURRICULUM.filter((c) => c.id < 10).map((c) => {
          const { tiene, max } = estrellasCapitulo(s, c.id)
          return <div key={c.id} className="cbar"><span>{c.id}. {c.titulo}</span><div className="mini-bar"><div style={{ width: `${(tiene / max) * 100}%` }} /></div><span className="dim">★ {tiene}/{max}</span></div>
        })}
      </div>
      <h3 className="sec">Por bloque de la PAU</h3>
      <table className="data-table stats-table">
        <thead><tr><th>Bloque</th><th>Superadas</th><th>Estrellas</th><th>Fallos</th><th>Ayudas</th></tr></thead>
        <tbody>{Object.entries(porBloque).map(([k, v]) => <tr key={k}><td>{k}</td><td>{v.sup}/{v.tot}</td><td>{v.estrellas}</td><td>{v.fallos}</td><td>{v.ayudas}</td></tr>)}</tbody>
      </table>
      {topErrores.length > 0 && (
        <>
          <h3 className="sec">Errores típicos más repetidos</h3>
          <ul className="err-list">{topErrores.map(([e, n]) => <li key={e}><span className="cnt">{n}×</span><Tex>{e}</Tex></li>)}</ul>
        </>
      )}
      {s.simulacros.length > 0 && (
        <>
          <h3 className="sec">Evolución de los simulacros</h3>
          <div className="sim-chart">
            {s.simulacros.map((x, i) => (
              <div key={i} className={`sim-bar ${x.materia}`} title={`${x.materia === 'fisica' ? 'Física' : 'Matemáticas'} · ${new Date(x.fecha).toLocaleDateString('es-ES')}`}>
                <div style={{ height: `${x.nota * 10}%` }}><span>{x.nota.toFixed(1).replace('.', ',')}</span></div>
                <em>{x.materia === 'fisica' ? 'F' : 'M'}</em>
              </div>
            ))}
          </div>
        </>
      )}
      {!compact && (
        <>
          <h3 className="sec">Logros</h3>
          <div className="logros">{LOGROS.map((l) => <div key={l.id} className={`logro glass ${s.logros.includes(l.id) ? 'on' : ''}`}><b>{s.logros.includes(l.id) ? '🏆' : '🔒'} {l.nombre}</b><span>{l.desc}</span></div>)}</div>
          <h3 className="sec">Diario de misión</h3>
          <div className="diario">
            {s.teoriaCompletada.length === 0 && <p className="dim">Todavía vacío. Completa el Archivo Técnico de un capítulo.</p>}
            {[...s.teoriaCompletada].sort((a, b) => a - b).map((cap) => (
              <div key={cap} className="diario-entry glass"><b>Capítulo {cap} · {CURRICULUM.find((c) => c.id === cap)?.titulo}</b><span>Aprendido: {TEORIA[cap]?.modulos.map((m) => m.titulo).join(' · ')}</span></div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function Stats() {
  const g = useGame()
  return <Shell titulo="Estadísticas, logros y diario" badge="TERMINAL"><AgentPanel /><StatsView s={g} /></Shell>
}

/* ------------------------------------------------------------------ Holocubierta (repaso) */
export function Holocubierta() {
  const ir = useUI((s) => s.ir)
  const g = useGame()
  return (
    <Shell titulo="Holocubierta · Archivo Técnico" badge="HOLOCUBIERTA">
      <VeraBubble>{'Aquí puedes repasar la teoría de cualquier capítulo que ya hayas abierto, y descargar su **Ficha PAU** en PDF. Repasar es gratis.'}</VeraBubble>
      <div className="upgrade-grid">
        {CURRICULUM.filter((c) => c.id < 10).map((c) => {
          const abierto = g.teoriaCompletada.includes(c.id) || g.cinematicas.includes(`c${c.id}-inicio`)
          return (
            <button key={c.id} className={`upgrade glass ${abierto ? '' : 'locked'}`} disabled={!abierto} onClick={() => { sfx.open(); ir({ id: 'teoria', cap: c.id }) }}>
              <h4>{c.id}. {c.titulo}</h4>
              <p>{c.fisica.tema}<br />{c.matematicas.tema}</p>
              <span className={g.teoriaCompletada.includes(c.id) ? 'ok' : 'maxed'}>{g.teoriaCompletada.includes(c.id) ? 'COMPLETADO' : abierto ? 'EN CURSO' : 'BLOQUEADO'}</span>
            </button>
          )
        })}
      </div>
    </Shell>
  )
}

/* ------------------------------------------------------------------ Hangar */
export function HangarView() {
  const g = useGame()
  const r = rangoDe(g.xp)
  return (
    <Shell titulo="Hangar" badge="HANGAR">
      <AgentPanel />
      <div className="upgrade-grid">
        {VEHICULOS.map((v) => (
          <div key={v.nombre} className={`upgrade glass ${r >= v.rango ? '' : 'locked'}`}>
            <h4 style={{ color: RANK_COLORS[v.rango] }}>{v.nombre}</h4><p>{v.desc}</p>
            <span className={r >= v.rango ? 'ok' : 'maxed'}>{r >= v.rango ? 'OPERATIVO' : `Requiere rango ${RANGOS[v.rango]}`}</span>
          </div>
        ))}
      </div>
    </Shell>
  )
}

/* ------------------------------------------------------------------ Créditos */
const CREDITOS = [
  ['Diseño, programación y contenidos', 'Generado con Claude (Anthropic) para un alumno de 2.º de Bachillerato'],
  ['HDRIs y texturas PBR', 'Poly Haven (CC0): Greg Zaal, Jarod Guest, Sergej Majboroda, Amal Kumar, Rob Tuytel, Dimitrios Savva, Rico Cilliers'],
  ['Texturas de la Tierra, la Luna y la Vía Láctea', 'Solar System Scope / INOVE (CC BY 4.0), basadas en datos de la NASA'],
  ['Personajes y animaciones', 'Mixamo (Adobe), vía ejemplos de three.js: Michelle, Soldier (Vanguard), X Bot'],
  ['Robot del hangar', 'Tomás Laulhé (Quaternius), modificado por Don McCurdy (CC0)'],
  ['Tipografías', 'Orbitron (Matt McInerney), Exo 2 (Natanael Gama), Inter (Rasmus Andersson) · SIL OFL 1.1'],
  ['Música y efectos', 'Sintetizados en tiempo real con Web Audio (sin archivos externos)'],
  ['Motor', 'Three.js, React Three Fiber, drei, postprocessing, KaTeX, math.js, zustand'],
  ['Datos reales', 'NASA Fact Sheets, ESA/EUMETSAT, CODATA 2018, CERN, Consejo de Seguridad Nuclear'],
]
export function Credits() {
  return (
    <Shell titulo="Créditos" badge="CRÉDITOS">
      <div className="credits-roll">
        <h2 className="logo-sm">HORIZONTE</h2>
        <p className="dim">La Segunda Tormenta</p>
        {CREDITOS.map(([a, b]) => <div key={a} className="cred"><b>{a}</b><span>{b}</span></div>)}
        <p className="dim">Agencia del Mediterráneo, VERA y todos los personajes son ficticios. Los edificios de la base están inspirados en la arquitectura valenciana, sin reproducirla.</p>
      </div>
    </Shell>
  )
}

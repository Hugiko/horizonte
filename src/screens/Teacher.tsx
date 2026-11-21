import { useEffect, useState } from 'react'
import { sfx } from '../audio/audio'
import { CURRICULUM, DEFAULTS } from '../data/curriculum'
import { MISIONES } from '../missions/index'
import { api } from '../net/api'
import { capituloDesbloqueado, PARTIDA_VACIA, aplicarConfigServidor, type SaveData } from '../state/store'
import { useUI } from '../state/ui'
import { StatsView } from './Facilities'

interface Jugador { username: string; save: SaveData | null; revision: number; updatedAt: string; createdAt: string }
const TK = 'horizonte-profesor'

export function Teacher() {
  const ir = useUI((s) => s.ir)
  const [token, setToken] = useState<string | null>(() => { try { return sessionStorage.getItem(TK) } catch { return null } })
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [cfg, setCfg] = useState<typeof DEFAULTS>(DEFAULTS)
  const [msg, setMsg] = useState<string | null>(null)

  const cargar = async (t = token) => {
    if (!t) return
    try {
      const [js, c] = await Promise.all([api<Jugador[]>('/teacher/players', { token: t }), api<Partial<typeof DEFAULTS>>('/config', { token: null })])
      setJugadores(js); setCfg({ ...DEFAULTS, ...c })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e)); setToken(null)
      try { sessionStorage.removeItem(TK) } catch { /* nada */ }
    }
  }
  useEffect(() => { void cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null)
    try {
      const r = await api<{ token: string }>('/teacher/login', { method: 'POST', body: { password: pw }, token: null })
      setToken(r.token); try { sessionStorage.setItem(TK, r.token) } catch { /* nada */ }
      sfx.correct(); void cargar(r.token)
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : String(e2)); sfx.wrong() }
  }

  const j = jugadores.find((x) => x.username === sel)
  const save: SaveData = { ...PARTIDA_VACIA, ...(j?.save ?? {}) }

  const guardarJugador = async (nuevo: SaveData) => {
    if (!j) return
    const s = { ...nuevo, profesorVersion: (nuevo.profesorVersion ?? 0) + 1 }
    await api(`/teacher/players/${encodeURIComponent(j.username)}/save`, { method: 'PUT', body: { save: s }, token })
    setMsg('Cambios guardados. El alumno los verá al volver a abrir el juego.'); sfx.click()
    void cargar()
  }

  const guardarCfg = async () => {
    await api('/teacher/config', { method: 'PUT', body: cfg, token })
    aplicarConfigServidor(cfg)
    setMsg('Ajustes globales guardados.'); sfx.click()
  }

  const header = (
    <header className="mission-bar glass no-print">
      <button className="link-btn" onClick={() => { sfx.back(); ir({ id: 'titulo' }) }}>← Salir</button>
      <div className="mb-title"><span className="badge">PROFESOR</span> Panel del profesor</div>
      <div className="mb-right">{token && <button className="link-btn" onClick={() => { setToken(null); try { sessionStorage.removeItem(TK) } catch { /* nada */ } }}>Cerrar sesión</button>}</div>
    </header>
  )

  if (!token) {
    return (
      <div className="screen facility">
        {header}
        <form className="auth glass teacher-login" onSubmit={login}>
          <h3>Acceso del profesor</h3>
          <label>Contraseña<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></label>
          {err && <p className="auth-error">{err}</p>}
          <button className="primary-btn">Entrar</button>
        </form>
      </div>
    )
  }

  return (
    <div className="screen facility teacher">
      {header}
      <div className="facility-body teacher-body">
        <aside className="glass t-list no-print">
          <h4>Alumnos ({jugadores.length})</h4>
          {jugadores.length === 0 && <p className="dim">Todavía no hay alumnos registrados.</p>}
          {jugadores.map((x) => (
            <button key={x.username} className={sel === x.username ? 'on' : ''} onClick={() => { setSel(x.username); setMsg(null) }}>
              <b>{x.username}</b><span>{Object.values(x.save?.misiones ?? {}).filter((m) => m.superada).length} misiones · {new Date(x.updatedAt).toLocaleDateString('es-ES')}</span>
            </button>
          ))}
          <h4>Ajustes globales</h4>
          <label>Umbral de estrellas para desbloquear (%)<input type="number" min={0} max={100} value={Math.round(cfg.umbralEstrellas * 100)} onChange={(e) => setCfg({ ...cfg, umbralEstrellas: Number(e.target.value) / 100 })} /></label>
          <label>Tolerancia de las respuestas (%)<input type="number" min={0.5} max={10} step={0.5} value={cfg.tolerancia * 100} onChange={(e) => setCfg({ ...cfg, tolerancia: Number(e.target.value) / 100 })} /></label>
          <label>Fallos antes de poder rendirse<input type="number" min={1} max={20} value={cfg.intentosAntesDeRendirse} onChange={(e) => setCfg({ ...cfg, intentosAntesDeRendirse: Number(e.target.value) })} /></label>
          <label>Créditos de ayuda iniciales<input type="number" min={0} max={200} value={cfg.creditosIniciales} onChange={(e) => setCfg({ ...cfg, creditosIniciales: Number(e.target.value) })} /></label>
          <label>Minutos del simulacro<input type="number" min={10} max={180} value={cfg.duracionSimulacro} onChange={(e) => setCfg({ ...cfg, duracionSimulacro: Number(e.target.value) })} /></label>
          <label>Fecha de la PAU<input type="date" value={cfg.fechaPAU} onChange={(e) => setCfg({ ...cfg, fechaPAU: e.target.value })} /></label>
          <button className="primary-btn" onClick={guardarCfg}>Guardar ajustes</button>
        </aside>
        <main className="t-main">
          {msg && <p className="t-msg no-print">{msg}</p>}
          {!j && <p className="dim">Selecciona un alumno para ver su progreso.</p>}
          {j && (
            <>
              <div className="t-head">
                <h2>{j.username}</h2>
                <span className="dim">Cuenta creada el {new Date(j.createdAt).toLocaleDateString('es-ES')} · última partida {new Date(j.updatedAt).toLocaleString('es-ES')}</span>
                <button className="primary-btn no-print" onClick={() => { document.body.classList.add('printing-report'); window.print(); setTimeout(() => document.body.classList.remove('printing-report'), 500) }}>⎙ Informe en PDF</button>
              </div>
              <section className="glass t-section no-print">
                <h4>Capítulos (colocar al alumno en el punto del curso)</h4>
                <div className="t-chapters">
                  {CURRICULUM.map((c) => {
                    const forz = save.desbloqueoProfesor[String(c.id)]
                    const abierto = capituloDesbloqueado(save, c.id, cfg.umbralEstrellas)
                    return (
                      <div key={c.id} className="t-chap">
                        <span>{c.id}. {c.titulo}</span>
                        <span className={abierto ? 'ok' : 'dim'}>{abierto ? 'abierto' : 'cerrado'}{forz !== undefined ? ' (profesor)' : ''}</span>
                        <select value={forz === undefined ? 'auto' : forz ? 'abrir' : 'cerrar'} onChange={(e) => {
                          const d = { ...save.desbloqueoProfesor }
                          if (e.target.value === 'auto') delete d[String(c.id)]
                          else d[String(c.id)] = e.target.value === 'abrir'
                          void guardarJugador({ ...save, desbloqueoProfesor: d })
                        }}>
                          <option value="auto">Automático</option><option value="abrir">Desbloquear</option><option value="cerrar">Bloquear</option>
                        </select>
                      </div>
                    )
                  })}
                </div>
              </section>
              <section className="glass t-section no-print">
                <h4>Reiniciar misiones</h4>
                <div className="t-missions">
                  {Object.entries(save.misiones).map(([id, m]) => (
                    <button key={id} className="chip" onClick={() => { const ms = { ...save.misiones }; delete ms[id]; void guardarJugador({ ...save, misiones: ms }) }} title="Reiniciar">
                      {id} · {MISIONES[id]?.titulo ?? ''} · ★{m.estrellas} ✕
                    </button>
                  ))}
                  {Object.keys(save.misiones).length === 0 && <span className="dim">Sin misiones jugadas.</span>}
                </div>
              </section>
              <div className="print-area"><h1 className="print-only">Informe de progreso · {j.username} · HORIZONTE</h1><StatsView s={save} compact /></div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

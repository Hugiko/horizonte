import { useEffect, useMemo, useRef, useState } from 'react'
import { setAmbiente, sfx } from '../audio/audio'
import { comprobar, desfasePotencia } from '../missions/check'
import { MISIONES } from '../missions/index'
import type { Mision } from '../missions/types'
import { createRng } from '../sims/rng'
import { useGame, RANGOS, rangoDe, LOGROS, type ResultadoMision } from '../state/store'
import { useUI, type Pantalla } from '../state/ui'
import { PartInput } from '../ui/inputs'
import { Tex } from '../ui/Tex'
import { ToolButtons, ToolPanel } from '../ui/tools'
import { VeraBubble, VeraPortrait } from '../ui/Vera'
import { Widget, type AjusteState } from '../widgets'
import { TheoryModal } from './TheoryViewer'

const COSTE = [0, 1, 2, 3]
const TIPO_LABEL: Record<string, string> = { ajuste: 'Ajuste en tiempo real', calculo: 'Cálculo aplicado', razonamiento: 'Razonamiento', exploracion: 'Exploración', decision: 'Decisión', crisis: 'Crisis contrarreloj' }

interface Mensaje { tipo: 'ok' | 'error' | 'pista' | 'info'; texto: string }

function Estrellas({ n, animar }: { n: number; animar?: boolean }) {
  return (
    <div className={`stars ${animar ? 'anim' : ''}`}>
      {[0, 1, 2].map((i) => <span key={i} className={i < n ? 'on' : ''} style={{ animationDelay: `${0.3 + i * 0.35}s` }}>★</span>)}
    </div>
  )
}

export function MissionPlayer({ id, volver }: { id: string; volver: Pantalla }) {
  const m = MISIONES[id] as Mision
  const ir = useUI((s) => s.ir)
  const toast = useUI((s) => s.toast)
  const { ajustes, creditos, mejoras, gastarCreditos, registrarMision } = useGame()
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31))
  const p = useMemo(() => m.generar(createRng(seed)), [m, seed])

  const [parte, setParte] = useState(0)
  const [resuelta, setResuelta] = useState<boolean[]>([])
  const [fallos, setFallos] = useState(0)
  const [seguidos, setSeguidos] = useState(0)
  const [ayudas, setAyudas] = useState(0)
  const [nivel3, setNivel3] = useState(false)
  const [pistas, setPistas] = useState<{ nivel: number; texto: string }[]>([])
  const [escanerUsado, setEscanerUsado] = useState(0)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [errores, setErrores] = useState<string[]>([])
  const [intentosAjuste, setIntentosAjuste] = useState(0)
  const [ajuste, setAjuste] = useState<AjusteState>({ valor: 0, disparo: 0 })
  const [fin, setFin] = useState<null | { resuelta: boolean; rendida: boolean; estrellas: number; tiempo: number; logros: string[]; subeRango: boolean; fueraTiempo: boolean }>(null)
  const [teoria, setTeoria] = useState(false)
  const [verRes, setVerRes] = useState(false)
  const inicio = useRef(Date.now())
  const tiempoExtra = 1 + 0.25 * (mejoras['tiempo'] ?? 0)
  const limite = m.tiempoLimite ? Math.round(m.tiempoLimite * tiempoExtra) : 0
  const [ahora, setAhora] = useState(Date.now())

  useEffect(() => { setAmbiente(m.dificultad === 'jefe' ? 'tension' : m.escena === 'espacio' ? 'espacio' : 'teoria') }, [m])
  useEffect(() => {
    if (!limite || fin) return
    const t = setInterval(() => setAhora(Date.now()), 500)
    return () => clearInterval(t)
  }, [limite, fin])
  const restante = limite ? Math.max(0, limite - Math.floor((ahora - inicio.current) / 1000)) : 0
  const avisado = useRef(false)
  useEffect(() => { if (limite && restante === 0 && !avisado.current && !fin) { avisado.current = true; sfx.alarm(); setMensajes((ms) => [...ms, { tipo: 'error', texto: 'Se acabó el tiempo de la crisis: perderás una estrella, pero puedes terminar la misión.' }]) } }, [restante, limite, fin])

  const reiniciar = (nuevaSemilla = true) => {
    if (nuevaSemilla) setSeed(Math.floor(Math.random() * 2 ** 31))
    setParte(0); setResuelta([]); setFallos(0); setSeguidos(0); setAyudas(0); setNivel3(false); setPistas([])
    setEscanerUsado(0); setMensajes([]); setErrores([]); setIntentosAjuste(0); setAjuste({ valor: 0, disparo: 0 })
    setFin(null); setVerRes(false); inicio.current = Date.now(); avisado.current = false
  }

  const actual = m.partes[parte]

  const terminar = (resueltaOk: boolean, rendida: boolean) => {
    const tiempo = Math.round((Date.now() - inicio.current) / 1000)
    const fueraTiempo = !!limite && tiempo > limite
    let estrellas = resueltaOk ? 1 + (nivel3 ? 0 : 1) + (fallos === 0 ? 1 : 0) : 0
    if (fueraTiempo && estrellas > 1) estrellas--
    const xpAntes = useGame.getState().xp
    const r: ResultadoMision = { id: m.id, resuelta: resueltaOk, rendida, estrellas, fallos, ayudas, errores, tiempo, recompensas: m.recompensas }
    const nuevos = registrarMision(r)
    const subeRango = rangoDe(useGame.getState().xp) > rangoDe(xpAntes)
    nuevos.forEach((lid) => { const l = LOGROS.find((x) => x.id === lid); if (l) toast(`Logro: ${l.nombre}`, l.desc, 'logro') })
    if (subeRango) { toast('¡Ascenso!', `Nuevo rango: ${RANGOS[rangoDe(useGame.getState().xp)]}`, 'rango'); setTimeout(() => sfx.levelUp(), 1600) }
    setFin({ resuelta: resueltaOk, rendida, estrellas, tiempo, logros: nuevos, subeRango, fueraTiempo })
    if (resueltaOk) { setAmbiente('victoria'); [0, 1, 2].slice(0, estrellas).forEach((i) => setTimeout(() => sfx.star(i), 400 + i * 350)) }
  }

  const responder = (resp: unknown) => {
    if (actual.tipo === 'ajuste') setAjuste((a) => ({ valor: resp as number, disparo: a.disparo + 1 }))
    const v = comprobar(actual, p, resp, ajustes.tolerancia)
    if (v.ok) {
      sfx.correct()
      const nuevas = [...resuelta]; nuevas[parte] = true
      setResuelta(nuevas); setSeguidos(0); setPistas([])
      setMensajes([{ tipo: 'ok', texto: v.aviso ? `Correcto. ${v.aviso}` : parte === m.partes.length - 1 ? '**Correcto.** Misión completada.' : '**Correcto.** Siguiente paso.' }])
      if (parte === m.partes.length - 1) setTimeout(() => terminar(true, false), 900)
      return
    }
    sfx.wrong()
    const nf = fallos + 1, ns = seguidos + 1
    setFallos(nf); setSeguidos(ns)
    const msgs: Mensaje[] = []
    const detectados = (actual.errores ?? []).filter((e) => { try { return e.detectar(resp, p) } catch { return false } })
    if (detectados.length) {
      detectados.forEach((e) => msgs.push({ tipo: 'error', texto: e.mensaje }))
      setErrores((es) => [...es, ...detectados.map((e) => e.mensaje)])
    } else if (v.aviso) {
      msgs.push({ tipo: 'error', texto: v.aviso })
    } else {
      msgs.push({ tipo: 'error', texto: actual.tipo === 'opcion' ? 'No es la opción correcta. Vuelve a leer cada una con calma: suelen diferenciarse en un detalle.' : 'No es correcto. Revisa el planteamiento y las unidades.' })
    }
    if ((mejoras['unidades'] ?? 0) > 0 && typeof resp === 'number' && ['numero', 'ajuste'].includes(actual.tipo)) {
      const k = desfasePotencia(resp, actual.respuesta(p) as number)
      if (k) msgs.push({ tipo: 'info', texto: `**Analizador de unidades:** tu resultado se desvía exactamente un factor $10^{${k}}$. Revisa los prefijos (km, cm, nm, µ…).` })
    }
    if (ns === 3) {
      const diag = detectados[0]?.mensaje ?? actual.ayuda2 ?? m.ayudas.nivel2
      msgs.push({ tipo: 'pista', texto: `**Diagnóstico gratuito** (3 fallos seguidos): ${diag}` })
    }
    if (actual.tipo === 'ajuste' && actual.maxIntentos) {
      const ni = intentosAjuste + 1
      setIntentosAjuste(ni)
      if (ni >= actual.maxIntentos) {
        msgs.push({ tipo: 'error', texto: 'Sin más intentos disponibles: la misión ha fracasado. Revisa la resolución y vuelve a intentarlo con datos nuevos.' })
        setMensajes(msgs)
        setTimeout(() => terminar(false, true), 1800)
        return
      }
      msgs.push({ tipo: 'info', texto: `Te quedan ${actual.maxIntentos - ni} intento(s). Calcula el valor antes de probar.` })
    }
    setMensajes(msgs)
  }

  const pedirPista = (nivel: 1 | 2 | 3) => {
    if (pistas.some((x) => x.nivel === nivel)) return
    const escaner = mejoras['escaner'] ?? 0
    const gratis = nivel === 1 && escanerUsado < escaner
    if (!gratis && !gastarCreditos(COSTE[nivel])) { sfx.wrong(); setMensajes([{ tipo: 'info', texto: 'No tienes créditos de soporte suficientes. Se ganan completando misiones y repasando el Archivo Técnico.' }]); return }
    if (gratis) setEscanerUsado(escanerUsado + 1)
    sfx.hint()
    const texto = nivel === 1 ? actual.ayuda1 ?? m.ayudas.nivel1 : nivel === 2 ? actual.ayuda2 ?? m.ayudas.nivel2 : (actual.ayuda3 ?? m.ayudas.nivel3)(p)
    setPistas([...pistas, { nivel, texto }])
    setAyudas(ayudas + 1)
    if (nivel === 3) setNivel3(true)
  }

  const salir = () => { sfx.back(); ir(volver) }
  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  /* ---------- Informe final ---------- */
  if (fin) {
    const g = useGame.getState()
    return (
      <div className="screen mission-end">
        <div className="end-card glass">
          <div className="end-head">
            <VeraPortrait size={64} talking />
            <div>
              <div className="eyebrow">{m.id} · {fin.resuelta ? 'MISIÓN COMPLETADA' : 'MISIÓN NO SUPERADA'}</div>
              <h2>{m.titulo}</h2>
            </div>
          </div>
          {fin.resuelta ? (
            <>
              <Estrellas n={fin.estrellas} animar />
              <ul className="star-reasons">
                <li className="on">★ Misión resuelta</li>
                <li className={nivel3 ? '' : 'on'}>★ Sin ayudas de nivel 3 {nivel3 && '(usaste una)'}</li>
                <li className={fallos === 0 ? 'on' : ''}>★ Todo a la primera {fallos > 0 && `(${fallos} fallo${fallos > 1 ? 's' : ''})`}</li>
                {fin.fueraTiempo && <li className="lost">− Se agotó el tiempo de la crisis</li>}
              </ul>
              <div className="rewards">
                <span>+{m.recompensas.xp} XP</span><span>+{m.recompensas.componentes} componentes</span><span>+{m.recompensas.creditos} créditos</span>
                <span className="dim">Tiempo: {mm(fin.tiempo)}</span>
              </div>
              {fin.subeRango && <div className="rank-up">¡Ascendido a {RANGOS[rangoDe(g.xp)]}!</div>}
            </>
          ) : (
            <VeraBubble tipo="info">{'No pasa nada, ingeniero: así se aprende. Estudia el **Informe de resolución** y repite la misión **con datos nuevos**. Hasta entonces no contará como superada.'}</VeraBubble>
          )}
          <div className="end-actions">
            <button className="primary-btn" onClick={() => setVerRes(!verRes)}>{verRes ? 'Ocultar' : 'Ver'} informe de resolución</button>
            <button className="primary-btn" onClick={() => reiniciar(true)}>Repetir con datos nuevos</button>
            <button className="link-btn" onClick={salir}>Volver</button>
          </div>
          {verRes && (
            <div className="resolution">
              <h3>Informe de resolución · cómo se escribe en la PAU</h3>
              <Tex>{m.resolucion(p)}</Tex>
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ---------- Misión en curso ---------- */
  return (
    <div className="screen mission">
      <header className="mission-bar glass">
        <button className="link-btn" onClick={salir}>← Salir</button>
        <div className="mb-title">
          <span className={`badge ${m.dificultad}`}>{m.dificultad === 'jefe' ? 'JEFE' : m.dificultad === 'experto' ? 'EXPERTO' : m.materia === 'fisica' ? 'FÍSICA' : 'MATEMÁTICAS'}</span>
          <b>{m.id}</b> {m.titulo.replace(/^(JEFE|Experto) · /, '')}
          <span className="mb-type">{TIPO_LABEL[m.tipoMision]} · {m.bloquePAU} · Tipo {m.tipoPAU.join('/')}</span>
        </div>
        <div className="mb-right">
          {limite > 0 && <span className={`timer ${restante < 60 ? 'low' : ''}`}>⏱ {mm(restante)}</span>}
          <span className="credits" title="Créditos de soporte">◈ {creditos}</span>
          <ToolButtons />
          <button className="tool-btn" onClick={() => { sfx.open(); ir({ id: 'trailer', mision: m.id, volver }) }} title="Volver a ver el tráiler"><span aria-hidden>▶</span><span className="lbl">Tráiler</span></button>
          <button className="tool-btn" onClick={() => { setTeoria(true); sfx.open() }} title="Archivo Técnico"><span aria-hidden>❖</span><span className="lbl">Teoría</span></button>
        </div>
      </header>

      <div className="mission-body">
        <section className="briefing glass">
          <h3>Informe de misión</h3>
          <Tex>{m.contexto(p)}</Tex>
          {m.datoReal && <p className="dato-real">Dato real: {m.datoReal.descripcion} · Fuente: {m.datoReal.fuente}</p>}
          {m.widget && <Widget id={m.widget.id} props={m.widget.props(p)} ajuste={ajuste} />}
        </section>

        <section className="console glass">
          <div className="steps">
            {m.partes.map((pt, i) => (
              <button key={i} className={`step ${i === parte ? 'on' : ''} ${resuelta[i] ? 'done' : ''}`} disabled={i > parte} onClick={() => setParte(i)}>
                {resuelta[i] ? '✓' : pt.etiqueta ?? i + 1}
              </button>
            ))}
            <span className="fails">{fallos > 0 && `Fallos: ${fallos}`}</span>
          </div>

          <div className="part">
            <div className="part-q"><span className="part-label">{actual.etiqueta}</span><Tex>{actual.enunciado(p)}</Tex></div>
            {resuelta[parte] ? (
              <div className="part-done">
                <span>✓ Resuelto</span>
                {parte < m.partes.length - 1 && <button className="primary-btn" onClick={() => { setParte(parte + 1); setMensajes([]); sfx.click() }}>Siguiente →</button>}
              </div>
            ) : (
              <PartInput key={`${parte}-${seed}`} parte={actual} p={p} seed={seed + parte} onSubmit={responder} />
            )}
            {actual.tipo === 'ajuste' && actual.maxIntentos && !resuelta[parte] && <p className="hint-note">Intentos: {actual.maxIntentos - intentosAjuste} de {actual.maxIntentos}</p>}
          </div>

          <div className="feedback">
            {mensajes.map((ms, i) => <VeraBubble key={i + ms.texto} tipo={ms.tipo}>{ms.texto}</VeraBubble>)}
            {pistas.map((pi) => <VeraBubble key={pi.nivel} tipo="pista">{`**Pista de nivel ${pi.nivel}.** ${pi.texto}`}</VeraBubble>)}
          </div>

          {!resuelta[parte] && (
            <div className="hints">
              <span className="hints-label">Canal de soporte VERA</span>
              <button onClick={() => pedirPista(1)} disabled={pistas.some((x) => x.nivel === 1)}>1 · Pista conceptual <em>{escanerUsado < (mejoras['escaner'] ?? 0) ? 'gratis (escáner)' : `◈ ${COSTE[1]}`}</em></button>
              <button onClick={() => pedirPista(2)} disabled={pistas.some((x) => x.nivel === 2)}>2 · Planteamiento <em>◈ {COSTE[2]}</em></button>
              <button onClick={() => pedirPista(3)} disabled={pistas.some((x) => x.nivel === 3)} className="h3">3 · Comprobación intermedia <em>◈ {COSTE[3]} · −1 ★</em></button>
            </div>
          )}
          {fallos >= ajustes.intentosAntesDeRendirse && (
            <button className="link-btn surrender" onClick={() => { sfx.back(); terminar(false, true) }}>Rendirse y ver el informe de resolución (habrá que repetirla con datos nuevos)</button>
          )}
        </section>
      </div>
      <ToolPanel />
      {teoria && <TheoryModal cap={m.capitulo} onClose={() => setTeoria(false)} />}
    </div>
  )
}

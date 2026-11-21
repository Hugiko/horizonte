import { useEffect, useState } from 'react'
import { setAmbiente, sfx } from '../audio/audio'
import { CURRICULUM } from '../data/curriculum'
import { useGame } from '../state/store'
import { useUI } from '../state/ui'
import { TEORIA } from '../theory'
import { Tex } from '../ui/Tex'
import { VeraBubble } from '../ui/Vera'
import { Widget } from '../widgets'

function Contenido({ cap, onCompletar, modal }: { cap: number; onCompletar?: () => void; modal?: boolean }) {
  const t = TEORIA[cap]
  const c = CURRICULUM.find((x) => x.id === cap)!
  const { modulosVistos, verModulo, completarTeoria, teoriaCompletada } = useGame()
  const total = t ? t.modulos.length + 2 : 0 // módulos + ejemplos + ficha
  const [i, setI] = useState(0)
  const [resp, setResp] = useState<number | null>(null)
  useEffect(() => setResp(null), [i])
  if (!t) return <p>Teoría no disponible.</p>

  const keyMod = (k: number) => `${cap}.${k}`
  const visto = (k: number) => modulosVistos.includes(keyMod(k))
  const todosVistos = t.modulos.every((_, k) => visto(k))

  const nav = (
    <nav className="th-nav">
      <div className="th-cap">Capítulo {cap} · {c.titulo}</div>
      {t.modulos.map((m, k) => (
        <button key={k} className={`${i === k ? 'on' : ''} ${visto(k) ? 'done' : ''}`} onClick={() => { setI(k); sfx.click() }}>
          <span className={`dot ${m.materia}`} />{m.titulo}{visto(k) && <span className="tick">✓</span>}
        </button>
      ))}
      <button className={i === t.modulos.length ? 'on' : ''} onClick={() => setI(t.modulos.length)}><span className="dot ej" />Ejemplos resueltos</button>
      <button className={i === t.modulos.length + 1 ? 'on' : ''} onClick={() => setI(t.modulos.length + 1)}><span className="dot ficha" />Ficha PAU</button>
      <div className="th-progress"><div style={{ width: `${(t.modulos.filter((_, k) => visto(k)).length / t.modulos.length) * 100}%` }} /></div>
    </nav>
  )

  let body: React.ReactNode
  if (i < t.modulos.length) {
    const m = t.modulos[i]
    const ok = resp === m.check.correcta
    body = (
      <article className="th-module" key={i}>
        <div className="eyebrow">{m.materia === 'fisica' ? 'FÍSICA' : 'MATEMÁTICAS II'} · Módulo {i + 1} de {t.modulos.length}</div>
        <h2>{m.titulo}</h2>
        <VeraBubble>{i === 0 ? `${t.intro}\n\n${m.vera}` : m.vera}</VeraBubble>
        <Tex className="th-text">{m.texto}</Tex>
        {m.widget && (
          <div className="th-widget">
            <Widget id={m.widget.id} props={m.widget.props} />
            {m.widget.nota && <p className="hint-note">{m.widget.nota}</p>}
          </div>
        )}
        <div className="th-check glass">
          <div className="eyebrow">Comprobación rápida</div>
          <Tex>{m.check.pregunta}</Tex>
          <div className="options">
            {m.check.opciones.map((o, k) => (
              <button key={k} className={`option ${resp === k ? (k === m.check.correcta ? 'right' : 'wrong') : ''}`}
                onClick={() => {
                  setResp(k)
                  if (k === m.check.correcta) { sfx.correct(); verModulo(keyMod(i)) } else sfx.wrong()
                }}>
                <span className="bullet" /><Tex>{o}</Tex>
              </button>
            ))}
          </div>
          {resp !== null && <VeraBubble tipo={ok ? 'ok' : 'error'}>{ok ? `**Exacto.** ${m.check.explicacion}` : 'No exactamente. Vuelve a leer el módulo y prueba otra vez.'}</VeraBubble>}
        </div>
        <div className="th-actions">
          {i > 0 && <button className="link-btn" onClick={() => setI(i - 1)}>← Anterior</button>}
          <button className="primary-btn" disabled={!visto(i)} onClick={() => { setI(i + 1); sfx.click() }}>{visto(i) ? 'Siguiente módulo →' : 'Responde la comprobación para seguir'}</button>
        </div>
      </article>
    )
  } else if (i === t.modulos.length) {
    body = (
      <article className="th-module">
        <div className="eyebrow">EJEMPLOS RESUELTOS · ESTILO PAU</div>
        <h2>Así se resuelve en el examen</h2>
        {t.ejemplos.map((e, k) => (
          <div key={k} className="th-example glass">
            <h3>{e.titulo}</h3>
            <Tex className="th-enun">{e.enunciado}</Tex>
            <details>
              <summary>Ver resolución justificada</summary>
              <Tex>{e.solucion}</Tex>
            </details>
          </div>
        ))}
        <div className="th-actions"><button className="primary-btn" onClick={() => setI(i + 1)}>Ficha PAU →</button></div>
      </article>
    )
  } else {
    body = (
      <article className="th-module ficha-pau">
        <div className="eyebrow">FICHA PAU · CAPÍTULO {cap}</div>
        <h2>{c.fisica.tema} · {c.matematicas.tema}</h2>
        <h3>Fórmulas clave</h3>
        <div className="ficha-formulas">{t.ficha.formulas.map((f, k) => <Tex key={k}>{f}</Tex>)}</div>
        <h3>Errores típicos</h3>
        <ul className="ficha-errores">{t.ficha.errores.map((e, k) => <li key={k}><Tex>{e}</Tex></li>)}</ul>
        <h3>Cómo se pregunta en la PAU (Comunitat Valenciana)</h3>
        <Tex>{t.ficha.examen}</Tex>
        <div className="th-actions no-print">
          <button className="link-btn" onClick={() => { document.body.classList.add('printing-ficha'); window.print(); setTimeout(() => document.body.classList.remove('printing-ficha'), 500) }}>⎙ Exportar / imprimir en PDF</button>
          {!modal && (
            <button className="primary-btn" disabled={!todosVistos} onClick={() => { if (!teoriaCompletada.includes(cap)) { completarTeoria(cap); sfx.levelUp() } onCompletar?.() }}>
              {todosVistos ? (teoriaCompletada.includes(cap) ? 'Volver al capítulo' : 'Completar Archivo Técnico (+150 XP, +3 créditos)') : 'Completa todos los módulos para terminar'}
            </button>
          )}
        </div>
      </article>
    )
  }
  return <div className="theory-layout" data-total={total}>{nav}<div className="th-body">{body}</div></div>
}

export function TheoryViewer({ cap }: { cap: number }) {
  const ir = useUI((s) => s.ir)
  useEffect(() => setAmbiente('teoria'), [])
  return (
    <div className="screen theory">
      <header className="mission-bar glass">
        <button className="link-btn" onClick={() => { sfx.back(); ir({ id: 'capitulo', cap }) }}>← Volver</button>
        <div className="mb-title"><span className="badge">ARCHIVO TÉCNICO</span> Holocubierta</div>
        <div className="mb-right" />
      </header>
      <Contenido cap={cap} onCompletar={() => ir({ id: 'capitulo', cap })} />
    </div>
  )
}

export function TheoryModal({ cap, onClose }: { cap: number; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal theory-modal glass" onClick={(e) => e.stopPropagation()}>
        <div className="tool-head"><span>Archivo Técnico · consulta (gratis)</span><button className="x-btn" onClick={onClose}>✕</button></div>
        <Contenido cap={cap} modal />
      </div>
    </div>
  )
}

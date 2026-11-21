import { parse } from 'mathjs'
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { sfx } from '../audio/audio'
import { parseNumero, parsePlano } from '../missions/check'
import { shuffle } from '../missions/fmt'
import type { Parte, Params } from '../missions/types'
import { Tex, TexInline } from './Tex'

interface Props {
  parte: Parte
  p: Params
  seed: number
  disabled?: boolean
  onSubmit: (resp: unknown) => void
  submitLabel?: string
  /** Modo examen: guarda la respuesta sin corregir. */
  examen?: boolean
  valorInicial?: unknown
}

type Parsed = { ok: true; value: unknown } | { ok: false; error: string }

function NumField({ value, onChange, placeholder, onEnter, autoFocus, small }: { value: string; onChange: (v: string) => void; placeholder?: string; onEnter?: () => void; autoFocus?: boolean; small?: boolean }) {
  return (
    <input className={`num-field ${small ? 'small' : ''}`} value={value} placeholder={placeholder} autoFocus={autoFocus}
      inputMode="numeric" spellCheck={false}
      onChange={(e) => onChange(soloEntero(e.target.value))}
      onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter') onEnter?.() }} />
  )
}

/** Las respuestas numéricas son siempre ENTEROS: solo dígitos y un signo menos inicial. */
export function soloEntero(raw: string) {
  const neg = raw.trim().startsWith('-') || raw.trim().startsWith('−')
  // si escriben decimales (12,5 o 12.5) se queda la parte entera: nunca 125
  const dig = raw.split(/[.,]/)[0].replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '')
  return (neg ? '-' : '') + dig
}
export function parseEntero(raw: string): number | null {
  return /^-?\d+$/.test(raw.trim()) ? Number(raw.trim()) : null
}

function preview(raw: string) {
  const v = parseEntero(raw)
  if (raw.trim() === '' || raw === '-') return null
  return v === null ? <span className="preview bad">escribe un número entero</span> : <span className="preview">{v.toLocaleString('es-ES')}</span>
}

const TECLAS: [string, string][] = [['x²', '^2'], ['xⁿ', '^'], ['√', 'sqrt('], ['π', 'pi'], ['e', 'e'], ['sen', 'sin('], ['cos', 'cos('], ['ln', 'ln('], ['eˣ', 'e^('], ['(', '('], [')', ')'], ['·', '*'], ['÷', '/']]

function exprTex(s: string) {
  try {
    return parse(s.replace(/\bln\(/g, 'log(').replace(/\bsen\(/g, 'sin(').replace(/(\d),(\d)/g, '$1.$2')).toTex({ parenthesis: 'auto', implicit: 'hide' })
  } catch {
    return null
  }
}

export function PartInput({ parte, p, seed, disabled, onSubmit, submitLabel = 'Comprobar', examen, valorInicial }: Props) {
  const dims = parte.dim
  const [txt, setTxt] = useState('')
  const [vec, setVec] = useState<string[]>([])
  const [mat, setMat] = useState<string[][]>([])
  const [sel, setSel] = useState<number | null>(null)
  const [orden, setOrden] = useState<string[]>([])
  const [punto, setPunto] = useState(['', '', ''])
  const [dir, setDir] = useState(['', '', ''])
  const [error, setError] = useState<string | null>(null)
  const rango = parte.rango?.(p)
  const [slider, setSlider] = useState(rango ? (rango.min + rango.max) / 2 : 0)

  const opciones = useMemo(() => (parte.opciones ? shuffle(parte.opciones(p).map((o, i) => ({ ...o, i })), seed + 7) : []), [parte, p, seed])

  // reiniciar al cambiar de parte o de datos
  useEffect(() => {
    const n = typeof dims === 'number' ? dims : 3
    const [r, c] = Array.isArray(dims) ? dims : [3, 3]
    setTxt(''); setVec(Array(n).fill('')); setMat(Array.from({ length: r }, () => Array(c).fill('')))
    setSel(null); setPunto(['', '', '']); setDir(['', '', '']); setError(null)
    setOrden(parte.pasos ? shuffle(parte.pasos(p), seed + 3) : [])
    if (rango) setSlider(Number(((rango.min + rango.max) / 2).toFixed(6)))
    // restaurar en modo examen
    if (valorInicial !== undefined && valorInicial !== null) {
      if (typeof valorInicial === 'number' && parte.tipo === 'opcion') setSel(valorInicial)
      else if (typeof valorInicial === 'number') setTxt(String(valorInicial))
      else if (typeof valorInicial === 'string') setTxt(valorInicial)
      else if (parte.tipo === 'orden' && Array.isArray(valorInicial)) setOrden(valorInicial as string[])
      else if (parte.tipo === 'vector' && Array.isArray(valorInicial)) setVec((valorInicial as number[]).map(String))
      else if (parte.tipo === 'matriz' && Array.isArray(valorInicial)) setMat((valorInicial as number[][]).map((f) => f.map(String)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parte, seed])

  const parsear = (): Parsed => {
    switch (parte.tipo) {
      case 'numero': {
        const v = parseEntero(txt)
        return v === null ? { ok: false, error: 'Escribe un número entero (sin comas ni puntos), redondeado, en la unidad que se indica.' } : { ok: true, value: v }
      }
      case 'ajuste': return { ok: true, value: slider }
      case 'vector': {
        const vs = vec.map(parseEntero)
        return vs.some((v) => v === null) ? { ok: false, error: 'Rellena todas las componentes con números enteros.' } : { ok: true, value: vs }
      }
      case 'matriz': {
        const ms = mat.map((f) => f.map(parseEntero))
        return ms.some((f) => f.some((v) => v === null)) ? { ok: false, error: 'Rellena todos los elementos de la matriz con números enteros.' } : { ok: true, value: ms }
      }
      case 'opcion': return sel === null ? { ok: false, error: 'Elige una opción.' } : { ok: true, value: sel }
      case 'orden': return { ok: true, value: orden }
      case 'expresion':
      case 'primitiva': return txt.trim() && exprTex(txt) !== null ? { ok: true, value: txt } : { ok: false, error: 'No entiendo la expresión. Usa * para multiplicar si hace falta, ^ para potencias y paréntesis.' }
      case 'plano': return parsePlano(txt) ? { ok: true, value: txt } : { ok: false, error: 'Escribe la ecuación del plano, por ejemplo: 2x - y + 3z = 4' }
      case 'recta': {
        const pt = punto.map(parseEntero), d = dir.map(parseEntero)
        if ([...pt, ...d].some((v) => v === null)) return { ok: false, error: 'Rellena el punto y el vector director.' }
        if (d.every((v) => v === 0)) return { ok: false, error: 'El vector director no puede ser nulo.' }
        return { ok: true, value: { punto: pt, dir: d } }
      }
    }
  }

  const enviar = () => {
    if (disabled) return
    const r = parsear()
    if (!r.ok) { setError(r.error); sfx.back(); return }
    setError(null)
    onSubmit(r.value)
  }

  let campo: React.ReactNode = null
  switch (parte.tipo) {
    case 'numero':
      campo = (
        <div className="row-input">
          <NumField value={txt} onChange={setTxt} onEnter={enviar} placeholder="Tu resultado" autoFocus />
          {parte.unidades && <span className="units">{parte.unidades}</span>}
          {preview(txt)}
        </div>
      )
      break
    case 'ajuste':
      campo = rango && (
        <div className="ajuste">
          <input type="range" min={rango.min} max={rango.max} step={rango.paso} value={slider} onChange={(e) => setSlider(Number(e.target.value))} />
          <div className="row-input">
            <NumField small value={String(slider)} onChange={(v) => { const n = parseNumero(v); if (n !== null) setSlider(Math.min(rango.max, Math.max(rango.min, n))) }} />
            {parte.unidades && <span className="units">{parte.unidades}</span>}
          </div>
        </div>
      )
      break
    case 'vector':
      campo = (
        <div className="row-input">
          <span className="paren">(</span>
          {vec.map((v, i) => (
            <span key={i} className="vec-cell">
              <NumField small value={v} onChange={(nv) => setVec(vec.map((x, k) => (k === i ? nv : x)))} onEnter={enviar} placeholder={['x', 'y', 'z'][i]} autoFocus={i === 0} />
              {i < vec.length - 1 && <span className="comma">,</span>}
            </span>
          ))}
          <span className="paren">)</span>
          {parte.unidades && <span className="units">{parte.unidades}</span>}
        </div>
      )
      break
    case 'matriz':
      campo = (
        <div className="matrix-input">
          <span className="bracket">(</span>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${mat[0]?.length ?? 1}, 1fr)` }}>
            {mat.map((f, i) => f.map((v, j) => (
              <NumField key={`${i}-${j}`} small value={v} onEnter={enviar} autoFocus={i === 0 && j === 0}
                onChange={(nv) => setMat(mat.map((ff, a) => ff.map((x, b) => (a === i && b === j ? nv : x))))} />
            )))}
          </div>
          <span className="bracket">)</span>
        </div>
      )
      break
    case 'opcion':
      campo = (
        <div className="options">
          {opciones.map((o) => (
            <button key={o.i} type="button" className={`option ${sel === o.i ? 'on' : ''}`} disabled={disabled}
              onClick={() => { setSel(o.i); sfx.click() }} onMouseEnter={() => sfx.hover()}>
              <span className="bullet" /> <Tex>{o.texto}</Tex>
            </button>
          ))}
        </div>
      )
      break
    case 'orden':
      campo = (
        <ol className="order">
          {orden.map((s, i) => (
            <li key={s}>
              <Tex>{s}</Tex>
              <span className="order-btns">
                <button type="button" disabled={i === 0} onClick={() => { const o = [...orden];[o[i - 1], o[i]] = [o[i], o[i - 1]]; setOrden(o); sfx.click() }} aria-label="Subir">▲</button>
                <button type="button" disabled={i === orden.length - 1} onClick={() => { const o = [...orden];[o[i + 1], o[i]] = [o[i], o[i + 1]]; setOrden(o); sfx.click() }} aria-label="Bajar">▼</button>
              </span>
            </li>
          ))}
        </ol>
      )
      break
    case 'expresion':
    case 'primitiva':
    case 'plano': {
      const tex = parte.tipo === 'plano' ? null : exprTex(txt)
      campo = (
        <div className="expr">
          <div className="row-input">
            {parte.tipo === 'primitiva' && <span className="units">F(x) =</span>}
            <input className="num-field wide" value={txt} onChange={(e) => setTxt(e.target.value)} spellCheck={false} autoFocus
              placeholder={parte.tipo === 'plano' ? 'p. ej.: 2x - y + 3z = 4' : 'p. ej.: x^2*sin(x)'}
              onKeyDown={(e) => { if (e.key === 'Enter') enviar() }} />
            {parte.tipo === 'primitiva' && <span className="units">+ C</span>}
          </div>
          {parte.tipo !== 'plano' && (
            <div className="keypad">
              {TECLAS.map(([l, v]) => <button key={l} type="button" onClick={() => { setTxt(txt + v); sfx.type() }}>{l}</button>)}
            </div>
          )}
          {tex && txt.trim() && <div className="expr-preview"><TexInline>{tex}</TexInline></div>}
          {parte.tipo === 'plano' && txt.trim() && (parsePlano(txt) ? <span className="preview">ecuación válida</span> : <span className="preview bad">no es un plano todavía</span>)}
        </div>
      )
      break
    }
    case 'recta':
      campo = (
        <div className="recta">
          <div className="row-input"><span className="units">Punto P =</span>
            {punto.map((v, i) => <NumField key={i} small value={v} onChange={(nv) => setPunto(punto.map((x, k) => (k === i ? nv : x)))} placeholder={['x', 'y', 'z'][i]} autoFocus={i === 0} />)}
          </div>
          <div className="row-input"><span className="units">Vector director v =</span>
            {dir.map((v, i) => <NumField key={i} small value={v} onEnter={enviar} onChange={(nv) => setDir(dir.map((x, k) => (k === i ? nv : x)))} placeholder={['v₁', 'v₂', 'v₃'][i]} />)}
          </div>
          <p className="hint-note">Vale cualquier punto de la recta y cualquier vector director proporcional.</p>
        </div>
      )
      break
  }

  return (
    <div className="part-input">
      {campo}
      {error && <p className="input-error">{error}</p>}
      <button type="button" className="primary-btn check-btn" disabled={disabled} onClick={enviar}>
        {examen ? 'Guardar respuesta' : parte.tipo === 'ajuste' ? 'Ejecutar' : submitLabel}
      </button>
    </div>
  )
}

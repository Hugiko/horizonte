import { evaluate } from 'mathjs'
import { useState } from 'react'
import { sfx } from '../audio/audio'
import { CONST_TABLE } from '../data/constants'
import { plain } from '../missions/fmt'
import { useUI } from '../state/ui'
import { phi } from '../sims/stats'
import { Tex } from './Tex'

function Calculadora() {
  const [expr, setExpr] = useState('')
  const [res, setRes] = useState<string>('0')
  const [deg, setDeg] = useState(true)
  const [ans, setAns] = useState(0)

  const calc = () => {
    try {
      let s = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/,/g, '.').replace(/\bln\(/g, 'log(').replace(/\blog\(/g, 'log10(').replace(/Ans/g, `(${ans})`).replace(/EXP/g, 'e')
      if (deg) s = s.replace(/\b(sin|cos|tan)\(/g, '$1(pi/180*').replace(/\ba(sin|cos|tan)\(/g, '(180/pi)*a$1(')
      // corregir el reemplazo anterior para funciones inversas
      s = s.replace(/\(180\/pi\)\*a(sin|cos|tan)\(pi\/180\*/g, '(180/pi)*a$1(')
      const v = evaluate(s)
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error()
      setAns(v); setRes(plain(v, 10)); sfx.click()
    } catch {
      setRes('Error de sintaxis'); sfx.wrong()
    }
  }
  const K = (l: string, v = l, cls = '') => <button className={cls} onClick={() => { setExpr(expr + v); sfx.type() }}>{l}</button>
  return (
    <div className="calc">
      <div className="calc-screen">
        <div className="calc-expr">{expr || ' '}</div>
        <div className="calc-res">{res}</div>
      </div>
      <div className="calc-keys">
        <button className={deg ? 'on' : ''} onClick={() => setDeg(!deg)}>{deg ? 'DEG' : 'RAD'}</button>
        {K('sin', 'sin(')}{K('cos', 'cos(')}{K('tan', 'tan(')}{K('ln', 'ln(')}
        {K('sin⁻¹', 'asin(')}{K('cos⁻¹', 'acos(')}{K('tan⁻¹', 'atan(')}{K('log', 'log(')}{K('√', 'sqrt(')}
        {K('x²', '^2')}{K('xʸ', '^')}{K('(')}{K(')')}{K('π')}
        {K('7')}{K('8')}{K('9')}<button className="del" onClick={() => setExpr(expr.slice(0, -1))}>DEL</button><button className="del" onClick={() => { setExpr(''); setRes('0') }}>AC</button>
        {K('4')}{K('5')}{K('6')}{K('×', '*')}{K('÷', '/')}
        {K('1')}{K('2')}{K('3')}{K('+')}{K('−', '-')}
        {K('0')}{K(',', '.')}{K('·10ˣ', 'EXP')}{K('Ans')}<button className="eq" onClick={calc}>=</button>
      </div>
      <p className="hint-note">Calculadora científica no programable, como en la PAU: sin cálculo simbólico.</p>
    </div>
  )
}

function Constantes() {
  return (
    <table className="data-table">
      <tbody>
        {CONST_TABLE.map((c) => (
          <tr key={c.symbol}><td className="sym">{c.symbol}</td><td>{c.name}</td><td className="val">{c.value}</td></tr>
        ))}
      </tbody>
    </table>
  )
}

function TablaNormal() {
  const cols = Array.from({ length: 10 }, (_, i) => i / 100)
  const filas = Array.from({ length: 35 }, (_, i) => i / 10)
  return (
    <div className="normal-wrap">
      <Tex className="hint-note">{String.raw`Valores de $\Phi(z) = P(Z \le z)$ para $Z \sim N(0,1)$. Fila: unidades y décimas; columna: centésimas. Para $z<0$: $\Phi(-z) = 1-\Phi(z)$.`}</Tex>
      <table className="data-table normal">
        <thead><tr><th>z</th>{cols.map((c) => <th key={c}>{c.toFixed(2).slice(2)}</th>)}</tr></thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f}><th>{f.toFixed(1).replace('.', ',')}</th>{cols.map((c) => <td key={c}>{phi(f + c).toFixed(4).replace('.', ',')}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const TITULOS = { calculadora: 'Calculadora', constantes: 'Tabla de constantes', normal: 'Tabla N(0,1)' }

export function ToolPanel() {
  const h = useUI((s) => s.herramienta)
  const set = useUI((s) => s.setHerramienta)
  if (!h) return null
  return (
    <div className={`tool-panel glass tool-${h}`}>
      <div className="tool-head">
        <span>{TITULOS[h]}</span>
        <button className="x-btn" onClick={() => { set(null); sfx.back() }} aria-label="Cerrar">✕</button>
      </div>
      {h === 'calculadora' && <Calculadora />}
      {h === 'constantes' && <Constantes />}
      {h === 'normal' && <TablaNormal />}
    </div>
  )
}

export function ToolButtons() {
  const h = useUI((s) => s.herramienta)
  const set = useUI((s) => s.setHerramienta)
  const b = (id: 'calculadora' | 'constantes' | 'normal', label: string, icon: string) => (
    <button className={`tool-btn ${h === id ? 'on' : ''}`} onClick={() => { set(h === id ? null : id); sfx.click() }} title={label}>
      <span aria-hidden>{icon}</span><span className="lbl">{label}</span>
    </button>
  )
  return <>{b('calculadora', 'Calculadora', '▦')}{b('constantes', 'Constantes', 'Ω')}{b('normal', 'N(0,1)', '∿')}</>
}

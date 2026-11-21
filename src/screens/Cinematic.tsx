import { useEffect, useState } from 'react'
import { setAmbiente, sfx } from '../audio/audio'
import { CINEMATICAS } from '../data/story'
import { useGame } from '../state/store'
import { useUI, type Pantalla } from '../state/ui'
import { useTypewriter, VeraPortrait } from '../ui/Vera'

export function Cinematic({ id, despues }: { id: string; despues: Pantalla }) {
  const cine = CINEMATICAS[id]
  const ir = useUI((s) => s.ir)
  const verCinematica = useGame((s) => s.verCinematica)
  const [i, setI] = useState(0)
  const linea = cine?.lineas[i]
  const tw = useTypewriter(linea?.texto ?? '', 22)

  useEffect(() => { setAmbiente(cine?.escena === 'tormenta' ? 'tension' : 'espacio') }, [cine])
  const terminar = () => { verCinematica(id); sfx.click(); ir(despues) }
  const avanzar = () => {
    if (!tw.done) { tw.skip(); return }
    if (i < cine.lineas.length - 1) { setI(i + 1); sfx.click() } else terminar()
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') avanzar(); if (e.key === 'Escape') terminar() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  })
  if (!cine) { ir(despues); return null }

  return (
    <div className="screen cinematic" onClick={avanzar}>
      <div className="letterbox top" />
      <div className="letterbox bottom" />
      <button className="skip link-btn" onClick={(e) => { e.stopPropagation(); terminar() }}>Saltar ⏭</button>
      <div className="subtitle-box">
        {linea.quien === 'VERA' ? <VeraPortrait size={70} talking={!tw.done} /> : <div className={`speaker-icon sp-${linea.quien === 'TÚ' ? 'tu' : linea.quien.toLowerCase()}`}>{linea.quien === 'RADIO' ? '📡' : linea.quien === 'DIRECTORA' ? 'D' : 'TÚ'}</div>}
        <div>
          <div className="speaker">{linea.quien === 'DIRECTORA' ? 'DIRECTORA ALBA RIBES · ADM' : linea.quien === 'RADIO' ? 'CANAL DE OPERACIONES' : linea.quien}</div>
          <p className="line">{tw.shown}<span className="caret">▍</span></p>
          <div className="continue">{i + 1}/{cine.lineas.length} · clic o espacio para continuar</div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { setAmbiente, sfx } from '../audio/audio'
import { MISIONES } from '../missions/index'
import { useGame } from '../state/store'
import { useUI, type Pantalla } from '../state/ui'

const BASE = `${import.meta.env.BASE_URL}trailers/`

/** Tráiler cinematográfico (vídeo MP4) que se reproduce a pantalla completa antes de cada misión. */
export function TrailerVideo({ mision, volver }: { mision: string; volver: Pantalla }) {
  const ir = useUI((s) => s.ir)
  const volumen = useGame((s) => s.volumen)
  const verCinematica = useGame((s) => s.verCinematica)
  const ref = useRef<HTMLVideoElement>(null)
  const [necesitaClic, setNecesitaClic] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const m = MISIONES[mision]

  const empezar = () => { verCinematica(`tr-${mision}`); ir({ id: 'mision', mision, volver }) }

  useEffect(() => {
    setAmbiente(null)
    const v = ref.current
    if (!v) return
    v.volume = Math.min(1, volumen)
    v.play().catch(() => setNecesitaClic(true)) // el navegador puede bloquear el autoplay con sonido
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') empezar() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen trailer-screen">
      <video ref={ref} className="trailer-video" src={`${BASE}${mision}.mp4`} poster={`${BASE}${mision}.jpg`} playsInline preload="auto"
        onEnded={empezar} onError={empezar}
        onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgreso(v.currentTime / v.duration) }} />
      {necesitaClic && (
        <button className="trailer-play" onClick={() => { ref.current?.play(); setNecesitaClic(false); sfx.click() }}>▶ Ver tráiler</button>
      )}
      <div className="trailer-hud">
        <span className="trailer-tag">{m ? `${m.id} · ${m.titulo.replace(/^(JEFE|Experto) · /, '')}` : ''}</span>
        <button className="trailer-skip" onClick={() => { sfx.click(); empezar() }}>Saltar tráiler ⏭</button>
      </div>
      <div className="trailer-progress"><div style={{ width: `${progreso * 100}%` }} /></div>
    </div>
  )
}

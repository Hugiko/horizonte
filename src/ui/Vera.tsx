import { useEffect, useState } from 'react'
import { sfx } from '../audio/audio'
import { Tex } from './Tex'

/** Retrato holográfico animado de VERA (SVG). */
export function VeraPortrait({ size = 72, talking = false }: { size?: number; talking?: boolean }) {
  return (
    <svg className={`vera ${talking ? 'talking' : ''}`} width={size} height={size} viewBox="0 0 100 100" aria-label="VERA">
      <defs>
        <radialGradient id="vg" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#3fe0ff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#3fe0ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#vg)" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#3fe0ff" strokeOpacity=".5" strokeDasharray="4 6" className="vera-ring" />
      <circle cx="50" cy="50" r="31" fill="none" stroke="#ff8a3d" strokeOpacity=".6" strokeDasharray="30 12" className="vera-ring2" />
      <path d="M30 44 Q50 22 70 44 L66 66 Q50 80 34 66 Z" fill="rgba(63,224,255,.12)" stroke="#3fe0ff" strokeWidth="1.5" />
      <ellipse cx="41" cy="48" rx="5" ry="2.6" fill="#eaffff" className="vera-eye" />
      <ellipse cx="59" cy="48" rx="5" ry="2.6" fill="#eaffff" className="vera-eye" />
      <rect x="41" y="61" width="18" height="2.5" rx="1.2" fill="#3fe0ff" className="vera-mouth" />
      {[0, 1, 2, 3, 4].map((i) => <line key={i} x1="22" x2="78" y1={30 + i * 10} y2={30 + i * 10} stroke="#3fe0ff" strokeOpacity=".08" />)}
    </svg>
  )
}

/** Texto que aparece letra a letra (subtítulos de VERA). */
export function useTypewriter(text: string, speed = 18, enabled = true) {
  const [n, setN] = useState(enabled ? 0 : text.length)
  useEffect(() => {
    if (!enabled) { setN(text.length); return }
    setN(0)
    let i = 0
    const id = setInterval(() => {
      i += 2
      setN(i)
      if (i % 6 === 0) sfx.type()
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed, enabled])
  return { shown: text.slice(0, n), done: n >= text.length, skip: () => setN(text.length) }
}

export function VeraBubble({ children, tipo = 'info' }: { children: string; tipo?: 'info' | 'pista' | 'error' | 'ok' }) {
  return (
    <div className={`vera-bubble vb-${tipo}`}>
      <VeraPortrait size={48} talking />
      <div className="vb-body"><span className="vb-name">VERA</span><Tex>{children}</Tex></div>
    </div>
  )
}

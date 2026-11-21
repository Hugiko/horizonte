import { useEffect, useState } from 'react'
import { setAmbiente, sfx } from '../audio/audio'
import { ZONAS } from '../scenes/BaseScene'
import { RANGOS, rangoDe, XP_RANGO, useGame } from '../state/store'
import { useSession } from '../net/session'
import { useUI } from '../state/ui'
import { SyncBadge } from '../ui/SyncBadge'

export function AgentPanel() {
  const { xp, creditos, componentes } = useGame()
  const username = useSession((s) => s.username)
  const r = rangoDe(xp)
  const sig = XP_RANGO[r + 1]
  const pct = sig ? ((xp - XP_RANGO[r]) / (sig - XP_RANGO[r])) * 100 : 100
  return (
    <div className="agent-panel glass">
      <div className="ap-name">{username ?? 'Agente'}</div>
      <div className="ap-rank">{RANGOS[r]}</div>
      <div className="ap-xp"><div style={{ width: `${pct}%` }} /></div>
      <div className="ap-xp-txt">{xp} XP{sig ? ` · ${sig - xp} para ${RANGOS[r + 1]}` : ' · rango máximo'}</div>
      <div className="ap-res"><span title="Créditos de soporte">◈ {creditos}</span><span title="Componentes">⚙ {componentes}</span></div>
    </div>
  )
}

export function BaseHUD({ near, onGo }: { near: string | null; onGo: (id: string) => void }) {
  const ir = useUI((s) => s.ir)
  const [ayuda, setAyuda] = useState(() => { try { return !localStorage.getItem('horizonte-ayuda-base') } catch { return true } })
  const fecha = useGame((s) => s.ajustes.fechaPAU)
  const dias = Math.max(0, Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000))
  useEffect(() => setAmbiente('base'), [])
  const zona = ZONAS.find((z) => z.id === near)
  return (
    <div className="overlay base-hud">
      <AgentPanel />
      <div className="countdown glass small"><div className="label">SEGUNDA TORMENTA EN</div><div className="days">{dias} <span>días</span></div></div>
      {zona && (
        <button className="interact glass" onClick={() => onGo(zona.id)} style={{ borderColor: zona.color }}>
          <kbd>E</kbd> {zona.nombre}
        </button>
      )}
      <nav className="quick-travel glass">
        {ZONAS.map((z) => (
          <button key={z.id} onClick={() => { sfx.click(); onGo(z.id) }} onMouseEnter={() => sfx.hover()} style={{ ['--c' as string]: z.color }}>
            <span className="qt-dot" />{z.nombre.split(' · ')[0]}
          </button>
        ))}
        <button onClick={() => { sfx.back(); ir({ id: 'titulo' }) }}><span className="qt-dot" />Menú</button>
      </nav>
      {ayuda && (
        <div className="controls-help glass">
          <b>Controles</b>
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> moverse · <kbd>Mayús</kbd> correr</span>
          <span>Arrastra con el ratón para girar la cámara · rueda: zoom</span>
          <span><kbd>E</kbd> interactuar</span>
          <span>O usa los accesos directos de abajo.</span>
          <button className="link-btn" onClick={() => { setAyuda(false); try { localStorage.setItem('horizonte-ayuda-base', '1') } catch { /* nada */ } }}>Entendido</button>
        </div>
      )}
      <SyncBadge />
    </div>
  )
}

import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { sfx } from './audio/audio'
import { CINEMATICAS } from './data/story'
import { MISIONES } from './missions/index'
import { api } from './net/api'
import { useSession } from './net/session'
import { BaseScene, ZONAS } from './scenes/BaseScene'
import { HoloLab } from './scenes/HoloLab'
import { playerState } from './scenes/Player'
import { TitleScene } from './scenes/TitleScene'
import { BaseHUD } from './screens/BaseHUD'
import { ChapterMap, ChapterScreen } from './screens/Chapters'
import { Cinematic } from './screens/Cinematic'
import { Exam } from './screens/Exam'
import { Credits, HangarView, holoColor, Holocubierta, Stats, Workshop } from './screens/Facilities'
import { MissionPlayer } from './screens/MissionPlayer'
import { Teacher } from './screens/Teacher'
import { TheoryViewer } from './screens/TheoryViewer'
import { TrailerVideo } from './screens/TrailerVideo'
import { aplicarConfigServidor, useGame } from './state/store'
import { useUI, type Pantalla } from './state/ui'
import { LoadingScreen } from './ui/LoadingScreen'
import { TitleMenu } from './ui/TitleMenu'

/** Cámara que gira alrededor de la base (pantallas de menú sobre la base). */
function OrbitCam() {
  useFrame(({ camera, clock }) => {
    // órbita lenta dentro de la sala (r < 15,6 m y bajo la cornisa): encuadra la mesa con las estaciones detrás
    const t = clock.elapsedTime * 0.05
    camera.position.set(Math.sin(t) * 10.5, 4.3 + Math.sin(t * 2.3) * 0.4, Math.cos(t) * 10.5)
    camera.lookAt(0, 2.9, 0)
  })
  return null
}

function escenaDe(p: Pantalla): { tipo: 'titulo' | 'base' | 'base-orbita' | 'lab' | 'espacio' | 'ninguna'; cap?: number; alerta?: boolean } {
  switch (p.id) {
    case 'trailer': return { tipo: 'ninguna' }
    case 'titulo': return { tipo: 'titulo' }
    case 'base': return { tipo: 'base' }
    case 'mision': {
      const m = MISIONES[p.mision]
      return m?.escena === 'espacio' ? { tipo: 'espacio' } : { tipo: 'lab', cap: m?.capitulo, alerta: m?.dificultad === 'jefe' }
    }
    case 'teoria': return { tipo: 'lab', cap: p.cap }
    case 'simulacro': return { tipo: 'lab', cap: 9, alerta: true }
    case 'cinematica': {
      const e = CINEMATICAS[p.cine]?.escena
      return e === 'base' ? { tipo: 'base-orbita' } : e === 'lab' ? { tipo: 'lab', cap: 8 } : { tipo: 'espacio', alerta: e === 'tormenta' }
    }
    default: return { tipo: 'base-orbita' }
  }
}

function Scene3D({ near, onInteract }: { near: string | null; onInteract: () => void }) {
  const pantalla = useUI((s) => s.pantalla)
  const e = escenaDe(pantalla)
  if (e.tipo === 'ninguna') return null
  if (e.tipo === 'titulo' || e.tipo === 'espacio') return <TitleScene />
  if (e.tipo === 'lab') return <HoloLab cap={e.cap} alerta={e.alerta} />
  return (
    <>
      <BaseScene nearZone={e.tipo === 'base' ? near : null} onInteract={onInteract} interactive={e.tipo === 'base'} />
      {e.tipo === 'base-orbita' && <OrbitCam />}
    </>
  )
}

function Toasts() {
  const toasts = useUI((s) => s.toasts)
  return <div className="toasts">{toasts.map((t) => <div key={t.id} className={`toast glass t-${t.tipo}`}><b>{t.titulo}</b><span>{t.texto}</span></div>)}</div>
}

export default function App() {
  const calidad = useGame((s) => s.calidad)
  const holo = useGame((s) => s.estetica.holo)
  const pantalla = useUI((s) => s.pantalla)
  const ir = useUI((s) => s.ir)
  const username = useSession((s) => s.username)
  const [near, setNear] = useState<string | null>(null)
  const nearRef = useRef<string | null>(null)
  const dpr: [number, number] = calidad === 'alta' ? [1, 2] : calidad === 'media' ? [1, 1.5] : [0.75, 1]

  // color de hologramas elegido en el taller
  useEffect(() => { document.documentElement.style.setProperty('--holo', holoColor(holo)) }, [holo])
  // ajustes globales del profesor
  useEffect(() => { api<Record<string, unknown>>('/config', { token: null, retries: 6 }).then(aplicarConfigServidor).catch(() => { /* sin conexión */ }) }, [])
  // tiempo de juego
  useEffect(() => {
    const id = setInterval(() => { if (username && useUI.getState().pantalla.id !== 'titulo' && document.visibilityState === 'visible') useGame.getState().sumarTiempo(60) }, 60000)
    return () => clearInterval(id)
  }, [username])
  // si se cierra la sesión, volver al título
  useEffect(() => { if (!username && !['titulo', 'profesor', 'creditos'].includes(pantalla.id)) ir({ id: 'titulo' }) }, [username, pantalla.id, ir])

  // zona cercana al jugador en la base
  useEffect(() => {
    if (pantalla.id !== 'base') return
    const id = setInterval(() => {
      const p = playerState.pos
      const z = ZONAS.find((zz) => Math.hypot(p.x - zz.x, p.z - zz.z) < zz.r)?.id ?? null
      if (z !== nearRef.current) { nearRef.current = z; setNear(z); if (z) sfx.hover() }
    }, 150)
    return () => clearInterval(id)
  }, [pantalla.id])

  const go = useCallback((id: string) => {
    sfx.open()
    if (id === 'mapa') ir({ id: 'mapa' })
    else if (id === 'holocubierta') ir({ id: 'holocubierta' })
    else if (id === 'taller') ir({ id: 'taller' })
    else if (id === 'estadisticas') ir({ id: 'estadisticas' })
    else if (id === 'hangar') ir({ id: 'hangar' })
  }, [ir])
  const interact = useCallback(() => { if (nearRef.current) go(nearRef.current) }, [go])

  let overlay: React.ReactNode = null
  switch (pantalla.id) {
    case 'titulo': overlay = <TitleMenu />; break
    case 'base': overlay = <BaseHUD near={near} onGo={go} />; break
    case 'mapa': overlay = <ChapterMap />; break
    case 'capitulo': overlay = <ChapterScreen cap={pantalla.cap} />; break
    case 'teoria': overlay = <TheoryViewer cap={pantalla.cap} />; break
    case 'mision': overlay = <MissionPlayer key={pantalla.mision} id={pantalla.mision} volver={pantalla.volver} />; break
    case 'taller': overlay = <Workshop />; break
    case 'estadisticas': overlay = <Stats />; break
    case 'holocubierta': overlay = <Holocubierta />; break
    case 'profesor': overlay = <Teacher />; break
    case 'creditos': overlay = <Credits />; break
    case 'simulacro': overlay = <Exam key={pantalla.materia} materia={pantalla.materia} />; break
    case 'cinematica': overlay = <Cinematic key={pantalla.cine} id={pantalla.cine} despues={pantalla.despues} />; break
    case 'hangar': overlay = <HangarView />; break
    case 'trailer': overlay = <TrailerVideo key={pantalla.mision} mision={pantalla.mision} volver={pantalla.volver} />; break
  }

  return (
    <>
      <Canvas shadows dpr={dpr} camera={{ fov: 45, near: 0.1, far: 1500, position: [0, 3, 10] }} gl={{ antialias: calidad === 'baja', powerPreference: 'high-performance' }}>
        <Suspense fallback={null}>
          <Scene3D near={near} onInteract={interact} />
        </Suspense>
      </Canvas>
      <div className={`screen-wrap s-${pantalla.id}`} key={pantalla.id}>{overlay}</div>
      <Toasts />
      <LoadingScreen />
    </>
  )
}

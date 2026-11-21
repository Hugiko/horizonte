import { Environment, useEnvironment, useTexture } from '@react-three/drei'
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGame } from '../state/store'
import { Player, playerState, type Collider } from './Player'
import { collidersDecor, Decoracion } from './base/Decor'
import { Sala, type MatsSala } from './base/Hall'
import { CONSOLAS, Estaciones } from './base/Stations'
import { ANG, enPared } from './base/util'

/*
 * Base HORIZONTE: gran sala de control octogonal y cerrada (R≈18 m), bóveda blanca nervada con óculo,
 * ventanal panorámico al Mediterráneo al atardecer y estaciones integradas en las paredes.
 * Rendimiento: geometría repetida con InstancedMesh, 4 luces (sol, hemisférica, óculo y mesa),
 * brillo con materiales emisivos + Bloom, sombras sólo en media/alta y N8AO sólo en alta.
 */

const T = `${import.meta.env.BASE_URL}assets/textures/pbr/`
const H = `${import.meta.env.BASE_URL}assets/hdri/`
// sol "visual" bajo sobre el horizonte y dirección de la luz algo más alta (licencia artística:
// así el haz que entra por el ventanal dibuja los montantes sobre el suelo)
const SOL_VISUAL = new THREE.Vector3(-0.1, 0.045, -1).normalize()
const SOL_LUZ = new THREE.Vector3(-0.28, 0.4, -1).normalize()

// gancho para pruebas automáticas (sólo con ?e2e en la URL): permite colocar al jugador
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2e')) (window as unknown as { __hz: unknown }).__hz = { playerState }

export interface Zona { id: string; nombre: string; x: number; z: number; r: number; color: string }
const zonaPared = (a: number, d: number) => { const [x, , z] = enPared(a, 0, 0, d); return { x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 } }
export const ZONAS: Zona[] = [
  { id: 'mapa', nombre: 'Mesa holográfica · Misiones', x: 0, z: 0, r: 4.6, color: '#3fe0ff' },
  { id: 'holocubierta', nombre: 'Holocubierta · Archivo Técnico', ...zonaPared(ANG.holo, 3.6), r: 3.2, color: '#ff8a3d' },
  { id: 'taller', nombre: 'Taller · Mejoras', ...zonaPared(ANG.taller, 3.9), r: 3.2, color: '#5dffa8' },
  { id: 'estadisticas', nombre: 'Terminal · Estadísticas y logros', ...zonaPared(ANG.terminal, 3.9), r: 3.0, color: '#ffd23d' },
  { id: 'hangar', nombre: 'Hangar · Vehículos', ...zonaPared(ANG.hangar, 3.6), r: 3.2, color: '#e05dff' },
]

function enP(a: number, u: number, d: number, r: number): Collider { const [x, , z] = enPared(a, u, 0, d); return { x, z, r } }
const COLLIDERS: Collider[] = [
  { x: 0, z: 0, r: 2.3 }, // mesa holográfica
  ...CONSOLAS.flatMap(({ a, r }) => [{ x: Math.cos(a) * r, z: Math.sin(a) * r, r: 1.0 }, { x: Math.cos(a) * (r + 1.05), z: Math.sin(a) * (r + 1.05), r: 0.45 }]),
  // taller: banco, robot y cajas
  enP(ANG.taller, -1.2, 1.6, 0.9), enP(ANG.taller, 0.6, 1.6, 0.9), enP(ANG.taller, 2.4, 1.6, 0.9), enP(ANG.taller, -2.6, 2.3, 0.5), enP(ANG.taller, 4.4, 1.0, 0.95),
  // terminal, núcleo VERA, hangar
  enP(ANG.terminal, 0, 2.3, 0.6), enP(ANG.vera, 0, 2.3, 1.45),
  enP(ANG.hangar, -5.3, 1.1, 1.0), enP(ANG.hangar, 5.2, 1.2, 0.95), enP(ANG.hangar, -4.4, 1.5, 0.5),
  enP(ANG.nw, 4.3, 0.7, 0.9),
  ...collidersDecor(),
]

/** Texturas PBR según calidad: en 'baja' sólo color; en media/alta, normal + ARM (rugosidad en el canal G).
 *  La chapa metálica sólo aporta relieve (normal/ARM): su color original es oxidado y no encaja. */
function useMateriales(calidad: string): MatsSala {
  const full = calidad !== 'baja'
  const urls = full
    ? ['concrete_floor_worn_001/diff', 'concrete_floor_worn_001/nor', 'concrete_floor_worn_001/arm', 'painted_plaster_wall/diff', 'painted_plaster_wall/nor', 'painted_plaster_wall/arm', 'metal_plate/nor', 'metal_plate/arm']
    : ['concrete_floor_worn_001/diff', 'painted_plaster_wall/diff']
  const tex = useTexture(urls.map((u) => `${T}${u}_2k.jpg`))
  return useMemo(() => {
    const prep = (ts: (THREE.Texture | undefined)[], rep: number, color = true) => ts.forEach((t, k) => { if (!t) return; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = full ? 8 : 2; if (k === 0 && color) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true })
    const s = full ? tex.slice(0, 3) : [tex[0]]
    const y = full ? tex.slice(3, 6) : [tex[1]]
    const m = full ? tex.slice(6, 8) : []
    prep(s, 8); prep(y, 3); prep(m, 2, false)
    const suelo = new THREE.MeshStandardMaterial({ map: s[0], normalMap: s[1] ?? null, roughnessMap: s[2] ?? null, color: '#f3eee6', roughness: full ? 0.5 : 0.4, metalness: 0.05, envMapIntensity: 1.2, normalScale: new THREE.Vector2(0.3, 0.3) })
    const yeso = new THREE.MeshStandardMaterial({ map: y[0], normalMap: y[1] ?? null, roughnessMap: y[2] ?? null, color: '#fdfcfa', roughness: 0.9, normalScale: new THREE.Vector2(0.4, 0.4) })
    const metal = new THREE.MeshStandardMaterial({ normalMap: m[0] ?? null, roughnessMap: m[1] ?? null, color: '#eef0f3', metalness: 0.35, roughness: 0.6, normalScale: new THREE.Vector2(0.45, 0.45) })
    return { suelo, yeso, metal }
  }, [tex, full])
}

export function BaseScene({ nearZone, onInteract, interactive = true }: { nearZone: string | null; onInteract: () => void; interactive?: boolean }) {
  const calidad = useGame((s) => s.calidad)
  const xp = useGame((s) => s.xp)
  const fecha = useGame((s) => s.ajustes.fechaPAU)
  const dias = Math.max(0, Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000))
  const sombras = calidad !== 'baja'
  const mats = useMateriales(calidad)
  const envMar = useEnvironment({ files: `${H}venice_sunset_1k.hdr` })
  const sol = useRef<THREE.DirectionalLight>(null!)
  useEffect(() => { sol.current.target.position.set(0, 0, 0); sol.current.target.updateMatrixWorld() }, [])

  return (
    <>
      <Environment files={`${H}studio_small_09_1k.hdr`} environmentIntensity={0.5} />
      <fog attach="fog" args={['#e07a4a', 200, 1150]} />
      <hemisphereLight args={['#fff3e6', '#b9a89c', 0.85]} />
      <pointLight position={[0, 9.6, 0]} color="#ffe0b5" intensity={70} decay={1.6} distance={0} />
      <pointLight position={[0, 2.4, 0]} color="#3fe0ff" intensity={9} decay={2} distance={11} />
      <directionalLight ref={sol} position={SOL_LUZ.clone().multiplyScalar(45).toArray()} intensity={sombras ? 3.4 : 1.2} color="#ffbe86" castShadow={sombras}
        shadow-mapSize={calidad === 'alta' ? [2048, 2048] : [1024, 1024]}
        shadow-camera-left={-21} shadow-camera-right={21} shadow-camera-top={21} shadow-camera-bottom={-21}
        shadow-camera-near={5} shadow-camera-far={100} shadow-bias={-0.0004} shadow-normalBias={0.05} />
      <Sala mats={mats} sombras={sombras} envMar={envMar} sunDir={SOL_VISUAL} luzDir={SOL_LUZ} />
      <Estaciones mats={mats} sombras={sombras} xp={xp} dias={dias} fecha={fecha} />
      <Decoracion mats={mats} sombras={sombras} baja={calidad === 'baja'} zonas={ZONAS} nearZone={nearZone} />
      {interactive && <Player colliders={COLLIDERS} bounds={15.2} camMax={{ r: 15.6, y: 6.0 }} onInteract={onInteract} />}
      {calidad !== 'baja' && (
        <EffectComposer multisampling={calidad === 'alta' ? 4 : 0} enableNormalPass={false}>
          {calidad === 'alta' ? <N8AO aoRadius={1.1} intensity={1.8} distanceFalloff={0.8} halfRes /> : <></>}
          <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.85} luminanceSmoothing={0.25} />
          <Vignette offset={0.32} darkness={0.5} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </>
  )
}

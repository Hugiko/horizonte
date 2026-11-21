import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { sfx } from '../audio/audio'
import { rangoDe, useGame } from '../state/store'
import { retargetClips } from './retarget'

const M = `${import.meta.env.BASE_URL}assets/models/`
export const RANK_COLORS = ['#8aa4b4', '#3fe0ff', '#5dffa8', '#ffd23d', '#ff8a3d', '#e05dff']
export const TRAJES: Record<string, { nombre: string; color: string }> = {
  estandar: { nombre: 'Estándar ADM', color: '#ffffff' },
  ceramica: { nombre: 'Cerámica', color: '#f4efe4' },
  cobalto: { nombre: 'Cobalto', color: '#7fa6ff' },
  coral: { nombre: 'Coral', color: '#ff9f86' },
  grafito: { nombre: 'Grafito', color: '#8c95a3' },
  oro: { nombre: 'Oro solar', color: '#ffd27a' },
}

export interface Collider { x: number; z: number; r: number }
export const playerState = { pos: new THREE.Vector3(0, 0, 8), yaw: Math.PI, moving: false }

const keys: Record<string, boolean> = {}
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { if (!(e.target instanceof HTMLInputElement)) keys[e.code] = true })
  window.addEventListener('keyup', (e) => { keys[e.code] = false })
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false })
}

function Character({ personaje, moving, running }: { personaje: 'chica' | 'chico'; moving: React.RefObject<boolean>; running: React.RefObject<boolean> }) {
  const file = personaje === 'chica' ? 'Michelle.glb' : 'Soldier.glb'
  const { scene } = useGLTF(M + file)
  const animSrc = useGLTF(M + 'Soldier.glb')
  const traje = useGame((s) => s.estetica.traje)
  const model = useMemo(() => {
    const c = cloneSkinned(scene) as THREE.Group
    c.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.frustumCulled = false
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mesh.material = mats.length === 1 ? (mats[0] as THREE.Material).clone() : mats.map((m) => m.clone())
      }
    })
    // normalizar altura a 1,75 m y pies en el suelo
    c.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(c, true)
    const h = box.max.y - box.min.y
    const s = 1.75 / h
    c.scale.setScalar(s)
    c.position.y = -box.min.y * s
    return c
  }, [scene])

  useEffect(() => {
    // el traje se tiñe en el modelo con armadura; en Michelle la textura incluye piel y pelo
    if (personaje === 'chica') return
    const col = new THREE.Color(TRAJES[traje]?.color ?? '#ffffff')
    model.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      for (const m of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[]) {
        if (m.color && !/visor/i.test(m.name)) m.color.copy(col)
      }
    })
  }, [model, traje, personaje])

  // animaciones de Soldier (Idle/Walk/Run); para Michelle se corrige la orientación de la cadera
  const clips = useMemo(() => retargetClips(animSrc.animations, animSrc.scene, scene), [animSrc, scene])
  const group = useRef<THREE.Group>(null!)
  const { actions } = useAnimations(clips, group)
  const current = useRef<string>('')

  useFrame(() => {
    const want = moving.current ? (running.current ? 'Run' : 'Walk') : 'Idle'
    if (want !== current.current) {
      const next = actions[want]
      const prev = actions[current.current]
      if (next) {
        next.reset().setEffectiveTimeScale(want === 'Walk' ? 1.15 : 1).fadeIn(0.25).play()
        prev?.fadeOut(0.25)
        current.current = want
      }
    }
  })

  // Soldier mira hacia −Z en su reposo: se gira para que el frente sea +Z como Michelle
  return <group ref={group}><group rotation={[0, personaje === 'chico' ? Math.PI : 0, 0]}><primitive object={model} /></group></group>
}

/** Personaje en tercera persona con cámara orbital suave. */
export function Player({ colliders, bounds = 46, camMax, onInteract }: { colliders: Collider[]; bounds?: number; camMax?: { r: number; y: number }; onInteract: () => void }) {
  const personaje = useGame((s) => s.personaje) ?? 'chica'
  const xp = useGame((s) => s.xp)
  const root = useRef<THREE.Group>(null!)
  const ring = useRef<THREE.Mesh>(null!)
  const moving = useRef(false)
  const running = useRef(false)
  const cam = useRef({ yaw: playerState.yaw + Math.PI, pitch: 0.28, dist: 5.5, target: new THREE.Vector3() })
  const { camera, gl } = useThree()
  const stepT = useRef(0)

  useEffect(() => {
    const el = gl.domElement
    let dragging = false, lx = 0, ly = 0
    const down = (e: PointerEvent) => { dragging = true; lx = e.clientX; ly = e.clientY }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      cam.current.yaw -= (e.clientX - lx) * 0.005
      cam.current.pitch = Math.min(1.2, Math.max(0.05, cam.current.pitch + (e.clientY - ly) * 0.004))
      lx = e.clientX; ly = e.clientY
    }
    const up = () => { dragging = false }
    const wheel = (e: WheelEvent) => { cam.current.dist = Math.min(9, Math.max(2.5, cam.current.dist + e.deltaY * 0.005)) }
    const key = (e: KeyboardEvent) => { if (e.code === 'KeyE' && !(e.target instanceof HTMLInputElement)) onInteract() }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    el.addEventListener('wheel', wheel, { passive: true })
    window.addEventListener('keydown', key)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      el.removeEventListener('wheel', wheel)
      window.removeEventListener('keydown', key)
    }
  }, [gl, onInteract])

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.05)
    const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0)
    const r = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0)
    running.current = !!(keys.ShiftLeft || keys.ShiftRight)
    const p = playerState.pos
    moving.current = f !== 0 || r !== 0
    if (moving.current) {
      const yaw = cam.current.yaw
      const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x)
      const dir = fwd.multiplyScalar(f).add(right.multiplyScalar(r)).normalize()
      const speed = running.current ? 6.2 : 2.6
      p.addScaledVector(dir, speed * dt)
      const targetYaw = Math.atan2(dir.x, dir.z)
      let d = targetYaw - playerState.yaw
      d = Math.atan2(Math.sin(d), Math.cos(d))
      playerState.yaw += d * Math.min(1, dt * 12)
      stepT.current += dt * (running.current ? 2.6 : 1.7)
      if (stepT.current > 1) { stepT.current = 0; sfx.step() }
    }
    // colisiones
    for (const c of colliders) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz)
      if (d < c.r && d > 1e-6) { p.x = c.x + (dx / d) * c.r; p.z = c.z + (dz / d) * c.r }
    }
    const dc = Math.hypot(p.x, p.z)
    if (dc > bounds) { p.x *= bounds / dc; p.z *= bounds / dc }
    playerState.moving = moving.current
    root.current.position.copy(p)
    root.current.rotation.y = playerState.yaw
    ring.current.rotation.z += dt * 0.6
    ;(ring.current.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(state.clock.elapsedTime * 3) * 0.15

    // cámara
    const c = cam.current
    c.target.lerp(new THREE.Vector3(p.x, p.y + 1.45, p.z), 1 - Math.exp(-dt * 10))
    const off = new THREE.Vector3(Math.sin(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch)).multiplyScalar(c.dist)
    const want = c.target.clone().add(off)
    want.y = Math.max(0.4, want.y)
    if (camMax) {
      // la cámara no atraviesa las paredes ni el techo de la sala
      const rr = Math.hypot(want.x, want.z)
      if (rr > camMax.r) { want.x *= camMax.r / rr; want.z *= camMax.r / rr }
      want.y = Math.min(camMax.y, want.y)
    }
    camera.position.lerp(want, 1 - Math.exp(-dt * 8))
    camera.lookAt(c.target)
  })

  return (
    <group ref={root}>
      <Character personaje={personaje} moving={moving} running={running} />
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.55, 0.62, 48, 1, 0, Math.PI * 1.7]} />
        <meshBasicMaterial color={RANK_COLORS[rangoDe(xp)]} transparent opacity={0.5} toneMapped={false} />
      </mesh>
    </group>
  )
}

useGLTF.preload(M + 'Soldier.glb')
useGLTF.preload(M + 'Michelle.glb')

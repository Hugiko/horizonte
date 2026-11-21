import { Sparkles, Text, useAnimations, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import orbitronUrl from '@fontsource/orbitron/files/orbitron-latin-700-normal.woff?url'
import { playerState } from '../Player'
import { ANG, Inst, MAT, curvaArco, enPared, formaArco, glow, haciaDentro, mat, texFranjas, texPantalla, texTunel } from './util'
import type { MatsSala } from './Hall'

const ROBOT = `${import.meta.env.BASE_URL}assets/models/RobotExpressive.glb`
const caja = new THREE.BoxGeometry(1, 1, 1)
const cil = new THREE.CylinderGeometry(1, 1, 1, 20)
const plano = new THREE.PlaneGeometry(1, 1)
const planoIzq = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0)
const esfera = new THREE.SphereGeometry(1, 8, 8)

/** Grupo colocado sobre una pared (x lateral, y altura, z hacia el centro). */
function EnPared({ a, children }: { a: number; children: React.ReactNode }) {
  return <group position={enPared(a, 0, 0, 0)} rotation={[0, haciaDentro(a), 0]}>{children}</group>
}

/** Rótulo de estación: título luminoso + subtítulo + tira de luz. */
function Rotulo({ y, titulo, sub, color, z = 0.35 }: { y: number; titulo: string; sub?: string; color: string; z?: number }) {
  return (
    <group position={[0, y, z]}>
      <Text font={orbitronUrl} fontSize={0.52} letterSpacing={0.18} anchorX="center" anchorY="middle" material={glow(color, 2.6)}>{titulo}</Text>
      {sub && <Text font={orbitronUrl} fontSize={0.17} letterSpacing={0.32} position={[0, -0.46, 0]} anchorX="center" anchorY="middle" material={glow('#e8f6ff', 1.3)}>{sub}</Text>}
    </group>
  )
}

/** Marco orgánico de puerta: tubo blanco grueso + filo luminoso de color. */
function Portico({ w, h, color, z = 0.2 }: { w: number; h: number; color: string; z?: number }) {
  const g = useMemo(() => ({
    marco: new THREE.TubeGeometry(curvaArco(w + 0.5, h + 0.25), 96, 0.26, 12),
    filo: new THREE.TubeGeometry(curvaArco(w + 0.02, h - 0.02), 96, 0.045, 6),
    halo: new THREE.TubeGeometry(curvaArco(w + 1.25, h + 0.65), 96, 0.03, 6),
  }), [w, h])
  return (
    <group position={[0, 0, z]}>
      <mesh geometry={g.marco} material={MAT.blanco} castShadow />
      <mesh geometry={g.filo} position={[0, 0, 0.16]} material={glow(color, 3)} />
      <mesh geometry={g.halo} position={[0, 0, -0.05]} material={glow(color, 1.6, 0.8)} />
      {/* umbral luminoso en el suelo */}
      <mesh position={[0, 0.012, 0.6]} rotation={[-Math.PI / 2, 0, 0]} material={glow(color, 2.2, 0.85)}><planeGeometry args={[w, 0.06]} /></mesh>
    </group>
  )
}

/** Superficie con forma de arco y UV normalizadas (0..1) para poner una textura dentro. */
function useArcoGeo(w: number, h: number) {
  return useMemo(() => {
    const g = new THREE.ShapeGeometry(formaArco(w, h), 32)
    const uv = g.attributes.uv as THREE.BufferAttribute, pos = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h)
    return g
  }, [w, h])
}

/* ─────────────────────────── HOLOCUBIERTA (naranja) ─────────────────────────── */
function Holocubierta() {
  const W = 4.4, H = 4.9
  const arco = useArcoGeo(W, H)
  const tunel = useMemo(() => new THREE.MeshBasicMaterial({ map: texTunel('#ff8a3d'), color: new THREE.Color(1.5, 1.5, 1.5), toneMapped: false }), [])
  const cubos = useRef<THREE.Group>(null!)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    cubos.current.children.forEach((c, i) => { c.rotation.set(t * (0.3 + i * 0.1), t * (0.5 + i * 0.07), 0); c.position.y = 1.4 + i * 0.75 + Math.sin(t * 1.2 + i) * 0.12 })
  })
  return (
    <EnPared a={ANG.holo}>
      <mesh geometry={arco} position={[0, 0, 0.06]} material={tunel} />
      <Portico w={W} h={H} color="#ff8a3d" />
      <Rotulo y={5.75} titulo="HOLOCUBIERTA" sub="ARCHIVO TÉCNICO" color="#ff8a3d" />
      {/* columnas de datos laterales */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 4.1, 2.6, 0.14]}>
          <mesh scale={[1.5, 3, 1]} geometry={plano}><meshBasicMaterial map={texPantalla('#ff8a3d', 3 + s, true, 256, 512)} toneMapped={false} color={[1.3, 1.3, 1.3]} /></mesh>
          <mesh position={[0, 0, -0.04]} scale={[1.7, 3.2, 0.05]} geometry={caja} material={MAT.grafito} />
        </group>
      ))}
      <group ref={cubos} position={[0, 0, 1.6]}>
        {[0.32, 0.22, 0.16].map((r, i) => (
          <mesh key={i} position={[(i - 1) * 1.1, 0, 0]}><boxGeometry args={[r * 2, r * 2, r * 2]} /><meshBasicMaterial color={new THREE.Color('#ff8a3d').multiplyScalar(2.4)} wireframe toneMapped={false} /></mesh>
        ))}
      </group>
      <mesh position={[0, 0.06, 0.9]} scale={[5.2, 0.12, 1.4]} geometry={caja} material={MAT.blanco} receiveShadow />
    </EnPared>
  )
}

/* ─────────────────────────── TALLER (verde) + robot ─────────────────────────── */
function Robot({ sombras }: { sombras: boolean }) {
  const gltf = useGLTF(ROBOT)
  const model = useMemo(() => {
    const s = cloneSkinned(gltf.scene) as THREE.Group
    s.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = sombras; m.frustumCulled = false } })
    s.updateMatrixWorld(true)
    const b = new THREE.Box3().setFromObject(s, true)
    const k = 1.35 / (b.max.y - b.min.y)
    s.scale.setScalar(k); s.position.y = -b.min.y * k
    return s
  }, [gltf, sombras])
  const root = useRef<THREE.Group>(null!)
  const { actions } = useAnimations(gltf.animations, root)
  useEffect(() => {
    const idle = actions.Idle, wave = actions.Wave
    idle?.reset().play()
    if (!wave) return
    wave.setLoop(THREE.LoopOnce, 1); wave.clampWhenFinished = false
    const timers: number[] = []
    const saludo = () => {
      wave.reset().setEffectiveWeight(1).fadeIn(0.3).play(); idle?.fadeOut(0.3)
      timers.push(window.setTimeout(() => { idle?.reset().fadeIn(0.4).play(); wave.fadeOut(0.4) }, wave.getClip().duration * 1000 - 350))
    }
    const id = window.setInterval(saludo, 7000)
    timers.push(window.setTimeout(saludo, 1800))
    return () => { clearInterval(id); timers.forEach(clearTimeout) }
  }, [actions])
  // gira suavemente hacia el jugador cuando está cerca
  const base = useRef(0.5)
  useFrame((_, dt) => {
    const g = root.current; const wp = new THREE.Vector3(); g.getWorldPosition(wp)
    const p = playerState.pos; const dx = p.x - wp.x, dz = p.z - wp.z
    const parentRot = (g.parent as THREE.Object3D).getWorldQuaternion(new THREE.Quaternion())
    const parentYaw = new THREE.Euler().setFromQuaternion(parentRot, 'YXZ').y
    const want = Math.hypot(dx, dz) < 7 ? Math.atan2(dx, dz) - parentYaw : base.current
    let d = want - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d))
    g.rotation.y += d * Math.min(1, dt * 3)
  })
  return <group ref={root} rotation={[0, 0.5, 0]}><primitive object={model} /></group>
}

const HERR_COL = ['#e86a3a', '#dfe6ee', '#9aa7b4', '#5dffa8', '#f2c14e', '#dfe6ee', '#e86a3a', '#9aa7b4', '#dfe6ee', '#2b3138', '#2b3138', '#e86a3a', '#2b3138', '#9aa7b4', '#2b3138']
function Taller({ mats, sombras }: { mats: MatsSala; sombras: boolean }) {
  const herramientas = useMemo(() => {
    const m: THREE.Matrix4[] = []
    for (let i = 0; i < 9; i++) m.push(mat([-2.6 + i * 0.65, 3.2 + (i % 3) * 0.12, 0.12], [0, 0, (i % 2 ? 0.15 : -0.1)], [0.08 + (i % 3) * 0.04, 0.5 + (i % 4) * 0.12, 0.05]))
    for (let i = 0; i < 6; i++) m.push(mat([-2.3 + i * 0.9, 2.45, 0.12], [0, 0, 0], [0.38, 0.22 + (i % 2) * 0.12, 0.05]))
    return m
  }, [])
  const cajas = useMemo(() => [
    mat([-2.4, 4.15, 0.35], [0, 0.1, 0], [0.7, 0.45, 0.5]), mat([-1.5, 4.12, 0.35], [0, -0.05, 0], [0.6, 0.38, 0.45]),
    mat([1.3, 4.15, 0.35], [0, 0, 0], [0.8, 0.45, 0.5]), mat([2.3, 4.1, 0.35], [0, 0.2, 0], [0.5, 0.35, 0.45]),
  ], [])
  const brazo = useRef<THREE.Group>(null!)
  useFrame((s) => { const t = s.clock.elapsedTime; brazo.current.rotation.y = Math.sin(t * 0.6) * 0.8; (brazo.current.children[1] as THREE.Object3D).rotation.z = -0.6 + Math.sin(t * 0.9) * 0.25 })
  return (
    <EnPared a={ANG.taller}>
      {/* nicho: panel perforado oscuro con herramientas y estante */}
      <mesh position={[0, 2.95, 0.05]} scale={[6.4, 4.3, 0.1]} geometry={caja} receiveShadow><meshStandardMaterial color="#3d4b58" roughness={0.6} metalness={0.4} /></mesh>
      <Inst m={herramientas} colors={HERR_COL} geometry={caja} material={MAT.blancoMate} />
      <mesh position={[0, 3.88, 0.35]} scale={[6, 0.06, 0.55]} geometry={caja} material={MAT.blanco} />
      <Inst m={cajas} geometry={caja} material={mats.metal} />
      <mesh position={[0, 3.84, 0.63]} scale={[6, 0.03, 0.02]} geometry={caja} material={glow('#5dffa8', 2.4)} />
      <Portico w={7} h={5.0} color="#5dffa8" />
      <Rotulo y={5.8} titulo="TALLER" sub="MEJORAS Y COMPONENTES" color="#5dffa8" />
      {/* banco de trabajo */}
      <group position={[0.6, 0, 1.6]}>
        <mesh position={[0, 0.45, 0]} scale={[3.8, 0.9, 1.05]} geometry={caja} material={MAT.grafito} castShadow={sombras} receiveShadow />
        <mesh position={[0, 0.93, 0]} scale={[4, 0.07, 1.2]} geometry={caja} material={mats.metal} castShadow={sombras} receiveShadow />
        <mesh position={[0, 0.84, 0.61]} scale={[3.8, 0.03, 0.02]} geometry={caja} material={glow('#5dffa8', 2.8)} />
        {[-1.2, 0, 1.2].map((x) => <mesh key={x} position={[x, 0.45, 0.53]} scale={[1.05, 0.7, 0.02]} geometry={caja} material={MAT.grafitoMate} />)}
        {/* caja de herramientas y pieza de dron */}
        <mesh position={[-1.3, 1.1, -0.15]} scale={[0.6, 0.28, 0.32]} geometry={caja} castShadow={sombras}><meshStandardMaterial color="#d2552f" roughness={0.45} metalness={0.3} /></mesh>
        <mesh position={[0.2, 1.02, 0.1]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.blanco} castShadow={sombras}><torusGeometry args={[0.28, 0.05, 10, 32]} /></mesh>
        <mesh position={[0.2, 1.02, 0.1]} rotation={[-Math.PI / 2, 0, 0]} material={glow('#5dffa8', 2)}><circleGeometry args={[0.1, 20]} /></mesh>
        {/* brazo robótico articulado */}
        <group ref={brazo} position={[1.4, 0.97, -0.2]}>
          <mesh position={[0, 0.06, 0]} scale={[0.22, 0.12, 0.22]} geometry={cil} material={MAT.blanco} castShadow={sombras} />
          <group position={[0, 0.12, 0]}>
            <mesh position={[0.25, 0.25, 0]} rotation={[0, 0, -0.8]} scale={[0.06, 0.7, 0.06]} geometry={cil} material={MAT.blanco} castShadow={sombras} />
            <mesh position={[0.5, 0.48, 0]} material={glow('#5dffa8', 2.6)}><sphereGeometry args={[0.05, 12, 12]} /></mesh>
          </group>
        </group>
        {/* holograma de diagnóstico sobre el banco */}
        <mesh position={[-0.2, 1.75, -0.3]} rotation={[-0.15, 0, 0]} scale={[1.6, 0.9, 1]} geometry={plano}><meshBasicMaterial map={texPantalla('#5dffa8', 7, false)} transparent opacity={0.9} toneMapped={false} color={[1.6, 1.6, 1.6]} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      </group>
      <group position={[-2.6, 0, 2.3]}><Robot sombras={sombras} /></group>
    </EnPared>
  )
}

/* ─────────────────────────── HANGAR (violeta) + drones ─────────────────────────── */
function Drones({ n }: { n: number }) {
  const cuerpo = useRef<THREE.InstancedMesh>(null!)
  const rotor = useRef<THREE.InstancedMesh>(null!)
  const ojo = useRef<THREE.InstancedMesh>(null!)
  const geos = useMemo(() => ({ cuerpo: new THREE.CapsuleGeometry(0.16, 0.34, 6, 12).rotateX(Math.PI / 2), rotor: new THREE.TorusGeometry(0.15, 0.022, 6, 20).rotateX(Math.PI / 2), ojo: new THREE.SphereGeometry(0.06, 10, 8) }), [])
  const sitios = useMemo(() => Array.from({ length: n }, (_, i) => ({ x: (i % 2 ? 1 : -1) * (0.7 + Math.floor(i / 2) * 0.8), y: 3.75 + (i % 3) * 0.25, z: 0.55 + (i % 2) * 0.3, f: i * 1.7 })), [n])
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    sitios.forEach((d, i) => {
      const p = new THREE.Vector3(d.x + Math.sin(t * 0.4 + d.f) * 0.25, d.y + Math.sin(t * 1.3 + d.f) * 0.14, d.z + Math.cos(t * 0.5 + d.f) * 0.2)
      e.set(Math.sin(t + d.f) * 0.08, Math.sin(t * 0.3 + d.f) * 0.5, Math.cos(t * 0.9 + d.f) * 0.08); q.setFromEuler(e)
      m.compose(p, q, new THREE.Vector3(1, 1, 1)); cuerpo.current.setMatrixAt(i, m)
      const fwd = new THREE.Vector3(0, 0, 0.3).applyQuaternion(q)
      m.compose(p.clone().add(fwd), q, new THREE.Vector3(1, 1, 1)); ojo.current.setMatrixAt(i, m)
      ;[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], k) => {
        const off = new THREE.Vector3(sx * 0.3, 0.06, sz * 0.24).applyQuaternion(q)
        m.compose(p.clone().add(off), q, new THREE.Vector3(1, 1, 1)); rotor.current.setMatrixAt(i * 4 + k, m)
      })
    })
    cuerpo.current.instanceMatrix.needsUpdate = true; ojo.current.instanceMatrix.needsUpdate = true; rotor.current.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <instancedMesh ref={cuerpo} args={[geos.cuerpo, MAT.blanco, n]} castShadow frustumCulled={false} />
      <instancedMesh ref={rotor} args={[geos.rotor, glow('#e05dff', 2.4), n * 4]} frustumCulled={false} />
      <instancedMesh ref={ojo} args={[geos.ojo, glow('#f3c2ff', 3), n]} frustumCulled={false} />
    </group>
  )
}

function Hangar({ mats, xp, sombras }: { mats: MatsSala; xp: number; sombras: boolean }) {
  const n = Math.min(8, 2 + Math.floor(xp / 1500))
  const franjas = useMemo(() => { const t = texFranjas('#b04bd6').clone(); t.repeat.set(8, 1); t.needsUpdate = true; return t }, [])
  const puerta = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d4d8e0', metalness: 0.55, roughness: 0.32 }), [])
  const contenedores = useMemo(() => [
    mat([-5.4, 0.45, 1.0], [0, 0.1, 0], [1.2, 0.9, 1]), mat([-5.3, 1.25, 1.0], [0, -0.15, 0], [0.9, 0.7, 0.8]), mat([-4.4, 0.35, 1.5], [0, 0.4, 0], [0.7, 0.7, 0.7]),
    mat([5.3, 0.45, 1.1], [0, -0.2, 0], [1.2, 0.9, 1]), mat([4.4, 0.3, 1.7], [0, 0.6, 0], [0.6, 0.6, 0.6]),
  ], [])
  return (
    <EnPared a={ANG.hangar}>
      {/* compuerta doble de metal con costura luminosa */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 2.03, 2.45, 0.12]}>
          <mesh scale={[4, 4.9, 0.18]} geometry={caja} material={puerta} receiveShadow />
          {[-1.6, 0, 1.6].map((y) => <mesh key={y} position={[0, y, 0.1]} scale={[3.7, 0.05, 0.02]} geometry={caja} material={MAT.grafito} />)}
          <mesh position={[s * -1.55, 0, 0.1]} scale={[0.35, 4.6, 0.04]} geometry={caja} material={MAT.grafito} />
          <mesh position={[s * -1.55, 0.6, 0.13]} scale={[0.06, 1.6, 0.02]} geometry={caja} material={glow('#e05dff', 2.6)} />
        </group>
      ))}
      <mesh position={[0, 2.45, 0.23]} scale={[0.05, 4.9, 0.02]} geometry={caja} material={glow('#e05dff', 3.2)} />
      {/* marco recto robusto */}
      <mesh position={[0, 5.12, 0.2]} scale={[9.2, 0.45, 0.5]} geometry={caja} material={MAT.blanco} castShadow={sombras} />
      {[-1, 1].map((s) => <mesh key={s} position={[s * 4.35, 2.55, 0.2]} scale={[0.5, 5.1, 0.5]} geometry={caja} material={MAT.blanco} castShadow={sombras} />)}
      <mesh position={[0, 4.88, 0.46]} scale={[8.2, 0.04, 0.02]} geometry={caja} material={glow('#e05dff', 3)} />
      {[-1, 1].map((s) => <mesh key={s} position={[s * 4.08, 2.45, 0.46]} scale={[0.04, 4.86, 0.02]} geometry={caja} material={glow('#e05dff', 3)} />)}
      <Rotulo y={5.85} titulo="HANGAR" sub="VEHÍCULOS Y DRONES" color="#e05dff" />
      {/* franjas de seguridad en el suelo */}
      <mesh position={[0, 0.013, 0.75]} rotation={[-Math.PI / 2, 0, 0]} scale={[8, 0.7, 1]} geometry={plano}><meshBasicMaterial map={franjas} toneMapped={false} /></mesh>
      <Inst m={contenedores} geometry={caja} material={mats.metal} castShadow={sombras} receiveShadow />
      <Text font={orbitronUrl} fontSize={0.5} letterSpacing={0.1} position={[-2.03, 3.6, 0.32]} anchorX="center" material={MAT.grafito}>H·01</Text>
      <Text font={orbitronUrl} fontSize={0.5} letterSpacing={0.1} position={[2.03, 3.6, 0.32]} anchorX="center" material={MAT.grafito}>ADM</Text>
      <group scale={1.4} position={[0, -1.2, 0]}><Drones key={n} n={n} /></group>
    </EnPared>
  )
}

/* ─────────────────────────── TERMINAL (amarillo) ─────────────────────────── */
function Terminal({ dias, fecha, sombras }: { dias: number; fecha: string; sombras: boolean }) {
  const fechaTxt = useMemo(() => { const d = new Date(fecha); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() }, [fecha])
  const barra = useRef<THREE.Mesh>(null!)
  useFrame((s) => { barra.current.scale.x = 6 * (0.5 + 0.5 * Math.sin(s.clock.elapsedTime * 0.35)) ** 2 + 0.01 })
  return (
    <EnPared a={ANG.terminal}>
      <mesh position={[0, 3.2, 0.06]} scale={[7.4, 3.9, 0.12]} geometry={caja} material={MAT.grafito} />
      <mesh position={[0, 3.2, 0.13]} scale={[7, 3.5, 1]} geometry={plano}><meshBasicMaterial color="#04101a" toneMapped={false} /></mesh>
      <mesh position={[0, 3.2, 0.135]} scale={[7, 3.5, 1]} geometry={plano}><meshBasicMaterial map={texPantalla('#ffd23d', 11, false, 1024, 512)} transparent opacity={0.22} toneMapped={false} depthWrite={false} /></mesh>
      {[[0, 4.97, 7.2, 0.04], [0, 1.43, 7.2, 0.04], [-3.58, 3.2, 0.04, 3.58], [3.58, 3.2, 0.04, 3.58]].map(([x, y, w, h], i) => <mesh key={i} position={[x, y, 0.15]} scale={[w, h, 0.02]} geometry={caja} material={glow('#ffd23d', 2.8)} />)}
      <Text font={orbitronUrl} fontSize={0.26} letterSpacing={0.3} position={[0, 4.45, 0.16]} anchorX="center" material={glow('#ff8a3d', 2.4)}>SEGUNDA TORMENTA</Text>
      <Text font={orbitronUrl} fontSize={1.15} letterSpacing={0.06} position={[0, 3.25, 0.16]} anchorX="center" anchorY="middle" material={glow('#fff4cf', 1.9)}>{`${dias} DÍAS`}</Text>
      <Text font={orbitronUrl} fontSize={0.17} letterSpacing={0.3} position={[0, 2.25, 0.16]} anchorX="center" material={glow('#ffd23d', 1.8)}>{fechaTxt ? `PAU · ${fechaTxt}` : 'CUENTA ATRÁS PARA LA PAU'}</Text>
      <mesh position={[-3, 1.85, 0.16]} scale={[6, 0.05, 1]} geometry={plano} material={glow('#ffd23d', 0.6)} />
      <mesh ref={barra} position={[-3, 1.85, 0.165]} scale={[3, 0.05, 1]} geometry={planoIzq} material={glow('#ffd23d', 3)} />
      <Rotulo y={5.75} titulo="TERMINAL" sub="ESTADÍSTICAS Y LOGROS" color="#ffd23d" />
      {/* atril de consulta */}
      <group position={[0, 0, 2.3]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.55, 0]} scale={[0.35, 1.1, 0.35]} geometry={cil} material={MAT.blanco} castShadow={sombras} />
        <mesh position={[0, 1.15, 0.05]} rotation={[-0.7, 0, 0]} scale={[1.1, 0.06, 0.7]} geometry={caja} material={MAT.blanco} castShadow={sombras} />
        <mesh position={[0, 1.19, 0.05]} rotation={[-0.7 - Math.PI / 2, 0, 0]} scale={[0.95, 0.56, 1]} geometry={plano}><meshBasicMaterial map={texPantalla('#ffd23d', 5)} toneMapped={false} color={[1.4, 1.4, 1.4]} /></mesh>
      </group>
    </EnPared>
  )
}

/* ─────────────────────────── NÚCLEO VERA (cian) ─────────────────────────── */
function Vera({ sombras }: { sombras: boolean }) {
  const anillos = useRef<THREE.Group>(null!)
  const nucleo = useRef<THREE.Mesh>(null!)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    anillos.current.children.forEach((c, i) => { c.rotation.set(Math.PI / 2 + Math.sin(t * 0.5 + i) * 0.35, 0, t * (0.4 + i * 0.25) * (i % 2 ? -1 : 1)) })
    nucleo.current.rotation.y = t * 0.6; nucleo.current.rotation.x = t * 0.3
    nucleo.current.scale.setScalar(1 + Math.sin(t * 2.2) * 0.06)
  })
  return (
    <EnPared a={ANG.vera}>
      {/* raíles de luz verticales en la pared */}
      {[-2.2, -1.6, 1.6, 2.2].map((x) => <mesh key={x} position={[x, 3, 0.1]} scale={[0.05, 4.6, 0.03]} geometry={caja} material={glow('#3fe0ff', 2.2)} />)}
      <mesh position={[0, 3, 0.05]} scale={[3.6, 5, 0.08]} geometry={caja} material={MAT.grafitoMate} />
      <group position={[0, 0, 2.3]}>
        <mesh position={[0, 0.25, 0]} scale={[1.3, 0.5, 1.3]} geometry={cil} material={MAT.blanco} castShadow={sombras} receiveShadow />
        <mesh position={[0, 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glow('#3fe0ff', 2.6)}><ringGeometry args={[0.95, 1.05, 48]} /></mesh>
        <mesh position={[0, 2.6, 0]} scale={[0.95, 4.1, 0.95]} geometry={cil}><meshStandardMaterial color="#9fe9ff" transparent opacity={0.14} roughness={0.05} metalness={0.9} depthWrite={false} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, 4.75, 0]} scale={[1.15, 0.3, 1.15]} geometry={cil} material={MAT.blanco} castShadow={sombras} />
        <group ref={anillos} position={[0, 2.6, 0]}>
          {[0.75, 0.6, 0.45].map((r, i) => <mesh key={i} material={glow(i === 1 ? '#ffffff' : '#3fe0ff', 2.6)}><torusGeometry args={[r, 0.018, 6, 64]} /></mesh>)}
        </group>
        <mesh ref={nucleo} position={[0, 2.6, 0]}><icosahedronGeometry args={[0.28, 1]} /><meshBasicMaterial color={new THREE.Color('#bff6ff').multiplyScalar(3)} toneMapped={false} wireframe /></mesh>
        <mesh position={[0, 2.6, 0]}><sphereGeometry args={[0.16, 16, 16]} /><meshBasicMaterial color={new THREE.Color('#eaffff').multiplyScalar(3.5)} toneMapped={false} /></mesh>
        <Sparkles count={18} scale={[1.3, 3.4, 1.3]} position={[0, 2.6, 0]} size={2} color="#aef4ff" speed={0.5} />
      </group>
      <Rotulo y={5.75} titulo="V.E.R.A." sub="NÚCLEO DE ASISTENCIA · EN LÍNEA" color="#3fe0ff" />
    </EnPared>
  )
}

/* ─────────────────────────── MESA HOLOGRÁFICA + CONSOLAS ─────────────────────────── */
function MesaHolografica({ sombras }: { sombras: boolean }) {
  const tierra = useRef<THREE.Group>(null!)
  const anillo = useRef<THREE.Mesh>(null!)
  const anillo2 = useRef<THREE.Mesh>(null!)
  const sat = useRef<THREE.Mesh>(null!)
  const pedestal = useMemo(() => new THREE.LatheGeometry([[0.0, 0], [1.25, 0], [1.3, 0.08], [0.95, 0.3], [0.8, 0.6], [1.05, 0.82], [1.85, 0.92], [1.85, 0.98], [0, 0.98]].map(([r, y]) => new THREE.Vector2(r, y)), 64), [])
  const marcas = useMemo(() => {
    // puntos de misión sobre el globo
    const out: THREE.Matrix4[] = []
    for (let i = 0; i < 9; i++) { const la = Math.sin(i * 2.3) * 1.1, lo = i * 0.7; out.push(mat([Math.cos(la) * Math.cos(lo) * 0.92, Math.sin(la) * 0.92, Math.cos(la) * Math.sin(lo) * 0.92], [0, 0, 0], 0.035)) }
    return out
  }, [])
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    tierra.current.rotation.y += dt * 0.25
    anillo.current.rotation.z += dt * 0.35
    anillo2.current.rotation.z -= dt * 0.2
    sat.current.position.set(Math.cos(t * 0.8) * 1.35, 2.35 + Math.sin(t * 0.8) * 0.4, Math.sin(t * 0.8) * 1.35)
  })
  const cono = useMemo(() => new THREE.MeshBasicMaterial({ map: texDegradadoCono(), color: new THREE.Color('#3fe0ff').multiplyScalar(1.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), [])
  return (
    <group>
      <mesh geometry={pedestal} material={MAT.blanco} castShadow={sombras} receiveShadow />
      <mesh position={[0, 0.995, 0]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.cristalOscuro}><circleGeometry args={[1.8, 64]} /></mesh>
      <mesh position={[0, 0.96, 0]} rotation={[Math.PI / 2, 0, 0]} material={glow('#3fe0ff', 3)}><torusGeometry args={[1.86, 0.025, 8, 96]} /></mesh>
      <mesh position={[0, 1.0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={glow('#3fe0ff', 2, 0.55, true)}><ringGeometry args={[0.6, 1.55, 64, 1]} /></mesh>
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} material={glow('#3fe0ff', 2.2)}><torusGeometry args={[0.96, 0.02, 6, 64]} /></mesh>
      {/* haz de proyección */}
      <mesh position={[0, 1.95, 0]} material={cono}><cylinderGeometry args={[1.45, 1.5, 1.9, 48, 1, true]} /></mesh>
      <group ref={tierra} position={[0, 2.35, 0]}>
        <mesh><sphereGeometry args={[0.86, 32, 24]} /><meshBasicMaterial color="#04263a" transparent opacity={0.7} /></mesh>
        <mesh><icosahedronGeometry args={[0.9, 3]} /><meshBasicMaterial color={new THREE.Color('#3fe0ff').multiplyScalar(2)} wireframe toneMapped={false} transparent opacity={0.75} /></mesh>
        <Inst m={marcas} geometry={esfera} material={glow('#ff8a3d', 3)} />
      </group>
      <mesh ref={anillo} position={[0, 2.35, 0]} rotation={[Math.PI / 2.4, 0, 0]} material={glow('#ff8a3d', 2.6)}><torusGeometry args={[1.25, 0.012, 6, 128]} /></mesh>
      <mesh ref={anillo2} position={[0, 2.35, 0]} rotation={[Math.PI / 1.8, 0.3, 0]} material={glow('#3fe0ff', 1.8, 0.7)}><torusGeometry args={[1.45, 0.008, 6, 128]} /></mesh>
      <mesh ref={sat} material={glow('#ffffff', 3)}><sphereGeometry args={[0.04, 8, 8]} /></mesh>
      <Sparkles count={28} scale={[2.8, 2.2, 2.8]} position={[0, 2.3, 0]} size={2.2} color="#9ff3ff" speed={0.35} />
    </group>
  )
}
function texDegradadoCono() {
  // degradado vertical de abajo (intenso) a arriba (transparente)
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 128
  const g = cv.getContext('2d')!; const gr = g.createLinearGradient(0, 0, 0, 128)
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.22)')
  g.fillStyle = gr; g.fillRect(0, 0, 4, 128)
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t
}

export const CONSOLAS = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map((a) => ({ a, r: 4.1 }))
function Consolas({ sombras }: { sombras: boolean }) {
  const m = useMemo(() => {
    const o = { cuerpo: [] as THREE.Matrix4[], tapa: [] as THREE.Matrix4[], pantalla: [] as THREE.Matrix4[], marco: [] as THREE.Matrix4[], luz: [] as THREE.Matrix4[], asiento: [] as THREE.Matrix4[], respaldo: [] as THREE.Matrix4[], pata: [] as THREE.Matrix4[] }
    CONSOLAS.forEach(({ a, r }) => {
      // el operador se sienta fuera y mira hacia la mesa: la pantalla mira hacia fuera
      const base = mat([Math.cos(a) * r, 0, Math.sin(a) * r], [0, Math.atan2(Math.cos(a), Math.sin(a)), 0])
      const L = (p: [number, number, number], rr: [number, number, number], s: [number, number, number]) => base.clone().multiply(mat(p, rr, s))
      o.cuerpo.push(L([0, 0.4, 0], [0, 0, 0], [1.9, 0.8, 0.7]))
      o.tapa.push(L([0, 0.84, 0.05], [0.12, 0, 0], [2.0, 0.06, 0.85]))
      o.marco.push(L([0, 1.28, -0.22], [-0.25, 0, 0], [1.75, 0.82, 0.05]))
      o.pantalla.push(L([0, 1.28, -0.19], [-0.25, 0, 0], [1.62, 0.72, 1]))
      o.luz.push(L([0, 0.82, 0.48], [0, 0, 0], [1.9, 0.025, 0.02]))
      o.asiento.push(L([0, 0.5, 1.05], [0, 0, 0], [0.55, 0.08, 0.5]))
      o.respaldo.push(L([0, 0.85, 1.32], [-0.12, 0, 0], [0.52, 0.6, 0.07]))
      o.pata.push(L([0, 0.25, 1.05], [0, 0, 0], [0.05, 0.5, 0.05]))
    })
    return o
  }, [])
  const pantallaMat = useMemo(() => new THREE.MeshBasicMaterial({ map: texPantalla('#3fe0ff', 2), color: new THREE.Color(1.35, 1.35, 1.35), toneMapped: false }), [])
  return (
    <group>
      <Inst m={m.cuerpo} geometry={caja} material={MAT.blanco} castShadow={sombras} receiveShadow />
      <Inst m={m.tapa} geometry={caja} material={MAT.grafito} castShadow={sombras} />
      <Inst m={m.marco} geometry={caja} material={MAT.grafito} castShadow={sombras} />
      <Inst m={m.pantalla} geometry={plano} material={pantallaMat} />
      <Inst m={m.luz} geometry={caja} material={glow('#3fe0ff', 2.8)} />
      <Inst m={m.asiento} geometry={caja} material={MAT.tela} castShadow={sombras} />
      <Inst m={m.respaldo} geometry={caja} material={MAT.tela} castShadow={sombras} />
      <Inst m={m.pata} geometry={cil} material={MAT.grafito} />
    </group>
  )
}

export function Estaciones({ mats, sombras, xp, dias, fecha }: { mats: MatsSala; sombras: boolean; xp: number; dias: number; fecha: string }) {
  return (
    <group>
      <MesaHolografica sombras={sombras} />
      <Consolas sombras={sombras} />
      <Holocubierta />
      <Taller mats={mats} sombras={sombras} />
      <Hangar mats={mats} xp={xp} sombras={sombras} />
      <Terminal dias={dias} fecha={fecha} sombras={sombras} />
      <Vera sombras={sombras} />
    </group>
  )
}

useGLTF.preload(ROBOT)

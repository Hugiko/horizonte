import { Float, Sparkles, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import orbitronUrl from '@fontsource/orbitron/files/orbitron-latin-700-normal.woff?url'
import type { Collider } from '../Player'
import { ANG, Inst, MAT, enPared, glow, haciaDentro, mat, matPared, texPantalla } from './util'
import type { MatsSala } from './Hall'
import type { Zona } from '../BaseScene'

const caja = new THREE.BoxGeometry(1, 1, 1)
const cil = new THREE.CylinderGeometry(1, 1, 1, 16)
// hoja: elipsoide alargado con la base en el origen (se escala por instancia)
const hojaGeo = new THREE.SphereGeometry(1, 10, 6).translate(0, 0, 1)
const copaGeo = new THREE.IcosahedronGeometry(1, 1)
const macetaGeo = new THREE.LatheGeometry([[0, 0], [0.42, 0], [0.5, 0.08], [0.6, 0.62], [0.64, 0.7], [0.58, 0.72], [0, 0.66]].map(([r, y]) => new THREE.Vector2(r, y)), 28)

type Tipo = 'agave' | 'strelitzia' | 'ficus' | 'palmera'
interface Maceta { x: number; z: number; s: number; tipo: Tipo }

/** Posiciones de jardineras (también usadas como colisiones). */
export const MACETAS: Maceta[] = (() => {
  const out: Maceta[] = []
  const add = (a: number, u: number, d: number, s: number, tipo: Tipo) => { const [x, , z] = enPared(a, u, 0, d); out.push({ x, z, s, tipo }) }
  // flanqueando el ventanal
  add(ANG.ne, -5.2, 1.1, 1.35, 'palmera'); add(ANG.nw, 5.2, 1.1, 1.35, 'palmera')
  // salones junto al ventanal
  add(ANG.ne, 4.6, 1.1, 1.1, 'strelitzia'); add(ANG.nw, -4.6, 1.1, 1.1, 'strelitzia')
  add(ANG.ne, 0, 0.9, 0.8, 'agave'); add(ANG.nw, 0, 0.9, 0.8, 'agave')
  // ritmo verde junto a las estaciones
  for (const [a, t] of [[ANG.holo, 'ficus'], [ANG.vera, 'agave'], [ANG.terminal, 'strelitzia'], [ANG.taller, 'ficus']] as [number, Tipo][]) {
    add(a, -5.6, 0.95, 0.9, t); add(a, 5.6, 0.95, 0.9, t === 'ficus' ? 'agave' : 'ficus')
  }
  return out
})()

function Jardineras({ sombras }: { sombras: boolean }) {
  const d = useMemo(() => {
    const macetas: THREE.Matrix4[] = [], tierra: THREE.Matrix4[] = [], hojas: THREE.Matrix4[] = [], hojasC: string[] = [], troncos: THREE.Matrix4[] = [], copas: THREE.Matrix4[] = [], copasC: string[] = [], luz: THREE.Matrix4[] = []
    const verdes = ['#3f7a3a', '#4f8f45', '#2f6b3c', '#5b9a4e', '#3c8452']
    let seed = 7
    const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    MACETAS.forEach((p, i) => {
      const s = p.s
      macetas.push(mat([p.x, 0, p.z], [0, 0, 0], [s, s, s]))
      tierra.push(mat([p.x, 0.67 * s, p.z], [-Math.PI / 2, 0, 0], [0.56 * s, 0.56 * s, 1]))
      luz.push(mat([p.x, 0.02, p.z], [-Math.PI / 2, 0, 0], [0.7 * s, 0.7 * s, 1]))
      const top = 0.66 * s
      if (p.tipo === 'agave') {
        for (let k = 0; k < 16; k++) { const az = (k / 16) * Math.PI * 2 + r(); const tilt = -(0.5 + r() * 0.7); hojas.push(mat([p.x, top, p.z], [tilt, az, 0], [0.07 * s, 0.02 * s, (0.35 + r() * 0.25) * s], 'YXZ')); hojasC.push(verdes[(i + k) % 5]) }
      } else if (p.tipo === 'strelitzia') {
        for (let k = 0; k < 11; k++) { const az = (k / 11) * Math.PI * 2 + r() * 0.5; const tilt = -(1.0 + r() * 0.35); hojas.push(mat([p.x, top, p.z], [tilt, az, 0.4], [0.16 * s, 0.025 * s, (0.7 + r() * 0.45) * s], 'YXZ')); hojasC.push(verdes[(k + 2) % 5]) }
      } else if (p.tipo === 'ficus') {
        troncos.push(mat([p.x, top + 0.6 * s, p.z], [0, 0, 0.05], [0.05 * s, 1.2 * s, 0.05 * s]))
        for (let k = 0; k < 6; k++) { const az = k * 1.1, rr = 0.25 + r() * 0.2; copas.push(mat([p.x + Math.cos(az) * rr * s, top + (1.25 + r() * 0.55) * s, p.z + Math.sin(az) * rr * s], [r(), r(), 0], (0.32 + r() * 0.15) * s)); copasC.push(verdes[(k + i) % 5]) }
      } else {
        // palmera de interior: tronco curvo y frondas que caen
        const h = 2.6 * s
        for (let j = 0; j < 5; j++) troncos.push(mat([p.x + j * 0.04 * s, top + (j + 0.5) * (h / 5), p.z], [0, 0, -0.04], [(0.12 - j * 0.012) * s, (h / 5) * 1.05, (0.12 - j * 0.012) * s]))
        for (let k = 0; k < 12; k++) { const az = (k / 12) * Math.PI * 2 + r() * 0.3; const tilt = -0.15 + r() * 0.55; hojas.push(mat([p.x + 0.2 * s, top + h, p.z], [tilt, az, 0], [0.2 * s, 0.02 * s, (0.75 + r() * 0.3) * s], 'YXZ')); hojasC.push(verdes[k % 5]) }
      }
    })
    return { macetas, tierra, hojas, hojasC, troncos, copas, copasC, luz }
  }, [])
  return (
    <group>
      <Inst m={d.macetas} geometry={macetaGeo} material={MAT.blanco} castShadow={sombras} receiveShadow />
      <Inst m={d.tierra} geometry={new THREE.CircleGeometry(1, 20)} material={MAT.tierra} />
      <Inst m={d.luz} geometry={new THREE.RingGeometry(0.92, 1, 32)} material={glow('#3fe0ff', 1.6, 0.6)} />
      <Inst m={d.hojas} colors={d.hojasC} geometry={hojaGeo} material={MAT.hoja} castShadow={sombras} />
      <Inst m={d.troncos} geometry={cil} material={MAT.tronco} castShadow={sombras} />
      <Inst m={d.copas} colors={d.copasC} geometry={copaGeo} material={MAT.hoja} castShadow={sombras} />
    </group>
  )
}

/** Bancos de los salones junto al ventanal (madera sobre zócalo blanco). */
export const BANCOS = [
  { a: ANG.ne, u: -2.1, d: 2.6 }, { a: ANG.ne, u: 2.1, d: 2.6 },
  { a: ANG.nw, u: -2.1, d: 2.6 }, { a: ANG.nw, u: 2.1, d: 2.6 },
]
function Bancos({ sombras }: { sombras: boolean }) {
  const d = useMemo(() => {
    const base: THREE.Matrix4[] = [], asiento: THREE.Matrix4[] = [], luz: THREE.Matrix4[] = []
    BANCOS.forEach(({ a, u, d }) => {
      base.push(matPared(a, [u, 0.2, d], [0, 0, 0], [2.6, 0.4, 0.55]))
      asiento.push(matPared(a, [u, 0.45, d], [0, 0, 0], [2.9, 0.1, 0.7]))
      luz.push(matPared(a, [u, 0.03, d + 0.3], [0, 0, 0], [2.5, 0.02, 0.02]))
    })
    return { base, asiento, luz }
  }, [])
  return (
    <group>
      <Inst m={d.base} geometry={caja} material={MAT.blanco} castShadow={sombras} receiveShadow />
      <Inst m={d.asiento} geometry={caja} material={MAT.madera} castShadow={sombras} receiveShadow />
      <Inst m={d.luz} geometry={caja} material={glow('#ffd2a0', 2.4)} />
    </group>
  )
}

/** Cajas de material apiladas (taller y salón). */
function Cajas({ mats, sombras }: { mats: MatsSala; sombras: boolean }) {
  const d = useMemo(() => {
    const m: THREE.Matrix4[] = [], c: string[] = []
    const pila = (a: number, u: number, dd: number) => {
      m.push(matPared(a, [u, 0.4, dd], [0, 0.1, 0], [0.9, 0.8, 0.8])); c.push('#ffffff')
      m.push(matPared(a, [u + 0.85, 0.3, dd + 0.1], [0, -0.2, 0], [0.6, 0.6, 0.6])); c.push('#ffb27a')
      m.push(matPared(a, [u + 0.1, 1.05, dd], [0, 0.35, 0], [0.6, 0.5, 0.55])); c.push('#dfe6ee')
    }
    pila(ANG.taller, 4.0, 1.0)
    pila(ANG.nw, 3.9, 0.7)
    return { m, c }
  }, [])
  return <Inst m={d.m} colors={d.c} geometry={caja} material={mats.metal} castShadow={sombras} receiveShadow />
}

/** Panel holográfico flotante con datos. */
function PanelHolo({ p, ry, w = 2.2, h = 1.25, color, titulo, seed }: { p: [number, number, number]; ry: number; w?: number; h?: number; color: string; titulo: string; seed: number }) {
  const borde = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)), [w, h])
  return (
    <Float speed={1.4} floatIntensity={0.35} rotationIntensity={0.05}>
      <group position={p} rotation={[0, ry, 0]}>
        <mesh><planeGeometry args={[w, h]} /><meshBasicMaterial color="#06202e" transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, -0.06, 0.005]}><planeGeometry args={[w * 0.94, h * 0.78]} /><meshBasicMaterial map={texPantalla(color, seed, false)} transparent toneMapped={false} color={[1.5, 1.5, 1.5]} depthWrite={false} side={THREE.DoubleSide} /></mesh>
        <lineSegments geometry={borde}><lineBasicMaterial color={new THREE.Color(color).multiplyScalar(2.5)} toneMapped={false} /></lineSegments>
        <Text font={orbitronUrl} fontSize={0.1} letterSpacing={0.2} position={[-w / 2 + 0.1, h / 2 - 0.1, 0.01]} anchorX="left" anchorY="top" material={glow(color, 2.2)}>{titulo}</Text>
      </group>
    </Float>
  )
}

/** Señalización en el suelo: nombre de cada estación junto a su línea de luz (legible al mirar hacia la mesa, como desde el punto de aparición). */
function SenalesSuelo() {
  const s: [number, string, string][] = [[ANG.taller, 'TALLER', '#5dffa8'], [ANG.terminal, 'TERMINAL', '#ffd23d'], [ANG.hangar, 'HANGAR', '#e05dff'], [ANG.vera, 'V.E.R.A.', '#3fe0ff'], [ANG.holo, 'HOLOCUBIERTA', '#ff8a3d']]
  return (
    <group>
      {s.map(([a, t, c]) => (
        <group key={t} position={[Math.cos(a) * 6.6, 0.015, Math.sin(a) * 6.6]} rotation={[0, haciaDentro(a), 0]}>
          <Text font={orbitronUrl} fontSize={0.26} letterSpacing={0.25} rotation={[-Math.PI / 2, 0, Math.PI]} position={[-0.32, 0, 0]} anchorX="center" anchorY="middle" material={glow(c, 1.6, 0.85)}>{t}</Text>
        </group>
      ))}
    </group>
  )
}

/** Marcador de zona interactiva: rombo flotante y anillo en el suelo. */
function Marcador({ z, near }: { z: Zona; near: boolean }) {
  const ref = useRef<THREE.Group>(null!)
  useFrame((s) => { const t = s.clock.elapsedTime; ref.current.rotation.y = t; ref.current.position.y = (z.id === 'mapa' ? 4.1 : 3.3) + (near ? 0.35 : 0) + Math.sin(t * 2) * 0.1 })
  return (
    <group position={[z.x, 0, z.z]}>
      {z.id !== 'mapa' && <group ref={ref}><mesh material={glow(z.color, near ? 3 : 2)}><octahedronGeometry args={[near ? 0.26 : 0.18, 0]} /></mesh></group>}
      {z.id === 'mapa' && <group ref={ref} />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]} material={glow(z.color, near ? 2.4 : 1.4, near ? 0.75 : 0.22)}>
        <ringGeometry args={[z.r - 0.07, z.r, 96]} />
      </mesh>
    </group>
  )
}

export function Decoracion({ mats, sombras, baja, zonas, nearZone }: { mats: MatsSala; sombras: boolean; baja: boolean; zonas: Zona[]; nearZone: string | null }) {
  const pNE = enPared(ANG.ne, 0, 3.4, 1.4), pNW = enPared(ANG.nw, 0, 3.4, 1.4)
  return (
    <group>
      <Jardineras sombras={sombras} />
      <Bancos sombras={sombras} />
      <Cajas mats={mats} sombras={sombras} />
      <PanelHolo p={pNE} ry={haciaDentro(ANG.ne)} color="#3fe0ff" titulo="MEDITERRÁNEO · 24 °C · VIENTO 12 KM/H" seed={21} />
      <PanelHolo p={pNW} ry={haciaDentro(ANG.nw)} color="#3fe0ff" titulo="RED ADM · 12 BASES EN LÍNEA" seed={34} />
      <PanelHolo p={[3.4, 4.3, -2.2]} ry={-0.6} w={1.7} h={0.95} color="#3fe0ff" titulo="ÓRBITA · SATÉLITES" seed={45} />
      <PanelHolo p={[-3.4, 4.3, -2.2]} ry={0.6} w={1.7} h={0.95} color="#ff8a3d" titulo="TORMENTA · PREVISIÓN" seed={52} />
      <SenalesSuelo />
      {zonas.map((z) => <Marcador key={z.id} z={z} near={nearZone === z.id} />)}
      {/* polvo en suspensión (y en el haz del ventanal) */}
      <Sparkles count={baja ? 30 : 90} scale={[28, 6, 28]} position={[0, 3.2, 0]} size={1.6} color="#d9f6ff" speed={0.18} opacity={0.45} />
      {!baja && <Sparkles count={50} scale={[11, 5, 12]} position={[0, 2.8, -9]} size={2.2} color="#ffd9b0" speed={0.12} opacity={0.6} />}
    </group>
  )
}

/** Colisiones de la decoración. */
export function collidersDecor(): Collider[] {
  const out: Collider[] = MACETAS.map((m) => ({ x: m.x, z: m.z, r: 0.75 * m.s + 0.25 }))
  BANCOS.forEach(({ a, u, d }) => {
    for (const k of [-1, 0, 1]) { const [x, , z] = enPared(a, u + k * 1.0, 0, d); out.push({ x, z, r: 0.6 }) }
  })
  return out
}

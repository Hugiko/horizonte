import { Line, OrbitControls, Text } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'

interface Props {
  puntos?: { p: number[]; label?: string; color?: string }[]
  rectas?: { punto: number[]; dir: number[]; color?: string; label?: string }[]
  planos?: { n: number[]; d: number; color?: string; label?: string }[] // n·x + d = 0
  segmentos?: { a: number[]; b: number[]; color?: string }[]
  escala?: number
}

// Coordenadas matemáticas (x, y, z) con z hacia arriba → Three (x, z, -y)
const T = (v: number[]) => new THREE.Vector3(v[0], v[2], -v[1])

function Plano({ n, d, color = '#3fe0ff', size }: { n: number[]; d: number; color?: string; size: number }) {
  const { pos, quat } = useMemo(() => {
    const nn = new THREE.Vector3(...n)
    const len = nn.length()
    const p0 = nn.clone().multiplyScalar(-d / (len * len))
    const normal = T([n[0], n[1], n[2]]).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    return { pos: T([p0.x, p0.y, p0.z]), quat: q }
  }, [n, d])
  return (
    <group position={pos} quaternion={quat}>
      <mesh><planeGeometry args={[size * 2, size * 2]} /><meshBasicMaterial color={color} transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <gridHelper args={[size * 2, 10, color, color]} rotation={[Math.PI / 2, 0, 0]} material-transparent material-opacity={0.25} />
    </group>
  )
}

/** Visor 3D de puntos, rectas y planos (geometría del espacio). Arrastra para girar. */
export function Geo3D({ puntos = [], rectas = [], planos = [], segmentos = [], escala = 6 }: Props) {
  const ejes: [number[], string, string][] = [[[1, 0, 0], '#ff6b6b', 'X'], [[0, 1, 0], '#5dffa8', 'Y'], [[0, 0, 1], '#4aa8ff', 'Z']]
  return (
    <div className="widget-canvas geo3d">
      <Canvas camera={{ position: [escala * 1.6, escala * 1.2, escala * 1.6], fov: 45 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#050b14']} />
        <ambientLight intensity={0.8} />
        {ejes.map(([v, c, l]) => (
          <group key={l}>
            <Line points={[T(v.map((x) => -x * escala)), T(v.map((x) => x * escala))]} color={c} lineWidth={1.5} />
            <Text position={T(v.map((x) => x * (escala + 0.6)))} fontSize={0.45} color={c}>{l}</Text>
          </group>
        ))}
        {planos.map((pl, i) => <Plano key={i} n={pl.n} d={pl.d} color={pl.color ?? ['#3fe0ff', '#ff8a3d', '#c08bff'][i % 3]} size={escala} />)}
        {rectas.map((r, i) => {
          const dir = new THREE.Vector3(...r.dir).normalize().multiplyScalar(escala * 2.5)
          const a = [r.punto[0] - dir.x, r.punto[1] - dir.y, r.punto[2] - dir.z]
          const b = [r.punto[0] + dir.x, r.punto[1] + dir.y, r.punto[2] + dir.z]
          return <Line key={i} points={[T(a), T(b)]} color={r.color ?? ['#ffd23d', '#ff5a5a', '#5dffa8'][i % 3]} lineWidth={2.5} />
        })}
        {segmentos.map((s, i) => <Line key={i} points={[T(s.a), T(s.b)]} color={s.color ?? '#ffffff'} lineWidth={2} dashed dashSize={0.2} gapSize={0.15} />)}
        {puntos.map((p, i) => (
          <group key={i} position={T(p.p)}>
            <mesh><sphereGeometry args={[0.14, 16, 16]} /><meshBasicMaterial color={p.color ?? '#f4f1ea'} /></mesh>
            {p.label && <Text position={[0.35, 0.35, 0]} fontSize={0.4} color={p.color ?? '#f4f1ea'}>{p.label}</Text>}
          </group>
        ))}
        <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.6} />
      </Canvas>
    </div>
  )
}

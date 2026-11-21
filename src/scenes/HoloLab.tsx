import { Float, Grid, Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGame } from '../state/store'

/** Holograma temático según el capítulo (campos, ondas, átomos…). */
function Holo({ cap, color }: { cap: number; color: string }) {
  const g = useRef<THREE.Group>(null!)
  useFrame((_, dt) => { g.current.rotation.y += dt * 0.25 })
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.55, toneMapped: false }), [color])
  const wave = useMemo(() => {
    const geo = new THREE.PlaneGeometry(6, 6, 48, 48)
    return geo
  }, [])
  const waveRef = useRef<THREE.Mesh>(null!)
  useFrame((s) => {
    if (!waveRef.current) return
    const pos = (waveRef.current.geometry as THREE.PlaneGeometry).attributes.position as THREE.BufferAttribute
    const t = s.clock.elapsedTime
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i)
      const r = Math.hypot(x, y)
      pos.setZ(i, 0.25 * Math.sin(r * 3 - t * 2.5) / (1 + r * 0.4))
    }
    pos.needsUpdate = true
  })
  let content: React.ReactNode
  if (cap <= 2) content = <><mesh material={mat}><sphereGeometry args={[1.2, 24, 16]} /></mesh>{[1.8, 2.4, 3].map((r, i) => <mesh key={r} rotation={[Math.PI / 2 + i * 0.3, i * 0.5, 0]} material={mat}><torusGeometry args={[r, 0.01, 6, 96]} /></mesh>)}</>
  else if (cap <= 5) content = <>{Array.from({ length: 10 }, (_, i) => <mesh key={i} rotation={[0, (i / 10) * Math.PI, 0]} material={mat}><torusGeometry args={[1.6, 0.008, 6, 64, Math.PI * 2]} /></mesh>)}<mesh material={mat} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.15, 0.15, 4, 12, 1, true]} /></mesh></>
  else if (cap <= 7) content = <mesh ref={waveRef} geometry={wave} material={mat} rotation={[-Math.PI / 2.6, 0, 0]} />
  else content = <><mesh material={mat}><icosahedronGeometry args={[0.5, 1]} /></mesh>{[0, 1, 2].map((i) => <mesh key={i} rotation={[i * 1.05, i * 0.7, 0]} material={mat}><torusGeometry args={[1.8, 0.01, 6, 96]} /></mesh>)}</>
  return <Float speed={1.2} floatIntensity={0.6}><group ref={g} position={[2.6, 1.8, -3]}>{content}</group></Float>
}

export function HoloLab({ cap = 1, color = '#3fe0ff', alerta = false }: { cap?: number; color?: string; alerta?: boolean }) {
  const quality = useGame((s) => s.calidad)
  const cam = useRef(0)
  useFrame(({ camera }, dt) => {
    cam.current += dt
    camera.position.set(Math.sin(cam.current * 0.05) * 1.5, 2.2, 7.5)
    camera.lookAt(0.8, 1.2, -2)
  })
  const c = alerta ? '#ff5a3d' : color
  return (
    <>
      <color attach="background" args={['#03060c']} />
      <fog attach="fog" args={['#03060c', 8, 30]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[2.6, 2, -2]} color={c} intensity={12} distance={14} />
      <Grid position={[0, 0, 0]} args={[40, 40]} cellSize={0.5} cellThickness={0.6} cellColor="#0e3a4a" sectionSize={2.5} sectionThickness={1.1} sectionColor={c} fadeDistance={28} fadeStrength={1.5} infiniteGrid />
      <Holo cap={cap} color={c} />
      <Sparkles count={quality === 'baja' ? 40 : 120} scale={[16, 6, 12]} position={[0, 3, -3]} size={2} color={c} speed={0.3} opacity={0.6} />
      {[-6, 6].map((x) => <mesh key={x} position={[x, 3, -6]}><boxGeometry args={[0.1, 6, 0.1]} /><meshBasicMaterial color={c} toneMapped={false} /></mesh>)}
      {quality !== 'baja' && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.6} luminanceSmoothing={0.3} />
          <Vignette offset={0.25} darkness={0.8} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </>
  )
}

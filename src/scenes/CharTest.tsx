import { useAnimations, useGLTF } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { retargetClips } from './retarget'

const M = `${import.meta.env.BASE_URL}assets/models/`

function One({ file, animFile, anim, x }: { file: string; animFile: string; anim: string; x: number }) {
  const { scene } = useGLTF(M + file)
  const src = useGLTF(M + animFile)
  const animations = src.animations
  const model = useMemo(() => cloneSkinned(scene), [scene])
  const clips = useMemo(() => retargetClips(animations, src.scene, scene), [animations, src.scene, scene])
  const g = useRef<THREE.Group>(null!)
  const { actions } = useAnimations(clips, g)
  useEffect(() => { const a = actions[anim] ?? Object.values(actions)[0]; a?.play(); if (a) a.time = 0.4 }, [actions, anim])
  const box = useMemo(() => { model.updateMatrixWorld(true); return new THREE.Box3().setFromObject(model, true) }, [model])
  const s = 1.75 / (box.max.y - box.min.y)
  return <group ref={g} position={[x, -box.min.y * s, 0]} scale={s}><primitive object={model} /></group>
}

/** Banco de pruebas de personajes (solo desarrollo): /#char-test */
export function CharTest() {
  return (
    <Canvas camera={{ position: [0, 1.4, 7], fov: 45 }} style={{ position: 'fixed', inset: 0, background: '#567' }}>
      <ambientLight intensity={1} /><directionalLight position={[3, 5, 4]} intensity={2} />
      <gridHelper args={[20, 20]} />
      <One file="Soldier.glb" animFile="Soldier.glb" anim="Walk" x={-3} />
      <One file="Michelle.glb" animFile="Soldier.glb" anim="Walk" x={-1} />
      <One file="Michelle.glb" animFile="Soldier.glb" anim="Idle" x={1} />
      <One file="Michelle.glb" animFile="Soldier.glb" anim="Run" x={3} />
    </Canvas>
  )
}

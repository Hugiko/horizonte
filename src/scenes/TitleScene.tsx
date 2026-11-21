import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGame } from '../state/store'

const A = `${import.meta.env.BASE_URL}assets/textures/planets/`
const SUN_DIR = new THREE.Vector3(1, 0.25, 0.35).normalize()

const earthVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`
const earthFragment = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D specMap;
  uniform vec3 sunDir;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vPosW);
    float ndl = dot(n, sunDir);
    float dayMix = smoothstep(-0.12, 0.22, ndl);
    vec3 day = texture2D(dayMap, vUv).rgb * max(ndl, 0.0) * 1.6;
    vec3 night = texture2D(nightMap, vUv).rgb * vec3(1.0, 0.75, 0.45) * 1.8;
    vec3 col = mix(night, day, dayMix);
    // brillo especular solo en los océanos
    float ocean = texture2D(specMap, vUv).r;
    float spec = pow(max(dot(reflect(-sunDir, n), v), 0.0), 40.0) * ocean * 1.4;
    col += vec3(1.0, 0.92, 0.8) * spec * dayMix;
    // dispersión atmosférica en el borde (Rayleigh aproximado)
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    col += vec3(0.25, 0.55, 1.0) * fres * smoothstep(-0.3, 0.6, ndl) * 1.2;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
const atmoVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`
const atmoFragment = /* glsl */ `
  uniform vec3 sunDir;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vPosW);
    // cara trasera: 0 en el borde exterior de la capa, máximo junto al limbo terrestre
    float rim = pow(clamp(-dot(n, v) * 3.2, 0.0, 1.0), 2.2);
    float lit = smoothstep(-0.4, 0.5, dot(n, sunDir));
    vec3 col = mix(vec3(0.3, 0.6, 1.0), vec3(1.0, 0.6, 0.35), pow(1.0 - lit, 4.0) * lit * 3.0);
    gl_FragColor = vec4(col * rim * lit * 2.2, rim * lit);
  }
`

function Earth() {
  const [day, night, spec, clouds] = useTexture([
    `${A}8k_earth_daymap.jpg`, `${A}2k_earth_nightmap.jpg`, `${A}2k_earth_specular_map.png`, `${A}2k_earth_clouds.jpg`,
  ])
  ;[day, night].forEach((t) => (t.colorSpace = THREE.SRGBColorSpace))
  ;[day, night, clouds].forEach((t) => (t.anisotropy = 8))

  const earthMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { dayMap: { value: day }, nightMap: { value: night }, specMap: { value: spec }, sunDir: { value: SUN_DIR } },
    vertexShader: earthVertex, fragmentShader: earthFragment,
  }), [day, night, spec])
  const atmoMat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: SUN_DIR } }, vertexShader: atmoVertex, fragmentShader: atmoFragment,
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }), [])

  const earth = useRef<THREE.Mesh>(null!)
  const cloudRef = useRef<THREE.Mesh>(null!)
  useFrame((_, dt) => {
    earth.current.rotation.y += dt * 0.012
    cloudRef.current.rotation.y += dt * 0.016
  })

  return (
    <group position={[2.2, -0.4, 0]} rotation={[0.25, 0, -0.41]}>
      <mesh ref={earth} material={earthMat}><sphereGeometry args={[2, 128, 128]} /></mesh>
      <mesh ref={cloudRef} scale={1.012}>
        <sphereGeometry args={[2, 96, 96]} />
        <meshStandardMaterial color="white" alphaMap={clouds} transparent depthWrite={false} roughness={1} />
      </mesh>
      <mesh scale={1.06} material={atmoMat}><sphereGeometry args={[2, 64, 64]} /></mesh>
    </group>
  )
}

function Moon() {
  const map = useTexture(`${A}2k_moon.jpg`)
  map.colorSpace = THREE.SRGBColorSpace
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((_, dt) => (ref.current.rotation.y += dt * 0.01))
  return (
    <mesh ref={ref} position={[-9, 3.2, -22]}>
      <sphereGeometry args={[0.55, 64, 64]} />
      <meshStandardMaterial map={map} roughness={1} />
    </mesh>
  )
}

function Stars() {
  const quality = useGame((s) => s.calidad)
  const map = useTexture(`${A}${quality === 'baja' ? '2k' : '8k'}_stars_milky_way.jpg`)
  map.colorSpace = THREE.SRGBColorSpace
  return (
    <mesh rotation={[0.6, 0, 0.3]}>
      <sphereGeometry args={[300, 64, 64]} />
      <meshBasicMaterial map={map} side={THREE.BackSide} color="#9aa4b8" toneMapped={false} />
    </mesh>
  )
}

/** Satélite dañado procedural (provisional hasta tener modelos definitivos). */
function Debris({ position, speed, seed }: { position: [number, number, number]; speed: number; seed: number }) {
  const ref = useRef<THREE.Group>(null!)
  useFrame((_, dt) => {
    ref.current.rotation.x += dt * speed
    ref.current.rotation.z += dt * speed * 0.7
    ref.current.position.x += dt * 0.02
  })
  return (
    <group ref={ref} position={position} scale={0.08} rotation={[seed, seed * 2, 0]}>
      <mesh><cylinderGeometry args={[0.5, 0.5, 1.2, 12]} /><meshStandardMaterial color="#d4a73a" metalness={1} roughness={0.35} /></mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.4, 0, 0]} rotation={[0, 0, seed * s * 0.3]}>
          <boxGeometry args={[1.8, 0.04, 0.8]} />
          <meshStandardMaterial color="#1b3a6b" metalness={0.8} roughness={0.2} emissive="#0a2a55" emissiveIntensity={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.85, 0]}><sphereGeometry args={[0.12, 8, 8]} /><meshBasicMaterial color="#ff8a3d" toneMapped={false} /></mesh>
    </group>
  )
}

function CameraDrift() {
  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime
    camera.position.set(Math.sin(t * 0.03) * 0.6, 0.3 + Math.sin(t * 0.05) * 0.15, 7.5)
    camera.lookAt(1.2, 0, 0)
  })
  return null
}

export function TitleScene() {
  const quality = useGame((s) => s.calidad)
  return (
    <>
      <color attach="background" args={['#020308']} />
      <directionalLight position={SUN_DIR.clone().multiplyScalar(50)} intensity={3.2} color="#fff4e6" />
      <ambientLight intensity={0.03} />
      <Stars />
      <Earth />
      <Moon />
      <Debris position={[0.2, 1.6, 2.4]} speed={0.3} seed={1} />
      <Debris position={[-1.2, -0.9, 3]} speed={0.5} seed={2} />
      <Debris position={[1.0, 2.4, 1.2]} speed={0.2} seed={3} />
      <CameraDrift />
      {quality !== 'baja' && (
        <EffectComposer multisampling={quality === 'alta' ? 8 : 0}>
          <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.85} luminanceSmoothing={0.2} />
          <ChromaticAberration offset={[0.0004, 0.0004]} radialModulation={false} modulationOffset={0} />
          <Vignette offset={0.25} darkness={0.75} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </>
  )
}

import { useMemo } from 'react'
import * as THREE from 'three'
import { ANG, AP, DOME_H, Inst, MAT, OCULUS, R, SIDE, WALL_H, enPared, glow, haciaDentro, mat, matPared, texDegradado } from './util'

export interface MatsSala { suelo: THREE.Material; yeso: THREE.Material; metal: THREE.Material }

// ancho y altura del ventanal panorámico (pared norte)
export const VENT_W = 12
export const VENT_Y0 = 0.55, VENT_Y1 = 6.0
const PAREDES = Object.values(ANG)
const VERTICES = Array.from({ length: 8 }, (_, k) => Math.PI / 8 + (k * Math.PI) / 4)

/** Perfil de la bóveda: de la cornisa (r≈R) al óculo, con curvatura suave. */
function perfilBoveda(t: number, off = 0): [number, number] {
  const r = OCULUS + (R + 0.2 - OCULUS - off) * Math.cos(t)
  const y = WALL_H + (DOME_H - off) * Math.sin(t)
  return [r, y]
}

const geo = {
  caja: new THREE.BoxGeometry(1, 1, 1),
  cil: new THREE.CylinderGeometry(1, 1, 1, 24),
  plano: new THREE.PlaneGeometry(1, 1),
}

/** Suelo pulido con anillos y líneas luminosas que guían a cada estación. */
function Suelo({ mats }: { mats: MatsSala }) {
  const lineas = useMemo(() => {
    const col: Record<string, string> = { ventana: '#ffd2a0', ne: '#3fe0ff', taller: '#5dffa8', terminal: '#ffd23d', hangar: '#e05dff', vera: '#3fe0ff', holo: '#ff8a3d', nw: '#3fe0ff' }
    const m: THREE.Matrix4[] = [], c: string[] = []
    Object.entries(ANG).forEach(([k, a]) => {
      // línea radial desde el anillo central hasta la estación (r 5,4 → 11,6)
      const mid = 8.5
      m.push(mat([Math.cos(a) * mid, 0.012, Math.sin(a) * mid], [-Math.PI / 2, 0, -a], [6.2, 0.05, 1]))
      c.push(col[k])
      // dos líneas paralelas más tenues
      for (const s of [-1, 1]) {
        const ox = -Math.sin(a) * 0.32 * s, oz = Math.cos(a) * 0.32 * s
        m.push(mat([Math.cos(a) * (mid + 0.6) + ox, 0.011, Math.sin(a) * (mid + 0.6) + oz], [-Math.PI / 2, 0, -a], [5, 0.018, 1]))
        c.push(col[k])
      }
    })
    return { m, c }
  }, [])
  const lineaMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(1.6), toneMapped: false }), [])
  return (
    <group>
      {/* losa octogonal (vértices alineados con los pilares) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mats.suelo} receiveShadow>
        <circleGeometry args={[R + 0.6, 8, Math.PI / 8]} />
      </mesh>
      {/* disco de piedra oscura pulida bajo la mesa */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
        <circleGeometry args={[5.2, 64]} />
        <meshStandardMaterial color="#1a2129" roughness={0.18} metalness={0.4} envMapIntensity={1.2} />
      </mesh>
      {/* anillos luminosos */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} material={glow('#3fe0ff', 2.4)}><ringGeometry args={[5.2, 5.28, 128]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} material={glow('#3fe0ff', 1.2, 0.5)}><ringGeometry args={[5.45, 5.48, 128]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} material={glow('#3fe0ff', 1.4, 0.7)}><ringGeometry args={[2.9, 2.94, 96]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0]} material={glow('#bdefff', 1.1, 0.55)}><ringGeometry args={[11.6, 11.64, 160]} /></mesh>
      <Inst m={lineas.m} colors={lineas.c} geometry={geo.plano} material={lineaMat} />
    </group>
  )
}

/** Paredes, zócalo oscuro con tiras de luz, pilares orgánicos y bandejas de cables. */
function Paredes({ mats, sombras }: { mats: MatsSala; sombras: boolean }) {
  const d = useMemo(() => {
    const llenas = PAREDES.filter((a) => a !== ANG.ventana)
    const muros = llenas.map((a) => matPared(a, [0, WALL_H / 2, -0.3], [0, 0, 0], [SIDE + 0.3, WALL_H, 0.6]))
    const zocalo = llenas.map((a) => matPared(a, [0, 0.5, 0.04], [0, 0, 0], [SIDE - 0.9, 1, 0.08]))
    const tiras = llenas.flatMap((a) => [
      matPared(a, [0, 1.02, 0.09], [0, 0, 0], [SIDE - 0.9, 0.035, 0.02]),
      matPared(a, [0, 0.07, 0.09], [0, 0, 0], [SIDE - 0.9, 0.025, 0.02]),
    ])
    // paneles verticales en relieve sobre el zócalo (ritmo de fachada)
    const paneles: THREE.Matrix4[] = []
    llenas.forEach((a) => { for (const u of [-5.1, 5.1]) paneles.push(matPared(a, [u, 3.4, 0.06], [0, 0, 0], [1.9, 4.2, 0.12])) })
    const panelLuz: THREE.Matrix4[] = []
    llenas.forEach((a) => { for (const u of [-5.1, 5.1]) for (const s of [-1, 1]) panelLuz.push(matPared(a, [u + s * 0.97, 3.4, 0.08], [0, 0, 0], [0.03, 4.2, 0.03])) })
    // bandejas de cables a 5,6 m
    const bandejas = llenas.map((a) => matPared(a, [0, 5.55, 0.28], [0, 0, 0], [SIDE - 1.4, 0.1, 0.42]))
    const cables = llenas.flatMap((a) => [-0.1, 0, 0.1].map((z, i) => matPared(a, [0, 5.66, 0.28 + z], [0, 0, Math.PI / 2], [0.035 + i * 0.008, SIDE - 1.5, 0.035 + i * 0.008])))
    const soportes = llenas.flatMap((a) => [-5, -2.5, 0, 2.5, 5].map((u) => matPared(a, [u, 5.75, 0.2], [0, 0, 0], [0.05, 0.45, 0.05])))
    // pilares en los vértices
    const pilares = VERTICES.map((va) => mat([Math.cos(va) * (R - 0.75), 0, Math.sin(va) * (R - 0.75)]))
    const pilarLuz = VERTICES.map((va) => mat([Math.cos(va) * (R - 1.27), 2.6, Math.sin(va) * (R - 1.27)], [0, -va, 0], [0.04, 3.2, 0.04]))
    return { muros, zocalo, tiras, paneles, panelLuz, bandejas, cables, soportes, pilares, pilarLuz }
  }, [])
  const pilarGeo = useMemo(() => {
    // fuste que se ensancha en la base y abre en la copa hacia las costillas
    const pts = [[0.62, 0], [0.5, 0.25], [0.42, 1.5], [0.4, 3.2], [0.46, 4.8], [0.66, 5.9], [0.95, WALL_H]].map(([r, y]) => new THREE.Vector2(r, y))
    return new THREE.LatheGeometry(pts, 24)
  }, [])
  return (
    <group>
      <Inst m={d.muros} geometry={geo.caja} material={mats.yeso} castShadow={sombras} receiveShadow />
      <Inst m={d.zocalo} geometry={geo.caja} material={MAT.grafito} receiveShadow />
      <Inst m={d.tiras} geometry={geo.caja} material={glow('#3fe0ff', 2.6)} />
      <Inst m={d.paneles} geometry={geo.caja} material={MAT.blancoMate} receiveShadow />
      <Inst m={d.panelLuz} geometry={geo.caja} material={glow('#9fefff', 1.8)} />
      <Inst m={d.bandejas} geometry={geo.caja} material={mats.metal} />
      <Inst m={d.cables} geometry={geo.cil} material={MAT.grafitoMate} />
      <Inst m={d.soportes} geometry={geo.caja} material={MAT.grafito} />
      <Inst m={d.pilares} geometry={pilarGeo} material={MAT.blanco} castShadow={sombras} receiveShadow />
      <Inst m={d.pilarLuz} geometry={geo.caja} material={glow('#3fe0ff', 2.2)} />
    </group>
  )
}

/** Ventanal panorámico al Mediterráneo (pared norte), con montantes orgánicos. */
function Ventanal({ mats, sombras, envMar }: { mats: MatsSala; sombras: boolean; envMar: THREE.Texture | null }) {
  const a = ANG.ventana
  const lado = (SIDE - VENT_W) / 2
  const montantes = useMemo(() => {
    const m: THREE.Matrix4[] = []
    for (let i = 0; i <= 6; i++) m.push(mat([-VENT_W / 2 + i * (VENT_W / 6), (VENT_Y0 + VENT_Y1) / 2, 0], [0, 0, 0], [0.14, VENT_Y1 - VENT_Y0, 0.45]))
    m.push(mat([0, 4.7, 0], [0, 0, 0], [VENT_W, 0.08, 0.3]))
    return m
  }, [])
  const vidrio = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cfeaff', transparent: true, opacity: 0.07, roughness: 0.04, metalness: 1, envMap: envMar, envMapIntensity: 1.4, depthWrite: false }), [envMar])
  const arcos = useMemo(() => {
    // pequeños arcos parabólicos en la parte alta de cada vano (detalle orgánico)
    const pts = Array.from({ length: 21 }, (_, i) => { const t = i / 20; const x = (t - 0.5) * (VENT_W / 6); return new THREE.Vector3(x, -1.2 * (2 * (t - 0.5)) ** 2, 0) })
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.05, 6)
  }, [])
  const arcosM = useMemo(() => Array.from({ length: 6 }, (_, i) => mat([-VENT_W / 2 + (i + 0.5) * (VENT_W / 6), VENT_Y1 - 0.02, 0.05])), [])
  return (
    <group position={enPared(a, 0, 0, 0)} rotation={[0, haciaDentro(a), 0]}>
      {/* antepecho, dintel y machones laterales */}
      <mesh position={[0, VENT_Y0 / 2, -0.3]} scale={[SIDE + 0.3, VENT_Y0, 0.6]} geometry={geo.caja} material={mats.yeso} castShadow={sombras} receiveShadow />
      <mesh position={[0, (WALL_H + VENT_Y1) / 2, -0.3]} scale={[SIDE + 0.3, WALL_H - VENT_Y1, 0.6]} geometry={geo.caja} material={mats.yeso} castShadow={sombras} receiveShadow />
      {[-1, 1].map((s) => <mesh key={s} position={[s * (VENT_W / 2 + lado / 2 + 0.08), (VENT_Y0 + VENT_Y1) / 2, -0.3]} scale={[lado + 0.3, VENT_Y1 - VENT_Y0, 0.6]} geometry={geo.caja} material={mats.yeso} castShadow={sombras} receiveShadow />)}
      <Inst m={montantes} geometry={geo.caja} material={MAT.blanco} castShadow={sombras} />
      <Inst m={arcosM} geometry={arcos} material={MAT.blanco} castShadow={sombras} />
      {/* repisa interior con tira cálida */}
      <mesh position={[0, VENT_Y0 + 0.03, 0.25]} scale={[VENT_W + 0.4, 0.06, 0.6]} geometry={geo.caja} material={MAT.blanco} receiveShadow />
      <mesh position={[0, VENT_Y0 - 0.05, 0.55]} scale={[VENT_W + 0.2, 0.03, 0.02]} geometry={geo.caja} material={glow('#ffc890', 2.2)} />
      <mesh position={[0, (VENT_Y0 + VENT_Y1) / 2, -0.05]} scale={[VENT_W, VENT_Y1 - VENT_Y0, 1]} geometry={geo.plano} material={vidrio} />
      {/* vidrio de control solar: tiñe y oscurece el exterior para que el atardecer no se queme */}
      <mesh position={[0, (VENT_Y0 + VENT_Y1) / 2, -0.07]} scale={[VENT_W, VENT_Y1 - VENT_Y0, 1]} geometry={geo.plano}><meshBasicMaterial color="#2a1c24" transparent opacity={0.3} depthWrite={false} /></mesh>
    </group>
  )
}

/** Bóveda blanca nervada con costillas que convergen en un óculo de luz cálida. */
function Boveda({ mats, sombras }: { mats: MatsSala; sombras: boolean }) {
  const domo = useMemo(() => {
    const pts = Array.from({ length: 28 }, (_, i) => { const [r, y] = perfilBoveda((i / 27) * (Math.PI / 2)); return new THREE.Vector2(r, y) })
    return new THREE.LatheGeometry(pts, 64)
  }, [])
  const yesoDoble = useMemo(() => { const m = (mats.yeso as THREE.MeshStandardMaterial).clone(); m.side = THREE.DoubleSide; return m }, [mats.yeso])
  const costilla = useMemo(() => {
    const pts = Array.from({ length: 30 }, (_, i) => { const [r, y] = perfilBoveda((i / 29) * (Math.PI / 2), 0.22); return new THREE.Vector3(r, y, 0) })
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.2, 10)
  }, [])
  const costillaFina = useMemo(() => {
    const pts = Array.from({ length: 30 }, (_, i) => { const [r, y] = perfilBoveda(0.12 + (i / 29) * (Math.PI / 2 - 0.12), 0.16); return new THREE.Vector3(r, y, 0) })
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.09, 8)
  }, [])
  const mPrin = useMemo(() => VERTICES.map((va) => mat([0, 0, 0], [0, -va, 0])), [])
  const mSec = useMemo(() => Array.from({ length: 8 }, (_, k) => mat([0, 0, 0], [0, -(k * Math.PI) / 4, 0])), [])
  // anillo intermedio de la bóveda (r = 10 m)
  const tMid = Math.acos((10 - OCULUS) / (R + 0.2 - OCULUS - 0.22))
  const yMid = WALL_H + (DOME_H - 0.22) * Math.sin(tMid)
  return (
    <group>
      <mesh geometry={domo} material={yesoDoble} castShadow={sombras} receiveShadow />
      <Inst m={mPrin} geometry={costilla} material={MAT.blanco} castShadow={sombras} />
      <Inst m={mSec} geometry={costillaFina} material={MAT.blanco} />
      {/* cornisa con luz indirecta (anillo cálido) */}
      <mesh position={[0, WALL_H, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.blanco} castShadow={sombras}><ringGeometry args={[15.75, R + 0.8, 96]} /></mesh>
      <mesh position={[0, WALL_H - 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} material={glow('#ffe6c4', 2.4)}><ringGeometry args={[15.72, 15.8, 128]} /></mesh>
      <mesh position={[0, WALL_H - 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.blanco}><torusGeometry args={[15.75, 0.12, 8, 128]} /></mesh>
      {/* anillo intermedio y halo cian */}
      <mesh position={[0, yMid, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.blanco}><torusGeometry args={[10, 0.14, 10, 128]} /></mesh>
      <mesh position={[0, yMid - 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={glow('#3fe0ff', 2.2)}><torusGeometry args={[9.9, 0.025, 6, 160]} /></mesh>
      {/* anillo suspendido sobre la mesa (lámpara anular colgada del óculo) */}
      <mesh position={[0, 7.4, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.blanco}><torusGeometry args={[3.4, 0.11, 10, 96]} /></mesh>
      <mesh position={[0, 7.3, 0]} rotation={[Math.PI / 2, 0, 0]} material={glow('#bff4ff', 2.6)}><torusGeometry args={[3.4, 0.035, 6, 128]} /></mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * Math.PI * 2; const x0 = Math.cos(a) * 3.4, z0 = Math.sin(a) * 3.4, x1 = Math.cos(a) * (OCULUS + 0.2), z1 = Math.sin(a) * (OCULUS + 0.2); const y0 = 7.4, y1 = WALL_H + DOME_H - 0.2; const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0); const mid: [number, number, number] = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]; const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x1 - x0, y1 - y0, z1 - z0).normalize()); return <mesh key={i} position={mid} quaternion={q} scale={[0.012, len, 0.012]} geometry={geo.cil} material={MAT.grafito} /> })}
      {/* óculo */}
      <mesh position={[0, WALL_H + DOME_H, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.blanco}><torusGeometry args={[OCULUS, 0.3, 14, 64]} /></mesh>
      <mesh position={[0, WALL_H + DOME_H + 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} material={glow('#fff1d6', 3.2)}><circleGeometry args={[OCULUS + 0.1, 48]} /></mesh>
      <mesh position={[0, WALL_H + DOME_H - 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} material={glow('#ffd9a0', 2.8)}><torusGeometry args={[OCULUS - 0.32, 0.03, 6, 64]} /></mesh>
    </group>
  )
}

/** Cielo de atardecer con shader propio (degradado controlado + disco solar): más saturado y barato que Sky. */
function CieloAtardecer({ sunDir }: { sunDir: THREE.Vector3 }) {
  const m = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: { uSol: { value: sunDir.clone().normalize() } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 uSol; varying vec3 vDir;
      void main(){
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 horizonte = vec3(0.98, 0.43, 0.17);
        vec3 medio = vec3(0.66, 0.30, 0.40);
        vec3 alto = vec3(0.10, 0.12, 0.30);
        vec3 c = mix(horizonte, medio, smoothstep(0.0, 0.12, h));
        c = mix(c, alto, smoothstep(0.1, 0.55, h));
        float a = max(dot(normalize(vDir), uSol), 0.0);
        c += vec3(1.0, 0.55, 0.22) * pow(a, 10.0) * 0.55;      // halo amplio
        c += vec3(1.0, 0.85, 0.6) * pow(a, 300.0) * 1.6;      // corona
        c += vec3(1.6, 1.3, 0.95) * smoothstep(0.9993, 0.9996, a); // disco
        c = mix(c, horizonte * 0.85, smoothstep(0.0, -0.08, h)); // bajo el horizonte
        gl_FragColor = vec4(c * 0.82, 1.0);
      }`,
  }), [sunDir])
  return <mesh material={m} scale={1200} renderOrder={-10} frustumCulled={false}><sphereGeometry args={[1, 32, 16]} /></mesh>
}

/** Exterior visto por el ventanal: terraza, mar al atardecer y siluetas blancas lejanas. */
function Exterior({ mats, envMar, sunDir }: { mats: MatsSala; envMar: THREE.Texture | null; sunDir: THREE.Vector3 }) {
  const mar = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1b4763', roughness: 0.22, metalness: 0.85, envMap: envMar, envMapIntensity: 0.9 }), [envMar])
  const siluetaMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f6ece6', roughness: 0.6, emissive: '#c89a8a', emissiveIntensity: 0.25 }), [])
  const reflejo = useMemo(() => new THREE.MeshBasicMaterial({ map: texDegradado([[0, 'rgba(255,200,130,0)'], [0.5, 'rgba(255,170,90,0.45)'], [1, 'rgba(255,200,130,0)']], true), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }), [])
  const z0 = -AP
  // costillas del "umbráculo" lejano
  const arcos = useMemo(() => {
    const pts = Array.from({ length: 17 }, (_, i) => { const t = (i / 16) * Math.PI; return new THREE.Vector3(Math.cos(t) * 7, Math.sin(t) * 12, 0) })
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.6, 5)
  }, [])
  const arcosM = useMemo(() => Array.from({ length: 14 }, (_, i) => mat([60 + i * 6, 0, -330], [0, Math.PI / 2, 0])), [])
  const az = Math.atan2(sunDir.x, -sunDir.z)
  return (
    <group>
      <CieloAtardecer sunDir={sunDir} />
      {/* terraza exterior y barandilla de vidrio */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, z0 - 4]} material={mats.yeso} receiveShadow><planeGeometry args={[34, 8]} /></mesh>
      <mesh position={[0, 0.55, z0 - 7.6]} scale={[34, 0.08, 0.16]} geometry={geo.caja} material={MAT.blanco} />
      <mesh position={[0, 0.3, z0 - 7.6]} scale={[34, 0.55, 1]} geometry={geo.plano}><meshStandardMaterial color="#bfe4ff" transparent opacity={0.15} metalness={1} roughness={0.05} /></mesh>
      <mesh position={[0, -2, z0 - 7.9]} scale={[34, 4, 0.6]} geometry={geo.caja} material={MAT.blancoMate} />
      {/* mar */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, -400]} material={mar}><planeGeometry args={[3000, 800]} /></mesh>
      {/* estela de sol sobre el agua */}
      <mesh rotation={[-Math.PI / 2, 0, -az]} position={[sunDir.x / -sunDir.z * 300, -3.9, -300]} material={reflejo}><planeGeometry args={[14, 560]} /></mesh>
      {/* costa lejana con arquitectura blanca orgánica (inspiración, no copia) */}
      <mesh position={[140, -4, -360]} scale={[180, 6, 40]} material={siluetaMat}><sphereGeometry args={[1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <mesh position={[90, 0, -350]} scale={[24, 8, 11]} material={siluetaMat}><sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <mesh position={[90, 0.5, -349]} rotation={[0.25, 0, 0]} scale={[25, 9, 10]} material={siluetaMat}><sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 3]} /></mesh>
      <mesh position={[150, 0, -365]} scale={[16, 30, 22]} material={siluetaMat}><sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <mesh position={[150, 30, -360]} rotation={[0, 0, Math.PI / 2.3]} material={siluetaMat}><torusGeometry args={[18, 1.4, 8, 32, Math.PI * 0.8]} /></mesh>
      <Inst m={arcosM} geometry={arcos} material={siluetaMat} />
      <mesh position={[-100, -4, -430]} scale={[120, 5, 30]} material={siluetaMat}><sphereGeometry args={[1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      {/* pilono inclinado de un puente atirantado */}
      <mesh position={[-60, 20, -380]} rotation={[0, 0, -0.35]} scale={[1.6, 52, 1.6]} geometry={geo.cil} material={siluetaMat} />
      {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} position={[-48 + i * 4, 10 + i * 2.5, -380]} rotation={[0, 0, 0.9 - i * 0.08]} scale={[0.15, 26, 0.15]} geometry={geo.cil} material={siluetaMat} />)}
    </group>
  )
}

/** Haz de luz que entra por el ventanal (prisma aditivo con alfa por vértice: barato y sin postproceso). */
function HazDeLuz({ luzDir }: { luzDir: THREE.Vector3 }) {
  const geo = useMemo(() => {
    const d = luzDir.clone().multiplyScalar(-1) // sentido de propagación de la luz
    const L = 20, z = -AP + 0.1
    const x0 = -VENT_W / 2, x1 = VENT_W / 2, y0 = VENT_Y0 + 0.2, y1 = VENT_Y1 - 0.1
    const cerca = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => new THREE.Vector3(x, y, z))
    const lejos = cerca.map((v) => v.clone().addScaledVector(d, L))
    const pos: number[] = [], col: number[] = []
    const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, e: THREE.Vector3, aa: number, ab: number) => {
      // a,b cerca (alfa aa) · c,e lejos (alfa ab)
      for (const [v, al] of [[a, aa], [b, aa], [c, ab], [a, aa], [c, ab], [e, ab]] as [THREE.Vector3, number][]) { pos.push(v.x, v.y, v.z); col.push(1, 0.78, 0.55, al) }
    }
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(cerca[i], cerca[j], lejos[j], lejos[i], 0.045, 0) }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4))
    return g
  }, [luzDir])
  const m = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }), [])
  return <mesh geometry={geo} material={m} renderOrder={5} />
}

export function Sala({ mats, sombras, envMar, sunDir, luzDir }: { mats: MatsSala; sombras: boolean; envMar: THREE.Texture | null; sunDir: THREE.Vector3; luzDir: THREE.Vector3 }) {
  return (
    <group>
      <Suelo mats={mats} />
      <Paredes mats={mats} sombras={sombras} />
      <Ventanal mats={mats} sombras={sombras} envMar={envMar} />
      <Boveda mats={mats} sombras={sombras} />
      <Exterior mats={mats} envMar={envMar} sunDir={sunDir} />
      <HazDeLuz luzDir={luzDir} />
    </group>
  )
}

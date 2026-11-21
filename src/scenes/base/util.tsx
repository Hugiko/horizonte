import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

/* ───────────── Geometría general de la sala octogonal ───────────── */
export const R = 18 // radio hasta los vértices del octógono
export const AP = R * Math.cos(Math.PI / 8) // apotema (distancia centro-pared) ≈ 16,63 m
export const SIDE = 2 * R * Math.sin(Math.PI / 8) // longitud de cada pared ≈ 13,78 m
export const WALL_H = 6.5 // altura de las paredes hasta la cornisa
export const DOME_H = 4.2 // subida de la bóveda sobre la cornisa
export const OCULUS = 2.2 // radio del óculo central

/** Ángulo (en el plano XZ: x = cos a, z = sin a) de cada pared. */
export const ANG = {
  ventana: -Math.PI / 2,
  ne: -Math.PI / 4,
  taller: 0,
  terminal: Math.PI / 4,
  hangar: Math.PI / 2,
  vera: (3 * Math.PI) / 4,
  holo: Math.PI,
  nw: (-3 * Math.PI) / 4,
}

/** Punto en el sistema local de una pared: u = lateral, y = altura, d = distancia hacia el centro. */
export function enPared(a: number, u: number, y: number, d: number): [number, number, number] {
  const c = Math.cos(a), s = Math.sin(a), k = AP - d
  return [c * k - s * u, y, s * k + c * u]
}
/** Giro Y que hace que el +Z local de un grupo apunte hacia el centro de la sala. */
export const haciaDentro = (a: number) => Math.atan2(-Math.cos(a), -Math.sin(a))

const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3()
type V3 = [number, number, number]
/** Matriz a partir de posición, rotación (Euler XYZ u orden dado) y escala. */
export function mat(p: V3, r: V3 = [0, 0, 0], s: number | V3 = 1, order: THREE.EulerOrder = 'XYZ') {
  _e.set(r[0], r[1], r[2], order)
  _q.setFromEuler(_e)
  if (typeof s === 'number') _s.set(s, s, s); else _s.set(s[0], s[1], s[2])
  return new THREE.Matrix4().compose(_v.set(p[0], p[1], p[2]), _q, _s)
}
/** Matriz de un objeto colocado en el sistema local de la pared a. */
export function matPared(a: number, p: V3, r: V3 = [0, 0, 0], s: number | V3 = 1) {
  const base = mat(enPared(a, 0, 0, 0), [0, haciaDentro(a), 0])
  return base.multiply(mat(p, r, s))
}

/** InstancedMesh estático: una sola llamada de dibujo para geometría repetida. */
export function Inst({ m, colors, geometry, material, castShadow = false, receiveShadow = false }: {
  m: THREE.Matrix4[]; colors?: THREE.ColorRepresentation[]; geometry: THREE.BufferGeometry; material: THREE.Material
  castShadow?: boolean; receiveShadow?: boolean
}) {
  const mesh = useMemo(() => {
    const im = new THREE.InstancedMesh(geometry, material, m.length)
    m.forEach((x, i) => im.setMatrixAt(i, x))
    const c = new THREE.Color()
    colors?.forEach((col, i) => im.setColorAt(i, c.set(col)))
    im.instanceMatrix.needsUpdate = true
    im.computeBoundingSphere()
    return im
  }, [m, colors, geometry, material])
  useEffect(() => () => mesh.dispose(), [mesh])
  return <primitive object={mesh} castShadow={castShadow} receiveShadow={receiveShadow} />
}

/* ───────────── Materiales compartidos (sin texturas) ───────────── */
const glowCache = new Map<string, THREE.MeshBasicMaterial>()
/** Material emisivo para el Bloom: color > 1 y sin tone mapping. */
export function glow(hex: string, k = 2.2, opacity = 1, additive = false) {
  const key = `${hex}|${k}|${opacity}|${additive}`
  let m = glowCache.get(key)
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), toneMapped: false, transparent: opacity < 1 || additive, opacity, depthWrite: !(opacity < 1 || additive), blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide })
    glowCache.set(key, m)
  }
  return m
}
export const MAT = {
  /** blanco cerámico liso (pilares, costillas, mobiliario) */
  blanco: new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.32, metalness: 0.02 }),
  blancoMate: new THREE.MeshStandardMaterial({ color: '#ebe8e2', roughness: 0.7 }),
  grafito: new THREE.MeshStandardMaterial({ color: '#232a33', roughness: 0.38, metalness: 0.65 }),
  grafitoMate: new THREE.MeshStandardMaterial({ color: '#2c333c', roughness: 0.75, metalness: 0.3 }),
  cristalOscuro: new THREE.MeshStandardMaterial({ color: '#0a141d', roughness: 0.12, metalness: 0.8 }),
  pantallaApagada: new THREE.MeshStandardMaterial({ color: '#05090e', roughness: 0.2, metalness: 0.5 }),
  tierra: new THREE.MeshStandardMaterial({ color: '#3b2c22', roughness: 1 }),
  hoja: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0, side: THREE.DoubleSide }),
  tronco: new THREE.MeshStandardMaterial({ color: '#7a5f45', roughness: 0.9 }),
  madera: new THREE.MeshStandardMaterial({ color: '#b98a5e', roughness: 0.55 }),
  tela: new THREE.MeshStandardMaterial({ color: '#3a4b5c', roughness: 0.9 }),
}

/* ───────────── Texturas procedurales de pantallas (canvas, se crean una vez) ───────────── */
const texCache = new Map<string, THREE.CanvasTexture>()
function rnd(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 } }

/** Interfaz de datos falsa: rejilla, gráfica, barras y líneas de texto. */
export function texPantalla(color: string, seed = 1, fondo = true, w = 512, h = 288) {
  const key = `p|${color}|${seed}|${fondo}|${w}x${h}`
  const hit = texCache.get(key); if (hit) return hit
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const g = cv.getContext('2d')!
  const r = rnd(seed * 97 + 13)
  if (fondo) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#071a26'); gr.addColorStop(1, '#030a10'); g.fillStyle = gr; g.fillRect(0, 0, w, h) }
  g.strokeStyle = color; g.fillStyle = color
  // rejilla tenue
  g.globalAlpha = 0.12; g.lineWidth = 1
  for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke() }
  for (let y = 0; y < h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
  // cabecera
  g.globalAlpha = 0.9; g.fillRect(16, 14, w * 0.32, 8)
  g.globalAlpha = 0.45; g.fillRect(16 + w * 0.34, 14, w * 0.12, 8); g.fillRect(w - 70, 12, 54, 12)
  // gráfica de línea
  g.globalAlpha = 0.95; g.lineWidth = 2.5; g.beginPath()
  const gx = 16, gy = 44, gw = w * 0.58, gh = h * 0.5
  for (let i = 0; i <= 40; i++) { const x = gx + (i / 40) * gw, y = gy + gh * (0.5 + 0.32 * Math.sin(i * 0.35 + seed) + (r() - 0.5) * 0.25); if (i) g.lineTo(x, y); else g.moveTo(x, y) }
  g.stroke()
  g.globalAlpha = 0.18; g.lineTo(gx + gw, gy + gh); g.lineTo(gx, gy + gh); g.closePath(); g.fill()
  g.globalAlpha = 0.5; g.lineWidth = 1; g.strokeRect(gx, gy, gw, gh)
  // barras
  const bx = w * 0.66, bw = w * 0.3
  for (let i = 0; i < 7; i++) { g.globalAlpha = 0.35 + r() * 0.6; g.fillRect(bx, 46 + i * 20, bw * (0.25 + r() * 0.75), 10) }
  // anillo de progreso
  g.globalAlpha = 0.9; g.lineWidth = 6; g.beginPath(); g.arc(bx + 40, h - 52, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (0.3 + r() * 0.6)); g.stroke()
  g.globalAlpha = 0.25; g.beginPath(); g.arc(bx + 40, h - 52, 30, 0, Math.PI * 2); g.stroke()
  // líneas de "texto"
  for (let i = 0; i < 5; i++) { g.globalAlpha = 0.3 + r() * 0.4; g.fillRect(16, gy + gh + 18 + i * 12, (0.2 + r() * 0.35) * w, 5) }
  for (let i = 0; i < 3; i++) { g.globalAlpha = 0.55; g.fillRect(bx + 86, h - 78 + i * 16, 40 + r() * 50, 6) }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  texCache.set(key, t); return t
}

/** Pasillo en perspectiva (ilusión de profundidad para la holocubierta). */
export function texTunel(color: string) {
  const key = `t|${color}`
  const hit = texCache.get(key); if (hit) return hit
  const w = 512, h = 512, cv = document.createElement('canvas'); cv.width = w; cv.height = h
  const g = cv.getContext('2d')!
  const gr = g.createRadialGradient(w / 2, h * 0.52, 10, w / 2, h * 0.52, w * 0.7)
  gr.addColorStop(0, '#3a1a08'); gr.addColorStop(0.35, '#140904'); gr.addColorStop(1, '#040202')
  g.fillStyle = gr; g.fillRect(0, 0, w, h)
  const vx = w / 2, vy = h * 0.52
  g.strokeStyle = color; g.lineWidth = 2
  // marcos concéntricos que se alejan
  for (let i = 1; i < 14; i++) {
    const k = Math.pow(0.78, i); g.globalAlpha = 0.15 + 0.7 * k
    const rw = w * 0.5 * k, rh = h * 0.52 * k
    g.strokeRect(vx - rw, vy - rh, rw * 2, rh + (h - vy) * k)
  }
  // líneas de fuga
  g.globalAlpha = 0.45
  for (let i = 0; i <= 12; i++) {
    const x = (i / 12) * w
    g.beginPath(); g.moveTo(x, h); g.lineTo(vx + (x - vx) * 0.04, vy + (h - vy) * 0.04); g.stroke()
    g.beginPath(); g.moveTo(x, 0); g.lineTo(vx + (x - vx) * 0.04, vy - vy * 0.04); g.stroke()
  }
  for (let i = 0; i <= 10; i++) {
    const y = (i / 10) * h
    g.beginPath(); g.moveTo(0, y); g.lineTo(vx - vx * 0.04, vy + (y - vy) * 0.04); g.stroke()
    g.beginPath(); g.moveTo(w, y); g.lineTo(vx + vx * 0.04, vy + (y - vy) * 0.04); g.stroke()
  }
  g.globalAlpha = 1; const glowG = g.createRadialGradient(vx, vy, 0, vx, vy, 60); glowG.addColorStop(0, '#ffd9b0'); glowG.addColorStop(1, 'rgba(255,140,60,0)')
  g.fillStyle = glowG; g.fillRect(vx - 60, vy - 60, 120, 120)
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace
  texCache.set(key, t); return t
}

/** Franjas diagonales de seguridad para el suelo del hangar. */
export function texFranjas(color: string) {
  const key = `f|${color}`
  const hit = texCache.get(key); if (hit) return hit
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64
  const g = cv.getContext('2d')!
  g.fillStyle = '#15131c'; g.fillRect(0, 0, 256, 64)
  g.fillStyle = color
  for (let x = -64; x < 256 + 64; x += 32) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 16, 64); g.lineTo(x + 48, 0); g.lineTo(x + 32, 0); g.closePath(); g.fill() }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping
  texCache.set(key, t); return t
}

/** Degradado vertical (para haces de luz y reflejo del sol en el mar). */
export function texDegradado(stops: [number, string][], horizontal = false) {
  const key = `d|${horizontal}|${stops.map((s) => s.join(':')).join(',')}`
  const hit = texCache.get(key); if (hit) return hit
  const cv = document.createElement('canvas'); cv.width = horizontal ? 256 : 4; cv.height = horizontal ? 4 : 256
  const g = cv.getContext('2d')!
  const gr = horizontal ? g.createLinearGradient(0, 0, 256, 0) : g.createLinearGradient(0, 0, 0, 256)
  stops.forEach(([o, c]) => gr.addColorStop(o, c))
  g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height)
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace
  texCache.set(key, t); return t
}

/** Curva de arco orgánico (laterales casi verticales y clave redondeada). */
export function curvaArco(w: number, h: number, n = 48) {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI
    const x = (w / 2) * Math.cos(t)
    const y = h * Math.pow(Math.sin(t), 0.45)
    pts.push(new THREE.Vector3(x, y, 0))
  }
  return new THREE.CatmullRomCurve3(pts)
}
export function formaArco(w: number, h: number, n = 48) {
  const s = new THREE.Shape()
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI
    const x = (w / 2) * Math.cos(t), y = h * Math.pow(Math.sin(t), 0.45)
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y)
  }
  s.closePath()
  return s
}

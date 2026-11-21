import React, { useEffect, useMemo, useState } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useDur } from './dur';
import { continueRender, delayRender, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

// ---------- texturas: se precargan todas antes de montar cualquier lienzo ----------
const TEXTURAS: [string, boolean][] = [
  ['2k_stars_milky_way.jpg', true], ['2k_earth_daymap.jpg', true], ['2k_earth_nightmap.jpg', true],
  ['2k_earth_clouds.jpg', false], ['2k_sun.jpg', true], ['2k_moon.jpg', true],
];
const cache = new Map<string, THREE.Texture>();
let promesa: Promise<void> | null = null;
export function precargarTexturas(): Promise<void> {
  if (!promesa) {
    const loader = new THREE.TextureLoader();
    promesa = Promise.all(TEXTURAS.map(([n, srgb]) => loader.loadAsync(staticFile(`img/${n}`)).then((t) => {
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      cache.set(n, t);
    }))).then(() => undefined);
  }
  return promesa;
}
export const Precarga: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [listo, setListo] = useState(cache.size === TEXTURAS.length);
  const [handle] = useState(() => (listo ? null : delayRender('precarga de texturas')));
  useEffect(() => {
    if (listo) return;
    precargarTexturas().then(() => { setListo(true); if (handle) continueRender(handle); });
  }, []);
  return listo ? <>{children}</> : null;
};
export function useTex(nombre: string, _srgb = true): THREE.Texture | null {
  return cache.get(nombre) ?? null;
}

const Camara: React.FC<{ pos: [number, number, number]; mira?: [number, number, number]; fov?: number }> = ({ pos, mira = [0, 0, 0], fov = 40 }) => {
  const { camera } = useThree();
  camera.position.set(...pos);
  (camera as THREE.PerspectiveCamera).fov = fov;
  (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  camera.lookAt(...mira);
  return null;
};

const Lienzo: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} gl={{ antialias: true, preserveDrawingBuffer: true }} style={{ position: 'absolute', inset: 0 }}>
      {children}
    </ThreeCanvas>
  );
};

// ---------- piezas ----------
const Estrellas: React.FC<{ brillo?: number; giro?: number }> = ({ brillo = 0.55, giro = 0 }) => {
  const t = useTex('2k_stars_milky_way.jpg');
  if (!t) return null;
  return (
    <mesh rotation={[0.4, giro, 0.2]}>
      <sphereGeometry args={[400, 48, 48]} />
      <meshBasicMaterial map={t} side={THREE.BackSide} color={new THREE.Color(brillo, brillo, brillo)} toneMapped={false} />
    </mesh>
  );
};

const vsGlobo = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vUv = uv; vN = normalize((modelMatrix*vec4(normal,0.)).xyz); vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const fsTierra = /* glsl */ `
uniform sampler2D dia; uniform sampler2D noche; uniform vec3 sol; uniform float luces; uniform float tiempo;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
void main(){
  float l = dot(normalize(vN), normalize(sol));
  float d = smoothstep(-0.12, 0.3, l);
  vec3 day = texture2D(dia, vUv).rgb * (0.05 + 1.25*max(l,0.0));
  float cel = h(floor(vUv*vec2(260.,130.)));
  float on = step(cel, luces) * (0.85 + 0.15*sin(tiempo*7.0 + cel*40.0));
  vec3 night = texture2D(noche, vUv).rgb * on * vec3(1.0,0.78,0.5) * 2.4;
  vec3 c = mix(night, day, d);
  vec3 V = normalize(cameraPosition - vW);
  float fr = pow(1.0 - max(dot(V, normalize(vN)),0.0), 3.0);
  c += vec3(0.25,0.75,1.0) * fr * (0.25 + 0.9*max(l+0.2,0.0));
  gl_FragColor = vec4(c, 1.0);
}`;
const fsAtmos = /* glsl */ `
uniform vec3 color; uniform float fuerza; varying vec3 vN; varying vec3 vW;
void main(){ vec3 V = normalize(cameraPosition - vW); float d = dot(V, normalize(vN)); float g = pow(clamp(-d*3.2, 0.0, 1.0), 2.2); gl_FragColor = vec4(color*g*fuerza, g); }`;

export const Tierra: React.FC<{ luces?: number; rot?: number; sol?: [number, number, number]; radio?: number; pos?: [number, number, number] }> = ({ luces = 1, rot = 0, sol = [-1, 0.3, 0.6], radio = 1, pos = [0, 0, 0] }) => {
  const dia = useTex('2k_earth_daymap.jpg');
  const noche = useTex('2k_earth_nightmap.jpg');
  const nubes = useTex('2k_earth_clouds.jpg', false);
  const f = useCurrentFrame();
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: vsGlobo, fragmentShader: fsTierra, uniforms: { dia: { value: null }, noche: { value: null }, sol: { value: new THREE.Vector3() }, luces: { value: 1 }, tiempo: { value: 0 } } }), []);
  const atm = useMemo(() => new THREE.ShaderMaterial({ vertexShader: vsGlobo, fragmentShader: fsAtmos, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { color: { value: new THREE.Color('#3FE0FF') }, fuerza: { value: 1.6 } } }), []);
  if (!dia || !noche || !nubes) return null;
  mat.uniforms.dia.value = dia; mat.uniforms.noche.value = noche; mat.uniforms.luces.value = luces; mat.uniforms.tiempo.value = f / 30;
  mat.uniforms.sol.value.set(...sol);
  return (
    <group position={pos} scale={radio}>
      <directionalLight position={sol.map((v) => v * 10) as [number, number, number]} intensity={2.2} />
      <mesh rotation={[0.41, rot, 0]} material={mat}><sphereGeometry args={[1, 96, 96]} /></mesh>
      <mesh rotation={[0.41, rot * 1.15 + 1, 0]}>
        <sphereGeometry args={[1.012, 96, 96]} />
        <meshStandardMaterial color="#ffffff" alphaMap={nubes} transparent opacity={0.75} depthWrite={false} />
      </mesh>
      <mesh scale={1.06} material={atm}><sphereGeometry args={[1, 64, 64]} /></mesh>
    </group>
  );
};

const fsCorona = /* glsl */ `
uniform vec3 color; uniform float tiempo; uniform float fuerza; varying vec2 vUv;
float h(float x){ return fract(sin(x*127.1)*43758.5453); }
float n(float x){ float i=floor(x), f=fract(x); return mix(h(i),h(i+1.0),smoothstep(0.,1.,f)); }
void main(){
  vec2 p = vUv*2.0-1.0; float r = length(p); float a = atan(p.y,p.x);
  float rays = n(a*9.0 + tiempo*0.4)*0.6 + n(a*23.0 - tiempo*0.7)*0.4;
  float g = exp(-(r-0.28)*5.5) * 0.55 + exp(-(r-0.28)*2.2) * 0.25 * rays + exp(-r*10.0);
  g *= smoothstep(1.0, 0.6, r);
  gl_FragColor = vec4(color * g * fuerza, g);
}`;
const vsPlano = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

export const Estrella: React.FC<{ color?: string; radio?: number; pos?: [number, number, number]; fuerza?: number; tinte?: string; giro?: number }> = ({ color = '#ffb060', radio = 1, pos = [0, 0, 0], fuerza = 1.6, tinte = '#ffffff', giro = 0 }) => {
  const t = useTex('2k_sun.jpg');
  const f = useCurrentFrame();
  const { camera } = useThree();
  const cor = useMemo(() => new THREE.ShaderMaterial({ vertexShader: vsPlano, fragmentShader: fsCorona, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { color: { value: new THREE.Color(color) }, tiempo: { value: 0 }, fuerza: { value: fuerza } } }), [color]);
  cor.uniforms.tiempo.value = f / 30; cor.uniforms.fuerza.value = fuerza;
  if (!t) return null;
  const q = camera.quaternion.clone();
  return (
    <group position={pos}>
      <pointLight intensity={60 * radio} distance={0} decay={1.4} color={color} />
      <mesh scale={radio} rotation={[0, giro + f / 300, 0]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial map={t} color={new THREE.Color(tinte).multiplyScalar(1.6)} toneMapped={false} />
      </mesh>
      <mesh scale={radio * 7} quaternion={q} material={cor}><planeGeometry args={[1, 1]} /></mesh>
    </group>
  );
};

const Planeta: React.FC<{ pos: [number, number, number]; radio?: number; tinte?: string }> = ({ pos, radio = 0.3, tinte = '#d9a27a' }) => {
  const t = useTex('2k_moon.jpg');
  const f = useCurrentFrame();
  if (!t) return null;
  return (
    <mesh position={pos} scale={radio} rotation={[0.2, f / 90, 0]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial map={t} color={tinte} roughness={1} />
    </mesh>
  );
};

const Anillo: React.FC<{ r: number; color?: string; opacidad?: number; rot?: [number, number, number]; progreso?: number }> = ({ r, color = '#3FE0FF', opacidad = 0.6, rot = [Math.PI / 2, 0, 0], progreso = 1 }) => {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const n = 256;
    for (let i = 0; i <= n * progreso; i++) { const a = (i / n) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [r, progreso]);
  return (
    // @ts-expect-error line de three en JSX
    <line geometry={geo} rotation={rot}>
      <lineBasicMaterial color={color} transparent opacity={opacidad} toneMapped={false} />
    </line>
  );
};

// ---------- escenas completas ----------
export const EscenaTierra: React.FC<{ modo?: 'normal' | 'apagon' | 'orbitas' | 'logo' }> = ({ modo = 'normal' }) => {
  const f = useCurrentFrame();
  const durationInFrames = useDur();
  const p = f / durationInFrames;
  let luces = 1;
  if (modo === 'apagon') {
    const caida = interpolate(f, [12, 95], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    const parpadeo = Math.sin(f * 1.7) > 0.2 ? 1 : 0.4;
    luces = Math.max(0, caida * (f > 12 ? parpadeo : 1));
  }
  const cam: [number, number, number] =
    modo === 'apagon' ? [interpolate(p, [0, 1], [-0.6, -0.2]), 0.55, interpolate(p, [0, 1], [2.6, 2.2])]
    : modo === 'orbitas' ? [0, interpolate(p, [0, 1], [1.4, 1.0]), interpolate(p, [0, 1], [7.0, 6.0])]
    : modo === 'logo' ? [0, interpolate(p, [0, 1], [-0.1, 0.05]), 2.4]
    : [interpolate(p, [0, 1], [0.4, 0]), 0.1, interpolate(p, [0, 1], [3.6, 2.9])];
  const sol: [number, number, number] = modo === 'apagon' ? [1.0, 0.2, -0.9] : modo === 'logo' ? [0, 1, -0.35] : [-1, 0.25, 0.5];
  const mira: [number, number, number] = modo === 'logo' ? [0, 1.08, 0] : modo === 'apagon' ? [-0.2, 0.35, 0] : modo === 'orbitas' ? [0, -0.75, 0] : [0, 0, 0];
  // rotación: en el apagón miramos el Mediterráneo (lon ~ 15°E)
  const rot = modo === 'apagon' ? -Math.PI / 2 - 0.26 + f / 900 : f / 400 + (modo === 'logo' ? 2.2 : 0.8);
  return (
    <Lienzo>
      <Camara pos={cam} mira={mira} fov={modo === 'logo' ? 30 : 38} />
      <ambientLight intensity={0.02} />
      <Estrellas brillo={0.45} giro={f / 2000} />
      <Tierra luces={luces} rot={rot} sol={sol} />
      {modo === 'orbitas' && <Orbitas />}
    </Lienzo>
  );
};

const Orbitas: React.FC = () => {
  const f = useCurrentFrame();
  const orbitas = [
    { r: 1.55, rot: [1.2, 0.2, 0] as [number, number, number], v: 1.0, n: 4 },
    { r: 1.7, rot: [1.9, -0.6, 0.3] as [number, number, number], v: 0.8, n: 4 },
    { r: 1.62, rot: [0.9, 1.0, 0.5] as [number, number, number], v: 0.9, n: 4 },
    { r: 2.9, rot: [Math.PI / 2 + 0.41, 0, 0] as [number, number, number], v: 0.25, n: 6 },
  ];
  const prog = interpolate(f, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <group>
      {orbitas.map((o, i) => (
        <group key={i} rotation={o.rot}>
          <Anillo r={o.r} rot={[0, 0, 0]} opacidad={i === 3 ? 0.8 : 0.45} color={i === 3 ? '#FF8A3D' : '#3FE0FF'} progreso={prog} />
          {Array.from({ length: o.n }).map((_, k) => {
            const a = (k / o.n) * Math.PI * 2 + (f / 30) * o.v * 0.6;
            return (
              <mesh key={k} position={[Math.cos(a) * o.r, Math.sin(a) * o.r, 0]}>
                <boxGeometry args={[0.045, 0.045, 0.045]} />
                <meshBasicMaterial color={i === 3 ? '#FF8A3D' : '#bff6ff'} toneMapped={false} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
};

export const EscenaSol: React.FC<{ furia?: boolean }> = ({ furia = false }) => {
  const f = useCurrentFrame();
  const durationInFrames = useDur();
  const p = f / durationInFrames;
  return (
    <Lienzo>
      <Camara pos={[interpolate(p, [0, 1], [0.5, 0.1]), 0.1, interpolate(p, [0, 1], [5.6, 4.8])]} mira={[-0.9, 0, 0]} fov={40} />
      <Estrellas brillo={0.3} />
      <Estrella color={furia ? '#ff7a2a' : '#ffb050'} radio={1.1} pos={[1.5, 0, 0]} fuerza={furia ? 2.4 : 1.7} tinte="#ffd9a0" />
    </Lienzo>
  );
};

export const EscenaExoplaneta: React.FC<{ cerca?: boolean }> = ({ cerca = false }) => {
  const f = useCurrentFrame();
  const durationInFrames = useDur();
  const p = f / durationInFrames;
  const R = 3.2;
  const ang = 0.6 + f / 55;
  const pl: [number, number, number] = [Math.cos(ang) * R, 0, Math.sin(ang) * R];
  // de cerca: la cámara sigue al planeta desde fuera de la órbita, con la estrella detrás
  const angC = ang - 0.32;
  const dC = interpolate(p, [0, 1], [R + 2.2, R + 1.5]);
  const cam: [number, number, number] = cerca
    ? [Math.cos(angC) * dC, interpolate(p, [0, 1], [0.55, 0.35]), Math.sin(angC) * dC]
    : [interpolate(p, [0, 1], [-1.5, 1.5]), interpolate(p, [0, 1], [3.4, 2.6]), interpolate(p, [0, 1], [8.5, 7.4])];
  const miraC: [number, number, number] = [pl[0] * 0.8, 0, pl[2] * 0.8];
  return (
    <Lienzo>
      <Camara pos={cam} mira={cerca ? miraC : [0, 0, 0]} fov={38} />
      <ambientLight intensity={0.06} />
      <Estrellas brillo={0.4} giro={f / 1500} />
      <Estrella color="#ff6a3a" radio={0.75} fuerza={1.5} tinte="#ff9a6a" />
      <Anillo r={R} opacidad={0.55} progreso={interpolate(f, [0, 40], [0, 1], { extrapolateRight: 'clamp' })} />
      <Planeta pos={pl} radio={cerca ? 0.5 : 0.36} />
    </Lienzo>
  );
};

export const EscenaEstrellas: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Lienzo>
      <Camara pos={[0, 0, 0.01]} mira={[Math.sin(f / 300) * 2, 0.6, -10]} fov={interpolate(f, [0, 150], [55, 42], { extrapolateRight: 'clamp' })} />
      <Estrellas brillo={0.85} giro={f / 900} />
    </Lienzo>
  );
};

import React from 'react';
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';

export const C = {
  blanco: '#F4F1EA',
  cian: '#3FE0FF',
  naranja: '#FF8A3D',
  espacio: '#05070F',
};
export const F = {
  titulo: 'Orbitron, sans-serif',
  exo: '"Exo 2", sans-serif',
  inter: 'Inter, sans-serif',
};

export const BARRA = 92; // franjas de 2,39:1

export const Letterbox: React.FC<{ abrir?: number }> = ({ abrir = 1 }) => {
  const h = BARRA * abrir;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: h, background: '#000' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: h, background: '#000' }} />
    </AbsoluteFill>
  );
};

// Grano de película: ruido SVG que cambia en cada fotograma
export const Grano: React.FC<{ fuerza?: number }> = ({ fuerza = 0.11 }) => {
  const f = useCurrentFrame();
  const seed = Math.floor(random(`g${f}`) * 1000);
  const dx = Math.floor(random(`x${f}`) * 200), dy = Math.floor(random(`y${f}`) * 200);
  return (
    <AbsoluteFill style={{ mixBlendMode: 'overlay', opacity: fuerza * 3, pointerEvents: 'none' }}>
      <svg width="1480" height="920" style={{ position: 'absolute', left: -dx, top: -dy }}>
        <filter id={`n${f}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#n${f})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Vineta: React.FC = () => (
  <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.75) 100%)', pointerEvents: 'none' }} />
);

// Destellos de luz (light leaks) que derivan lentamente
export const LightLeak: React.FC<{ color?: string; intensidad?: number; semilla?: string }> = ({ color = C.naranja, intensidad = 0.35, semilla = 'a' }) => {
  const f = useCurrentFrame();
  const x = 20 + 60 * (0.5 + 0.5 * Math.sin(f / 47 + random(semilla) * 6));
  const y = 30 + 40 * (0.5 + 0.5 * Math.cos(f / 61 + random(semilla + 'y') * 6));
  const pulso = 0.75 + 0.25 * Math.sin(f / 9 + random(semilla + 'p') * 6);
  return (
    <AbsoluteFill
      style={{
        mixBlendMode: 'screen',
        opacity: intensidad * pulso,
        background: `radial-gradient(ellipse 55% 70% at ${x}% ${y}%, ${color} 0%, ${color}55 35%, transparent 70%)`,
        filter: 'blur(30px)',
        pointerEvents: 'none',
      }}
    />
  );
};

// Fogonazo blanco en los cortes con golpe
export const Flash: React.FC<{ duracion?: number; color?: string }> = ({ duracion = 6, color = '#fff' }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, duracion], [0.9, 0], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: color, opacity: o, mixBlendMode: 'screen', pointerEvents: 'none' }} />;
};

// Temblor de cámara que decae
export const useTemblor = (fuerza = 14, decae = 14) => {
  const f = useCurrentFrame();
  const a = fuerza * Math.exp(-f / decae);
  return { x: (random(`sx${f}`) - 0.5) * 2 * a, y: (random(`sy${f}`) - 0.5) * 2 * a };
};

// Texto con aberración cromática + cortes de glitch
export const Glitch: React.FC<{ children: React.ReactNode; fuerza?: number; style?: React.CSSProperties }> = ({ children, fuerza = 1, style }) => {
  const f = useCurrentFrame();
  const activo = random(`ga${Math.floor(f / 2)}`) < 0.35 * fuerza;
  const off = activo ? (random(`go${f}`) - 0.5) * 22 * fuerza : 1.5 * fuerza;
  const corte = activo ? random(`gc${f}`) * 80 + 10 : -1;
  const parpadeo = random(`gp${f}`) < 0.06 * fuerza ? 0.35 : 1;
  const base: React.CSSProperties = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  return (
    <div style={{ position: 'relative', ...style, opacity: parpadeo }}>
      <div style={{ visibility: 'hidden' }}>{children}</div>
      <div style={{ ...base, color: '#ff2a2a', transform: `translateX(${-off}px)`, mixBlendMode: 'screen', opacity: 0.8 }}>{children}</div>
      <div style={{ ...base, color: C.cian, transform: `translateX(${off}px)`, mixBlendMode: 'screen', opacity: 0.8 }}>{children}</div>
      <div style={{ ...base, clipPath: corte > 0 ? `inset(${corte}% 0 ${Math.max(0, 100 - corte - 12)}% 0)` : undefined, transform: corte > 0 ? `translateX(${off * 2}px)` : undefined }}>{children}</div>
      {corte > 0 && <div style={{ ...base, clipPath: `inset(0 0 ${100 - corte}% 0)` }}>{children}</div>}
      {corte > 0 && <div style={{ ...base, clipPath: `inset(${corte + 12}% 0 0 0)` }}>{children}</div>}
    </div>
  );
};

// Líneas de barrido tipo pantalla
export const Scanlines: React.FC<{ opacidad?: number }> = ({ opacidad = 0.12 }) => {
  const f = useCurrentFrame();
  const { height } = useVideoConfig();
  const y = (f * 9) % (height + 200) - 100;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px)', opacity: opacidad }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: y, height: 90, background: 'linear-gradient(180deg, transparent, rgba(63,224,255,0.07), transparent)' }} />
    </AbsoluteFill>
  );
};

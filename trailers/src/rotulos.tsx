import React from 'react';
import { AbsoluteFill, Easing, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { C, F, Glitch } from './efectos';
import { useDur } from './dur';
import type { PlanoT } from './tipos';

const cl = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
// tamaño de letra para que un texto Orbitron quepa en el ancho útil (anchura media ≈ 0,86 em + espaciado)
const ajustar = (texto: string, max: number, esp: number, ancho = 1120) => Math.min(max, ancho / (texto.length * (0.86 + esp)));
const SCRIM: React.CSSProperties = { background: 'radial-gradient(ellipse 62% 30% at 50% 50%, rgba(5,7,15,0.62) 0%, rgba(5,7,15,0.25) 55%, transparent 75%)' };

// Aparición "slam": escala grande → 1 con desenfoque
const useSlam = (inicio = 0, dur = 8) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [inicio, inicio + dur], [0, 1], { ...cl, easing: Easing.out(Easing.exp) });
  return { opacity: interpolate(f, [inicio, inicio + 2], [0, 1], cl), transform: `scale(${1.6 - 0.6 * t})`, filter: `blur(${(1 - t) * 14}px)` };
};
// Salida rápida al final del plano
const useSalida = (frames = 6) => {
  const f = useCurrentFrame();
  const d = useDur();
  return interpolate(f, [d - frames, d], [1, 0], cl);
};

const Centro: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', ...style }}>{children}</AbsoluteFill>
);

const Subtexto: React.FC<{ texto?: string; inicio?: number; color?: string; tam?: number }> = ({ texto, inicio = 8, color = C.blanco, tam = 20 }) => {
  const f = useCurrentFrame();
  if (!texto) return null;
  const n = Math.floor(interpolate(f, [inicio, inicio + texto.length * 0.8], [0, texto.length], cl));
  const esp = interpolate(f, [inicio, inicio + 60], [0.65, 0.45], cl);
  return <div style={{ fontFamily: F.exo, fontWeight: 600, fontSize: tam, letterSpacing: `${esp}em`, color, opacity: 0.95, marginTop: 18, whiteSpace: 'nowrap', textShadow: '0 0 10px #000, 0 0 22px #000' }}>{texto.slice(0, n)}<span style={{ opacity: n < texto.length ? 1 : 0 }}>▍</span></div>;
};

const Fecha: React.FC<{ p: PlanoT }> = ({ p }) => {
  const f = useCurrentFrame();
  const d = useDur();
  const esp = interpolate(f, [0, d], [0.6, 0.18], { ...cl, easing: Easing.out(Easing.quad) });
  const naranja = p.id === 'nueve-meses';
  const slam = useSlam(0, 10);
  return (
    <Centro style={{ opacity: useSalida(), ...SCRIM }}>
      <div style={{ ...slam, fontFamily: F.titulo, fontWeight: 900, fontSize: ajustar(p.texto ?? '', 200, 0.6), letterSpacing: `${esp}em`, color: C.blanco, textShadow: `0 0 40px ${naranja ? C.naranja : 'rgba(255,190,120,0.6)'}, 0 4px 30px rgba(0,0,0,0.8)`, marginRight: `-${esp}em`, lineHeight: 1 }}>{p.texto}</div>
      <Subtexto texto={p.subtexto} inicio={10} color={naranja ? C.naranja : C.cian} />
    </Centro>
  );
};

const Alerta: React.FC<{ p: PlanoT }> = ({ p }) => {
  const f = useCurrentFrame();
  const parp = Math.floor(f / 8) % 2 === 0;
  return (
    <AbsoluteFill style={{ opacity: useSalida() }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 40%, rgba(255,60,20,${parp ? 0.35 : 0.18}) 100%)` }} />
      <Centro>
        <div style={{ fontFamily: F.titulo, fontSize: 18, letterSpacing: '0.5em', color: C.naranja, marginBottom: 10, opacity: parp ? 1 : 0.4 }}>⚠ ALERTA · ADM</div>
        <Glitch fuerza={interpolate(f, [0, 20, 40], [1.6, 0.8, 0.4], cl)} style={{ fontFamily: F.titulo, fontWeight: 900, fontSize: 104, color: C.blanco, letterSpacing: '0.06em', ...useSlam(0, 8) }}>{p.texto}</Glitch>
        <div style={{ marginTop: 26, display: 'flex', gap: 28 }}>
          {(p.lineas ?? []).map((l, i) => {
            const o = interpolate(f, [20 + i * 14, 24 + i * 14], [0, 1], cl);
            return <div key={i} style={{ fontFamily: F.titulo, fontSize: 15, letterSpacing: '0.18em', color: C.naranja, opacity: o * (random(`al${i}${Math.floor(f / 3)}`) > 0.08 ? 1 : 0.2), border: `1px solid ${C.naranja}88`, padding: '6px 12px', background: 'rgba(255,138,61,0.08)' }}>{l}</div>;
          })}
        </div>
      </Centro>
    </AbsoluteFill>
  );
};

const Esquinas: React.FC<{ color?: string }> = ({ color = C.cian }) => {
  const f = useCurrentFrame();
  const m = interpolate(f, [0, 10], [60, 120], { ...cl, easing: Easing.out(Easing.cubic) });
  const s: React.CSSProperties = { position: 'absolute', width: 34, height: 34, borderColor: color, borderStyle: 'solid', opacity: 0.8 };
  return (
    <AbsoluteFill>
      <div style={{ ...s, left: m, top: m, borderWidth: '2px 0 0 2px' }} />
      <div style={{ ...s, right: m, top: m, borderWidth: '2px 2px 0 0' }} />
      <div style={{ ...s, left: m, bottom: m, borderWidth: '0 0 2px 2px' }} />
      <div style={{ ...s, right: m, bottom: m, borderWidth: '0 2px 2px 0' }} />
    </AbsoluteFill>
  );
};

const Hud: React.FC<{ p: PlanoT }> = ({ p }) => {
  const f = useCurrentFrame();
  const slam = useSlam(4, 9);
  return (
    <AbsoluteFill style={{ opacity: useSalida() }}>
      <Esquinas />
      <div style={{ position: 'absolute', left: 130, top: 112, fontFamily: F.titulo, fontSize: 12, letterSpacing: '0.3em', color: C.cian, opacity: 0.8 }}>
        ADM // ENLACE {String(1000 + Math.floor(f * 37.3) % 9000)} · {p.id.toUpperCase()}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 128, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ ...slam, fontFamily: F.titulo, fontWeight: 900, fontSize: ajustar(p.texto ?? '', 58, 0.08, 1000), letterSpacing: '0.08em', color: C.blanco, textShadow: `0 0 24px ${C.cian}88, 0 3px 18px rgba(0,0,0,0.9)` }}>{p.texto}</div>
        <Subtexto texto={p.subtexto} inicio={12} color={C.cian} tam={16} />
      </div>
    </AbsoluteFill>
  );
};

const Palabras: React.FC<{ p: PlanoT }> = ({ p }) => {
  const f = useCurrentFrame();
  const d = useDur();
  const ws = p.palabras ?? [];
  // reparte las palabras siguiendo el ritmo de la narración (golpes de sfx si existen)
  const golpes = (p.sfx ?? []).filter((s) => s.nombre === 'hit').map((s) => Math.round(s.en * 30));
  const marcas = ws.map((_, i) => (golpes.length >= ws.length ? golpes[i] : golpes.length === ws.length - 1 && i > 0 ? golpes[i - 1] : Math.round((i * d) / ws.length)));
  marcas[0] = 0;
  let idx = 0; marcas.forEach((m, i) => { if (f >= m) idx = i; });
  const ini = marcas[idx];
  const fin = idx + 1 < ws.length ? marcas[idx + 1] : d;
  const local = f - ini;
  const t = interpolate(local, [0, 7], [0, 1], { ...cl, easing: Easing.out(Easing.exp) });
  const esp = interpolate(local, [0, fin - ini], [0.14, 0.24], cl);
  const ultima = idx === ws.length - 1;
  const color = ultima ? '#FFB27A' : C.blanco;
  return (
    <Centro style={SCRIM}>
      <div style={{ fontFamily: F.titulo, fontWeight: 900, fontSize: ajustar(ws[idx], 84, 0.24), letterSpacing: `${esp}em`, color, transform: `scale(${1.5 - 0.5 * t})`, filter: `blur(${(1 - t) * 12}px)`, opacity: interpolate(local, [0, 2], [0, 1], cl) * interpolate(f, [d - 4, d], [1, 0], cl), textShadow: `0 0 30px ${ultima ? C.naranja : C.cian}66, 0 4px 24px rgba(0,0,0,0.9)`, whiteSpace: 'nowrap' }}>{ws[idx]}</div>
      <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
        {ws.map((_, i) => <div key={i} style={{ width: 40, height: 3, background: i <= idx ? C.cian : '#ffffff33' }} />)}
      </div>
    </Centro>
  );
};

const Seccion: React.FC<{ p: PlanoT }> = ({ p }) => {
  const f = useCurrentFrame();
  const linea = interpolate(f, [0, 14], [0, 1], { ...cl, easing: Easing.out(Easing.cubic) });
  const esp = interpolate(f, [0, 60], [0.9, 0.42], { ...cl, easing: Easing.out(Easing.quad) });
  const o = interpolate(f, [3, 10], [0, 1], cl);
  return (
    <Centro style={{ opacity: useSalida(5) }}>
      <div style={{ width: 700 * linea, height: 1, background: C.cian, boxShadow: `0 0 14px ${C.cian}` }} />
      <div style={{ fontFamily: F.titulo, fontWeight: 700, fontSize: ajustar(p.texto ?? '', 64, 0.9), letterSpacing: `${esp}em`, marginRight: `-${esp}em`, color: C.blanco, opacity: o, margin: '22px 0', textShadow: `0 0 30px ${C.cian}99` }}>{p.texto}</div>
      <div style={{ width: 700 * linea, height: 1, background: C.cian, boxShadow: `0 0 14px ${C.cian}` }} />
    </Centro>
  );
};

const Pista: React.FC<{ p: PlanoT }> = ({ p }) => {
  const f = useCurrentFrame();
  const slam = useSlam(6, 9);
  return (
    <AbsoluteFill style={{ opacity: useSalida(4) }}>
      <div style={{ position: 'absolute', left: 120, top: 116, fontFamily: F.titulo, fontSize: 14, letterSpacing: '0.4em', color: C.naranja }}>LA CLAVE · VERA</div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 120, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontFamily: F.exo, fontWeight: 800, fontSize: 34, letterSpacing: '0.06em', color: C.blanco, opacity: interpolate(f, [0, 6], [0, 1], cl), textShadow: '0 2px 12px #000' }}>{p.texto}</div>
        {p.formula && <div style={{ ...slam, marginTop: 10, fontFamily: F.titulo, fontWeight: 700, fontSize: 30, color: C.cian, letterSpacing: '0.12em', textShadow: `0 0 20px ${C.cian}` }}>{p.formula}</div>}
      </div>
    </AbsoluteFill>
  );
};

// VERA: anillo holográfico que reacciona a su propia voz
const Vera: React.FC<{ p: PlanoT; vozSrc?: string; vozOffset: number }> = ({ p, vozSrc, vozOffset }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audio = useAudioData(staticFile(vozSrc ?? 'audio/sfx/tick.wav'));
  const barras = 64;
  let vals: number[] = new Array(barras).fill(0);
  if (audio && vozSrc && f >= vozOffset) vals = visualizeAudio({ fps, frame: f - vozOffset, audioData: audio, numberOfSamples: barras, smoothing: true });
  const ap = spring({ frame: f, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill style={{ opacity: useSalida() }}>
      <Centro style={{ top: -40 }}>
        <svg width="360" height="360" style={{ transform: `scale(${ap})` }}>
          <defs><radialGradient id="vn"><stop offset="0" stopColor={C.cian} stopOpacity="0.5" /><stop offset="1" stopColor={C.cian} stopOpacity="0" /></radialGradient></defs>
          <circle cx="180" cy="180" r="170" fill="url(#vn)" />
          <circle cx="180" cy="180" r="92" fill="none" stroke={C.cian} strokeWidth="2" opacity="0.7" />
          <circle cx="180" cy="180" r="60" fill={C.cian} opacity={0.18 + (vals[2] ?? 0) * 1.5} />
          {vals.map((v, i) => {
            const a = (i / barras) * Math.PI * 2 + f / 60;
            const l = 10 + Math.min(70, v * 420);
            return <line key={i} x1={180 + Math.cos(a) * 100} y1={180 + Math.sin(a) * 100} x2={180 + Math.cos(a) * (100 + l)} y2={180 + Math.sin(a) * (100 + l)} stroke={C.cian} strokeWidth="3" strokeLinecap="round" opacity="0.9" />;
          })}
          <circle cx="180" cy="180" r="140" fill="none" stroke={C.blanco} strokeOpacity="0.25" strokeDasharray="4 10" transform={`rotate(${f * 1.5} 180 180)`} />
        </svg>
        <div style={{ fontFamily: F.titulo, fontWeight: 900, fontSize: 46, letterSpacing: '0.5em', marginRight: '-0.5em', color: C.blanco, marginTop: -6, textShadow: `0 0 20px ${C.cian}` }}>{p.texto}</div>
        <Subtexto texto={p.subtexto} inicio={6} color={C.cian} tam={14} />
      </Centro>
    </AbsoluteFill>
  );
};

const TituloMision: React.FC<{ p: PlanoT }> = ({ p }) => {
  const f = useCurrentFrame();
  const d = useDur();
  const esp = interpolate(f, [0, d], [0.35, 0.14], { ...cl, easing: Easing.out(Easing.cubic) });
  const brillo = interpolate(f, [8, 40], [-30, 130], cl);
  const slam = useSlam(0, 12);
  return (
    <Centro style={SCRIM}>
      <div style={{ fontFamily: F.titulo, fontSize: 18, letterSpacing: '0.6em', color: C.cian, opacity: interpolate(f, [10, 18], [0, 1], cl), marginBottom: 12 }}>{p.etiqueta}</div>
      <div style={{ ...slam, fontFamily: F.titulo, fontWeight: 900, fontSize: ajustar(p.texto ?? '', 118, 0.35), letterSpacing: `${esp}em`, marginRight: `-${esp}em`, whiteSpace: 'nowrap',
        backgroundImage: `linear-gradient(100deg, #b9b4aa 0%, #F4F1EA ${brillo - 12}%, #ffffff ${brillo}%, #F4F1EA ${brillo + 12}%, #a9a49a 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
        filter: `${slam.filter} drop-shadow(0 0 26px rgba(63,224,255,0.45))` }}>{p.texto}</div>
      <div style={{ width: interpolate(f, [6, 26], [0, 760], { ...cl, easing: Easing.out(Easing.cubic) }), height: 2, background: `linear-gradient(90deg, transparent, ${C.naranja}, transparent)`, marginTop: 14 }} />
      <Subtexto texto={p.subtexto} inicio={16} tam={18} />
    </Centro>
  );
};

const Lema: React.FC<{ p: PlanoT }> = ({ p }) => {
  const f = useCurrentFrame();
  const d = useDur();
  const esp = interpolate(f, [0, d], [0.28, 0.12], { ...cl, easing: Easing.out(Easing.quad) });
  return (
    <Centro style={{ opacity: useSalida(8), ...SCRIM }}>
      <div style={{ ...useSlam(0, 8), fontFamily: F.titulo, fontWeight: 900, fontSize: ajustar(p.texto ?? '', 64, 0.28), letterSpacing: `${esp}em`, marginRight: `-${esp}em`, color: C.blanco, whiteSpace: 'nowrap', textShadow: `0 0 30px ${C.naranja}aa` }}>{p.texto}</div>
    </Centro>
  );
};

const Logo: React.FC<{ p: PlanoT }> = ({ p }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [4, 24], [0, 1], cl);
  const esp = interpolate(f, [0, 90], [0.9, 0.55], { ...cl, easing: Easing.out(Easing.quad) });
  return (
    <AbsoluteFill>
      <Centro style={{ top: -120 }}>
        <div style={{ fontFamily: F.titulo, fontWeight: 900, fontSize: 76, letterSpacing: `${esp}em`, marginRight: `-${esp}em`, color: C.blanco, opacity: o, textShadow: `0 0 30px ${C.cian}` }}>{p.texto}</div>
        <Subtexto texto={p.subtexto} inicio={16} color={C.cian} tam={14} />
      </Centro>
      <div style={{ position: 'absolute', bottom: 100, left: 0, right: 0, textAlign: 'center', fontFamily: F.inter, fontSize: 11, color: '#ffffff99', opacity: interpolate(f, [20, 35], [0, 1], cl) }}>{p.creditos}</div>
    </AbsoluteFill>
  );
};

export const Rotulo: React.FC<{ p: PlanoT; vozSrc?: string }> = ({ p, vozSrc }) => {
  switch (p.tipo) {
    case 'fecha': return <Fecha p={p} />;
    case 'alerta': return <Alerta p={p} />;
    case 'hud': return <Hud p={p} />;
    case 'palabras': return <Palabras p={p} />;
    case 'seccion': return <Seccion p={p} />;
    case 'pista': return <Pista p={p} />;
    case 'vera': return <Vera p={p} vozSrc={vozSrc} vozOffset={(p.vozFrom ?? p.from) - p.from} />;
    case 'titulo-mision': return <TituloMision p={p} />;
    case 'lema': return <Lema p={p} />;
    case 'logo': return <Logo p={p} />;
    default: return <Lema p={p} />;
  }
};

import React from 'react';
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame, Easing } from 'remotion';
import { C, F } from './efectos';
import { useDur } from './dur';
import { EscenaEstrellas, EscenaExoplaneta, EscenaSol, EscenaTierra } from './escenas3d';

const Polvo: React.FC<{ n?: number; color?: string }> = ({ n = 70, color = '#ffffff' }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {Array.from({ length: n }).map((_, i) => {
        const x = random(`px${i}`) * 1280, y = random(`py${i}`) * 720, s = 1 + random(`ps${i}`) * 2;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(f / (8 + random(`pt${i}`) * 20) + i));
        return <div key={i} style={{ position: 'absolute', left: x - f * 0.15 * s, top: y, width: s, height: s, borderRadius: s, background: color, opacity: tw * 0.7 }} />;
      })}
    </AbsoluteFill>
  );
};

const ImagenKB: React.FC<{ src: string; filtro?: string; zoom?: [number, number]; origen?: string }> = ({ src, filtro, zoom = [1.05, 1.25], origen = '30% 60%' }) => {
  const f = useCurrentFrame();
  const d = useDur();
  const s = interpolate(f, [0, d], zoom);
  return (
    <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
      <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s})`, transformOrigin: origen, filter: filtro }} />
    </AbsoluteFill>
  );
};

// Base de la ADM: arcos blancos orgánicos (inspirados en la arquitectura valenciana) a contraluz
const Base: React.FC = () => {
  const f = useCurrentFrame();
  const d = useDur();
  const dx = interpolate(f, [0, d], [0, -60]);
  const costillas = Array.from({ length: 13 });
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #0a1a2a 0%, #05070F 55%, #020308 100%)' }}>
      <svg width="1280" height="720" style={{ position: 'absolute', transform: `translateX(${dx}px) scale(1.12)` }}>
        <defs>
          <linearGradient id="cer" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#F4F1EA" stopOpacity="0.9" /><stop offset="1" stopColor="#F4F1EA" stopOpacity="0.05" /></linearGradient>
          <radialGradient id="halo" cx="50%" cy="60%" r="50%"><stop offset="0" stopColor={C.cian} stopOpacity="0.25" /><stop offset="1" stopColor={C.cian} stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="1280" height="720" fill="url(#halo)" />
        {costillas.map((_, i) => {
          const x = 80 + i * 95;
          const h = 420 + Math.sin(i * 0.5) * 80;
          return <path key={i} d={`M ${x} 720 C ${x + 10} ${720 - h * 0.6}, ${x + 70} ${720 - h}, ${x + 160} ${720 - h * 0.98}`} stroke="url(#cer)" strokeWidth={10 - Math.abs(6 - i) * 0.6} fill="none" opacity={0.35 + 0.05 * (i % 3)} />;
        })}
        <path d="M 0 610 Q 640 520 1280 610" stroke="url(#cer)" strokeWidth="5" fill="none" opacity="0.5" />
        <path d="M 0 650 Q 640 600 1280 650" stroke={C.cian} strokeWidth="1.5" fill="none" opacity="0.5" />
      </svg>
      <Polvo n={40} color={C.cian} />
    </AbsoluteFill>
  );
};

// Espejo hexagonal tipo James Webb + curva de luz de tránsito
const Webb: React.FC = () => {
  const f = useCurrentFrame();
  const d = useDur();
  const hexes: [number, number][] = [];
  const r = 46, w = Math.sqrt(3) * r;
  for (let q = -2; q <= 2; q++) for (let s = -2; s <= 2; s++) {
    const k = -q - s; if (Math.abs(k) > 2) continue; if (q === 0 && s === 0) continue;
    hexes.push([w * (q + s / 2), 1.5 * r * s]);
  }
  const hex = (cx: number, cy: number) => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + (i * Math.PI) / 3; return `${cx + (r - 3) * Math.cos(a)},${cy + (r - 3) * Math.sin(a)}`; }).join(' ');
  const barrido = interpolate(f, [0, d], [-300, 300]);
  const prog = interpolate(f, [10, d - 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pts = Array.from({ length: 120 }, (_, i) => {
    const x = i / 119;
    const dip = x > 0.42 && x < 0.58 ? -1 * Math.min(1, Math.min(x - 0.42, 0.58 - x) * 30) : 0;
    const y = dip * 38 + (random(`lc${i}`) - 0.5) * 6;
    return `${860 + x * 340},${300 - y}`;
  }).slice(0, Math.max(2, Math.floor(prog * 120)));
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(circle at 35% 50%, #1a1406 0%, #05070F 60%)' }}>
      <Polvo n={60} />
      <svg width="1280" height="720" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="oro" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset="0.5" stopColor="#c8901e" /><stop offset="1" stopColor="#6a4508" /></linearGradient>
          <linearGradient id="brillo" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.8" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
          <clipPath id="esp">{hexes.map(([x, y], i) => <polygon key={i} points={hex(x, y)} />)}</clipPath>
        </defs>
        <g transform={`translate(400 300) rotate(${interpolate(f, [0, d], [-4, 4])}) scale(${interpolate(f, [0, d], [0.78, 0.9])})`}>
          {hexes.map(([x, y], i) => <polygon key={i} points={hex(x, y)} fill="url(#oro)" stroke="#2a1a00" strokeWidth="2" />)}
          <g clipPath="url(#esp)"><rect x={barrido - 60} y={-300} width={120} height={600} fill="url(#brillo)" transform="rotate(20)" opacity="0.7" /></g>
          <line x1="0" y1="-10" x2="0" y2="-230" stroke="#999" strokeWidth="3" />
          <circle cx="0" cy="-232" r="10" fill="#bbb" />
        </g>
        <g opacity={interpolate(f, [5, 20], [0, 1], { extrapolateRight: 'clamp' })}>
          <text x="860" y="230" fill={C.cian} fontFamily={F.titulo} fontSize="13" letterSpacing="3">CURVA DE LUZ · TRÁNSITO</text>
          <line x1="860" y1="300" x2="1200" y2="300" stroke={C.cian} strokeOpacity="0.2" />
          <polyline points={pts.join(' ')} fill="none" stroke={C.cian} strokeWidth="2.5" />
          <text x="860" y="370" fill={C.blanco} fillOpacity="0.6" fontFamily={F.inter} fontSize="12">brillo de la estrella frente al tiempo</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// Esquema de órbita: la gravedad apunta al centro (fuerza centrípeta)
const OrbitaVectores: React.FC = () => {
  const f = useCurrentFrame();
  const a = -0.9 + f / 60;
  const R = 210, cx = 640, cy = 370;
  const px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R * 0.42;
  const dash = interpolate(f, [0, 30], [1400, 0], { extrapolateRight: 'clamp' });
  const ux = (cx - px), uy = (cy - py), ul = Math.hypot(ux, uy);
  const tx = -Math.sin(a), ty = Math.cos(a) * 0.42, tl = Math.hypot(tx, ty);
  const flecha = interpolate(f, [12, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 52%, #14203a 0%, #05070F 65%)' }}>
      <Polvo n={80} />
      <svg width="1280" height="720" style={{ position: 'absolute' }}>
        <defs>
          <radialGradient id="est"><stop offset="0" stopColor="#fff2d0" /><stop offset="0.3" stopColor="#ff8a3d" /><stop offset="1" stopColor="#ff8a3d" stopOpacity="0" /></radialGradient>
          <marker id="pc" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={C.naranja} /></marker>
          <marker id="pv" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={C.cian} /></marker>
        </defs>
        <ellipse cx={cx} cy={cy} rx={R} ry={R * 0.42} fill="none" stroke={C.cian} strokeOpacity="0.55" strokeWidth="2" strokeDasharray="1400" strokeDashoffset={dash} />
        <circle cx={cx} cy={cy} r={70} fill="url(#est)" />
        <line x1={px} y1={py} x2={px + (ux / ul) * 130 * flecha} y2={py + (uy / ul) * 130 * flecha} stroke={C.naranja} strokeWidth="4" markerEnd="url(#pc)" />
        <line x1={px} y1={py} x2={px + (tx / tl) * 110 * flecha} y2={py + (ty / tl) * 110 * flecha} stroke={C.cian} strokeWidth="3" markerEnd="url(#pv)" />
        <circle cx={px} cy={py} r={16} fill="#c9a27e" stroke="#fff" strokeOpacity="0.4" />
        <text x={px + (ux / ul) * 150} y={py + (uy / ul) * 150} fill={C.naranja} fontFamily={F.titulo} fontSize="20" textAnchor="middle" opacity={flecha}>F</text>
        <text x={px + (tx / tl) * 130} y={py + (ty / tl) * 130} fill={C.cian} fontFamily={F.titulo} fontSize="20" textAnchor="middle" opacity={flecha}>v</text>
        <text x={cx + R + 20} y={cy + 6} fill={C.blanco} fillOpacity="0.5" fontFamily={F.titulo} fontSize="16">r</text>
        <line x1={cx} y1={cy} x2={cx + R} y2={cy} stroke={C.blanco} strokeOpacity="0.3" strokeDasharray="6 6" />
      </svg>
    </AbsoluteFill>
  );
};

// Velocidad de escape: lanzamientos que vuelven a caer… y uno que escapa
const Escape: React.FC = () => {
  const f = useCurrentFrame();
  const X = 640, Y = 470; // punto de lanzamiento (cima del planeta)
  const tiros = [
    { W: -230, H: 150, escapa: false, d: 0 },
    { W: 300, H: 250, escapa: false, d: 5 },
    { W: -330, H: 330, escapa: false, d: 10 },
    { W: 0, H: 0, escapa: true, d: 16 },
  ];
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 120%, #3a2414 0%, #05070F 60%)' }}>
      <Polvo n={70} />
      <svg width="1280" height="720" style={{ position: 'absolute' }}>
        <defs>
          <radialGradient id="pla" cx="50%" cy="20%" r="70%"><stop offset="0" stopColor="#d9a27a" /><stop offset="1" stopColor="#3a2012" /></radialGradient>
        </defs>
        <circle cx={X} cy={Y + 560} r="560" fill="url(#pla)" />
        <circle cx={X} cy={Y + 560} r="566" fill="none" stroke={C.naranja} strokeOpacity="0.45" strokeWidth="5" />
        {tiros.map((t, i) => {
          const k = interpolate(f, [t.d, t.d + 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) });
          const pts = Array.from({ length: 50 }, (_, j) => {
            const s = (j / 49) * k;
            if (t.escapa) return [X + 260 * Math.pow(s, 1.6), Y - 420 * Math.pow(s, 0.85)];
            return [X + t.W * s, Y - t.H * 4 * s * (1 - s) + 30 * s * s];
          });
          const fin = pts[pts.length - 1];
          return (
            <g key={i}>
              <polyline points={pts.map((q) => q.join(',')).join(' ')} fill="none" stroke={t.escapa ? C.cian : C.blanco} strokeOpacity={t.escapa ? 1 : 0.45} strokeWidth={t.escapa ? 3.5 : 2} strokeDasharray={t.escapa ? undefined : '8 8'} />
              {k > 0 && <circle cx={fin[0]} cy={fin[1]} r={t.escapa ? 7 : 4} fill={t.escapa ? C.cian : C.blanco} />}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

export const Visual: React.FC<{ nombre: string }> = ({ nombre }) => {
  switch (nombre) {
    case 'tierra': return <EscenaTierra />;
    case 'tierra-apagon': return <EscenaTierra modo="apagon" />;
    case 'tierra-orbitas': return <EscenaTierra modo="orbitas" />;
    case 'tierra-logo': return <EscenaTierra modo="logo" />;
    case 'sol': return <EscenaSol />;
    case 'sol-furia': return <ImagenKB src="img/nasa-sdo-llamarada-x.jpg" filtro="hue-rotate(195deg) saturate(1.6) brightness(1.1) contrast(1.15)" zoom={[1.1, 1.5]} origen="15% 62%" />;
    case 'exoplaneta': return <EscenaExoplaneta />;
    case 'exoplaneta-cerca': return <EscenaExoplaneta cerca />;
    case 'estrellas': return <EscenaEstrellas />;
    case 'base': return <Base />;
    case 'webb': return <Webb />;
    case 'orbita-vectores': return <OrbitaVectores />;
    case 'escape': return <Escape />;
    case 'negro':
    default: return <AbsoluteFill style={{ background: C.espacio }}><Polvo n={50} /></AbsoluteFill>;
  }
};

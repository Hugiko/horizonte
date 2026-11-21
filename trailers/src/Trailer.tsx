import React from 'react';
import { AbsoluteFill, Html5Audio as Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BARRA, C, F, Flash, Grano, LightLeak, Letterbox, Scanlines, Vineta, useTemblor } from './efectos';
import { DurPlano } from './dur';
import { Rotulo } from './rotulos';
import { Visual } from './visuales';
import { Precarga } from './escenas3d';
import type { Linea, PlanoT } from './tipos';

const cl = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const colorLeak = (v: string) => (v.startsWith('sol') || v === 'tierra-apagon' ? C.naranja : v.startsWith('exo') ? '#ff6a3a' : C.cian);

const PlanoVista: React.FC<{ p: PlanoT; vozSrc?: string }> = ({ p, vozSrc }) => {
  const f = useCurrentFrame();
  const temblor = useTemblor(p.impacto ? 12 : 0, 10);
  const push = interpolate(f, [0, p.frames], [1, 1.07]);
  return (
    <AbsoluteFill style={{ background: C.espacio, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translate(${temblor.x}px, ${temblor.y}px) scale(${push})` }}>
        <Visual nombre={p.visual} />
      </AbsoluteFill>
      <LightLeak color={colorLeak(p.visual)} intensidad={p.tipo === 'alerta' ? 0.45 : 0.28} semilla={p.id} />
      {(p.tipo === 'hud' || p.tipo === 'vera' || p.tipo === 'pista') && <Scanlines />}
      <AbsoluteFill style={{ transform: `translate(${temblor.x * 0.6}px, ${temblor.y * 0.6}px)` }}>
        <Rotulo p={p} vozSrc={vozSrc} />
      </AbsoluteFill>
      {p.flash && <Flash duracion={p.impacto ? 7 : 4} color={p.tipo === 'alerta' ? '#ffb080' : '#ffffff'} />}
      {/* fundido de entrada corto para cortes sin golpe */}
      {!p.flash && <AbsoluteFill style={{ background: '#000', opacity: interpolate(f, [0, 3], [1, 0], cl) }} />}
    </AbsoluteFill>
  );
};

const Subtitulos: React.FC<{ linea: Linea }> = ({ linea }) => {
  const f = useCurrentFrame();
  const v = linea.voces.find((x) => f >= x.from && f < x.from + x.frames - 30);
  if (!v) return null;
  const o = interpolate(f, [v.from, v.from + 4, v.from + v.frames - 36, v.from + v.frames - 30], [0, 1, 1, 0], cl);
  const texto = v.texto.replace('ele hache ese cuatro siete cinco be', 'LHS 475b').replace('mil ochocientos cincuenta y nueve', '1859').replace('dos mil setenta y uno', '2071');
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BARRA, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: o }}>
      <div style={{ fontFamily: F.inter, fontSize: 19, color: v.locutor === 'vera' ? C.cian : '#e8e4dc', maxWidth: 1000, textAlign: 'center', letterSpacing: '0.01em' }}>
        {v.locutor === 'vera' && <span style={{ fontFamily: F.titulo, fontSize: 13, letterSpacing: '0.2em', marginRight: 10 }}>VERA</span>}
        {texto}
      </div>
    </div>
  );
};

export const Trailer: React.FC<{ linea: Linea }> = ({ linea }) => {
  const f = useCurrentFrame();
  // nivel de "ducking" (0-1): la música baja cuando habla la narración
  const duck = (g: number) => {
    let d = 0;
    for (const p of linea.planos) {
      if (p.vozFrom === undefined || !p.vozFrames) continue;
      const a = p.vozFrom, b = p.vozFrom + p.vozFrames;
      d = Math.max(d, interpolate(g, [a - 6, a, b, b + 10], [0, 1, 1, 0], cl));
    }
    return d;
  };
  const abrir = interpolate(f, [0, 20, linea.total - 20, linea.total], [1.6, 1, 1, 1.6], cl);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Precarga>
      {linea.planos.map((p) => {
        const v = linea.voces.find((x) => x.from === p.vozFrom);
        return (
          <Sequence key={p.id} from={p.from} durationInFrames={p.frames} name={p.id}>
            <DurPlano.Provider value={p.frames}>
              <PlanoVista p={p} vozSrc={v?.src} />
            </DurPlano.Provider>
          </Sequence>
        );
      })}
      </Precarga>
      <Vineta />
      <Grano fuerza={0.1} />
      <Letterbox abrir={Math.min(abrir, 1.6)} />
      <Subtitulos linea={linea} />

      {/* música */}
      {linea.musica.map((m, i) => (
        <Sequence key={`m${i}`} from={m.from} durationInFrames={m.frames} name={`música ${i + 1}`}>
          <Audio
            src={staticFile(m.src)}
            startFrom={m.startFrom}
            volume={(lf) => {
              const env = interpolate(lf, [0, m.fadeIn, m.frames - m.fadeOut, m.frames], [0, 1, 1, 0], cl);
              return 0.8 * m.volumen * env * (1 - 0.68 * duck(m.from + lf));
            }}
          />
        </Sequence>
      ))}
      {/* narración */}
      {linea.voces.map((v, i) => (
        <Sequence key={`v${i}`} from={v.from} durationInFrames={v.frames} name={`voz ${i + 1}`}>
          <Audio src={staticFile(v.src)} volume={0.74} />
        </Sequence>
      ))}
      {/* efectos */}
      {linea.sfx.map((s, i) => (
        <Sequence key={`s${i}`} from={s.from} name={`sfx ${s.src.split('/').pop()}`}>
          <Audio src={staticFile(s.src)} volume={s.volumen * 0.55} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

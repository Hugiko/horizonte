import type { Guion, Linea, PlanoT, MusicaT, SfxT } from './tipos';

const IMPACTOS = new Set(['braam', 'hit', 'boom']);

// Convierte el guion (segundos) + duraciones de voz en una línea de tiempo en fotogramas.
export function calcularLinea(g: Guion, voz: Record<string, number>): Linea {
  const fps = g.fps || 30;
  const planos: PlanoT[] = [];
  const sfx: SfxT[] = [];
  const voces: Linea['voces'] = [];
  let t = 0;
  for (const p of g.planos) {
    const ini = p.voz?.inicio ?? 0.15;
    const dv = p.voz ? voz[p.id] ?? 0 : 0;
    const dur = Math.max(p.duracion, p.voz ? ini + dv + 0.22 : 0);
    const frames = Math.round(dur * fps);
    const golpes = (p.sfx ?? []).filter((s) => IMPACTOS.has(s.nombre) && Math.abs(s.en) < 0.05);
    const pt: PlanoT = { ...p, from: t, frames, flash: golpes.length > 0, impacto: golpes.some((s) => s.nombre !== 'boom' || (s.volumen ?? 1) > 0.6) };
    if (p.voz && dv) {
      pt.vozFrom = t + Math.round(ini * fps);
      pt.vozFrames = Math.round(dv * fps);
      voces.push({ from: pt.vozFrom, frames: Math.round((dv + 1.2) * fps), src: `audio/${g.id}/voz-${p.id}.wav`, locutor: p.voz.locutor, texto: p.voz.texto });
    }
    for (const s of p.sfx ?? []) sfx.push({ src: `audio/sfx/${s.nombre}.wav`, from: Math.max(0, t + Math.round(s.en * fps)), volumen: s.volumen ?? 1 });
    planos.push(pt);
    t += frames;
  }
  const total = t;
  const inicioPlano = (id: string) => planos.find((p) => p.id === id)?.from ?? 0;
  const musica: MusicaT[] = g.musica.map((m, i) => {
    const from = inicioPlano(m.plano);
    const siguiente = i + 1 < g.musica.length ? inicioPlano(g.musica[i + 1].plano) : total;
    let desde = m.desde ?? 0;
    if (m.alinearFinal) desde = Math.max(0, m.hasta - (total - from) / fps);
    const frames = Math.min(siguiente - from, Math.round((m.hasta - desde) * fps));
    return { src: m.src, from, frames, startFrom: Math.round(desde * fps), volumen: m.volumen ?? 0.8, fadeIn: Math.round((m.fadeIn ?? 0.3) * fps), fadeOut: Math.round((m.fadeOut ?? 0.5) * fps) };
  });
  return { id: g.id.replace(/\./g, '-'), ID: g.id, total, fps, planos, musica, sfx, voces };
}

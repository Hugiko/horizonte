// Sintetiza los efectos de tráiler (sin audio de terceros): braam, boom, hit, riser, whoosh, tick, glitch.
// Uso: node scripts/sfx.mjs   → public/audio/sfx/<nombre>.wav (estéreo, 44.1 kHz)
import fs from 'node:fs';
import path from 'node:path';
import { writeWav, biquad, sweepLP, reverb, normalize, softclip, env, SR } from './dsp.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const OUT = path.join(ROOT, 'public', 'audio', 'sfx');
fs.mkdirSync(OUT, { recursive: true });

let seed = 1234;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const buf = (s) => new Float32Array(Math.round(s * SR));

function finish(name, x, { wet = 0.25, size = 1.4, target = 0.89, width = 0 } = {}) {
  const [rl, rr] = reverb(x, { size, damp: 0.5 });
  const L = new Float32Array(x.length), R = new Float32Array(x.length);
  let d = Math.round(width * SR), i;
  for (i = 0; i < x.length; i++) { L[i] = x[i] + rl[i] * wet * 8; R[i] = (i >= d ? x[i - d] : 0) + rr[i] * wet * 8; }
  normalize([L, R], target);
  writeWav(path.join(OUT, `${name}.wav`), [L, R]);
  console.log('sfx', name, (x.length / SR).toFixed(2), 's');
}

// BRAAM: metales graves desafinados (sierra) con filtro que se abre, distorsión y cola larga
{
  const T = 5.5, x = buf(T);
  const freqs = [43.65, 43.9, 87.3, 87.0, 65.4, 130.8, 43.4];
  const ph = freqs.map(() => Math.random());
  for (let i = 0; i < x.length; i++) {
    const t = i / SR; let v = 0;
    freqs.forEach((f, k) => { ph[k] = (ph[k] + f * (1 + 0.002 * Math.sin(t * 3 + k)) / SR) % 1; v += (2 * ph[k] - 1) * (k < 2 ? 1 : 0.6); });
    x[i] = v * env(t, 0.06, 1.6) ;
  }
  let y = sweepLP(x, (i) => { const t = i / SR; return 180 + 1400 * Math.exp(-t / 0.5) + 300 * Math.exp(-t / 2); }, 1.2);
  y = softclip(y, 2.2);
  // sub
  for (let i = 0; i < y.length; i++) { const t = i / SR; y[i] = y[i] * 0.8 + Math.sin(2 * Math.PI * 43.65 * t) * env(t, 0.02, 2.2) * 0.9; }
  finish('braam', y, { wet: 0.3, size: 1.6, width: 0.012 });
}

// BOOM: golpe sub con caída de tono + ruido
{
  const T = 4, x = buf(T); let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, f = 32 + 90 * Math.exp(-t / 0.08);
    ph += 2 * Math.PI * f / SR;
    x[i] = Math.sin(ph) * env(t, 0.004, 1.1) + rnd() * env(t, 0.001, 0.05) * 0.6;
  }
  finish('boom', softclip(biquad(x, 'lp', 2500), 1.8), { wet: 0.35, size: 1.8 });
}

// HIT: impacto de tráiler (sub + chasquido metálico + ruido filtrado)
{
  const T = 3, x = buf(T); let ph = 0;
  const metal = [212, 317, 451, 593, 811, 1143];
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, f = 45 + 140 * Math.exp(-t / 0.05);
    ph += 2 * Math.PI * f / SR;
    let m = 0; metal.forEach((mf, k) => { m += Math.sin(2 * Math.PI * mf * t + k) * Math.exp(-t / (0.25 + k * 0.05)); });
    x[i] = Math.sin(ph) * env(t, 0.002, 0.6) * 1.1 + m * 0.12 + rnd() * env(t, 0.001, 0.09) * 0.7;
  }
  finish('hit', softclip(x, 2), { wet: 0.45, size: 1.7, width: 0.008 });
}

// RISER: ruido + barrido ascendente que crece (3 s) y corta seco
{
  const T = 3.2, x = buf(T); let ph = 0, ph2 = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR, p = Math.min(1, t / 3.0), f = 120 * Math.pow(12, p);
    ph += 2 * Math.PI * f / SR; ph2 += 2 * Math.PI * f * 1.5 / SR;
    const amp = Math.pow(p, 2.2) * (t > 3.0 ? Math.exp(-(t - 3.0) / 0.03) : 1);
    x[i] = (Math.sin(ph) * 0.35 + Math.sin(ph2) * 0.2 + rnd() * 0.5) * amp;
  }
  const y = sweepLP(x, (i) => 300 + 9000 * Math.pow(Math.min(1, i / SR / 3), 2), 2);
  finish('riser', y, { wet: 0.25, size: 1.2, width: 0.015 });
}

// WHOOSH: ruido con banda que barre arriba y abajo
{
  const T = 1.4, x = buf(T);
  for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = rnd() * Math.sin(Math.PI * Math.min(1, t / 1.0)) ** 2; }
  const y = sweepLP(x, (i) => { const t = i / SR; return 400 + 5000 * Math.sin(Math.PI * Math.min(1, t / 1.0)); }, 3);
  finish('whoosh', y, { wet: 0.2, size: 1, width: 0.02 });
}

// TICK: reloj (4 golpes secos, 1 por cada 0,5 s)
{
  const T = 2.4, x = buf(T);
  for (let k = 0; k < 4; k++) {
    const t0 = k * 0.5;
    for (let i = 0; i < 0.06 * SR; i++) {
      const t = i / SR, j = Math.round(t0 * SR) + i;
      x[j] += (Math.sin(2 * Math.PI * (k % 2 ? 2600 : 3100) * t) * 0.6 + rnd() * 0.5) * Math.exp(-t / 0.006);
    }
  }
  finish('tick', biquad(x, 'hp', 900), { wet: 0.3, size: 0.8, target: 0.7 });
}

// GLITCH: ráfagas digitales troceadas
{
  const T = 0.9, x = buf(T); let hold = 0, v = 0, on = true;
  for (let i = 0; i < x.length; i++) {
    if (i % 600 === 0) on = Math.random() > 0.35;
    if (hold-- <= 0) { v = rnd(); hold = 4 + Math.floor(Math.random() * 40); }
    const t = i / SR;
    x[i] = on ? (v * 0.6 + Math.sign(Math.sin(2 * Math.PI * (300 + 2000 * Math.random()) * t)) * 0.2) * Math.exp(-t / 0.5) : 0;
  }
  finish('glitch', biquad(x, 'hp', 200), { wet: 0.1, size: 0.6, target: 0.75 });
}

// Utilidades de audio mínimas (sin dependencias): WAV, filtros biquad, reverb, normalización.
import fs from 'node:fs';

export const SR = 44100;

export function writeWav(path, channels, sr = SR) {
  const n = channels[0].length, nc = channels.length;
  const buf = Buffer.alloc(44 + n * nc * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * nc * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(nc, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * nc * 2, 28); buf.writeUInt16LE(nc * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * nc * 2, 40);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
    const v = Math.max(-1, Math.min(1, channels[c][i]));
    buf.writeInt16LE(Math.round(v * 32767), o); o += 2;
  }
  fs.writeFileSync(path, buf);
}

export function readWav(path) {
  const b = fs.readFileSync(path);
  let p = 12, fmt, data;
  while (p < b.length) {
    const id = b.toString('ascii', p, p + 4), size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { nc: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === 'data') { data = b.subarray(p + 8, p + 8 + size); break; }
    p += 8 + size + (size % 2);
  }
  const n = data.length / 2 / fmt.nc;
  const ch = Array.from({ length: fmt.nc }, () => new Float32Array(n));
  for (let i = 0; i < n; i++) for (let c = 0; c < fmt.nc; c++) ch[c][i] = data.readInt16LE((i * fmt.nc + c) * 2) / 32768;
  return { sr: fmt.sr, channels: ch };
}

// Biquad (RBJ cookbook)
export function biquad(x, type, f, q = 0.707, gainDb = 0, sr = SR) {
  const w = 2 * Math.PI * f / sr, cw = Math.cos(w), sw = Math.sin(w), a = sw / (2 * q), A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + a; a1 = -2 * cw; a2 = 1 - a; }
  else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + a; a1 = -2 * cw; a2 = 1 - a; }
  else if (type === 'bp') { b0 = a; b1 = 0; b2 = -a; a0 = 1 + a; a1 = -2 * cw; a2 = 1 - a; }
  else if (type === 'peak') { b0 = 1 + a * A; b1 = -2 * cw; b2 = 1 - a * A; a0 = 1 + a / A; a1 = -2 * cw; a2 = 1 - a / A; }
  else if (type === 'lowshelf') {
    const s = 2 * Math.sqrt(A) * a;
    b0 = A * ((A + 1) - (A - 1) * cw + s); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - s);
    a0 = (A + 1) + (A - 1) * cw + s; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - s;
  }
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

// Filtro paso bajo de frecuencia variable (una pasada por muestra), f(i) en Hz
export function sweepLP(x, fAt, q = 0.9, sr = SR) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const w = 2 * Math.PI * Math.min(fAt(i), sr * 0.45) / sr, cw = Math.cos(w), a = Math.sin(w) / (2 * q);
    const b0 = (1 - cw) / 2, b1 = 1 - cw, a0 = 1 + a, a1 = -2 * cw, a2 = 1 - a;
    const v = (b0 * x[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

// Reverb Schroeder estéreo sencilla; devuelve [L, R] (solo la parte húmeda)
export function reverb(x, { size = 1, damp = 0.4, sr = SR } = {}) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((d) => Math.round(d * size * sr / 44100));
  const out = [new Float32Array(x.length), new Float32Array(x.length)];
  const fb = 0.84;
  combs.forEach((d, k) => {
    const buf = new Float32Array(d + (k % 2) * 23); let idx = 0, lp = 0;
    const o = out[k % 2];
    for (let i = 0; i < x.length; i++) {
      const v = buf[idx];
      lp = v * (1 - damp) + lp * damp;
      buf[idx] = x[i] + lp * fb;
      o[i] += v;
      idx = (idx + 1) % buf.length;
    }
  });
  for (const o of out) {
    for (const d of [556, 441, 341, 225]) {
      const buf = new Float32Array(d); let idx = 0;
      for (let i = 0; i < o.length; i++) {
        const b = buf[idx], v = -o[i] + b; buf[idx] = o[i] + b * 0.5; o[i] = v; idx = (idx + 1) % d;
      }
    }
    for (let i = 0; i < o.length; i++) o[i] *= 0.06;
  }
  return out;
}

export function peak(chs) { let m = 0; for (const c of chs) for (const v of c) m = Math.max(m, Math.abs(v)); return m; }
export function normalize(chs, target = 0.89) { const p = peak(chs) || 1; for (const c of chs) for (let i = 0; i < c.length; i++) c[i] *= target / p; return chs; }
export function softclip(x, drive = 1) { const y = new Float32Array(x.length); for (let i = 0; i < x.length; i++) y[i] = Math.tanh(x[i] * drive); return y; }
export const env = (t, a, d) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / d));

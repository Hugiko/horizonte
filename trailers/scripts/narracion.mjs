// Genera la narración de un tráiler con edge-tts y la procesa (graves, eco, voz de "radio" para VERA).
// Uso: node scripts/narracion.mjs F1.1        (requiere: pip install edge-tts)
// Salida: public/audio/<ID>/voz-<plano>.wav  +  guiones/<ID>.voz.json (duraciones en segundos)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { readWav, writeWav, biquad, reverb, normalize, softclip, SR } from './dsp.mjs';
import { tts as ttsEleven } from './voz_elevenlabs.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const FFMPEG = path.join(ROOT, 'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
const id = process.argv[2];
if (!id) { console.error('Uso: node scripts/narracion.mjs <ID>'); process.exit(1); }
const guion = JSON.parse(fs.readFileSync(path.join(ROOT, 'guiones', `${id}.json`), 'utf8'));
const outDir = path.join(ROOT, 'public', 'audio', id);
const tmp = path.join(outDir, '_tmp');
fs.mkdirSync(tmp, { recursive: true });

const duraciones = {};
for (const plano of guion.planos) {
  if (!plano.voz) continue;
  const cfg = guion.voces[plano.voz.locutor];
  const mp3 = path.join(tmp, `${plano.id}.mp3`), raw = path.join(tmp, `${plano.id}.wav`);
  if (cfg.motor === 'elevenlabs') {
    // caché por texto+voz+ajustes: nunca se gasta crédito dos veces en la misma frase
    const textoTTS = `${plano.voz.etiqueta ?? cfg.etiqueta ?? ''} ${plano.voz.texto}`.trim() // etiquetas de tono de eleven_v3 (no salen en subtítulos)
    const clave = crypto.createHash('sha1').update(JSON.stringify([cfg.voiceId, cfg.ajustes, cfg.modelo, textoTTS])).digest('hex').slice(0, 16);
    const cache = path.join(ROOT, 'cache-voz', `${clave}.mp3`);
    if (!fs.existsSync(cache)) await ttsEleven(cfg.voiceId, textoTTS, cache, cfg.ajustes, cfg.modelo ?? 'eleven_multilingual_v2');
    fs.copyFileSync(cache, mp3);
  } else {
    execFileSync('edge-tts', ['--voice', cfg.voz, `--rate=${cfg.rate}`, `--pitch=${cfg.pitch}`, '--text', plano.voz.texto, '--write-media', mp3], { stdio: 'inherit' });
  }
  execFileSync(FFMPEG, ['-loglevel', 'error', '-y', '-i', mp3, '-ac', '1', '-ar', String(SR), '-c:a', 'pcm_s16le', raw]);
  let x = readWav(raw).channels[0];

  // Recorta silencios al principio y al final
  const thr = 0.008;
  let a = 0, b = x.length - 1;
  while (a < b && Math.abs(x[a]) < thr) a++;
  while (b > a && Math.abs(x[b]) < thr) b--;
  x = x.slice(Math.max(0, a - 400), Math.min(x.length, b + 2200));

  // Cadena de voz de tráiler (con voces naturales solo un filtro suave: el procesado fuerte suena robótico)
  x = biquad(x, 'hp', cfg.radio ? 160 : 60);
  if (!cfg.natural) {
  x = biquad(x, 'lowshelf', 140, 0.7, 7 * (cfg.graves ?? 0.5));
  x = biquad(x, 'peak', 3200, 1, 2.5);
  if (cfg.radio) { x = biquad(x, 'peak', 1800, 0.8, 3); x = softclip(x, 1.6); }
  }
  // compresión simple (ganancia lenta según envolvente)
  if (!cfg.natural) { let e = 0; const y = new Float32Array(x.length); const k = 0.9995;
    let mx = 0; for (const v of x) mx = Math.max(mx, Math.abs(v));
    for (let i = 0; i < x.length; i++) { const v = x[i] / (mx || 1); e = Math.max(Math.abs(v), e * k); const g = e > 0.25 ? Math.pow(0.25 / e, 0.55) : 1; y[i] = v * g; }
    x = y; }
  const cola = Math.round(SR * 1.2);
  const xx = new Float32Array(x.length + cola); xx.set(x);
  const [rl, rr] = reverb(xx, { size: 1.15, damp: 0.45 });
  const wet = cfg.eco ?? 0.15;
  const L = new Float32Array(xx.length), R = new Float32Array(xx.length);
  for (let i = 0; i < xx.length; i++) { L[i] = xx[i] + rl[i] * wet * 6; R[i] = xx[i] + rr[i] * wet * 6; }
  normalize([L, R], 0.89);
  const out = path.join(outDir, `voz-${plano.id}.wav`);
  writeWav(out, [L, R]);
  duraciones[plano.id] = +(x.length / SR).toFixed(3); // duración de la voz sin la cola de eco
  console.log(`${plano.id}: ${duraciones[plano.id]} s`);
}
fs.rmSync(tmp, { recursive: true, force: true });
fs.writeFileSync(path.join(ROOT, 'guiones', `${id}.voz.json`), JSON.stringify(duraciones, null, 2));
console.log('Listo →', path.join(ROOT, 'guiones', `${id}.voz.json`));

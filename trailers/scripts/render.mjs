// Renderiza un tráiler: node scripts/render.mjs F1.1 [--qa] [--solo-qa]
//  · MP4 → ../public/trailers/<ID>.mp4 (H.264 1280x720 30 fps, ~1,8 Mbps, AAC 160 kbps)
//  · póster → ../public/trailers/<ID>.jpg
//  · --qa: además guarda un fotograma por plano en out/qa/<ID>/ para revisarlos a ojo
import path from 'node:path';
import fs from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const ID = process.argv[2];
if (!ID) { console.error('Uso: node scripts/render.mjs <ID> [--qa] [--solo-qa]'); process.exit(1); }
const qa = process.argv.includes('--qa') || process.argv.includes('--solo-qa');
const soloQa = process.argv.includes('--solo-qa');
const compId = ID.replace(/\./g, '-');
const outDir = path.resolve(ROOT, '..', 'public', 'trailers');
fs.mkdirSync(outDir, { recursive: true });

const chromiumOptions = { gl: 'angle' };
console.log('Empaquetando…');
const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src', 'index.ts') });
const comp = await selectComposition({ serveUrl, id: compId, chromiumOptions });
const linea = comp.props.linea;
console.log(`${compId}: ${comp.durationInFrames} fotogramas (${(comp.durationInFrames / comp.fps).toFixed(1)} s)`);

if (qa) {
  const qaDir = path.join(ROOT, 'out', 'qa', ID);
  fs.mkdirSync(qaDir, { recursive: true });
  for (const p of linea.planos) {
    for (const [k, frac] of [['a', 0.25], ['b', 0.7]]) {
      const frame = p.from + Math.floor(p.frames * frac);
      await renderStill({ serveUrl, composition: comp, frame, output: path.join(qaDir, `${String(p.from).padStart(4, '0')}-${p.id}-${k}.jpg`), imageFormat: 'jpeg', jpegQuality: 80, chromiumOptions });
    }
    console.log('qa', p.id);
  }
}
if (!soloQa) {
  const guion = JSON.parse(fs.readFileSync(path.join(ROOT, 'guiones', `${ID}.json`), 'utf8'));
  const pp = linea.planos.find((p) => p.id === guion.poster?.plano) ?? linea.planos[linea.planos.length - 3];
  await renderStill({ serveUrl, composition: comp, frame: pp.from + Math.round((guion.poster?.segundo ?? 1.5) * comp.fps), output: path.join(outDir, `${ID}.jpg`), imageFormat: 'jpeg', jpegQuality: 88, chromiumOptions });
  let ultimo = -1;
  await renderMedia({
    serveUrl, composition: comp, codec: 'h264', outputLocation: path.join(outDir, `${ID}.mp4`),
    videoBitrate: '1800k', audioBitrate: '160k', audioCodec: 'aac', pixelFormat: 'yuv420p', chromiumOptions, concurrency: 4, imageFormat: 'jpeg', jpegQuality: 90,
    onProgress: ({ progress }) => { const p = Math.floor(progress * 20); if (p !== ultimo) { ultimo = p; process.stdout.write(`${p * 5}% `); } },
  });
  console.log('\nListo →', path.join(outDir, `${ID}.mp4`));
}

/**
 * Narración realista con ElevenLabs para los tráileres de HORIZONTE.
 *
 * La clave se lee de trailers/.env (ELEVENLABS_API_KEY=...), archivo que nunca se sube a internet.
 *
 * Uso:
 *   node scripts/voz_elevenlabs.mjs voces                 → lista voces en castellano de la biblioteca (para elegir)
 *   node scripts/voz_elevenlabs.mjs muestras              → genera muestras de varias voces en ../muestras_voz/
 *   node scripts/voz_elevenlabs.mjs linea <voiceId> "texto" salida.mp3
 *   node scripts/voz_elevenlabs.mjs credito               → caracteres usados / disponibles este mes
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const envFile = path.join(here, '..', '.env')
if (fs.existsSync(envFile)) process.loadEnvFile(envFile)
const KEY = process.env.ELEVENLABS_API_KEY
if (!KEY) { console.error('Falta ELEVENLABS_API_KEY en trailers/.env'); process.exit(1) }

const API = 'https://api.elevenlabs.io'
const H = { 'xi-api-key': KEY, 'content-type': 'application/json' }

/** Ajustes pensados para un tono de tráiler: algo de variación y mucha expresividad. */
export const AJUSTES = {
  narrador: { stability: 0.38, similarity_boost: 0.85, style: 0.55, use_speaker_boost: true, speed: 0.92 },
  vera: { stability: 0.45, similarity_boost: 0.85, style: 0.4, use_speaker_boost: true, speed: 1.0 },
}

export async function tts(voiceId, texto, salida, ajustes = AJUSTES.narrador, modelo = 'eleven_multilingual_v2') {
  const r = await fetch(`${API}/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ text: texto, model_id: modelo, language_code: 'es', voice_settings: ajustes }),
  })
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`)
  fs.mkdirSync(path.dirname(salida), { recursive: true })
  fs.writeFileSync(salida, Buffer.from(await r.arrayBuffer()))
  return salida
}

async function buscarVoces(genero) {
  const q = new URLSearchParams({ page_size: '12', language: 'es', gender: genero, sort: 'usage_character_count_7d' })
  const r = await fetch(`${API}/v1/shared-voices?${q}`, { headers: H })
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`)
  return (await r.json()).voices ?? []
}

const esCLI = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
const [cmd, ...args] = esCLI ? process.argv.slice(2) : ['__modulo__']
if (cmd === '__modulo__') {
  // importado como módulo: no hacer nada
} else if (cmd === 'credito') {
  const r = await fetch(`${API}/v1/user/subscription`, { headers: H })
  const s = await r.json()
  console.log(`Plan: ${s.tier} · usados ${s.character_count} de ${s.character_limit} caracteres este mes`)
} else if (cmd === 'voces') {
  for (const g of ['male', 'female']) {
    console.log(`\n=== ${g === 'male' ? 'MASCULINAS' : 'FEMENINAS'} ===`)
    for (const v of await buscarVoces(g)) console.log(`${v.voice_id}  ${v.name}  [${v.accent ?? ''} · ${v.use_case ?? ''}] ${v.description?.slice(0, 80) ?? ''}`)
  }
} else if (cmd === 'muestras') {
  const out = path.join(here, '..', '..', 'muestras_voz', 'elevenlabs')
  const textoN = 'Nuestros satélites han caído. La segunda tormenta ya viene de camino. Y esta vez... no habrá segunda oportunidad.'
  const textoV = 'Antes de enviar nada allí, tenemos que pesarlo. Sin báscula. Solo con su órbita.'
  for (const [g, texto, aj] of [['male', textoN, AJUSTES.narrador], ['female', textoV, AJUSTES.vera]]) {
    const voces = (await buscarVoces(g)).filter((v) => !v.accent || /spain|castil|peninsular|españ|european/i.test(`${v.accent} ${v.description} ${v.labels ? JSON.stringify(v.labels) : ''}`)).slice(0, 5)
    for (const v of voces) {
      const f = path.join(out, `${g === 'male' ? 'narrador' : 'VERA'}_${v.name.replace(/[^\w-]+/g, '_')}_${v.voice_id}.mp3`)
      await tts(v.voice_id, texto, f, aj)
      console.log('✓', f)
    }
  }
} else if (cmd === 'linea') {
  const [voiceId, texto, salida] = args
  await tts(voiceId, texto, salida)
  console.log('✓', salida)
} else {
  console.log('Comandos: voces | muestras | linea <voiceId> "texto" salida.mp3 | credito')
}

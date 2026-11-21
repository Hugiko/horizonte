/**
 * Servidor de HORIZONTE. Sirve el juego y guarda el progreso de los jugadores.
 *
 * Variables de entorno (en Render se configuran solas con render.yaml):
 *   PORT              puerto (Render lo asigna)
 *   DATABASE_URL      PostgreSQL. Si falta, se guarda en server/data/db.json
 *   SESSION_SECRET    clave para firmar las sesiones
 *   TEACHER_PASSWORD  contraseña del panel del profesor
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { createStorage } from './storage.js'

const here = path.dirname(fileURLToPath(import.meta.url))
// Variables locales (DATABASE_URL, TEACHER_PASSWORD…) en el archivo .env, que nunca se sube a internet.
const envFile = path.join(here, '..', '.env')
if (fs.existsSync(envFile)) process.loadEnvFile(envFile)
const dataDir = path.join(here, 'data')
const isProd = process.env.NODE_ENV === 'production' || !!process.env.RENDER

function localSecret() {
  const file = path.join(dataDir, '.secret')
  fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'))
  return fs.readFileSync(file, 'utf8').trim()
}

if (isProd && !process.env.DATABASE_URL) {
  console.warn('AVISO: no hay DATABASE_URL. Las partidas se guardan en un archivo que Render borra al reiniciar.')
}
if (isProd && !process.env.SESSION_SECRET) {
  console.warn('AVISO: no hay SESSION_SECRET; se usará una clave local.')
}

const storage = await createStorage({
  databaseUrl: process.env.DATABASE_URL,
  filePath: path.join(dataDir, 'db.json'),
})
const teacherPassword = process.env.TEACHER_PASSWORD || (isProd ? null : 'horizonte')

const app = createApp({
  storage,
  secret: process.env.SESSION_SECRET || localSecret(),
  teacherPassword,
  distDir: path.join(here, '..', 'dist'),
})

const port = Number(process.env.PORT) || 3000
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`HORIZONTE en marcha → http://localhost:${port}  (guardado: ${storage.kind})`)
})

const shutdown = () => server.close(async () => {
  await storage.close()
  process.exit(0)
})
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

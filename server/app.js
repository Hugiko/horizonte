import compression from 'compression'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { createLimiter, createTokens, hashPassword, safeEqualText, verifyPassword } from './auth.js'

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/
const MAX_SAVE_BYTES = 200_000
const HASHED_FILE_RE = /-[A-Za-z0-9_-]{8}\.(js|css|woff2?|ttf)$/

/**
 * Crea la aplicación: API de partidas + la web del juego ya compilada (carpeta dist).
 * @param {{ storage: any, secret: string, teacherPassword: string|null, distDir?: string }} opts
 */
export function createApp({ storage, secret, teacherPassword, distDir }) {
  const app = express()
  const tokens = createTokens(secret)
  const loginLimiter = createLimiter({ max: 10, windowMs: 15 * 60 * 1000 })
  const registerLimiter = createLimiter({ max: 5, windowMs: 60 * 60 * 1000 })

  app.disable('x-powered-by')
  app.set('trust proxy', 1) // Render pone un proxy delante
  app.use(compression())
  app.use('/api', express.json({ limit: '256kb' }))
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
  const auth = (role) => (req, res, next) => {
    const data = tokens.verify((req.get('authorization') ?? '').replace(/^Bearer /, ''))
    if (!data || data.role !== role) return res.status(401).json({ error: 'Sesión caducada. Vuelve a identificarte.' })
    req.user = data.sub
    next()
  }
  const normUser = (u) => (typeof u === 'string' ? u.trim().toLowerCase() : '')
  const validSave = (s) => s && typeof s === 'object' && !Array.isArray(s) && JSON.stringify(s).length <= MAX_SAVE_BYTES

  app.get('/api/health', (_req, res) => res.json({ ok: true, storage: storage.kind }))

  /* ---------- Jugadores ---------- */
  app.post('/api/auth/register', wrap(async (req, res) => {
    const username = normUser(req.body?.username)
    const password = req.body?.password
    if (!USERNAME_RE.test(username))
      return res.status(400).json({ error: 'El nombre de agente debe tener de 3 a 20 caracteres: letras, números, guion o guion bajo, sin espacios.' })
    if (typeof password !== 'string' || password.length < 6 || password.length > 100)
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' })
    if (!registerLimiter(req.ip)) return res.status(429).json({ error: 'Demasiados registros desde este equipo. Espera un rato.' })
    const { salt, hash } = await hashPassword(password)
    if (!(await storage.createPlayer({ username, salt, hash })))
      return res.status(409).json({ error: 'Ese nombre de agente ya existe. Elige otro o identifícate.' })
    res.status(201).json({ token: tokens.issue(username, 'player'), username, save: null, revision: 0 })
  }))

  app.post('/api/auth/login', wrap(async (req, res) => {
    if (!loginLimiter(req.ip)) return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos.' })
    const username = normUser(req.body?.username)
    const password = req.body?.password
    const p = USERNAME_RE.test(username) ? await storage.getPlayer(username) : null
    if (!p || typeof password !== 'string' || !(await verifyPassword(password, p.salt, p.hash)))
      return res.status(401).json({ error: 'Nombre de agente o contraseña incorrectos.' })
    res.json({ token: tokens.issue(username, 'player'), username, save: p.save, revision: p.revision })
  }))

  app.get('/api/save', auth('player'), wrap(async (req, res) => {
    const p = await storage.getPlayer(req.user)
    if (!p) return res.status(401).json({ error: 'La cuenta ya no existe.' })
    res.json({ username: p.username, save: p.save, revision: p.revision, updatedAt: p.updatedAt })
  }))

  app.put('/api/save', auth('player'), wrap(async (req, res) => {
    const { save, baseRevision } = req.body ?? {}
    if (!validSave(save) || !Number.isInteger(baseRevision)) return res.status(400).json({ error: 'Partida no válida.' })
    const r = await storage.updateSave(req.user, save, baseRevision)
    if (r.ok) return res.json({ revision: r.revision })
    if (!r.player) return res.status(401).json({ error: 'La cuenta ya no existe.' })
    // Otra pestaña u otro ordenador guardó antes: se devuelve la versión del servidor.
    res.status(409).json({ error: 'conflict', save: r.player.save, revision: r.player.revision })
  }))

  /* ---------- Ajustes globales (los fija el profesor) ---------- */
  app.get('/api/config', wrap(async (_req, res) => res.json(await storage.getConfig())))

  /* ---------- Profesor ---------- */
  app.post('/api/teacher/login', (req, res) => {
    if (!teacherPassword) return res.status(503).json({ error: 'El panel del profesor no está configurado (falta TEACHER_PASSWORD).' })
    if (!loginLimiter(`t:${req.ip}`)) return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos.' })
    if (!safeEqualText(req.body?.password ?? '', teacherPassword)) return res.status(401).json({ error: 'Contraseña incorrecta.' })
    res.json({ token: tokens.issue('teacher', 'teacher', 7) })
  })
  app.get('/api/teacher/players', auth('teacher'), wrap(async (_req, res) => res.json(await storage.listPlayers())))
  app.put('/api/teacher/players/:username/save', auth('teacher'), wrap(async (req, res) => {
    if (!validSave(req.body?.save)) return res.status(400).json({ error: 'Partida no válida.' })
    const rev = await storage.forceSave(normUser(req.params.username), req.body.save)
    if (rev === null) return res.status(404).json({ error: 'No existe ese jugador.' })
    res.json({ revision: rev })
  }))
  app.put('/api/teacher/config', auth('teacher'), wrap(async (req, res) => {
    const cfg = req.body
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return res.status(400).json({ error: 'Configuración no válida.' })
    await storage.setConfig(cfg)
    res.json({ ok: true })
  }))

  app.use('/api', (_req, res) => res.status(404).json({ error: 'No encontrado.' }))

  /* ---------- Web del juego ---------- */
  if (distDir && fs.existsSync(distDir)) {
    app.use(express.static(distDir, {
      index: false,
      setHeaders(res, file) {
        res.set('Cache-Control', HASHED_FILE_RE.test(file) ? 'public, max-age=31536000, immutable' : 'public, max-age=86400')
      },
    }))
    const indexHtml = path.join(distDir, 'index.html')
    app.use((req, res, next) => {
      if (req.method !== 'GET' || path.extname(req.path)) return next()
      res.set('Cache-Control', 'no-cache')
      res.sendFile(indexHtml)
    })
  }

  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Partida demasiado grande.' })
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Petición no válida.' })
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor.' })
  })
  return app
}

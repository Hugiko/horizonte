/**
 * Almacenamiento de partidas.
 * - Con la variable DATABASE_URL (Render Postgres u otro PostgreSQL): base de datos real.
 * - Sin ella: archivo JSON local (para jugar en el propio ordenador o para pruebas).
 *
 * Interfaz común:
 *   getPlayer(username) → { username, salt, hash, save, revision, createdAt, updatedAt } | null
 *   createPlayer({ username, salt, hash }) → boolean (false si ya existe)
 *   updateSave(username, save, baseRevision) → { ok: true, revision } | { ok: false, player }
 *   forceSave(username, save) → revision | null (lo usa el profesor)
 *   listPlayers() → jugadores sin datos de contraseña
 *   getConfig() / setConfig(obj)
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'

export async function createStorage({ databaseUrl, filePath }) {
  if (!databaseUrl) return createFileStorage(filePath)
  if (/^(mysql|mariadb):\/\//i.test(databaseUrl)) return createMysqlStorage(databaseUrl)
  return createPgStorage(databaseUrl)
}

/* ------------------------------------------------------------------ */
/**
 * MySQL / MariaDB (p. ej. una base ya existente en ZAP-Hosting).
 * Solo usa sus propias tablas con prefijo `horizonte_`: nunca lee ni toca otras tablas.
 * URL: mysql://usuario:contraseña@host:3306/basededatos   (añadir ?ssl=true si el servidor lo exige)
 */
async function createMysqlStorage(url) {
  const { default: mysql } = await import('mysql2/promise')
  const u = new URL(url.replace(/^mariadb:/i, 'mysql:'))
  const pool = mysql.createPool({
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.slice(1)),
    ssl: u.searchParams.get('ssl') === 'true' ? { rejectUnauthorized: false } : undefined,
    connectionLimit: 5,
    connectTimeout: 15000,
    charset: 'utf8mb4',
    timezone: 'Z',
  })
  await pool.query(`
    create table if not exists horizonte_players (
      username   varchar(20) not null primary key,
      salt       varchar(64) not null,
      hash       varchar(128) not null,
      save       longtext null,
      revision   int not null default 0,
      created_at datetime(3) not null,
      updated_at datetime(3) not null
    ) character set utf8mb4`)
  await pool.query(`
    create table if not exists horizonte_config (
      k     varchar(32) not null primary key,
      value longtext not null
    ) character set utf8mb4`)
  const now = () => new Date()
  const row = (r) => r && {
    username: r.username, salt: r.salt, hash: r.hash, save: r.save ? JSON.parse(r.save) : null, revision: r.revision,
    createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString(),
  }
  return {
    kind: 'mysql',
    async getPlayer(username) {
      const [rows] = await pool.query('select * from horizonte_players where username = ?', [username])
      return row(rows[0]) ?? null
    },
    async createPlayer({ username, salt, hash }) {
      const [r] = await pool.query(
        'insert ignore into horizonte_players (username, salt, hash, revision, created_at, updated_at) values (?, ?, ?, 0, ?, ?)',
        [username, salt, hash, now(), now()])
      return r.affectedRows === 1
    },
    async updateSave(username, save, baseRevision) {
      const [r] = await pool.query(
        'update horizonte_players set save = ?, revision = revision + 1, updated_at = ? where username = ? and revision = ?',
        [JSON.stringify(save), now(), username, baseRevision])
      if (r.affectedRows === 1) return { ok: true, revision: baseRevision + 1 }
      return { ok: false, player: publicPlayer(await this.getPlayer(username)) }
    },
    async forceSave(username, save) {
      const [r] = await pool.query(
        'update horizonte_players set save = ?, revision = revision + 1, updated_at = ? where username = ?',
        [JSON.stringify(save), now(), username])
      if (r.affectedRows !== 1) return null
      return (await this.getPlayer(username)).revision
    },
    async listPlayers() {
      const [rows] = await pool.query('select * from horizonte_players order by updated_at desc')
      return rows.map((r) => publicPlayer(row(r)))
    },
    async getConfig() {
      const [rows] = await pool.query(`select value from horizonte_config where k = 'global'`)
      return rows[0] ? JSON.parse(rows[0].value) : {}
    },
    async setConfig(value) {
      await pool.query(
        `insert into horizonte_config (k, value) values ('global', ?) on duplicate key update value = values(value)`,
        [JSON.stringify(value)])
    },
    close: () => pool.end(),
  }
}

const publicPlayer = (p) => p && {
  username: p.username, save: p.save, revision: p.revision, createdAt: p.createdAt, updatedAt: p.updatedAt,
}

/* ------------------------------------------------------------------ */
async function createPgStorage(url) {
  const host = new URL(url).hostname
  // Las URLs internas de Render (dpg-xxxx-a) no usan SSL; las externas sí.
  const ssl = host.includes('.') && host !== 'localhost' ? { rejectUnauthorized: false } : false
  const pool = new pg.Pool({ connectionString: url, ssl, max: 5 })
  await pool.query(`
    create table if not exists players (
      username   text primary key,
      salt       text not null,
      hash       text not null,
      save       jsonb,
      revision   integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists config (
      key   text primary key,
      value jsonb not null
    );
  `)
  const row = (r) => r && {
    username: r.username, salt: r.salt, hash: r.hash, save: r.save, revision: r.revision,
    createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString(),
  }
  return {
    kind: 'postgres',
    async getPlayer(username) {
      const { rows } = await pool.query('select * from players where username = $1', [username])
      return row(rows[0]) ?? null
    },
    async createPlayer({ username, salt, hash }) {
      const r = await pool.query(
        'insert into players (username, salt, hash) values ($1, $2, $3) on conflict do nothing', [username, salt, hash])
      return r.rowCount === 1
    },
    async updateSave(username, save, baseRevision) {
      const r = await pool.query(
        `update players set save = $2, revision = revision + 1, updated_at = now()
         where username = $1 and revision = $3 returning revision`, [username, save, baseRevision])
      if (r.rowCount === 1) return { ok: true, revision: r.rows[0].revision }
      return { ok: false, player: publicPlayer(await this.getPlayer(username)) }
    },
    async forceSave(username, save) {
      const r = await pool.query(
        `update players set save = $2, revision = revision + 1, updated_at = now()
         where username = $1 returning revision`, [username, save])
      return r.rows[0]?.revision ?? null
    },
    async listPlayers() {
      const { rows } = await pool.query('select * from players order by updated_at desc')
      return rows.map((r) => publicPlayer(row(r)))
    },
    async getConfig() {
      const { rows } = await pool.query(`select value from config where key = 'global'`)
      return rows[0]?.value ?? {}
    },
    async setConfig(value) {
      await pool.query(
        `insert into config (key, value) values ('global', $1)
         on conflict (key) do update set value = excluded.value`, [value])
    },
    close: () => pool.end(),
  }
}

/* ------------------------------------------------------------------ */
async function createFileStorage(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  let db = { players: {}, config: {} }
  try {
    db = JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }
  // Escrituras en cola y atómicas (archivo temporal + renombrar) para no corromper el JSON.
  let queue = Promise.resolve()
  const persist = () => {
    queue = queue.then(async () => {
      const tmp = `${filePath}.tmp`
      await fs.writeFile(tmp, JSON.stringify(db))
      await fs.rename(tmp, filePath)
    })
    return queue
  }
  const now = () => new Date().toISOString()
  return {
    kind: 'archivo',
    async getPlayer(username) {
      return db.players[username] ? structuredClone(db.players[username]) : null
    },
    async createPlayer({ username, salt, hash }) {
      if (db.players[username]) return false
      db.players[username] = { username, salt, hash, save: null, revision: 0, createdAt: now(), updatedAt: now() }
      await persist()
      return true
    },
    async updateSave(username, save, baseRevision) {
      const p = db.players[username]
      if (!p || p.revision !== baseRevision) return { ok: false, player: publicPlayer(p && structuredClone(p)) }
      Object.assign(p, { save, revision: p.revision + 1, updatedAt: now() })
      await persist()
      return { ok: true, revision: p.revision }
    },
    async forceSave(username, save) {
      const p = db.players[username]
      if (!p) return null
      Object.assign(p, { save, revision: p.revision + 1, updatedAt: now() })
      await persist()
      return p.revision
    },
    async listPlayers() {
      return Object.values(db.players)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map((p) => publicPlayer(structuredClone(p)))
    },
    async getConfig() {
      return structuredClone(db.config ?? {})
    },
    async setConfig(value) {
      db.config = value
      await persist()
    },
    close: () => queue,
  }
}

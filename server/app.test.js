import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { createStorage } from './storage.js'

let server, base, dir, storage

beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'horizonte-'))
  storage = await createStorage({ filePath: path.join(dir, 'db.json') })
  const app = createApp({ storage, secret: 'test-secret', teacherPassword: 'profe123' })
  await new Promise((r) => { server = app.listen(0, r) })
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(async () => {
  await new Promise((r) => server.close(r))
  await storage.close()
  await fs.rm(dir, { recursive: true, force: true })
})

const call = async (method, url, body, token) => {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, data: await res.json() }
}

describe('API de partidas', () => {
  let token

  it('registra un jugador y rechaza datos no válidos', async () => {
    expect((await call('POST', '/api/auth/register', { username: 'a', password: '123456' })).status).toBe(400)
    expect((await call('POST', '/api/auth/register', { username: 'lucia', password: '123' })).status).toBe(400)
    const r = await call('POST', '/api/auth/register', { username: 'Lucia', password: 'secreto1' })
    expect(r.status).toBe(201)
    expect(r.data.username).toBe('lucia')
    token = r.data.token
    expect((await call('POST', '/api/auth/register', { username: 'lucia', password: 'otraclave' })).status).toBe(409)
  })

  it('inicia sesión solo con la contraseña correcta', async () => {
    expect((await call('POST', '/api/auth/login', { username: 'lucia', password: 'mal' })).status).toBe(401)
    const r = await call('POST', '/api/auth/login', { username: 'LUCIA', password: 'secreto1' })
    expect(r.status).toBe(200)
    expect(r.data.revision).toBe(0)
  })

  it('guarda la partida y detecta conflictos entre dispositivos', async () => {
    expect((await call('PUT', '/api/save', { save: { xp: 10 }, baseRevision: 0 })).status).toBe(401)
    const a = await call('PUT', '/api/save', { save: { xp: 10 }, baseRevision: 0 }, token)
    expect(a.data.revision).toBe(1)
    const stale = await call('PUT', '/api/save', { save: { xp: 5 }, baseRevision: 0 }, token)
    expect(stale.status).toBe(409)
    expect(stale.data.save).toEqual({ xp: 10 })
    const g = await call('GET', '/api/save', null, token)
    expect(g.data).toMatchObject({ save: { xp: 10 }, revision: 1 })
  })

  it('el progreso sobrevive a un reinicio del servidor (archivo)', async () => {
    const again = await createStorage({ filePath: path.join(dir, 'db.json') })
    expect((await again.getPlayer('lucia')).save).toEqual({ xp: 10 })
  })

  it('rechaza tokens falsificados', async () => {
    const fake = token.slice(0, -2) + (token.endsWith('A') ? 'BB' : 'AA')
    expect((await call('GET', '/api/save', null, fake)).status).toBe(401)
  })

  it('el profesor ve jugadores y puede modificar su partida', async () => {
    expect((await call('POST', '/api/teacher/login', { password: 'x' })).status).toBe(401)
    const t = (await call('POST', '/api/teacher/login', { password: 'profe123' })).data.token
    expect((await call('GET', '/api/teacher/players', null, token)).status).toBe(401)
    const list = await call('GET', '/api/teacher/players', null, t)
    expect(list.data[0]).toMatchObject({ username: 'lucia' })
    expect(list.data[0].hash).toBeUndefined()
    const f = await call('PUT', '/api/teacher/players/lucia/save', { save: { xp: 99 } }, t)
    expect(f.data.revision).toBe(2)
    await call('PUT', '/api/teacher/config', { umbralEstrellas: 0.5 }, t)
    expect((await call('GET', '/api/config')).data).toEqual({ umbralEstrellas: 0.5 })
  })
})

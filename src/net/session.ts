/**
 * Sesión del jugador y sincronización automática de la partida con el servidor.
 * - Cada cambio en la partida se envía al servidor (agrupado cada 1,5 s).
 * - Si otro ordenador guardó antes (conflicto), gana la versión con más progreso.
 * - Al cerrar la pestaña se envía lo pendiente.
 */
import { create } from 'zustand'
import { snapshot, useGame, type SaveData } from '../state/store'
import { api, ApiError, getToken, setToken } from './api'

export type SyncStatus = 'desconectado' | 'conectando' | 'guardado' | 'guardando' | 'pendiente' | 'error'

interface SessionState {
  username: string | null
  status: SyncStatus
  error: string | null
  revision: number
}

export const useSession = create<SessionState>(() => ({
  username: null, status: 'desconectado', error: null, revision: 0,
}))

const USER_KEY = 'horizonte-agente'
const progreso = (s: Partial<SaveData> | null) =>
  s ? (s.xp ?? 0) + Object.values(s.misiones ?? {}).reduce((a, m) => a + (m.estrellas ?? 0) * 100, 0) : -1

let timer: ReturnType<typeof setTimeout> | undefined
let inFlight: Promise<void> | null = null
let dirty = false
let applyingRemote = false
let unsubscribe: (() => void) | null = null

async function push(keepalive = false): Promise<void> {
  const { username, revision } = useSession.getState()
  if (!username || !dirty) return
  if (inFlight) { await inFlight; return push(keepalive) }
  dirty = false
  useSession.setState({ status: 'guardando' })
  inFlight = (async () => {
    try {
      const r = await api<{ revision: number }>('/save', {
        method: 'PUT', body: { save: snapshot(), baseRevision: revision }, keepalive, retries: keepalive ? 0 : 4,
      })
      useSession.setState({ revision: r.revision, status: dirty ? 'pendiente' : 'guardado', error: null })
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const remote = e.data.save as Partial<SaveData> | null
        const remoteRev = e.data.revision as number
        useSession.setState({ revision: remoteRev })
        // Gana el servidor si el profesor ha cambiado la partida o si tiene más progreso
        if ((remote?.profesorVersion ?? 0) > (snapshot().profesorVersion ?? 0) || progreso(remote) > progreso(snapshot())) {
          applyingRemote = true
          useGame.getState().aplicarPartida(remote)
          applyingRemote = false
          useSession.setState({ status: 'guardado' })
        } else {
          dirty = true // nuestra versión tiene más progreso: reintentar sobre la nueva revisión
        }
      } else if (e instanceof ApiError && e.status === 401) {
        logout(e.message)
        return
      } else {
        dirty = true
        useSession.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) })
      }
    } finally {
      inFlight = null
    }
    if (dirty) schedule(5000)
  })()
  return inFlight
}

function schedule(ms = 1500) {
  clearTimeout(timer)
  timer = setTimeout(() => void push(), ms)
}

function startSync() {
  unsubscribe?.()
  unsubscribe = useGame.subscribe((s, prev) => {
    if (applyingRemote || !useSession.getState().username) return
    // solo cuentan cambios en los datos de partida (no la calidad gráfica)
    if (JSON.stringify(snapshot(s)) === JSON.stringify(snapshot(prev))) return
    dirty = true
    if (useSession.getState().status !== 'guardando') useSession.setState({ status: 'pendiente' })
    schedule()
  })
}

function adopt(username: string, token: string, save: Partial<SaveData> | null, revision: number) {
  setToken(token)
  try { localStorage.setItem(USER_KEY, username) } catch { /* sin almacenamiento */ }
  applyingRemote = true
  useGame.getState().aplicarPartida(save)
  applyingRemote = false
  useSession.setState({ username, revision, status: 'guardado', error: null })
  startSync()
}

export async function register(username: string, password: string) {
  const r = await api<{ token: string; username: string; save: null; revision: number }>(
    '/auth/register', { method: 'POST', body: { username, password }, token: null })
  adopt(r.username, r.token, null, r.revision)
}

export async function login(username: string, password: string) {
  const r = await api<{ token: string; username: string; save: SaveData | null; revision: number }>(
    '/auth/login', { method: 'POST', body: { username, password }, token: null })
  adopt(r.username, r.token, r.save, r.revision)
}

/** Recupera la sesión guardada en este navegador al abrir el juego. */
export async function resume(): Promise<void> {
  if (!getToken()) return
  useSession.setState({ status: 'conectando' })
  try {
    const r = await api<{ username: string; save: SaveData | null; revision: number }>('/save', { retries: 6 })
    adopt(r.username, getToken()!, r.save, r.revision)
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) logout()
    else useSession.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) })
  }
}

export function logout(reason?: string) {
  clearTimeout(timer)
  unsubscribe?.()
  unsubscribe = null
  dirty = false
  setToken(null)
  useGame.getState().aplicarPartida(null)
  useSession.setState({ username: null, status: 'desconectado', error: reason ?? null, revision: 0 })
}

export const lastUsername = () => { try { return localStorage.getItem(USER_KEY) ?? '' } catch { return '' } }

/** Envía ya los cambios pendientes (por ejemplo, antes de cerrar sesión). */
export const flush = () => { clearTimeout(timer); return push() }

if (typeof window !== 'undefined') {
  const onHide = () => { if (dirty) void push(true) }
  window.addEventListener('pagehide', onHide)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') onHide() })
}

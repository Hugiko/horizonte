/** Cliente HTTP de la API del servidor de HORIZONTE. */
const TOKEN_KEY = 'horizonte-sesion'

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* navegador sin almacenamiento: la sesión dura lo que la pestaña */ }
}

export class ApiError extends Error {
  status: number
  data: Record<string, unknown>
  constructor(status: number, data: Record<string, unknown>) {
    super(typeof data.error === 'string' ? data.error : `Error ${status}`)
    this.status = status
    this.data = data
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Petición JSON con reintentos ante fallos de red.
 * (El plan gratuito de Render "duerme" el servidor: el primer acceso puede tardar ~1 minuto.)
 */
export async function api<T = Record<string, unknown>>(
  path: string,
  opts: { method?: string; body?: unknown; retries?: number; keepalive?: boolean; token?: string | null } = {},
): Promise<T> {
  const { method = 'GET', body, retries = 4, keepalive = false } = opts
  const token = opts.token === undefined ? getToken() : opts.token
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`./api${path}`, {
        method,
        keepalive,
        headers: {
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) return data as T
      // 502/503/504: el servidor está arrancando → reintentar
      if (res.status >= 502 && attempt < retries) { await sleep(1500 * 2 ** attempt); continue }
      throw new ApiError(res.status, data)
    } catch (e) {
      if (e instanceof ApiError) throw e
      if (attempt >= retries) throw new ApiError(0, { error: 'No hay conexión con la base ADM. Revisa internet.' })
      await sleep(1500 * 2 ** attempt)
    }
  }
}

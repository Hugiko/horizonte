import crypto from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(crypto.scrypt)

/** Contraseñas: scrypt con sal aleatoria. Nunca se guarda la contraseña. */
export async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const key = await scrypt(password.normalize('NFKC'), salt, 64)
  return { salt, hash: key.toString('hex') }
}

export async function verifyPassword(password, salt, hash) {
  const { hash: candidate } = await hashPassword(password, salt)
  const a = Buffer.from(candidate, 'hex')
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** Tokens de sesión firmados con HMAC: base64url(payload).base64url(firma). */
export function createTokens(secret) {
  const sign = (data) => crypto.createHmac('sha256', secret).update(data).digest('base64url')
  return {
    issue(sub, role, days = 60) {
      const payload = Buffer.from(JSON.stringify({ sub, role, exp: Date.now() + days * 86400000 })).toString('base64url')
      return `${payload}.${sign(payload)}`
    },
    verify(token) {
      if (typeof token !== 'string') return null
      const [payload, sig] = token.split('.')
      if (!payload || !sig) return null
      const expected = sign(payload)
      if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
      try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
        return data.exp > Date.now() ? data : null
      } catch {
        return null
      }
    },
  }
}

/** Limitador sencillo de intentos por IP (contra ataques de fuerza bruta). */
export function createLimiter({ max, windowMs }) {
  const hits = new Map()
  return (key) => {
    const now = Date.now()
    const h = hits.get(key)
    if (!h || h.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs })
      if (hits.size > 10000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k)
      return true
    }
    h.count++
    return h.count <= max
  }
}

export function safeEqualText(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest()
  const hb = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(ha, hb)
}

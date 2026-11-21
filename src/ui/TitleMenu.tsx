import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { flush, lastUsername, login, logout, register, resume, useSession } from '../net/session'
import { useGame, RANGOS, rangoDe, type Calidad, type Personaje } from '../state/store'
import { useUI } from '../state/ui'
import { sfx } from '../audio/audio'
import { SyncBadge } from './SyncBadge'

const CALIDADES: Calidad[] = ['baja', 'media', 'alta']

function AuthPanel() {
  const [mode, setMode] = useState<'login' | 'register'>(lastUsername() ? 'login' : 'register')
  const [username, setUsername] = useState(lastUsername())
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [busy, setBusy] = useState(false)
  const sessionError = useSession((s) => s.error)
  const [error, setError] = useState<string | null>(sessionError)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (mode === 'register' && password !== password2) return setError('Las contraseñas no coinciden.')
    setBusy(true)
    try {
      await (mode === 'login' ? login(username, password) : register(username, password))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth glass" onSubmit={submit}>
      <div className="auth-tabs">
        <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setError(null) }}>Nuevo agente</button>
        <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setError(null) }}>Ya tengo cuenta</button>
      </div>
      <label>Nombre de agente
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username"
          placeholder="p. ej. lucia_2027" maxLength={20} required autoFocus />
      </label>
      <label>Contraseña
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required />
      </label>
      {mode === 'register' && (
        <label>Repite la contraseña
          <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" minLength={6} required />
        </label>
      )}
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="primary-btn" disabled={busy}>
        {busy ? 'Conectando con la base ADM…' : mode === 'login' ? 'Entrar' : 'Crear agente'}
      </button>
      <p className="auth-note">Tu progreso se guarda en el servidor de la ADM: puedes seguir jugando desde cualquier ordenador.</p>
    </form>
  )
}

function CharacterPicker({ onPick, onCancel }: { onPick: (p: Personaje) => void; onCancel: () => void }) {
  return (
    <div className="picker glass">
      <h2>Elige tu ingeniero/a</h2>
      <div className="picker-options">
        {(['chica', 'chico'] as Personaje[]).map((p) => (
          <button key={p} className="picker-card" onClick={() => onPick(p)}>
            <svg viewBox="0 0 80 120" aria-hidden>
              <circle cx="40" cy="26" r="15" />
              {p === 'chica' && <path d="M24 26c0-14 32-14 32 0v14h-6V28H30v12h-6z" className="hair" />}
              {p === 'chico' && <path d="M25 22c2-12 28-12 30 0l-4-3H29z" className="hair" />}
              <path d="M18 112V70c0-16 10-24 22-24s22 8 22 24v42z" />
              <path d="M40 52v58" className="seam" />
            </svg>
            <span>{p === 'chica' ? 'Ingeniera' : 'Ingeniero'}</span>
          </button>
        ))}
      </div>
      <button className="link-btn" onClick={onCancel}>Volver</button>
    </div>
  )
}

export function TitleMenu() {
  const { t } = useTranslation()
  const { iniciada, nuevaPartida, calidad, setCalidad, ajustes, xp, cinematicas, volumen, setVolumen } = useGame()
  const rango = rangoDe(xp)
  const ir = useUI((s) => s.ir)
  const entrar = () => { sfx.open(); if (!cinematicas.includes('prologo')) ir({ id: 'cinematica', cine: 'prologo', despues: { id: 'base' } }); else ir({ id: 'base' }) }
  const username = useSession((s) => s.username)
  const status = useSession((s) => s.status)
  const [view, setView] = useState<'menu' | 'confirm' | 'pick'>('menu')
  const dias = Math.max(0, Math.ceil((new Date(ajustes.fechaPAU).getTime() - Date.now()) / 86400000))

  useEffect(() => { void resume() }, [])

  const salir = async () => { await flush(); logout() }

  return (
    <div className="overlay">
      <div className="title-menu">
        <div className="logo">{t('title')}</div>
        <div className="subtitle">{t('subtitle')}</div>

        {!username && status === 'conectando' && <p className="auth-note">Conectando con la base ADM…</p>}
        {!username && status !== 'conectando' && <AuthPanel />}
        {!username && <button className="menu-btn small" onClick={() => ir({ id: 'profesor' })}>{t('menu.teacher')}</button>}

        {username && view === 'menu' && (
          <>
            <div className="agent">Agente <b>{username}</b> · {RANGOS[rango]}</div>
            <button className="menu-btn" disabled={!iniciada} onClick={entrar}>{t('menu.continue')}</button>
            <button className="menu-btn" onClick={() => setView(iniciada ? 'confirm' : 'pick')}>{t('menu.newGame')}</button>
            <button className="menu-btn" onClick={() => setCalidad(CALIDADES[(CALIDADES.indexOf(calidad) + 1) % 3])}>
              {t('menu.settings')} · calidad {calidad}
            </button>
            <label className="menu-vol">Volumen <input type="range" min={0} max={1} step={0.05} value={volumen} onChange={(e) => setVolumen(Number(e.target.value))} /></label>
            <button className="menu-btn" onClick={() => ir({ id: 'profesor' })}>{t('menu.teacher')}</button>
            <button className="menu-btn" onClick={() => ir({ id: 'creditos' })}>{t('menu.credits')}</button>
            <button className="menu-btn small" onClick={salir}>Cerrar sesión</button>
          </>
        )}
        {username && view === 'confirm' && (
          <div className="confirm glass">
            <p>Empezar una partida nueva <b>borra todo tu progreso</b>. ¿Seguro?</p>
            <div className="row">
              <button className="primary-btn danger" onClick={() => setView('pick')}>Sí, empezar de cero</button>
              <button className="link-btn" onClick={() => setView('menu')}>Cancelar</button>
            </div>
          </div>
        )}
        {username && view === 'pick' && (
          <CharacterPicker onPick={(p) => { nuevaPartida(p); setView('menu'); ir({ id: 'cinematica', cine: 'prologo', despues: { id: 'base' } }) }} onCancel={() => setView('menu')} />
        )}
      </div>

      <div className="countdown glass">
        <div className="label">{t('countdown').toUpperCase()}</div>
        <div className="days">{dias} <span style={{ fontSize: '1rem' }}>{t('days')}</span></div>
      </div>
      {username && <SyncBadge />}
    </div>
  )
}

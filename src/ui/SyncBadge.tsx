import { useSession, type SyncStatus } from '../net/session'

const LABEL: Record<SyncStatus, string> = {
  desconectado: 'Sin sesión',
  conectando: 'Conectando…',
  guardado: 'Progreso guardado',
  guardando: 'Guardando…',
  pendiente: 'Cambios sin guardar',
  error: 'Sin conexión · reintentando',
}

/** Indicador discreto del estado de guardado en el servidor. */
export function SyncBadge() {
  const status = useSession((s) => s.status)
  return (
    <div className={`sync-badge sync-${status}`} title={useSession.getState().error ?? ''}>
      <span className="dot" /> {LABEL[status]}
    </div>
  )
}

import { create } from 'zustand'

export type Pantalla =
  | { id: 'titulo' }
  | { id: 'base' }
  | { id: 'mapa' }
  | { id: 'capitulo'; cap: number }
  | { id: 'teoria'; cap: number; modulo?: number }
  | { id: 'mision'; mision: string; volver: Pantalla }
  | { id: 'taller' }
  | { id: 'estadisticas' }
  | { id: 'profesor' }
  | { id: 'creditos' }
  | { id: 'simulacro'; materia: 'fisica' | 'matematicas' }
  | { id: 'cinematica'; cine: string; despues: Pantalla }
  | { id: 'holocubierta' }
  | { id: 'hangar' }
  | { id: 'trailer'; mision: string; volver: Pantalla }

export type Herramienta = 'calculadora' | 'constantes' | 'normal' | null

interface UIState {
  pantalla: Pantalla
  herramienta: Herramienta
  plano: number // plano de cámara activo en los tráileres/cinemáticas
  toasts: { id: number; titulo: string; texto: string; tipo: 'logro' | 'info' | 'rango' }[]
  ir: (p: Pantalla) => void
  setHerramienta: (h: Herramienta) => void
  toast: (titulo: string, texto: string, tipo?: 'logro' | 'info' | 'rango') => void
  quitarToast: (id: number) => void
}

let n = 0
export const useUI = create<UIState>((set) => ({
  pantalla: { id: 'titulo' },
  herramienta: null,
  plano: 0,
  toasts: [],
  ir: (pantalla) => set({ pantalla, herramienta: null }),
  setHerramienta: (herramienta) => set({ herramienta }),
  toast: (titulo, texto, tipo = 'info') => {
    const id = ++n
    set((s) => ({ toasts: [...s.toasts, { id, titulo, texto, tipo }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5200)
  },
  quitarToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

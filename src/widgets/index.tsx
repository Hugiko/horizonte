import { lazy, Suspense, type ComponentType } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
const W: Record<string, ComponentType<any>> = {
  campo: lazy(() => import('./Campo').then((m) => ({ default: m.Campo }))),
  grafo: lazy(() => import('./Grafo').then((m) => ({ default: m.Grafo }))),
  orbita: lazy(() => import('./Orbita').then((m) => ({ default: m.Orbita }))),
  plot: lazy(() => import('./Plot').then((m) => ({ default: m.Plot }))),
  optica: lazy(() => import('./Optica').then((m) => ({ default: m.Optica }))),
  geo3d: lazy(() => import('./Geo3D').then((m) => ({ default: m.Geo3D }))),
  particula: lazy(() => import('./Particula').then((m) => ({ default: m.Particula }))),
  reactor: lazy(() => import('./Misc').then((m) => ({ default: m.Reactor }))),
  arbol: lazy(() => import('./Misc').then((m) => ({ default: m.Arbol }))),
  espira: lazy(() => import('./Misc').then((m) => ({ default: m.Espira }))),
  onda: lazy(() => import('./Misc').then((m) => ({ default: m.Onda }))),
}

export interface AjusteState { valor: number; disparo: number } // disparo cambia en cada "Ejecutar"

export function Widget({ id, props, ajuste }: { id: string; props: Record<string, unknown>; ajuste?: AjusteState }) {
  const C = W[id]
  if (!C) return null
  return (
    <div className="widget">
      <Suspense fallback={<div className="widget-loading">Cargando simulación…</div>}>
        <C {...props} ajuste={ajuste} />
      </Suspense>
    </div>
  )
}

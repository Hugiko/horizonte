export interface ModuloTeoria {
  titulo: string
  materia: 'fisica' | 'matematicas'
  vera: string // frase de VERA que abre el módulo
  texto: string // admite $...$ y $$...$$
  widget?: { id: string; props: Record<string, unknown>; nota?: string }
  check: { pregunta: string; opciones: string[]; correcta: number; explicacion: string }
}

export interface Teoria {
  cap: number
  intro: string
  modulos: ModuloTeoria[]
  ejemplos: { titulo: string; enunciado: string; solucion: string }[]
  ficha: { formulas: string[]; errores: string[]; examen: string }
}

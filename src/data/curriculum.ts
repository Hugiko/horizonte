/**
 * ORDEN DEL CURSO — archivo de configuración.
 * El profesor puede reordenar capítulos o mover misiones si el instituto
 * da los temas en otro orden. Solo hay que cambiar el orden de este array
 * (y el campo `orden`).
 */
export interface Capitulo {
  id: number
  orden: number
  titulo: string
  epoca: string
  historia: string
  fisica: { tema: string; bloquePAU: string; teoria: string[] }
  matematicas: { tema: string; bloquePAU: string; teoria: string[] }
  misiones: string[] // ids de misión; el jefe va siempre el último
  jefe: string
  escena: string
}

export const CURRICULUM: Capitulo[] = [
  {
    id: 1, orden: 1, titulo: 'Caída del cielo', epoca: 'Sept–Oct', escena: 'orbita_baja',
    historia: 'La tormenta ha llenado la órbita de restos. Primer día en la ADM.',
    fisica: { tema: 'Ley de gravitación y campo gravitatorio', bloquePAU: 'Campo gravitatorio',
      teoria: ['Ley de gravitación universal', 'Campo gravitatorio de masas puntuales y superposición', 'Líneas de campo', 'Campo y peso'] },
    matematicas: { tema: 'Matrices', bloquePAU: 'Álgebra',
      teoria: ['Operaciones con matrices', 'Potencias de matrices', 'Rango de una matriz con parámetro'] },
    misiones: ['F1.1', 'F1.2', 'F1.3', 'M1.1', 'M1.2', 'X1.1'], jefe: 'J1',
  },
  {
    id: 2, orden: 2, titulo: 'Órbitas', epoca: 'Oct–Nov', escena: 'lanzamiento',
    historia: 'Hay que relanzar los satélites de comunicaciones y meteorológicos.',
    fisica: { tema: 'Energía, potencial y órbitas', bloquePAU: 'Campo gravitatorio',
      teoria: ['Campo conservativo y energía potencial', 'Potencial gravitatorio', 'Velocidad orbital y de escape', 'Energía y tipo de trayectoria', 'Leyes de Kepler y momento angular', 'Materia oscura y curvas de rotación'] },
    matematicas: { tema: 'Determinantes e inversa', bloquePAU: 'Álgebra',
      teoria: ['Determinantes y propiedades', 'Matriz inversa', 'Ecuaciones matriciales'] },
    misiones: ['F2.1', 'F2.2', 'F2.3', 'F2.4', 'M2.1', 'M2.2', 'X2.1'], jefe: 'J2',
  },
  {
    id: 3, orden: 3, titulo: 'Tormenta de carga', epoca: 'Nov–Dic', escena: 'escudo',
    historia: 'Llega una oleada de partículas cargadas y hay que proteger las instalaciones.',
    fisica: { tema: 'Campo eléctrico', bloquePAU: 'Campo electromagnético',
      teoria: ['Campo y superposición', 'Potencial, energía y trabajo', 'Analogías con el campo gravitatorio', 'Flujo y teorema de Gauss', 'Movimiento de cargas'] },
    matematicas: { tema: 'Sistemas de ecuaciones', bloquePAU: 'Álgebra',
      teoria: ['Teorema de Rouché-Frobenius', 'Método de Gauss', 'Regla de Cramer', 'Discusión con parámetros'] },
    misiones: ['F3.1', 'F3.2', 'F3.3', 'F3.4', 'M3.1', 'M3.2', 'X3.1'], jefe: 'J3',
  },
  {
    id: 4, orden: 4, titulo: 'Líneas de fuerza', epoca: 'Ene', escena: 'subestacion',
    historia: 'Las subestaciones y los equipos de análisis necesitan campos magnéticos.',
    fisica: { tema: 'Campo magnético', bloquePAU: 'Campo electromagnético',
      teoria: ['Fuerza de Lorentz', 'Cargas en campos magnéticos', 'Selector de velocidades y espectrómetro', 'Campo de hilos, espiras y solenoides', 'Fuerzas entre conductores'] },
    matematicas: { tema: 'Vectores, rectas y planos', bloquePAU: 'Geometría',
      teoria: ['Productos escalar, vectorial y mixto', 'Ecuaciones de la recta', 'Ecuaciones del plano'] },
    misiones: ['F4.1', 'F4.2', 'F4.3', 'M4.1', 'M4.2', 'X4.1'], jefe: 'J4',
  },
  {
    id: 5, orden: 5, titulo: 'Inducción', epoca: 'Ene–Feb', escena: 'central',
    historia: 'Hay que volver a poner en marcha los generadores y la red de transporte.',
    fisica: { tema: 'Inducción electromagnética', bloquePAU: 'Campo electromagnético',
      teoria: ['Flujo magnético', 'Leyes de Faraday y Lenz', 'Alternador, motor y transformador'] },
    matematicas: { tema: 'Posiciones, ángulos y distancias', bloquePAU: 'Geometría',
      teoria: ['Posiciones relativas', 'Ángulos', 'Distancias', 'Simétricos'] },
    misiones: ['F5.1', 'F5.2', 'F5.3', 'M5.1', 'M5.2', 'X5.1'], jefe: 'J5',
  },
  {
    id: 6, orden: 6, titulo: 'Vibraciones', epoca: 'Feb–Mar', escena: 'puerto',
    historia: 'Tras la tormenta empiezan los temblores y el ruido del puerto bloquea los sensores.',
    fisica: { tema: 'MAS, ondas y sonido', bloquePAU: 'Vibraciones y ondas',
      teoria: ['Movimiento armónico simple', 'Energía en el MAS', 'Ondas mecánicas', 'Ecuación de onda', 'Intensidad y decibelios', 'Efecto Doppler'] },
    matematicas: { tema: 'Límites, continuidad y derivadas', bloquePAU: 'Análisis',
      teoria: ['Límites e indeterminaciones', 'Continuidad y Bolzano', 'Derivabilidad', 'Rolle y valor medio', "L'Hôpital"] },
    misiones: ['F6.1', 'F6.2', 'F6.3', 'M6.1', 'M6.2', 'M6.3'], jefe: 'J6',
  },
  {
    id: 7, orden: 7, titulo: 'Luz', epoca: 'Mar–Abr', escena: 'banco_optico',
    historia: 'Hay que reconstruir las comunicaciones ópticas y los sistemas de visión.',
    fisica: { tema: 'Fenómenos ondulatorios y óptica', bloquePAU: 'Vibraciones y ondas',
      teoria: ['Huygens, reflexión y refracción', 'Reflexión total y fibra óptica', 'Interferencia y difracción', 'Espectro electromagnético', 'Óptica geométrica', 'El ojo e instrumentos ópticos'] },
    matematicas: { tema: 'Aplicaciones de la derivada', bloquePAU: 'Análisis',
      teoria: ['Monotonía y extremos', 'Curvatura e inflexión', 'Representación de funciones', 'Optimización'] },
    misiones: ['F7.1', 'F7.2', 'F7.3', 'F7.4', 'M7.1', 'M7.2', 'M7.3'], jefe: 'J7',
  },
  {
    id: 8, orden: 8, titulo: 'Más allá de lo clásico', epoca: 'Abr', escena: 'laboratorio_cuantico',
    historia: 'Los relojes y sensores de precisión fallan. La física clásica ya no basta.',
    fisica: { tema: 'Relatividad y física cuántica', bloquePAU: 'Física relativista, cuántica, nuclear y de partículas',
      teoria: ['Michelson-Morley y postulados', 'Dilatación del tiempo y contracción de la longitud', 'E = mc²', 'Cuerpo negro y Planck', 'Efecto fotoeléctrico', 'De Broglie e incertidumbre'] },
    matematicas: { tema: 'Integrales', bloquePAU: 'Análisis',
      teoria: ['Primitivas', 'Integración por partes y cambio de variable', 'Racionales sencillas', 'Barrow y teorema fundamental', 'Áreas entre curvas'] },
    misiones: ['F8.1', 'F8.2', 'F8.3', 'M8.1', 'M8.2', 'M8.3'], jefe: 'J8',
  },
  {
    id: 9, orden: 9, titulo: 'El núcleo', epoca: 'Abr–May', escena: 'reactor',
    historia: 'Hay que volver a arrancar el reactor antes de la segunda tormenta.',
    fisica: { tema: 'Física nuclear y de partículas', bloquePAU: 'Física relativista, cuántica, nuclear y de partículas',
      teoria: ['Radiactividad', 'Ley de desintegración y datación', 'Defecto de masa y energía de enlace', 'Fisión y fusión', 'Medicina nuclear', 'Modelo estándar'] },
    matematicas: { tema: 'Probabilidad y distribuciones', bloquePAU: 'Probabilidad y Estadística',
      teoria: ['Probabilidad condicionada', 'Probabilidad total y Bayes', 'Distribución binomial', 'Distribución normal y tablas'] },
    misiones: ['F9.1', 'F9.2', 'F9.3', 'F9.4', 'M9.1', 'M9.2', 'M9.3', 'M9.4'], jefe: 'J9',
  },
  {
    id: 10, orden: 10, titulo: 'La segunda tormenta', epoca: 'May', escena: 'tormenta',
    historia: 'Llega la tormenta. Hay que mantener en pie todo lo reconstruido.',
    fisica: { tema: 'Simulacro final de Física', bloquePAU: 'Todos', teoria: [] },
    matematicas: { tema: 'Simulacro final de Matemáticas II', bloquePAU: 'Todos', teoria: [] },
    misiones: ['SIM-F', 'SIM-M'], jefe: 'SIM-M',
  },
]

/** Ajustes por defecto (el profesor puede cambiarlos desde su panel). */
export const DEFAULTS = {
  umbralEstrellas: 0.6, // 60 % de las estrellas del capítulo
  tolerancia: 0.02, // ±2 %
  intentosAntesDeRendirse: 5,
  creditosIniciales: 10,
  /** Fecha estimada de la PAU (ficticia hasta que se publique el calendario oficial). */
  fechaPAU: '2027-06-02',
  /** Minutos del simulacro de examen por materia. */
  duracionSimulacro: 90,
}

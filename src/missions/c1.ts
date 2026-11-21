import { ASTRO, CONST } from '../data/constants'
import { cerca } from './check'
import { num, sci, texMat, texVec } from './fmt'
import { defineMision } from './types'
import type { Rng } from '../sims/rng'
import { matMul, matPow } from './linalg'

const G = CONST.G
const R = { xp: 120, componentes: 15, creditos: 2 }

/* ================================================================== F1.1 */
function generarRestos(rng: Rng) {
    const masas: { m: number; x: number; y: number }[] = []
    while (masas.length < 3) {
      const x = rng.int(-12, 12), y = rng.int(-12, 12)
      if (Math.hypot(x, y) < 4 || masas.some((q) => Math.hypot(q.x - x, q.y - y) < 4)) continue
      masas.push({ m: rng.nice(2e4, 9e4, 2), x, y })
    }
    const gi = masas.map((q) => { const r = Math.hypot(q.x, q.y); const k = (G * q.m) / r ** 3; return [k * q.x, k * q.y] })
    const g = [gi.reduce((s, v) => s + v[0], 0), gi.reduce((s, v) => s + v[1], 0)]
    const sin2 = masas.map((q) => { const r = Math.hypot(q.x, q.y); const k = (G * q.m) / r ** 2; return [k * q.x, k * q.y] })
    const g1r = [sin2.reduce((s, v) => s + v[0], 0), sin2.reduce((s, v) => s + v[1], 0)]
    const sumaMod = gi.reduce((s, v) => s + Math.hypot(v[0], v[1]), 0)
    return { masas, gi, g, mod: Math.hypot(g[0], g[1]), g1r, sumaMod }
  }


export const F1_1 = defineMision({
  id: 'F1.3', capitulo: 1, materia: 'fisica', titulo: 'Campo de restos',
  bloquePAU: 'Campo gravitatorio', saberes: ['campo gravitatorio de masas puntuales', 'principio de superposición'],
  tipoPAU: ['C'], tipoMision: 'exploracion', dificultad: 'PAU', escena: 'espacio',
  generar: (rng) => {
    for (;;) {
      const p = generarRestos(rng)
      // descartar configuraciones casi alineadas, donde la suma de módulos coincidiría con el módulo de la suma
      if (p.sumaMod / p.mod > 1.06 && Math.hypot(p.g1r[0] - p.g[0], p.g1r[1] - p.g[1]) > 0.05 * p.mod) return p
    }
  },
  contexto: (p) => `Primer día en la ADM. El dron de inspección flota en el origen del sistema de referencia, en $(0,0)$, rodeado por tres fragmentos de un satélite destrozado por la tormenta. El escáner del dron ha medido sus masas y posiciones en el plano orbital (distancias en metros):

${p.masas.map((q: { m: number; x: number; y: number }, i: number) => `- Fragmento ${i + 1}: $m_${i + 1} = ${sci(q.m, 2)}\\ \\text{kg}$ en $(${q.x},\\ ${q.y})$`).join('\n')}

Antes de mover el dron, VERA necesita saber qué campo gravitatorio siente en su posición. Ignora la Tierra: aquí solo cuentan los fragmentos. $G = 6{,}674\\cdot10^{-11}\\ \\text{N·m}^2/\\text{kg}^2$.`,
  widget: { id: 'campo', props: (p) => ({ fuentes: p.masas.map((q: { m: number; x: number; y: number }) => ({ x: q.x, y: q.y, q: q.m })), sonda: [0, 0], tipo: 'gravitatorio', escala: 14 }) },
  partes: [
    {
      etiqueta: 'a)', tipo: 'vector', dim: 2, unidades: 'N/kg',
      enunciado: () => 'Calcula el vector campo gravitatorio total $\\vec g = (g_x,\\ g_y)$ en la posición del dron.',
      respuesta: (p) => p.g,
      errores: [
        { detectar: (r, p) => Array.isArray(r) && cerca(r[0], -p.g[0], 0.03) && cerca(r[1], -p.g[1], 0.03), mensaje: 'Tu vector apunta justo al revés. El campo gravitatorio va desde el dron HACIA cada masa: es atractivo.' },
        { detectar: (r, p) => Array.isArray(r) && cerca(r[0], p.g1r[0], 0.03) && cerca(r[1], p.g1r[1], 0.03), mensaje: 'Parece que has dividido entre $r^2$ al usar el vector $\\vec r$ sin hacerlo unitario. Recuerda: $\\vec g = -\\frac{GM}{r^2}\\hat u_r$, y $\\hat u_r = \\vec r / r$, así que en componentes aparece $r^3$.' },
      ],
      ayuda3: (p) => `El campo creado solo por el fragmento 1 vale $${texVec(p.gi[0], 3)}\\ \\text{N/kg}$. Haz lo mismo con los otros dos y suma componente a componente.`,
    },
    {
      etiqueta: 'b)', tipo: 'numero', unidades: 'N/kg',
      enunciado: () => 'Calcula el módulo del campo total.',
      respuesta: (p) => p.mod,
      errores: [{ detectar: (r, p) => cerca(r, p.sumaMod, 0.02), mensaje: 'Has sumado los módulos de los tres campos. El campo es un vector: primero se suman las componentes y después se calcula el módulo.' }],
      ayuda3: (p) => `Debe salir menor que la suma de los tres módulos por separado, que es $${sci(p.sumaMod)}$ N/kg.`,
    },
  ],
  ayudas: {
    nivel1: 'El campo gravitatorio cumple el principio de superposición: el campo total es la **suma vectorial** de los campos que crea cada masa por separado.',
    nivel2: 'Para cada fragmento: $\\vec g_i = \\dfrac{G m_i}{r_i^3}\\,\\vec r_i$, donde $\\vec r_i$ es el vector que va **desde el dron hasta el fragmento** y $r_i$ su módulo. Después $\\vec g = \\vec g_1 + \\vec g_2 + \\vec g_3$ y $|\\vec g| = \\sqrt{g_x^2+g_y^2}$.',
    nivel3: (p) => `Para el fragmento 1, $r_1 = ${num(Math.hypot(p.masas[0].x, p.masas[0].y), 4)}$ m.`,
  },
  resolucion: (p) => `**Planteamiento.** Por el principio de superposición, $\\vec g = \\sum \\vec g_i$, con $\\vec g_i = \\dfrac{G m_i}{r_i^2}\\,\\hat u_i = \\dfrac{G m_i}{r_i^3}\\,\\vec r_i$, donde $\\vec r_i$ va del dron a cada fragmento (el campo es atractivo).

${p.masas.map((q: { m: number; x: number; y: number }, i: number) => `- Fragmento ${i + 1}: $\\vec r_${i + 1} = (${q.x},\\ ${q.y})$ m, $r_${i + 1} = ${num(Math.hypot(q.x, q.y), 4)}$ m $\\Rightarrow \\vec g_${i + 1} = ${texVec(p.gi[i], 3)}$ N/kg`).join('\n')}

**Suma vectorial:** $$\\vec g = ${texVec(p.g, 3)}\\ \\text{N/kg}$$

**Módulo:** $$|\\vec g| = \\sqrt{g_x^2 + g_y^2} = ${sci(p.mod)}\\ \\text{N/kg}$$

Es un campo diminuto: las masas de los fragmentos son muy pequeñas comparadas con la de un planeta. Aun así, la dirección del vector indica hacia dónde derivaría el dron si no corrigiera.`,
  recompensas: R,
})

/* ================================================================== F1.2 */
const SISTEMAS = [
  { nombre: 'Tierra–Luna a la distancia media', M: ASTRO.earth.mass, m: ASTRO.moon.mass, d: 3.844e8, ficticio: false, a: 'la Tierra', b: 'la Luna' },
  { nombre: 'Tierra–Luna en el perigeo lunar', M: ASTRO.earth.mass, m: ASTRO.moon.mass, d: 3.633e8, ficticio: false, a: 'la Tierra', b: 'la Luna' },
  { nombre: 'Tierra–Luna en el apogeo lunar', M: ASTRO.earth.mass, m: ASTRO.moon.mass, d: 4.055e8, ficticio: false, a: 'la Tierra', b: 'la Luna' },
]
export const F1_2 = defineMision({
  id: 'F1.2', capitulo: 1, materia: 'fisica', titulo: 'El punto de equilibrio',
  bloquePAU: 'Campo gravitatorio', saberes: ['campo gravitatorio', 'punto de campo nulo'], tipoPAU: ['C', 'R'],
  tipoMision: 'calculo', dificultad: 'PAU', escena: 'espacio',
  datoReal: { descripcion: 'Masas de la Tierra y la Luna; perigeo y apogeo lunares', fuente: 'NASA Moon Fact Sheet', verificado: true },
  generar: (rng) => {
    const base = rng.next() < 0.75 ? rng.pick(SISTEMAS) : {
      nombre: 'Kepler-ADM b y su luna (sistema ficticio de entrenamiento)', ficticio: true,
      M: rng.nice(2e24, 9e24, 2), m: 0, d: rng.nice(1.5e8, 5e8, 3), a: 'el planeta', b: 'la luna',
    }
    const m = base.ficticio ? Number((base.M * rng.range(0.005, 0.03)).toPrecision(2)) : base.m
    const k = Math.sqrt(m / base.M)
    const x = base.d / (1 + k)
    return { ...base, m, x, y: base.d - x, xSinRaiz: base.d / (1 + m / base.M) }
  },
  contexto: (p) => `La ADM quiere aparcar una baliza de comunicaciones en el punto de la recta que une ${p.a} con ${p.b} donde el campo gravitatorio total es **nulo**.

Datos (${p.nombre}${p.ficticio ? ' — valores ficticios' : ''}):
- Masa de ${p.a}: $M = ${sci(p.M)}$ kg
- Masa de ${p.b}: $m = ${sci(p.m)}$ kg
- Distancia entre centros: $d = ${sci(p.d, 4)}$ m`,
  widget: { id: 'campo', props: (p) => ({ fuentes: [{ x: -6, y: 0, q: p.M }, { x: 6, y: 0, q: p.m * 30 }], tipo: 'gravitatorio', escala: 9, linea: true }) },
  partes: [
    {
      etiqueta: 'a)', tipo: 'numero', unidades: 'm',
      enunciado: (p) => `¿A qué distancia del centro de ${p.a} hay que colocar la baliza?`,
      respuesta: (p) => p.x,
      errores: [
        { detectar: (r, p) => cerca(r, p.xSinRaiz), mensaje: 'Te ha faltado la raíz cuadrada: al igualar los campos aparece $\\frac{M}{x^2} = \\frac{m}{(d-x)^2}$, y al despejar sale $\\sqrt{m/M}$, no $m/M$.' },
        { detectar: (r, p) => cerca(r, p.y), mensaje: 'Esa es la distancia medida desde el otro cuerpo. Fíjate en desde dónde te piden medir.' },
      ],
      ayuda3: (p) => `El punto está mucho más cerca de ${p.b}: a más del 80 % del camino desde ${p.a}.`,
    },
    {
      etiqueta: 'b)', tipo: 'numero', unidades: 'm',
      enunciado: (p) => `¿Y a qué distancia del centro de ${p.b}?`,
      respuesta: (p) => p.y,
    },
    {
      etiqueta: 'c)', tipo: 'opcion',
      enunciado: () => 'Un técnico dice: «En ese punto la baliza no tiene gravedad: no le afecta ninguna fuerza». ¿Qué respuesta es la correcta?',
      respuesta: () => null,
      opciones: () => [
        { texto: 'Falso: sobre la baliza actúan las dos atracciones; lo que se anula es su suma vectorial, el campo resultante.', correcta: true },
        { texto: 'Verdadero: en ese punto las masas dejan de crear campo gravitatorio.', correcta: false, feedback: 'Cada masa sigue creando su campo en todo el espacio; solo se compensan.' },
        { texto: 'Falso: la baliza sigue sintiendo un campo, porque el campo nunca puede ser nulo.', correcta: false, feedback: 'El campo resultante sí puede ser nulo; lo que no desaparecen son las fuerzas individuales.' },
        { texto: 'Verdadero: como la energía potencial es nula en ese punto, no hay fuerzas.', correcta: false, feedback: 'La energía potencial allí es negativa (suma de dos términos negativos), no nula.' },
      ],
    },
  ],
  ayudas: {
    nivel1: 'En el punto buscado, los campos que crean las dos masas tienen el mismo módulo y sentidos opuestos. Entre las dos masas es el único sitio donde eso puede ocurrir.',
    nivel2: 'Llama $x$ a la distancia al cuerpo de masa $M$. Iguala los módulos: $\\dfrac{GM}{x^2} = \\dfrac{Gm}{(d-x)^2}$. Simplifica $G$ y toma raíces cuadradas antes de despejar.',
    nivel3: (p) => `El cociente $\\sqrt{m/M}$ vale $${num(Math.sqrt(p.m / p.M), 3)}$.`,
  },
  resolucion: (p) => `**Planteamiento.** Entre las dos masas los campos tienen sentidos opuestos. El campo total se anula donde sus módulos son iguales. Sea $x$ la distancia al centro de ${p.a}:
$$\\frac{GM}{x^2} = \\frac{Gm}{(d-x)^2} \\;\\Rightarrow\\; \\frac{d-x}{x} = \\sqrt{\\frac{m}{M}} \\;\\Rightarrow\\; x = \\frac{d}{1+\\sqrt{m/M}}$$

**Cálculo.** $\\sqrt{m/M} = ${num(Math.sqrt(p.m / p.M), 4)}$, así que
$$x = \\frac{${sci(p.d, 4)}}{1 + ${num(Math.sqrt(p.m / p.M), 4)}} = ${sci(p.x, 4)}\\ \\text{m}$$
y desde ${p.b}: $d - x = ${sci(p.y, 4)}$ m.

**c)** El campo nulo no significa ausencia de fuerzas: sobre la baliza actúan dos fuerzas gravitatorias, iguales en módulo y opuestas. Además, el equilibrio es **inestable**: un pequeño desplazamiento hacia cualquiera de los dos cuerpos hace que su atracción gane.`,
  recompensas: R,
})

/* ================================================================== F1.3 */
const DATASETS = [
  { nombre: 'la Luna', r: 3.844e8, T: 27.32 * 86400, unidadT: 'días', Tshow: 27.32, factorT: 86400, h: null as number | null },
  { nombre: 'la ISS', r: ASTRO.earth.radius + 4.2e5, T: 92.7 * 60, unidadT: 'minutos', Tshow: 92.7, factorT: 60, h: 4.2e5 },
  { nombre: 'un satélite geoestacionario (Meteosat)', r: 4.2164e7, T: 86164, unidadT: 'horas', Tshow: 23.934, factorT: 3600, h: null },
]
export const F1_3 = defineMision({
  id: 'F1.3', capitulo: 1, materia: 'fisica', titulo: 'Pesar mundos',
  bloquePAU: 'Campo gravitatorio', saberes: ['tercera ley de Kepler', 'masa de un planeta', 'gravedad en la superficie'],
  tipoPAU: ['C', 'R'], tipoMision: 'decision', dificultad: 'PAU', escena: 'espacio',
  datoReal: { descripcion: 'Órbitas de la Luna, la ISS y Meteosat', fuente: 'NASA / ESA (EUMETSAT)', verificado: true },
  generar: (rng) => {
    const d = rng.pick(DATASETS)
    const MT = (4 * Math.PI ** 2 * d.r ** 3) / (G * d.T ** 2)
    const rL = rng.nice(2e8, 6e8, 3), Tdias = rng.nice(5, 40, 3), Rp = rng.nice(5e6, 1.2e7, 3)
    const Mx = (4 * Math.PI ** 2 * rL ** 3) / (G * (Tdias * 86400) ** 2)
    const gx = (G * Mx) / Rp ** 2
    const masa = rng.nice(800, 3000, 2)
    let ratio = rng.range(0.6, 1.6)
    if (Math.abs(ratio - 1) < 0.08) ratio += 0.2
    const F = Number((ratio * masa * gx).toPrecision(3))
    return { d, MT, rL, Tdias, Rp, Mx, gx, masa, F, puede: F > masa * gx, MTsinSeg: (4 * Math.PI ** 2 * d.r ** 3) / (G * d.Tshow ** 2), MTconH: d.h ? (4 * Math.PI ** 2 * d.h ** 3) / (G * d.T ** 2) : -1 }
  },
  contexto: (p) => `Para calibrar los instrumentos de la ADM, VERA te pide "pesar" la Tierra usando solo la órbita de ${p.d.nombre}: radio orbital $r = ${sci(p.d.r, 4)}$ m${p.d.h ? ` (medido desde el centro de la Tierra; su altura sobre la superficie es de $${sci(p.d.h, 2)}$ m)` : ''} y periodo $T = ${num(p.d.Tshow, 4)}$ ${p.d.unidadT}.

Después, la misma técnica sirve para un exoplaneta (datos **ficticios**) donde la ADM quiere enviar un módulo de aterrizaje:
- Su luna orbita a $r_L = ${sci(p.rL)}$ m con un periodo de $${num(p.Tdias)}$ días.
- Radio del exoplaneta: $R = ${sci(p.Rp)}$ m.
- Módulo de aterrizaje: masa $${num(p.masa, 4)}$ kg, empuje máximo de sus motores $${sci(p.F)}$ N.`,
  partes: [
    {
      etiqueta: 'a)', tipo: 'numero', unidades: 'kg',
      enunciado: () => 'Calcula la masa de la Tierra.',
      respuesta: (p) => p.MT,
      errores: [
        { detectar: (r, p) => cerca(r, p.MTsinSeg, 0.03), mensaje: 'Has usado el periodo sin pasarlo a segundos. En el SI, $T$ va en segundos.' },
        { detectar: (r, p) => p.MTconH > 0 && cerca(r, p.MTconH, 0.03), mensaje: 'Has usado la altura sobre la superficie como radio orbital. El radio de la órbita se mide desde el centro de la Tierra.' },
      ],
      ayuda3: () => 'El resultado debe parecerse al valor de las tablas, $5{,}97\\cdot10^{24}$ kg, con un margen de un pequeño tanto por ciento.',
    },
    {
      etiqueta: 'b)', tipo: 'numero', unidades: 'kg',
      enunciado: () => 'Calcula la masa del exoplaneta.',
      respuesta: (p) => p.Mx,
      errores: [{ detectar: (r, p) => cerca(r, p.Mx * 86400 ** 2, 0.03), mensaje: 'El periodo está en días: hay que pasarlo a segundos (1 día = 86 400 s).' }],
    },
    {
      etiqueta: 'c)', tipo: 'numero', unidades: 'm/s²',
      enunciado: () => 'Calcula la intensidad del campo gravitatorio en la superficie del exoplaneta.',
      respuesta: (p) => p.gx,
      errores: [{ detectar: (r, p) => cerca(r, (G * p.Mx) / p.Rp, 0.03), mensaje: 'Te falta elevar el radio al cuadrado: $g_0 = GM/R^2$.' }],
    },
    {
      etiqueta: 'd)', tipo: 'opcion',
      enunciado: () => 'Decisión de misión: ¿puede el módulo descender de forma controlada (frenar hasta posarse) con su empuje máximo?',
      respuesta: () => null,
      opciones: (p) => [
        { texto: `Sí: su peso allí es de unos $${sci(p.masa * p.gx, 2)}$ N, menor que el empuje máximo.`, correcta: p.puede },
        { texto: `No: su peso allí es de unos $${sci(p.masa * p.gx, 2)}$ N, mayor que el empuje máximo; no podría frenar la caída.`, correcta: !p.puede },
        { texto: 'Sí, siempre: en el espacio los motores no tienen que vencer ningún peso.', correcta: false, feedback: 'Cerca de la superficie el módulo sí tiene peso: $P = m g_0$.' },
      ],
    },
  ],
  ayudas: {
    nivel1: 'La fuerza gravitatoria del planeta es la fuerza centrípeta que mantiene al satélite en su órbita circular.',
    nivel2: 'Iguala $\\dfrac{GMm}{r^2} = m\\,\\dfrac{4\\pi^2}{T^2}\\,r$ y despeja $M = \\dfrac{4\\pi^2 r^3}{G T^2}$ (tercera ley de Kepler). Después $g_0 = GM/R^2$ y el peso es $P = m g_0$.',
    nivel3: (p) => `El periodo de ${p.d.nombre} en segundos es $T = ${sci(p.d.T, 4)}$ s.`,
  },
  resolucion: (p) => `**a)** La atracción gravitatoria actúa como fuerza centrípeta:
$$\\frac{GMm}{r^2} = m\\frac{4\\pi^2}{T^2}r \\;\\Rightarrow\\; M = \\frac{4\\pi^2 r^3}{G T^2}$$
Con $T = ${sci(p.d.T, 4)}$ s y $r = ${sci(p.d.r, 4)}$ m: $M_T = ${sci(p.MT)}$ kg.

**b)** Igual con la luna del exoplaneta ($T = ${num(p.Tdias)}\\cdot 86400 = ${sci(p.Tdias * 86400, 4)}$ s): $M = ${sci(p.Mx)}$ kg.

**c)** $g_0 = \\dfrac{GM}{R^2} = \\dfrac{6{,}674\\cdot10^{-11}\\cdot ${sci(p.Mx)}}{(${sci(p.Rp)})^2} = ${num(p.gx)}\\ \\text{m/s}^2$

**d)** Peso del módulo: $P = m g_0 = ${num(p.masa, 4)}\\cdot ${num(p.gx)} = ${sci(p.masa * p.gx)}$ N. El empuje máximo es $${sci(p.F)}$ N, ${p.puede ? 'mayor que el peso: puede frenar y posarse' : 'menor que el peso: no puede frenar la caída'}.`,
  recompensas: R,
})

/* ================================================================== M1.1 */
function grafoAleatorio(rng: { next(): number; int(a: number, b: number): number }, n: number): number[][] {
  for (let intento = 0; ; intento++) {
    if (intento > 5000) throw new Error('grafoAleatorio: sin grafo válido')
    const A = Array.from({ length: n }, () => Array(n).fill(0))
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (rng.next() < 0.5) { A[i][j] = 1; A[j][i] = 1 }
    // conexo
    const vis = new Set([0]); const st = [0]
    while (st.length) { const v = st.pop()!; for (let j = 0; j < n; j++) if (A[v][j] && !vis.has(j)) { vis.add(j); st.push(j) } }
    if (vis.size !== n) continue
    const A2 = matMul(A, A)
    const filas = A2.map((f, i) => f.reduce((s, x, j) => s + (i === j ? 0 : x), 0))
    const max = Math.max(...filas)
    if (filas.filter((x) => x === max).length === 1) return A
  }
}
const NOMBRES = ['A', 'B', 'C', 'D', 'E']
export const M1_1 = defineMision({
  id: 'M1.2', capitulo: 1, materia: 'matematicas', titulo: 'Red de antenas',
  bloquePAU: 'Álgebra', saberes: ['producto de matrices', 'potencias de matrices', 'matriz de adyacencia'],
  tipoPAU: ['C'], tipoMision: 'decision', dificultad: 'PAU', escena: 'lab',
  generar: (rng) => {
    const n = 5
    const A = grafoAleatorio(rng, n)
    const A2 = matMul(A, A), A3 = matMul(A2, A)
    let i = rng.int(0, n - 1), j = rng.int(0, n - 1)
    while (j === i) j = rng.int(0, n - 1)
    const filas = A2.map((f, a) => f.reduce((s, x, b) => s + (a === b ? 0 : x), 0))
    const mejor = filas.indexOf(Math.max(...filas))
    return { A, A2, A3, i, j, filas, mejor, n }
  },
  contexto: (p) => `La tormenta ha dejado en pie ${p.n} antenas: ${NOMBRES.slice(0, p.n).join(', ')}. Su matriz de adyacencia $A$ tiene un 1 en la posición $(i,j)$ si las antenas $i$ y $j$ tienen enlace directo y un 0 si no lo tienen (filas y columnas en orden ${NOMBRES.slice(0, p.n).join(', ')}):
$$A = ${texMat(p.A)}$$
Una propiedad clave: el elemento $(i,j)$ de $A^k$ cuenta las rutas de exactamente $k$ saltos que van de $i$ a $j$.`,
  widget: { id: 'grafo', props: (p) => ({ A: p.A, nombres: NOMBRES.slice(0, p.n) }) },
  partes: [
    {
      etiqueta: 'a)', tipo: 'matriz', dim: [5, 5],
      enunciado: () => 'Calcula $A^2$.',
      respuesta: (p) => p.A2,
      errores: [{ detectar: (r, p) => Array.isArray(r) && p.A.every((f: number[], i: number) => f.every((x, j) => (r as number[][])[i]?.[j] === x * x)), mensaje: 'Has elevado al cuadrado cada elemento. $A^2 = A\\cdot A$ es un producto de matrices: fila por columna.' }],
      ayuda3: (p) => `La diagonal de $A^2$ cuenta los enlaces de cada antena. Por ejemplo, el elemento $(1,1)$ vale ${p.A2[0][0]}.`,
    },
    {
      etiqueta: 'b)', tipo: 'numero', absTol: 0.01, tolerancia: 0,
      enunciado: (p) => `¿Cuántas rutas de exactamente 3 saltos hay de la antena ${NOMBRES[p.i]} a la antena ${NOMBRES[p.j]}?`,
      respuesta: (p) => p.A3[p.i][p.j],
      errores: [{ detectar: (r, p) => r === p.A2[p.i][p.j] && p.A2[p.i][p.j] !== p.A3[p.i][p.j], mensaje: 'Ese es el número de rutas de 2 saltos (en $A^2$). Para 3 saltos necesitas $A^3 = A^2\\cdot A$.' }],
    },
    {
      etiqueta: 'c)', tipo: 'opcion',
      enunciado: () => 'El equipo solo puede reforzar una antena hoy. Se elige la que tiene más rutas de 2 saltos hacia las **demás** antenas (suma de su fila de $A^2$ sin contar la diagonal). ¿Cuál es?',
      respuesta: () => null,
      opciones: (p) => NOMBRES.slice(0, p.n).map((nm, k) => ({ texto: `Antena ${nm}`, correcta: k === p.mejor, feedback: k !== p.mejor ? `La antena ${nm} tiene ${p.filas[k]} rutas de 2 saltos hacia las demás.` : undefined })),
    },
  ],
  ayudas: {
    nivel1: 'Multiplicar matrices es combinar rutas: un camino de 2 saltos de $i$ a $j$ pasa por alguna antena intermedia $k$, con enlaces $i\\to k$ y $k\\to j$.',
    nivel2: 'Elemento $(i,j)$ de $A\\cdot B$: $\\sum_k a_{ik}\\,b_{kj}$ (fila $i$ de la primera por columna $j$ de la segunda). Para 3 saltos, $A^3 = A^2\\cdot A$.',
    nivel3: (p) => `La primera fila de $A^2$ suma ${p.A2[0].reduce((s: number, x: number) => s + x, 0)} (diagonal incluida).`,
  },
  resolucion: (p) => `**a)** $A^2 = A\\cdot A$, fila por columna:
$$A^2 = ${texMat(p.A2)}$$
La diagonal da el número de enlaces de cada antena (ir y volver).

**b)** $A^3 = A^2\\cdot A = ${texMat(p.A3)}$, y el elemento (${NOMBRES[p.i]}, ${NOMBRES[p.j]}) es **${p.A3[p.i][p.j]}**.

**c)** Sumando cada fila de $A^2$ sin la diagonal: ${NOMBRES.slice(0, p.n).map((nm, k) => `${nm}: ${p.filas[k]}`).join(', ')}. Se refuerza la antena **${NOMBRES[p.mejor]}**.`,
  recompensas: R,
})

/* ================================================================== M1.2 */
export const M1_2 = defineMision({
  id: 'M1.2', capitulo: 1, materia: 'matematicas', titulo: 'El brazo del hangar',
  bloquePAU: 'Álgebra', saberes: ['producto de matrices', 'potencias de matrices', 'rango con parámetro'],
  tipoPAU: ['C'], tipoMision: 'calculo', dificultad: 'PAU', escena: 'lab',
  generar: (rng) => {
    const a = rng.int(2, 5)
    const A = [[1, a], [0, 1]]
    const B = [[rng.int(-3, 4), rng.int(-3, 4)], [rng.int(-3, 4), rng.int(-3, 4)]]
    if (B[1][0] === 0) B[1][0] = 2
    const n = 2026
    const b = rng.pick([-3, -2, -1, 1, 2, 3])
    return { a, A, B, AB: matMul(A, B), BA: matMul(B, A), n, An: [[1, n * a], [0, 1]], b, t: -(b ** 3) }
  },
  contexto: (p) => `El brazo robótico del hangar se controla con matrices. Cada pulsación del motor de traslación aplica la matriz $A$, y la herramienta montada en la pinza aplica la matriz $B$:
$$A = ${texMat(p.A)},\\qquad B = ${texMat(p.B)}$$
Además, la estabilidad del brazo depende de un parámetro de calibración $t$ a través de la matriz
$$M = \\begin{pmatrix} 1 & ${p.b} & 0 \\\\ 0 & 1 & ${p.b} \\\\ ${p.b} & 0 & t \\end{pmatrix}$$
El brazo alcanza todas las posiciones del espacio solo si $\\operatorname{rg}(M) = 3$.`,
  partes: [
    {
      etiqueta: 'a)', tipo: 'matriz', dim: [2, 2],
      enunciado: () => 'Primero se mueve el motor y después actúa la herramienta sobre el resultado. Calcula $A\\cdot B$.',
      respuesta: (p) => p.AB,
      errores: [{ detectar: (r, p) => JSON.stringify(r) === JSON.stringify(p.BA) && JSON.stringify(p.AB) !== JSON.stringify(p.BA), mensaje: 'Has calculado $B\\cdot A$. El producto de matrices no es conmutativo: el orden importa.' }],
    },
    {
      etiqueta: 'b)', tipo: 'matriz', dim: [2, 2],
      enunciado: (p) => `El motor se pulsa ${p.n} veces seguidas. Calcula $A^{${p.n}}$ (busca el patrón con $A^2$, $A^3$…).`,
      respuesta: (p) => p.An,
      errores: [
        { detectar: (r, p) => Array.isArray(r) && (r as number[][])[0]?.[1] === p.a, mensaje: 'El elemento de arriba a la derecha crece con cada potencia: calcula $A^2$ y $A^3$ y mira cómo cambia.' },
        { detectar: (r, p) => Array.isArray(r) && (r as number[][])[0]?.[1] === p.n, mensaje: 'Casi: el elemento $(1,2)$ de $A^n$ es $n$ veces el de $A$, no $n$ a secas.' },
      ],
      ayuda3: (p) => `$A^3 = ${texMat(matPow(p.A, 3))}$. ¿Qué relación hay entre el 3 y el elemento de arriba a la derecha?`,
    },
    {
      etiqueta: 'c)', tipo: 'numero', absTol: 1e-6, tolerancia: 0,
      enunciado: () => '¿Para qué valor de $t$ deja de tener $M$ rango 3?',
      respuesta: (p) => p.t,
      errores: [{ detectar: (r, p) => r === -p.t, mensaje: 'Revisa el signo al desarrollar el determinante.' }],
      ayuda3: (p) => `El determinante de $M$ es de la forma $t + k$, con $k = ${p.b ** 3}$.`,
    },
    {
      etiqueta: 'd)', tipo: 'numero', absTol: 1e-6, tolerancia: 0,
      enunciado: () => 'Para ese valor de $t$, ¿cuál es el rango de $M$?',
      respuesta: () => 2,
      errores: [{ detectar: (r) => r === 1, mensaje: 'Busca un menor de orden 2 distinto de cero: con uno basta para que el rango sea al menos 2.' }],
    },
  ],
  ayudas: {
    nivel1: 'Las potencias de matrices "triangulares" como $A$ suelen seguir un patrón. Para el rango, piensa en el determinante: si es distinto de cero, el rango es máximo.',
    nivel2: 'Calcula $A^2$ y $A^3$ y generaliza a $A^n$ (se puede justificar por inducción). Para $M$: desarrolla $|M|$ por la primera fila, iguálalo a 0 y, para ese valor, busca un menor de orden 2 no nulo.',
    nivel3: (p) => `$A^2 = ${texMat(matPow(p.A, 2))}$.`,
  },
  resolucion: (p) => `**a)** $$A\\cdot B = ${texMat(p.A)}${texMat(p.B)} = ${texMat(p.AB)}$$ (Ojo: $B\\cdot A = ${texMat(p.BA)}$${JSON.stringify(p.AB) !== JSON.stringify(p.BA) ? ', distinta' : ''}.)

**b)** $A^2 = ${texMat(matPow(p.A, 2))}$, $A^3 = ${texMat(matPow(p.A, 3))}$. Por inducción, $A^n = \\begin{pmatrix}1 & ${p.a}n\\\\ 0 & 1\\end{pmatrix}$, porque $A^{n}\\cdot A = \\begin{pmatrix}1 & ${p.a}n\\\\0&1\\end{pmatrix}\\begin{pmatrix}1&${p.a}\\\\0&1\\end{pmatrix} = \\begin{pmatrix}1 & ${p.a}(n+1)\\\\0&1\\end{pmatrix}$. Por tanto
$$A^{${p.n}} = ${texMat(p.An)}$$

**c)** Desarrollando por la primera fila:
$$|M| = 1\\cdot(t - 0) - (${p.b})\\cdot(0 - ${p.b}^2) + 0 = t + ${num(p.b ** 3)}$$
Se anula para $t = ${p.t}$. Para cualquier otro valor, $\\operatorname{rg}(M) = 3$.

**d)** Si $t = ${p.t}$, $|M| = 0$ y $\\operatorname{rg}(M) < 3$. Como el menor $\\begin{vmatrix}1 & ${p.b}\\\\ 0 & 1\\end{vmatrix} = 1 \\neq 0$, $\\operatorname{rg}(M) = 2$.`,
  recompensas: R,
})

/* ================================================================== X1.1 */
export const X1_1 = defineMision({
  id: 'X1.1', capitulo: 1, materia: 'fisica', titulo: 'Experto · El anillo de chatarra',
  bloquePAU: 'Campo gravitatorio', saberes: ['superposición', 'simetría', 'máximo de una función'],
  tipoPAU: ['C', 'R'], tipoMision: 'calculo', dificultad: 'experto', escena: 'espacio',
  generar: (rng) => {
    const N = 8, m = rng.nice(1e5, 5e5, 2), Ra = rng.nice(20, 60, 2), z = rng.nice(10, 80, 2)
    const g = (zz: number) => (G * N * m * zz) / (Ra ** 2 + zz ** 2) ** 1.5
    return { N, m, Ra, z, gz: g(z), zmax: Ra / Math.SQRT2, gmax: g(Ra / Math.SQRT2) }
  },
  contexto: (p) => `Ocho módulos de chatarra idénticos ($m = ${sci(p.m, 2)}$ kg cada uno) han quedado distribuidos de forma uniforme en un anillo de radio $R = ${num(p.Ra)}$ m. El dron se mueve por el eje del anillo (la recta perpendicular a su plano que pasa por el centro). Trata cada módulo como una masa puntual.`,
  widget: { id: 'campo', props: (p) => ({ fuentes: Array.from({ length: 8 }, (_, k) => ({ x: 8 * Math.cos((k * Math.PI) / 4), y: 3 * Math.sin((k * Math.PI) / 4), q: p.m })), tipo: 'gravitatorio', escala: 12 }) },
  partes: [
    {
      etiqueta: 'a)', tipo: 'numero', unidades: 'N/kg',
      enunciado: (p) => `Calcula el módulo del campo gravitatorio en un punto del eje a $z = ${num(p.z)}$ m del centro.`,
      respuesta: (p) => p.gz,
      errores: [{ detectar: (r, p) => cerca(r, (G * p.N * p.m) / (p.Ra ** 2 + p.z ** 2), 0.03), mensaje: 'Has sumado los módulos completos. Por simetría, las componentes paralelas al plano del anillo se anulan: solo sobrevive la componente a lo largo del eje, que lleva un factor $z/\\sqrt{R^2+z^2}$.' }],
    },
    {
      etiqueta: 'b)', tipo: 'numero', unidades: 'm',
      enunciado: () => '¿A qué distancia del centro, sobre el eje, es máximo el campo?',
      respuesta: (p) => p.zmax,
    },
    {
      etiqueta: 'c)', tipo: 'numero', unidades: 'N/kg',
      enunciado: () => '¿Cuánto vale ese campo máximo?',
      respuesta: (p) => p.gmax,
    },
  ],
  ayudas: {
    nivel1: 'Usa la simetría: para cada módulo hay otro en el lado opuesto del anillo, y sus componentes radiales se cancelan.',
    nivel2: 'Cada módulo está a distancia $d = \\sqrt{R^2+z^2}$. Su componente axial es $\\frac{Gm}{d^2}\\cdot\\frac{z}{d}$. Suma $N$ veces y, para el máximo, deriva $g(z)$ e iguala a cero.',
    nivel3: (p) => `$d = \\sqrt{R^2+z^2} = ${num(Math.hypot(p.Ra, p.z))}$ m.`,
  },
  resolucion: (p) => `**a)** Por simetría solo queda la componente axial:
$$g(z) = N\\frac{Gm}{R^2+z^2}\\cdot\\frac{z}{\\sqrt{R^2+z^2}} = \\frac{G N m\\, z}{(R^2+z^2)^{3/2}} = ${sci(p.gz)}\\ \\text{N/kg}$$

**b)** $g'(z) = GNm\\,\\dfrac{(R^2+z^2) - 3z^2}{(R^2+z^2)^{5/2}} = 0 \\Rightarrow R^2 = 2z^2 \\Rightarrow z = \\dfrac{R}{\\sqrt2} = ${num(p.zmax)}$ m. (El signo de $g'$ pasa de + a −: es un máximo.)

**c)** $g_{max} = g(R/\\sqrt2) = ${sci(p.gmax)}$ N/kg.

En el centro del anillo ($z=0$) el campo es nulo y muy lejos tiende a $GNm/z^2$: como una masa puntual.`,
  recompensas: { xp: 220, componentes: 35, creditos: 3 },
})

/* ================================================================== J1 */
export const J1 = defineMision({
  id: 'J1', capitulo: 1, materia: 'fisica', titulo: 'JEFE · Recogida en la órbita',
  bloquePAU: 'Campo gravitatorio + Álgebra', saberes: ['campo gravitatorio', 'superposición', 'producto de matrices'],
  tipoPAU: ['C', 'R'], tipoMision: 'crisis', dificultad: 'jefe', escena: 'espacio', tiempoLimite: 480,
  generar: (rng) => {
    const m1 = rng.nice(3e5, 9e5, 2), m2 = rng.nice(3e5, 9e5, 2)
    const S1 = [-10, 0], S2 = [10, 0]
    const campo = (P: number[]) => {
      let gx = 0, gy = 0
      for (const [S, m] of [[S1, m1], [S2, m2]] as [number[], number][]) {
        const dx = S[0] - P[0], dy = S[1] - P[1], r = Math.hypot(dx, dy)
        gx += (G * m * dx) / r ** 3; gy += (G * m * dy) / r ** 3
      }
      return Math.hypot(gx, gy)
    }
    let pts: number[][], gs: number[]
    for (;;) {
      pts = [[0, rng.int(4, 12)], [rng.int(-6, 6), rng.int(-14, -4)], [rng.int(-4, 4), rng.int(2, 6)]]
      gs = pts.map(campo)
      const sorted = [...gs].sort((a, b) => a - b)
      if (sorted[1] / sorted[0] > 1.15) break
    }
    const A = [[rng.int(1, 3), rng.int(-2, 2)], [rng.int(-2, 2), rng.int(1, 3)]]
    let v = [rng.int(1, 5), rng.int(1, 5)]
    const A2 = matMul(A, A)
    while (A2[0][0] * v[0] + A2[0][1] * v[1] === A[0][0] * v[0] + A[0][1] * v[1] && A2[1][0] * v[0] + A2[1][1] * v[1] === A[1][0] * v[0] + A[1][1] * v[1]) {
      A[0][1] += 1
      A2.splice(0, 2, ...matMul(A, A))
      v = [rng.int(1, 5), rng.int(1, 5)]
    }
    const w = [A2[0][0] * v[0] + A2[0][1] * v[1], A2[1][0] * v[0] + A2[1][1] * v[1]]
    return { m1, m2, S1, S2, pts, gs, segura: gs.indexOf(Math.min(...gs)), A, v, w, A2 }
  },
  contexto: (p) => `**¡ALERTA DE COLISIÓN!** Dos grandes restos derivan hacia el dron. Tienes que llevarlo al punto de recogida más estable antes de que lleguen.
- Resto 1: $m_1 = ${sci(p.m1, 2)}$ kg en $(-10,\\ 0)$ m
- Resto 2: $m_2 = ${sci(p.m2, 2)}$ kg en $(10,\\ 0)$ m
- Puntos de recogida posibles: $P_1(${p.pts[0].join(',\\ ')})$, $P_2(${p.pts[1].join(',\\ ')})$ y $P_3(${p.pts[2].join(',\\ ')})$.

La ruta de escape está cifrada: el vector de ruta es $\\vec w = A^2\\,\\vec v$, con $A = ${texMat(p.A)}$ y $\\vec v = (${p.v.join(',\\ ')})$.`,
  widget: { id: 'campo', props: (p) => ({ fuentes: [{ x: -10, y: 0, q: p.m1 }, { x: 10, y: 0, q: p.m2 }], puntos: p.pts, tipo: 'gravitatorio', escala: 17 }) },
  partes: [
    {
      etiqueta: 'Fase 1', tipo: 'numero', unidades: 'N/kg',
      enunciado: () => 'Calcula el módulo del campo gravitatorio en $P_1$.',
      respuesta: (p) => p.gs[0],
    },
    {
      etiqueta: 'Fase 2', tipo: 'opcion',
      enunciado: () => 'El dron debe esperar donde el campo sea **mínimo** (menor deriva). Calcula el campo en $P_2$ y $P_3$ y decide.',
      respuesta: () => null,
      opciones: (p) => [0, 1, 2].map((k) => ({ texto: `Punto $P_${k + 1}$`, correcta: k === p.segura, feedback: k !== p.segura ? `En $P_${k + 1}$ el campo vale $${sci(p.gs[k])}$ N/kg. Compáralo con los demás.` : undefined })),
    },
    {
      etiqueta: 'Fase 3', tipo: 'vector', dim: 2,
      enunciado: () => 'Descifra la ruta de escape: calcula $\\vec w = A^2\\,\\vec v$.',
      respuesta: (p) => p.w,
      errores: [{ detectar: (r, p) => Array.isArray(r) && r[0] === p.A[0][0] * p.v[0] + p.A[0][1] * p.v[1] && r[1] === p.A[1][0] * p.v[0] + p.A[1][1] * p.v[1], mensaje: 'Eso es $A\\vec v$. Te falta aplicar $A$ otra vez.' }],
    },
  ],
  ayudas: {
    nivel1: 'Superposición de campos para las dos primeras fases; producto matriz por vector para la tercera.',
    nivel2: 'En cada punto, $\\vec g = \\sum \\frac{Gm_i}{r_i^3}\\vec r_i$, con $\\vec r_i$ desde el punto hasta cada resto. Para la ruta, calcula primero $A^2$ y luego multiplícala por $\\vec v$.',
    nivel3: (p) => `$A^2 = ${texMat(p.A2)}$.`,
  },
  resolucion: (p) => `**Fase 1.** Superposición en $P_1$: $|\\vec g(P_1)| = ${sci(p.gs[0])}$ N/kg.

**Fase 2.** Del mismo modo, $|\\vec g(P_2)| = ${sci(p.gs[1])}$ N/kg y $|\\vec g(P_3)| = ${sci(p.gs[2])}$ N/kg. El mínimo está en $P_${p.segura + 1}$.

**Fase 3.** $A^2 = ${texMat(p.A2)}$, de modo que $\\vec w = A^2\\vec v = (${p.w.join(',\\ ')})$.`,
  recompensas: { xp: 320, componentes: 45, creditos: 4 },
})

// Pendientes de sustituir por adaptaciones de ejercicios PAU reales (se rehacen misión a misión).
export default [F1_1, F1_2, M1_1, X1_1, J1]

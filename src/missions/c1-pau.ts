/**
 * Capítulo 1 · misiones adaptadas de ejercicios REALES de la PAU de la Comunitat Valenciana.
 * Mismas preguntas y misma resolución que el original; datos nuevos en cada intento.
 * Todas las respuestas numéricas son ENTEROS en la unidad/escala indicada.
 */
import { cerca } from './check'
import { num, sci, texMat } from './fmt'
import { det, inverse, matMul, transpose } from './linalg'
import { defineMision } from './types'

const G = 6.67e-11 // valor que da el enunciado oficial de la PAU CV
const DIA = 86400

/* ======================================================================
 * F1.1 · PESAR MUNDOS
 * Original: PAU CV Física, julio 2023, Problema 1 (exoplaneta LHS 475b, telescopio James Webb).
 * a) radio orbital a partir de M y T; b) expresión de la velocidad de escape, y masa y radio
 *    del planeta a partir de g0 y v_e.
 * ==================================================================== */
export const F1_1 = defineMision({
  id: 'F1.1', capitulo: 1, materia: 'fisica', titulo: 'Pesar mundos',
  bloquePAU: 'Campo gravitatorio', saberes: ['tercera ley de Kepler', 'campo gravitatorio en la superficie', 'velocidad de escape'],
  tipoPAU: ['C', 'R'], tipoMision: 'calculo', dificultad: 'PAU', escena: 'espacio',
  datoReal: { descripcion: 'Adaptado de la PAU CV de Física, julio 2023, Problema 1 (exoplaneta LHS 475b descubierto por el James Webb). Observatorio de Aras de los Olmos (Universitat de València).', fuente: 'bancdelaselectivitat.umh.es · ExFisicaExtraordinaria2023.pdf', verificado: true },
  generar: (rng) => {
    const M = rng.nice(3e29, 9e29, 2) // masa de la estrella (kg)
    const Tdias = rng.int(2, 6)
    const T = Tdias * DIA
    const r = Math.cbrt((G * M * T * T) / (4 * Math.PI ** 2))
    const g0 = rng.nice(6, 14, 2) // m/s²
    const vkm = rng.nice(8, 16, 3) // km/s
    const v = vkm * 1000
    const R = (v * v) / (2 * g0)
    const Mp = (g0 * R * R) / G
    return {
      M, Tdias, T, g0, vkm,
      r_mkm: r / 1e6, // miles de km
      R_km: R / 1000,
      Mp_22: Mp / 1e22,
      // valores de errores típicos
      r_dias: Math.cbrt((G * M * Tdias * Tdias) / (4 * Math.PI ** 2)) / 1e6,
      r_sin4pi: Math.cbrt(G * M * T * T) / 1e6,
      R_sin2: (v * v) / g0 / 1000,
      R_m: R,
      Mp_sinCuadrado: (g0 * R) / G / 1e22,
      Mp_Rkm: (g0 * (R / 1000) ** 2) / G / 1e22,
    }
  },
  contexto: (p) => `Con la red de satélites destruida, la ADM necesita un punto de apoyo lejos de la tormenta. Esta noche, el **Observatorio de Aras de los Olmos** ha detectado un planeta rocoso girando en una órbita circular alrededor de una estrella cercana. VERA quiere enviar allí una sonda repetidora… pero antes hay que **pesar** ese sistema usando solo lo que vemos desde la Tierra.

- Masa de la estrella: $M = ${sci(p.M, 2)}\\ \\text{kg}$
- El planeta tarda **${p.Tdias} días terrestres** en completar una órbita.
- En su superficie, la aceleración de la gravedad es $g_0 = ${num(p.g0, 2)}\\ \\text{m/s}^2$ y la velocidad de escape es $v_e = ${num(p.vkm, 3)}\\ \\text{km/s}$.

Dato: $G = 6{,}67\\cdot10^{-11}\\ \\text{N·m}^2/\\text{kg}^2$. **Da los resultados como números enteros, redondeados, en la unidad indicada.**`,
  partes: [
    {
      etiqueta: 'a)', tipo: 'numero', unidades: 'miles de km', tolerancia: 0.01,
      enunciado: () => 'Deduce la expresión que relaciona el radio de la órbita con $M$ y el periodo, y calcula la distancia del planeta al centro de la estrella. Exprésala en **miles de kilómetros** (1 unidad = $10^6$ m).',
      respuesta: (p) => p.r_mkm,
      errores: [
        { detectar: (r, p) => typeof r === 'number' && Math.abs(r - p.r_dias) < 1, mensaje: 'Has usado el periodo en días. En el SI el periodo va en segundos: $T = \\text{días}\\cdot 86\\,400$ s.' },
        { detectar: (r, p) => cerca(r, p.r_sin4pi, 0.03), mensaje: 'Te falta el factor $4\\pi^2$. Recuerda: $\\omega = 2\\pi/T$, así que $\\omega^2 = 4\\pi^2/T^2$.' },
        { detectar: (r, p) => cerca(r, p.r_mkm * 1000, 0.02), mensaje: 'Parece que lo has dado en kilómetros. Te piden **miles** de kilómetros.' },
      ],
      ayuda3: (p) => `El periodo en segundos es $T = ${num(p.T, 6)}$ s. El radio debe salir entre $10^9$ y $10^{10}$ m.`,
    },
    {
      etiqueta: 'b)', tipo: 'opcion',
      enunciado: () => 'Para la segunda parte necesitas la velocidad de escape. ¿Cuál es su expresión y de dónde sale?',
      respuesta: () => null,
      opciones: () => [
        { texto: '$v_e = \\sqrt{\\dfrac{2GM}{R}}$: se impone que la energía mecánica en la superficie sea nula, $\\tfrac12 m v_e^2 - \\dfrac{GMm}{R} = 0$.', correcta: true },
        { texto: '$v_e = \\sqrt{\\dfrac{GM}{R}}$: se iguala la fuerza gravitatoria a la fuerza centrípeta en la superficie.', correcta: false, feedback: 'Esa es la velocidad de una órbita rasante, no la de escape. Para escapar hay que llegar al infinito con energía mecánica ≥ 0.' },
        { texto: '$v_e = \\sqrt{2 g_0 R^2}$: se iguala la energía cinética al peso del cuerpo.', correcta: false, feedback: 'No se iguala energía a peso (son magnitudes distintas). Revisa las unidades: dentro de la raíz quedan m³/s², no m²/s²; sobra un factor R.' },
        { texto: '$v_e = \\dfrac{2GM}{R}$: se impone que la energía potencial sea nula en la superficie.', correcta: false, feedback: 'La energía potencial gravitatoria nunca es nula a distancia finita (con el origen en el infinito). Además, las unidades no son de velocidad.' },
      ],
    },
    {
      etiqueta: 'c)', tipo: 'numero', unidades: 'km', tolerancia: 0.01,
      enunciado: () => 'Calcula el **radio del planeta**, en kilómetros.',
      respuesta: (p) => p.R_km,
      errores: [
        { detectar: (r, p) => cerca(r, p.R_sin2, 0.02), mensaje: 'Te ha salido el doble. Combina $v_e^2 = 2GM/R$ con $g_0 = GM/R^2$: $v_e^2 = 2 g_0 R$, así que $R = v_e^2/(2g_0)$.' },
        { detectar: (r, p) => cerca(r, p.R_m, 0.02), mensaje: 'Ese valor está en metros. Te lo piden en kilómetros.' },
      ],
      ayuda3: () => 'Sustituye $GM = g_0 R^2$ en la expresión de la velocidad de escape: el resultado depende solo de $v_e$ y $g_0$. Pasa $v_e$ a m/s.',
    },
    {
      etiqueta: 'd)', tipo: 'numero', unidades: '× 10²² kg', tolerancia: 0.01,
      enunciado: () => 'Calcula la **masa del planeta**. Escríbela en unidades de $10^{22}$ kg (por ejemplo, $3{,}5\\cdot10^{24}$ kg se escribiría 350).',
      respuesta: (p) => p.Mp_22,
      errores: [
        { detectar: (r) => r === 0, mensaje: 'Te sale prácticamente 0: comprueba que $R$ está en metros (SI) y elevado al cuadrado, $M = g_0R^2/G$.' },
        { detectar: (r, p) => typeof r === 'number' && r > 0 && Math.abs(r - p.Mp_22 / 1000) < 1, mensaje: 'Te ha salido mil veces menor: probablemente has dado la masa en unidades de $10^{25}$ kg. Exprésala en unidades de $10^{22}$ kg.' },
      ],
      ayuda3: (p) => `Con tu radio, $R^2$ debería ser del orden de $10^{${Math.floor(Math.log10((p.R_km * 1000) ** 2))}}\\ \\text{m}^2$.`,
    },
  ],
  ayudas: {
    nivel1: 'En una órbita circular, la fuerza gravitatoria hace de fuerza centrípeta. Y en la superficie, el campo gravitatorio y la velocidad de escape dependen de la misma pareja $GM$ y $R$.',
    nivel2: 'a) $\\dfrac{GMm}{r^2} = m\\dfrac{4\\pi^2}{T^2}r \\Rightarrow r = \\sqrt[3]{\\dfrac{GMT^2}{4\\pi^2}}$. b) $v_e = \\sqrt{2GM/R}$ y $g_0 = GM/R^2$: divide una por otra para sacar $R$, y luego $M = g_0R^2/G$.',
    nivel3: (p) => `El periodo en segundos es $T = ${num(p.T, 6)}$ s.`,
  },
  resolucion: (p) => `**a)** La fuerza gravitatoria que la estrella ejerce sobre el planeta actúa como fuerza centrípeta:
$$G\\frac{Mm}{r^2} = m\\,\\omega^2 r = m\\frac{4\\pi^2}{T^2}r \\;\\Rightarrow\\; r = \\sqrt[3]{\\frac{G M T^2}{4\\pi^2}}$$
Con $T = ${p.Tdias}\\cdot 86\\,400 = ${num(p.T, 6)}$ s:
$$r = \\sqrt[3]{\\frac{6{,}67\\cdot10^{-11}\\cdot ${sci(p.M, 2)}\\cdot (${num(p.T, 6)})^2}{4\\pi^2}} = ${sci(p.r_mkm * 1e6, 4)}\\ \\text{m} \\approx \\mathbf{${Math.round(p.r_mkm)}}\\ \\text{miles de km}$$

**b)** Un cuerpo escapa si llega al infinito con energía mecánica nula (origen de potencial en el infinito):
$$\\tfrac12 m v_e^2 - G\\frac{Mm}{R} = 0 \\;\\Rightarrow\\; v_e = \\sqrt{\\frac{2GM}{R}}$$

**c)** Como $g_0 = \\dfrac{GM}{R^2} \\Rightarrow GM = g_0R^2$, sustituyendo: $v_e^2 = \\dfrac{2g_0R^2}{R} = 2g_0R$, luego
$$R = \\frac{v_e^2}{2g_0} = \\frac{(${num(p.vkm * 1000, 5)})^2}{2\\cdot ${num(p.g0, 2)}} = ${sci(p.R_km * 1000, 4)}\\ \\text{m} \\approx \\mathbf{${Math.round(p.R_km)}}\\ \\text{km}$$

**d)** $$M_p = \\frac{g_0R^2}{G} = \\frac{${num(p.g0, 2)}\\cdot(${sci(p.R_km * 1000, 4)})^2}{6{,}67\\cdot10^{-11}} = ${sci(p.Mp_22 * 1e22, 4)}\\ \\text{kg} \\approx \\mathbf{${Math.round(p.Mp_22)}}\\cdot10^{22}\\ \\text{kg}$$

Comprobación de coherencia: la masa sale del orden de la de la Tierra ($597\\cdot10^{22}$ kg), razonable para un planeta rocoso.`,
  recompensas: { xp: 140, componentes: 18, creditos: 2 },
  trailer: {
    lema: 'Calcula antes de lanzar',
    lineas: [
      ['NARRADOR', 'Nuestros satélites han caído. La segunda tormenta ya viene de camino.'],
      ['RADIO', 'Aras de los Olmos informa: planeta rocoso detectado en órbita de una estrella cercana.'],
      ['VERA', 'Antes de enviar nada allí, tenemos que pesarlo. Sin báscula. Solo con su órbita.'],
      ['NARRADOR', 'Así pesan los astrónomos estrellas, planetas y agujeros negros. Así descubrió el James Webb su primer exoplaneta.'],
      ['VERA', 'Una pista: la gravedad es la fuerza que mantiene la órbita. El periodo y el radio la delatan.'],
      ['NARRADOR', 'Misión uno. Pesar mundos.'],
    ],
  },
})

/* ======================================================================
 * M1.1 · EL CÓDIGO DEL BRAZO
 * Original: PAU CV Matemáticas II, junio 2022, Problema 1.
 * a) Demostrar que C − ABᵗ tiene inversa y calcularla; b) resolver CX = ABᵗX + I;
 * c) justificar que (ABᵗ)ⁿ = kⁿ I.
 * ==================================================================== */
const UNIMODULARES = [[[2, 1], [1, 1]], [[1, 1], [0, 1]], [[1, 0], [2, 1]], [[3, 2], [1, 1]], [[2, 3], [1, 2]], [[1, -1], [1, 0]], [[1, 2], [1, 3]], [[-1, 1], [-2, 1]], [[2, -1], [-1, 1]], [[1, 0], [-3, 1]]]

function generarAB(rng: { int(a: number, b: number): number }, k: number): { A: number[][]; B: number[][] } {
  // filas a1, a2 de A y b1, b2 de B con a1·b1 = a2·b2 = k y a1·b2 = a2·b1 = 0  ⇒  ABᵗ = kI
  const cross = (u: number[], v: number[]) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
  const dot = (u: number[], v: number[]) => u.reduce((s, x, i) => s + x * v[i], 0)
  for (let intento = 0; intento < 20000; intento++) {
    const a1 = [rng.int(-2, 2), rng.int(-2, 2), rng.int(-2, 2)]
    const a2 = [rng.int(-2, 2), rng.int(-2, 2), rng.int(-2, 2)]
    const n = cross(a1, a2)
    if (n.every((x) => x === 0)) continue
    const cs: number[][] = []
    for (let t = 0; t < 60 && cs.length < 2; t++) {
      const c = [rng.int(-2, 2), rng.int(-2, 2), rng.int(-2, 2)]
      if (dot(c, n) === k) cs.push(c)
    }
    if (cs.length < 2) continue
    const b1 = cross(a2, cs[0])
    const b2 = cross(cs[1], a1)
    if ([...b1, ...b2].some((x) => Math.abs(x) > 4)) continue
    if ([...a1, ...a2].filter((x) => x === 0).length > 3) continue
    return { A: [a1, a2], B: [b1, b2] }
  }
  return { A: [[1, 1, 1], [1, -1, 0]], B: [[1, 1, 1], [1, -2, 1]] } // ABᵗ = 3I (respaldo, nunca debería usarse)
}

export const M1_1 = defineMision({
  id: 'M1.1', capitulo: 1, materia: 'matematicas', titulo: 'El código del brazo',
  bloquePAU: 'Álgebra', saberes: ['producto y traspuesta de matrices', 'matriz inversa', 'ecuaciones matriciales', 'potencias de matrices'],
  tipoPAU: ['C', 'R'], tipoMision: 'calculo', dificultad: 'PAU', escena: 'lab',
  datoReal: { descripcion: 'Adaptado de la PAU CV de Matemáticas II, junio 2022, Problema 1.', fuente: 'bancdelaselectivitat.umh.es · ExMatematicas-IIOrdinaria-de-2022.pdf', verificado: true },
  generar: (rng) => {
    const k = rng.int(2, 5)
    const { A, B } = generarAB(rng, k)
    // N = C − kI con determinante ±1 (inversa entera); se descartan las que son su propia inversa
    let N: number[][]
    do {
      N = rng.pick(UNIMODULARES).map((f) => f.slice())
      if (rng.next() < 0.5) N[0] = N[0].map((x) => -x)
    } while (JSON.stringify(N) === JSON.stringify(inverse(N).map((f) => f.map((x) => Math.round(x) + 0))))
    const C = N.map((f, i) => f.map((x, j) => x + (i === j ? k : 0)))
    const ABt = matMul(A, transpose(B))
    const D = C.map((f, i) => f.map((x, j) => x - ABt[i][j]))
    const dD = det(D)
    const Dinv = inverse(D).map((f) => f.map((x) => Math.round(x) + 0))
    const n = rng.int(4, 7)
    const cof = [[D[1][1], -D[1][0]], [-D[0][1], D[0][0]]] // matriz de cofactores (sin trasponer)
    return { k, A, B, C, ABt, D, dD, Dinv, n, kn: k ** n, cof: cof.map((f) => f.map((x) => x / dD)), CplusDet: det(C.map((f, i) => f.map((x, j) => x + ABt[i][j]))) }
  },
  contexto: (p) => `El brazo robótico del hangar recibe las órdenes cifradas con matrices. La tormenta corrompió el módulo de control y VERA necesita reconstruir la clave de descifrado antes de volver a moverlo:
$$A = ${texMat(p.A)},\\qquad B = ${texMat(p.B)},\\qquad C = ${texMat(p.C)}$$
La clave es la matriz $X$ que cumple $CX = AB^{t}X + I$, donde $I$ es la identidad. **Todos los resultados de esta misión son números enteros.**`,
  partes: [
    {
      etiqueta: 'a.1)', tipo: 'numero', tolerancia: 0, absTol: 0,
      enunciado: () => 'Calcula $AB^{t}$ y después el **determinante** de $C - AB^{t}$. ¿Cuánto vale?',
      respuesta: (p) => p.dD,
      errores: [
        { detectar: (r, p) => r === -p.dD, mensaje: 'El signo no es correcto. Revisa el orden: $|M| = m_{11}m_{22} - m_{12}m_{21}$.' },
        { detectar: (r, p) => r === p.CplusDet && p.CplusDet !== p.dD, mensaje: 'Has calculado el determinante de $C + AB^{t}$. Fíjate en el signo menos.' },
      ],
      ayuda3: (p) => `$AB^{t}$ es una matriz muy especial: un múltiplo de la identidad. Su elemento $(1,1)$ vale ${p.ABt[0][0]}.`,
    },
    {
      etiqueta: 'a.2)', tipo: 'matriz', dim: [2, 2],
      enunciado: () => 'Como el determinante no es nulo, $C - AB^{t}$ tiene inversa. **Calcúlala.**',
      respuesta: (p) => p.Dinv,
      errores: [
        { detectar: (r, p) => Array.isArray(r) && JSON.stringify(r) === JSON.stringify(p.cof.map((f: number[]) => f.map((x) => Math.round(x) + 0))) && JSON.stringify(p.cof) !== JSON.stringify(p.Dinv), mensaje: 'Te ha faltado trasponer la matriz de cofactores: $M^{-1} = \\dfrac{1}{|M|}\\,(\\operatorname{Adj} M)^{t}$.' },
        { detectar: (r, p) => Array.isArray(r) && JSON.stringify(r) === JSON.stringify(p.D), mensaje: 'Esa es la propia matriz $C - AB^{t}$, no su inversa.' },
      ],
      ayuda3: (p) => `Comprueba tu resultado multiplicándolo por $C - AB^{t} = ${texMat(p.D)}$: debe salir la identidad.`,
    },
    {
      etiqueta: 'b)', tipo: 'matriz', dim: [2, 2],
      enunciado: () => 'Calcula la matriz clave $X$ que verifica $CX = AB^{t}X + I$.',
      respuesta: (p) => p.Dinv,
      errores: [{ detectar: (r, p) => Array.isArray(r) && JSON.stringify(r) === JSON.stringify(p.D), mensaje: 'Al despejar, $(C - AB^{t})X = I$: $X$ es la **inversa** de $C - AB^{t}$, no la matriz misma.' }],
      ayuda3: () => 'Pasa $AB^{t}X$ al primer miembro y saca $X$ factor común **por la derecha**.',
    },
    {
      etiqueta: 'c.1)', tipo: 'opcion',
      enunciado: (p) => `Justifica que $(AB^{t})^n = ${p.k}^n I$ para todo número natural $n$. ¿Qué razonamiento es correcto?`,
      respuesta: () => null,
      opciones: (p) => [
        { texto: `Como $AB^{t} = ${p.k}I$ y la identidad conmuta con todo, $(AB^{t})^n = (${p.k}I)^n = ${p.k}^n I^n = ${p.k}^n I$ (y se puede formalizar por inducción).`, correcta: true },
        { texto: `Porque $(AB^{t})^n = A^n (B^{t})^n$, y cada factor vale $${p.k}^n$.`, correcta: false, feedback: '$A$ y $B$ no son cuadradas: $A^n$ ni siquiera existe. Además, $(MN)^n \\neq M^nN^n$ en general.' },
        { texto: `Porque el determinante de $AB^{t}$ es $${p.k ** 2}$, y las potencias de una matriz se obtienen elevando su determinante.`, correcta: false, feedback: 'El determinante de una potencia es la potencia del determinante, pero conocer el determinante no determina la matriz.' },
      ],
    },
    {
      etiqueta: 'c.2)', tipo: 'numero', tolerancia: 0, absTol: 0,
      enunciado: (p) => `El brazo aplica la orden $AB^{t}$ ${p.n} veces seguidas. ¿Cuánto vale el elemento $(1,1)$ de $(AB^{t})^{${p.n}}$?`,
      respuesta: (p) => p.kn,
      errores: [{ detectar: (r, p) => r === p.k * p.n, mensaje: `Eso es $k\\cdot n$. Una potencia multiplica $k$ por sí mismo $n$ veces.` }],
    },
  ],
  ayudas: {
    nivel1: 'Empieza por calcular $AB^{t}$: es un producto $2\\times3$ por $3\\times2$, así que sale $2\\times2$. Mira bien qué matriz te sale.',
    nivel2: 'Para una matriz $2\\times2$ $M = \\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}$ con $|M|\\ne0$: $M^{-1} = \\dfrac{1}{|M|}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}$. En b), agrupa: $CX - AB^{t}X = I \\Rightarrow (C - AB^{t})X = I$.',
    nivel3: (p) => `$AB^{t} = ${texMat(p.ABt)}$.`,
  },
  resolucion: (p) => `**a)** Producto (filas de $A$ por filas de $B$):
$$AB^{t} = ${texMat(p.A)}${texMat(transpose(p.B))} = ${texMat(p.ABt)} = ${p.k}I$$
$$C - AB^{t} = ${texMat(p.C)} - ${texMat(p.ABt)} = ${texMat(p.D)},\\qquad |C - AB^{t}| = ${p.dD} \\neq 0$$
Como el determinante no es nulo, la matriz es invertible:
$$(C - AB^{t})^{-1} = \\frac{1}{${p.dD}}\\begin{pmatrix} ${p.D[1][1]} & ${-p.D[0][1]} \\\\ ${-p.D[1][0]} & ${p.D[0][0]} \\end{pmatrix} = ${texMat(p.Dinv)}$$
(Comprobación: $(C - AB^{t})\\cdot(C - AB^{t})^{-1} = I$.)

**b)** $CX = AB^{t}X + I \\Rightarrow CX - AB^{t}X = I \\Rightarrow (C - AB^{t})X = I$. Multiplicando por la izquierda por la inversa:
$$X = (C - AB^{t})^{-1} = ${texMat(p.Dinv)}$$

**c)** Como $AB^{t} = ${p.k}I$: $(AB^{t})^n = (${p.k}I)^n = ${p.k}^nI^n = ${p.k}^nI$, porque $I^n = I$ y los escalares conmutan con las matrices. Por inducción: para $n=1$ es cierto; si $(AB^{t})^n = ${p.k}^nI$, entonces $(AB^{t})^{n+1} = ${p.k}^nI\\cdot ${p.k}I = ${p.k}^{n+1}I$.

Para $n = ${p.n}$: el elemento $(1,1)$ vale $${p.k}^{${p.n}} = \\mathbf{${p.kn}}$.`,
  recompensas: { xp: 140, componentes: 18, creditos: 2 },
  trailer: {
    lema: 'La clave está en la inversa',
    lineas: [
      ['RADIO', 'Brazo robótico del hangar: módulo de control corrompido. Órdenes ilegibles.'],
      ['NARRADOR', 'Sin ese brazo, no se puede cargar ni un solo satélite.'],
      ['VERA', 'Las órdenes viajan cifradas con matrices. Si encontramos la matriz inversa, encontramos la clave.'],
      ['NARRADOR', 'Así se cifran mensajes, se mueven robots industriales y se generan los gráficos de cada videojuego.'],
      ['VERA', 'Pista: agrupa lo que multiplica a la incógnita. Y no olvides que el orden en las matrices importa.'],
      ['NARRADOR', 'Misión de álgebra. El código del brazo.'],
    ],
  },
})

export default [F1_1, M1_1]

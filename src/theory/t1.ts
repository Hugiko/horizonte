import type { Teoria } from './types'

const t1: Teoria = {
  cap: 1,
  intro: 'Antes de lanzar nada, ingeniero, tienes que entender por qué la Luna no se cae. O, mejor dicho, por qué está cayendo todo el rato sin llegar nunca.',
  modulos: [
    {
      titulo: 'Ley de gravitación universal', materia: 'fisica',
      vera: 'Newton lo resumió en una línea. Nosotros vamos a exprimirla durante dos capítulos.',
      texto: `Dos masas puntuales $M$ y $m$ separadas una distancia $r$ se atraen con una fuerza dirigida a lo largo de la recta que las une:
$$\\vec F = -G\\,\\frac{M m}{r^2}\\,\\hat u_r \\qquad G = 6{,}674\\cdot10^{-11}\\ \\text{N·m}^2/\\text{kg}^2$$

- $\\hat u_r$ es el vector unitario que va **desde la masa que atrae hacia la masa atraída**; el signo menos indica que la fuerza es **atractiva**.
- Es una fuerza **central** (siempre apunta al centro de la otra masa) y depende del **inverso del cuadrado** de la distancia: si $r$ se duplica, la fuerza se divide entre 4.
- Cumple la tercera ley de Newton: la Tierra atrae a la Luna con la misma fuerza con que la Luna atrae a la Tierra.
- Para cuerpos esféricos, $r$ es la distancia **entre centros**.`,
      check: {
        pregunta: 'Si la distancia entre dos asteroides se triplica, la fuerza gravitatoria entre ellos…',
        opciones: ['se divide entre 3', 'se divide entre 9', 'se multiplica por 9', 'no cambia'],
        correcta: 1, explicacion: 'La fuerza es proporcional a $1/r^2$: $(1/3)^2 = 1/9$.',
      },
    },
    {
      titulo: 'Campo gravitatorio y superposición', materia: 'fisica',
      vera: 'Arrastra la sonda por el mapa. Mira hacia dónde apuntan las flechas: siempre hacia las masas.',
      texto: `Una masa $M$ modifica el espacio que la rodea: crea un **campo gravitatorio**. Su intensidad es la fuerza por unidad de masa:
$$\\vec g = \\frac{\\vec F}{m} = -G\\,\\frac{M}{r^2}\\,\\hat u_r \\qquad [\\vec g] = \\text{N/kg} = \\text{m/s}^2$$

**Principio de superposición:** si hay varias masas, el campo total es la **suma vectorial** de los campos de cada una:
$$\\vec g = \\vec g_1 + \\vec g_2 + \\dots = \\sum_i -G\\frac{M_i}{r_i^2}\\hat u_{r_i}$$

En componentes, si $\\vec r_i$ es el vector que va desde el punto hasta la masa $M_i$: $\\vec g_i = \\dfrac{G M_i}{r_i^3}\\,\\vec r_i$ (por eso aparece $r^3$: un $r$ sirve para hacer unitario el vector).

**Las líneas de campo** son tangentes a $\\vec g$ en cada punto: nacen en el infinito y mueren en las masas. Nunca se cortan.`,
      widget: { id: 'campo', props: { fuentes: [{ x: -5, y: 1, q: 8e4 }, { x: 5, y: -2, q: 4e4 }, { x: 1, y: 6, q: 2e4 }], tipo: 'gravitatorio', escala: 12, editable: true }, nota: 'Puedes arrastrar también las masas.' },
      check: {
        pregunta: 'Dos masas iguales están en $(-a, 0)$ y $(a, 0)$. ¿Cuánto vale el campo en el origen?',
        opciones: ['El doble del campo de una sola masa', 'Cero', 'El campo de una sola masa', 'Depende del valor de $a$, pero nunca es cero'],
        correcta: 1, explicacion: 'Los dos campos tienen el mismo módulo y sentidos opuestos: su suma vectorial es nula.',
      },
    },
    {
      titulo: 'Campo y peso', materia: 'fisica',
      vera: 'Lo que llamas "peso" es solo el campo gravitatorio multiplicado por tu masa. Nada más.',
      texto: `En la superficie de un planeta de masa $M$ y radio $R$:
$$g_0 = \\frac{GM}{R^2} \\qquad \\Rightarrow \\qquad GM = g_0 R^2$$
Esta relación permite trabajar sin conocer $G$ ni $M$ por separado (es un truco muy usado en la PAU).

A una altura $h$ sobre la superficie: $g(h) = \\dfrac{GM}{(R+h)^2} = g_0\\left(\\dfrac{R}{R+h}\\right)^2$.

El **peso** de un cuerpo es $\\vec P = m\\vec g$. La masa es una propiedad del cuerpo; el peso depende del lugar. Un astronauta en la ISS (a unos 400 km) tiene un peso del 88 % del que tendría en la superficie: **flota porque está en caída libre**, no porque no haya gravedad.

**Tercera ley de Kepler para órbitas circulares.** Si un satélite gira en una órbita circular de radio $r$, la fuerza gravitatoria es la centrípeta:
$$\\frac{GMm}{r^2} = m\\frac{v^2}{r} = m\\frac{4\\pi^2}{T^2}r \\;\\Rightarrow\\; T^2 = \\frac{4\\pi^2}{GM}\\,r^3$$
De aquí se puede despejar la masa del planeta central conociendo $r$ y $T$ de un satélite.

**Velocidad de escape** (adelanto del capítulo 2). Es la velocidad mínima que hay que dar en la superficie para que un cuerpo llegue al infinito. Se impone energía mecánica nula (origen de potencial en el infinito):
$$\\tfrac12 m v_e^2 - \\frac{GMm}{R} = 0 \\;\\Rightarrow\\; v_e = \\sqrt{\\frac{2GM}{R}} = \\sqrt{2 g_0 R}$$
Combinada con $g_0 = GM/R^2$, permite obtener el radio y la masa de un planeta a partir de $g_0$ y $v_e$ (así se plantea en la PAU de julio de 2023).`,
      check: {
        pregunta: 'Un astronauta flota dentro de la ISS porque…',
        opciones: ['allí la gravedad terrestre es nula', 'está fuera de la atmósfera', 'la estación y él caen libremente con la misma aceleración', 'la Luna compensa la atracción terrestre'],
        correcta: 2, explicacion: 'A 400 km, $g$ todavía vale unos $8{,}6$ m/s². Astronauta y estación caen juntos (están en órbita), por eso no hay fuerza de contacto entre ellos.',
      },
    },
    {
      titulo: 'Matrices: operaciones', materia: 'matematicas',
      vera: 'Las matrices son la forma en que los robots y las redes piensan. Y el producto no conmuta: tatúatelo.',
      texto: `Una matriz $m\\times n$ es una tabla de $m$ filas y $n$ columnas.

- **Suma:** elemento a elemento (mismas dimensiones).
- **Producto por un número:** se multiplica cada elemento.
- **Producto de matrices:** $A_{m\\times n}\\cdot B_{n\\times p} = C_{m\\times p}$ con $c_{ij} = \\sum_k a_{ik}b_{kj}$ (**fila de A por columna de B**). Solo existe si el número de columnas de $A$ coincide con el de filas de $B$.
- **¡No es conmutativo!** En general $AB \\neq BA$. Por eso $(A+B)^2 = A^2 + AB + BA + B^2$, y no $A^2 + 2AB + B^2$.
- **Traspuesta:** $(A^t)_{ij} = a_{ji}$, y $(AB)^t = B^tA^t$.
- **Matriz identidad** $I$: unos en la diagonal; $AI = IA = A$.

**Potencias.** $A^n = A\\cdot A\\cdots A$. Para calcular $A^{2026}$ se busca un **patrón**: se calculan $A^2, A^3, \\dots$ hasta ver la regla (o un ciclo, por ejemplo $A^4 = I$) y se justifica por inducción.

**Matriz de adyacencia** de una red: $a_{ij} = 1$ si hay enlace directo de $i$ a $j$. El elemento $(i,j)$ de $A^k$ es el número de caminos de $k$ pasos de $i$ a $j$.`,
      widget: { id: 'grafo', props: { A: [[0, 1, 1, 0], [1, 0, 1, 1], [1, 1, 0, 0], [0, 1, 0, 0]], nombres: ['A', 'B', 'C', 'D'] } },
      check: {
        pregunta: 'Si $A$ es $2\\times3$ y $B$ es $3\\times4$, ¿qué productos existen?',
        opciones: ['Solo $AB$, que es $2\\times4$', 'Solo $BA$, que es $3\\times3$', '$AB$ y $BA$', 'Ninguno'],
        correcta: 0, explicacion: '$AB$: columnas de $A$ (3) = filas de $B$ (3) ✓ → $2\\times4$. $BA$: columnas de $B$ (4) ≠ filas de $A$ (2) ✗.',
      },
    },
    {
      titulo: 'Rango de una matriz', materia: 'matematicas',
      vera: 'El rango te dice cuánta información "independiente" hay en una matriz. Si es bajo, a tu brazo robótico le faltan direcciones.',
      texto: `El **rango** de una matriz, $\\operatorname{rg}(A)$, es el número de filas (o columnas) linealmente independientes. Equivale al orden del mayor **menor no nulo**.

**Cómo calcularlo:**
- **Por Gauss:** se escalona la matriz con operaciones elementales; el rango es el número de filas no nulas.
- **Por menores:** si hay un menor de orden $k$ no nulo, $\\operatorname{rg}\\ge k$. Se "orla" ese menor para ver si alguno de orden $k+1$ es no nulo.

**Rango con parámetro** (muy típico en la PAU): en una matriz cuadrada $n\\times n$,
- si $|A| \\ne 0$, $\\operatorname{rg}(A) = n$;
- se resuelve $|A| = 0$ para encontrar los valores críticos del parámetro y, para cada uno, se estudia aparte buscando menores de orden menor.

Ejemplo: $M = \\begin{pmatrix}1 & 1 & t\\\\ 1 & t & 1\\\\ t & 1 & 1\\end{pmatrix}$ tiene $|M| = -(t-1)^2(t+2)$. Si $t\\ne1, -2$: rango 3. Si $t = -2$: rango 2. Si $t = 1$: las tres filas son iguales, rango 1.`,
      check: {
        pregunta: 'Una matriz $3\\times3$ tiene determinante nulo y un menor $2\\times2$ igual a 5. Su rango es…',
        opciones: ['1', '2', '3', 'No se puede saber'],
        correcta: 1, explicacion: '$|A| = 0 \\Rightarrow \\operatorname{rg} < 3$, y el menor no nulo de orden 2 garantiza $\\operatorname{rg} \\ge 2$.',
      },
    },
  ],
  ejemplos: [
    {
      titulo: 'Física · Punto de campo nulo (tipo PAU)',
      enunciado: 'Dos masas puntuales $m_1 = 4$ kg y $m_2 = 1$ kg están separadas 3 m. Determina el punto donde el campo gravitatorio total es nulo y justifica por qué solo puede estar entre ambas.',
      solucion: `Fuera del segmento, los dos campos apuntan en el mismo sentido (hacia las masas) y no pueden anularse. Entre ellas tienen sentidos opuestos. Sea $x$ la distancia a $m_1$:
$$\\frac{G m_1}{x^2} = \\frac{G m_2}{(3-x)^2} \\Rightarrow \\frac{3-x}{x} = \\sqrt{\\frac{m_2}{m_1}} = \\frac12 \\Rightarrow x = 2\\ \\text{m}$$
El campo es nulo a 2 m de $m_1$ (1 m de $m_2$): **más cerca de la masa menor**, como era de esperar.`,
    },
    {
      titulo: 'Matemáticas · Potencia de una matriz (tipo PAU)',
      enunciado: 'Dada $A = \\begin{pmatrix}0 & -1\\\\ 1 & 0\\end{pmatrix}$, calcula $A^{2026}$.',
      solucion: `$A^2 = \\begin{pmatrix}-1&0\\\\0&-1\\end{pmatrix} = -I$, así que $A^4 = (A^2)^2 = I$. Las potencias se repiten con periodo 4. Como $2026 = 4\\cdot506 + 2$:
$$A^{2026} = (A^4)^{506}A^2 = I\\cdot A^2 = -I = \\begin{pmatrix}-1&0\\\\0&-1\\end{pmatrix}$$`,
    },
  ],
  ficha: {
    formulas: [
      '$\\vec F = -G\\dfrac{Mm}{r^2}\\hat u_r$',
      '$\\vec g = -G\\dfrac{M}{r^2}\\hat u_r$, $\\quad \\vec g = \\sum \\vec g_i$',
      '$g_0 = \\dfrac{GM}{R^2} \\Rightarrow GM = g_0R^2$',
      '$g(h) = g_0\\left(\\dfrac{R}{R+h}\\right)^2$',
      '$T^2 = \\dfrac{4\\pi^2}{GM}r^3 \\;\\Rightarrow\\; M = \\dfrac{4\\pi^2r^3}{GT^2}$',
      '$v_e = \\sqrt{\\dfrac{2GM}{R}} = \\sqrt{2g_0R}$',
      '$(AB)_{ij} = \\sum_k a_{ik}b_{kj}$, $\\quad (AB)^t = B^tA^t$',
      '$|A| \\ne 0 \\Leftrightarrow \\operatorname{rg}(A) = n$',
    ],
    errores: [
      'Usar la altura sobre la superficie en lugar de la distancia al centro: $r = R + h$.',
      'Sumar módulos de campos en lugar de sumar vectores.',
      'Olvidar pasar el periodo a segundos o los km a metros.',
      'Escribir $(A+B)^2 = A^2 + 2AB + B^2$: el producto de matrices no conmuta.',
      'Decir que el rango es 3 sin comprobar el determinante, o que es 1 sin buscar menores de orden 2.',
    ],
    examen: 'En la PAU de la Comunitat Valenciana, el bloque de **campo gravitatorio** suele pedir: el campo en un punto por superposición (con dibujo de los vectores), el punto de campo nulo, la masa de un planeta a partir de la órbita de un satélite y cuestiones de razonamiento sobre el peso y la ingravidez. En **Matemáticas II** (Álgebra) aparecen potencias $A^n$ buscando un patrón, matrices con parámetro (rango, inversa) y ecuaciones matriciales.',
  },
}
export default t1

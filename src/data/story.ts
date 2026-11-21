/** Guion de las cinemáticas (inicio y final de cada capítulo). */
export interface Linea { quien: 'VERA' | 'DIRECTORA' | 'TÚ' | 'RADIO'; texto: string }
export interface Cinematica { id: string; escena: 'espacio' | 'base' | 'lab' | 'tormenta'; lineas: Linea[] }

const c = (id: string, escena: Cinematica['escena'], lineas: [Linea['quien'], string][]): Cinematica => ({ id, escena, lineas: lineas.map(([quien, texto]) => ({ quien, texto })) })

export const CINEMATICAS: Record<string, Cinematica> = Object.fromEntries([
  c('prologo', 'espacio', [
    ['RADIO', 'Año 2071. Una supertormenta solar, más intensa que el evento Carrington de 1859, golpea la Tierra.'],
    ['RADIO', 'Caen los satélites. La red eléctrica del Mediterráneo se colapsa. El reactor de la región entra en parada de emergencia.'],
    ['DIRECTORA', 'Los observatorios confirman una segunda tormenta, todavía más fuerte. Llegará en nueve meses.'],
    ['DIRECTORA', 'Bienvenido a la Agencia del Mediterráneo. No tenemos tiempo para formarte como antes: aprenderás reparando.'],
    ['VERA', 'Hola. Soy VERA: Vector de Evaluación y Respuesta Autónoma. Seré tu mentora. Intentaré no reírme de tus errores. Lo intentaré.'],
  ]),
  c('c1-inicio', 'espacio', [
    ['VERA', 'La órbita baja es un vertedero: miles de fragmentos de satélites girando a casi 8 km/s.'],
    ['DIRECTORA', 'Antes de relanzar nada hay que limpiar. Tu primer trabajo: guiar el dron de recogida.'],
    ['VERA', 'Para eso necesitas entender el campo gravitatorio. Te espero en la Holocubierta.'],
  ]),
  c('c1-fin', 'espacio', [
    ['RADIO', 'Dron de recogida en posición segura. Restos capturados.'],
    ['VERA', 'Nada mal para alguien que esta mañana no sabía dónde estaba la cafetería.'],
    ['DIRECTORA', 'Órbita despejada. Siguiente objetivo: volver a poner satélites ahí arriba.'],
  ]),
  c('c2-inicio', 'espacio', [
    ['DIRECTORA', 'Sin satélites no hay previsión meteorológica, ni GPS, ni comunicaciones. Hay que relanzarlos.'],
    ['VERA', 'Y el combustible es limitado. Esta vez no vale probar a ver qué pasa: hay que calcular antes de lanzar.'],
  ]),
  c('c2-fin', 'espacio', [
    ['RADIO', 'Tres satélites en órbita nominal. Recibimos telemetría.'],
    ['VERA', 'Kepler estaría orgulloso. Yo también, un poco.'],
    ['DIRECTORA', 'Malas noticias: los satélites detectan una oleada de partículas cargadas dirigiéndose hacia nosotros.'],
  ]),
  c('c3-inicio', 'base', [
    ['VERA', 'Protones y electrones a gran velocidad. Si llegan a las instalaciones, fríen todos los circuitos.'],
    ['DIRECTORA', 'Necesitamos escudos y deflectores. Y repartir la poca energía que tenemos sin dejar a nadie a oscuras.'],
  ]),
  c('c3-fin', 'base', [
    ['RADIO', 'Oleada desviada. Daños mínimos en la base.'],
    ['VERA', 'Gauss te mandaría saludos si no llevara dos siglos muerto.'],
  ]),
  c('c4-inicio', 'base', [
    ['DIRECTORA', 'Las subestaciones de alta tensión están contaminadas con material desconocido. Hay que analizarlo.'],
    ['VERA', 'Para eso usaremos campos magnéticos: separan las partículas según su masa y su carga.'],
  ]),
  c('c4-fin', 'base', [
    ['RADIO', 'Fuga localizada y aislada.'],
    ['VERA', 'Bien. Ahora toca lo difícil: volver a generar electricidad.'],
  ]),
  c('c5-inicio', 'base', [
    ['DIRECTORA', 'Los alternadores están parados. Sin ellos, la red no vuelve.'],
    ['VERA', 'Faraday descubrió cómo convertir movimiento en corriente. Hoy vas a hacer lo mismo, pero a escala regional.'],
  ]),
  c('c5-fin', 'base', [
    ['RADIO', 'Red de transporte restablecida. Valencia vuelve a tener luz.'],
    ['VERA', 'Mira por la ventana. Esas luces las has encendido tú.'],
  ]),
  c('c6-inicio', 'base', [
    ['RADIO', 'Alerta sísmica. Repetimos: alerta sísmica.'],
    ['DIRECTORA', 'La tormenta ha alterado la corteza. Y el ruido del puerto bloquea los sensores que necesitamos.'],
    ['VERA', 'Vibraciones y ondas. Todo oscila, ingeniero. Hasta tus notas.'],
  ]),
  c('c6-fin', 'base', [
    ['RADIO', 'Amortiguadores sincronizados. Sensores limpios.'],
    ['VERA', 'Siguiente parada: la luz. Las comunicaciones por fibra siguen caídas.'],
  ]),
  c('c7-inicio', 'lab', [
    ['DIRECTORA', 'Los cables submarinos de fibra óptica están dañados y el telescopio de seguimiento, ciego.'],
    ['VERA', 'La luz es una onda. Y a veces se comporta como rayos. Hoy usaremos las dos caras.'],
  ]),
  c('c7-fin', 'lab', [
    ['RADIO', 'Enlace de fibra restablecido. Telescopio operativo.'],
    ['VERA', 'Ahora vemos venir la tormenta. Y no es pequeña.'],
  ]),
  c('c8-inicio', 'lab', [
    ['DIRECTORA', 'Los relojes atómicos se desincronizan y los sensores de precisión dan lecturas imposibles.'],
    ['VERA', 'Bienvenido al lugar donde la física clásica se rinde. Relatividad y cuántica.'],
  ]),
  c('c8-fin', 'lab', [
    ['RADIO', 'Red sincronizada al nanosegundo.'],
    ['VERA', 'Queda lo más delicado: el reactor.'],
  ]),
  c('c9-inicio', 'lab', [
    ['DIRECTORA', 'Sin el reactor no aguantaremos la segunda tormenta. Hay que arrancarlo. Con cuidado.'],
    ['VERA', 'Núcleos, desintegraciones, probabilidades. Aquí un error no da una mala nota: da un mal día.'],
  ]),
  c('c9-fin', 'lab', [
    ['RADIO', 'Reactor en régimen estable. Potencia nominal.'],
    ['DIRECTORA', 'Lo tenemos todo. Ahora solo falta aguantar.'],
    ['VERA', 'La tormenta llega. Demuestra todo lo que has aprendido.'],
  ]),
  c('c10-inicio', 'tormenta', [
    ['RADIO', 'Impacto de la eyección coronal en 90 minutos.'],
    ['DIRECTORA', 'Todos los sistemas que has reparado van a ponerse a prueba a la vez.'],
    ['VERA', 'Sin ayudas esta vez, ingeniero. Como en el examen de verdad. Confío en ti.'],
  ]),
  c('final', 'espacio', [
    ['RADIO', 'La tormenta ha pasado. Todos los sistemas operativos.'],
    ['DIRECTORA', 'Lo has conseguido. El Mediterráneo sigue en pie gracias a ti.'],
    ['VERA', 'Y ahora, el examen de verdad. Pero eso ya lo tienes preparado. Suerte, ingeniero.'],
  ]),
].map((x) => [x.id, x]))

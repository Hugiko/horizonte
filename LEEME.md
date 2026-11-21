# HORIZONTE · La Segunda Tormenta

Juego 3D educativo para preparar la PAU de la Comunitat Valenciana (Física y Matemáticas II).

## Cómo jugar
**Haz doble clic en `JUGAR.bat`.**
- La primera vez instala lo necesario (unos minutos, con internet).
- Después se abre el navegador con el juego.
- Para cerrar el juego, cierra la ventana negra.

Si el ordenador no tiene Node.js, `JUGAR.bat` intenta instalarlo solo. Si no lo consigue, descárgalo de https://nodejs.org (versión LTS), instálalo y vuelve a hacer doble clic.

## Publicación en Render
El archivo `render.yaml` lo deja todo configurado: la web del juego más una base de datos PostgreSQL donde se guarda el progreso de cada jugador.
- Cada jugador crea su cuenta (nombre de agente + contraseña) y puede jugar desde cualquier ordenador.
- El progreso se guarda solo, cada pocos segundos.
- `TEACHER_PASSWORD` es la contraseña del panel del profesor (Render la pide al crear el servicio).
- En el plan gratuito de Render el servidor "se duerme" tras 15 minutos sin uso. La primera visita después tarda unos 50 segundos, y el juego lo indica mientras conecta.

## Carpetas
| Carpeta | Contenido |
|---|---|
| `src/data/curriculum.ts` | **Orden de capítulos y misiones** (editable por el profesor) y ajustes por defecto |
| `src/data/constants.ts` | Constantes físicas y datos astronómicos, con su fuente |
| `src/missions/` | Definición de misiones (como datos) |
| `src/sims/` | Simulaciones físicas (órbitas RK4…) y sus tests |
| `src/scenes/` | Escenas 3D |
| `src/ui/` | Interfaz (menús, carga, paneles) |
| `src/state/` | Estado del juego |
| `src/net/` | Conexión con el servidor: cuentas y guardado en la nube |
| `server/` | Servidor (API de partidas, base de datos) y sus tests |
| `src/i18n/` | Textos (castellano; valenciano en el futuro) |
| `public/assets/` | HDRIs, texturas, modelos y audio |

## Para desarrolladores
- `npm run dev`: servidor de desarrollo
- `npm test`: tests automáticos (Vitest)
- `npm run build`: versión compilada en `dist/`

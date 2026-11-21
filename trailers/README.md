# Tráileres de HORIZONTE

Proyecto Remotion **independiente** (su propio `package.json`; no toca el del juego) que produce el tráiler
cinematográfico que el juego reproduce a pantalla completa antes de cada misión
(`src/screens/TrailerVideo.tsx` carga `public/trailers/<ID>.mp4` y el póster `<ID>.jpg`).

Todo es **data-driven**: cada `guiones/<ID>.json` se convierte automáticamente en una composición
(`F1.1` → `F1-1`). Para un tráiler nuevo solo hace falta un JSON nuevo y generar su narración.

## Requisitos (una sola vez)

```bash
cd trailers
npm install
pip install edge-tts      # voz neuronal de Microsoft Edge (gratuita, necesita internet)
node scripts/sfx.mjs      # sintetiza los efectos (braam, boom, hit, riser, whoosh, tick, glitch)
```

FFmpeg no hace falta: se usa el que trae Remotion (`node_modules/@remotion/compositor-win32-x64-msvc`).

## Producir el tráiler de la siguiente misión (p. ej. F1.2)

1. **Guion**: copia `guiones/F1.1.json` a `guiones/F1.2.json` y edítalo (ver formato abajo).
   Estructura obligatoria: gancho (amenaza) → qué falla → EN LA VIDA REAL → LA CLAVE (pista, **sin solución ni números**)
   → título de la misión + lema. Textos y narración en español de España.
2. **Narración**: `node scripts/narracion.mjs F1.2`
   → `public/audio/F1.2/voz-<plano>.wav` y `guiones/F1.2.voz.json` (duraciones medidas).
   Los planos se alargan solos si la voz no cabe en su `duracion`.
3. **Revisar**: `node scripts/render.mjs F1.2 --solo-qa` → dos fotogramas por plano en `out/qa/F1.2/`. Míralos.
   (O en vivo: `npm run studio`.)
4. **Render final**: `node scripts/render.mjs F1.2`
   → `../public/trailers/F1.2.mp4` (H.264 1280×720 30 fps ≈1,8 Mbps, AAC 160 kbps) + póster `../public/trailers/F1.2.jpg`.
5. Comprueba la mezcla (sin saturar) y la duración (45–70 s). Anota en `../CREDITOS.md` cualquier recurso nuevo.

## Formato del guion

```jsonc
{
  "id": "F1.1", "titulo": "PESAR MUNDOS", "fps": 30,
  "poster": { "plano": "mision", "segundo": 1.6 },          // fotograma del póster
  "voces": {                                                  // locutores (edge-tts)
    "narrador": { "voz": "es-ES-AlvaroNeural", "rate": "-2%", "pitch": "-10Hz", "graves": 0.55, "eco": 0.18 },
    "vera":     { "voz": "es-ES-ElviraNeural", "rate": "+4%", "pitch": "-2Hz", "graves": 0.2, "eco": 0.1, "radio": true }
  },
  "musica": [                                                 // tramos de la pista (segundos de la canción)
    { "src": "musica/five-armies.mp3", "plano": "carrington", "desde": 0, "hasta": 13.5, "volumen": 0.7 },
    { "src": "musica/five-armies.mp3", "plano": "apagon", "hasta": 150.5, "alinearFinal": true, "volumen": 0.85 }
  ],                                                          // alinearFinal: el final del tramo cae en el final del tráiler
  "planos": [
    { "id": "apagon", "tipo": "alerta", "visual": "tierra-apagon", "duracion": 4,
      "texto": "APAGÓN TOTAL", "lineas": ["SATÉLITES · SIN SEÑAL"],
      "voz": { "locutor": "narrador", "texto": "Satélites muertos…", "inicio": 0.6 },
      "sfx": [ { "nombre": "braam", "en": 0, "volumen": 1 }, { "nombre": "riser", "en": -3.0 } ] }
  ]
}
```

- **tipo** (rótulo): `fecha`, `alerta` (glitch naranja), `vera` (holograma que reacciona a su voz), `hud`,
  `palabras` (cortes rápidos de `palabras[]`, sincronizados con los `hit`), `seccion` ("EN LA VIDA REAL", "LA CLAVE"),
  `pista` (`texto` + `formula` conceptual), `titulo-mision` (`texto`, `subtexto`, `etiqueta`), `lema`, `logo` (`creditos`).
- **visual** (fondo): `sol`, `sol-furia` (foto NASA SDO), `tierra`, `tierra-apagon`, `tierra-orbitas`, `tierra-logo`,
  `exoplaneta`, `exoplaneta-cerca`, `estrellas`, `base` (arcos blancos de la ADM), `webb`, `orbita-vectores`, `escape`, `negro`.
  Para un visual nuevo, añade un `case` en `src/visuales.tsx` (2D/SVG) o una escena en `src/escenas3d.tsx` (@remotion/three).
- **sfx**: `braam`, `boom`, `hit`, `riser` (sube 3 s: ponlo en `en: -3` para que culmine en el corte), `whoosh`, `tick`, `glitch`.
  `en` en segundos respecto al inicio del plano (puede ser negativo). `braam`/`hit`/`boom` en 0 → fogonazo + temblor.
- Escribe los números y siglas como se pronuncian en `voz.texto` ("mil ochocientos cincuenta y nueve",
  "ele hache ese cuatro siete cinco be"); los subtítulos se ven en la franja inferior (ajusta los reemplazos en `Trailer.tsx`).

Efectos globales: franjas 2,39:1, grano, viñeta, light leaks, fogonazos y temblor en los golpes, subtítulos,
música atenuada automáticamente bajo la narración (ducking).

## Estructura

```
guiones/        <ID>.json (guion), <ID>.voz.json (generado), storyboard-<ID>.md
scripts/        narracion.mjs (edge-tts + procesado), sfx.mjs (síntesis), render.mjs (MP4 + póster + QA), dsp.mjs
src/            Root.tsx (registra un guion = una composición), Trailer.tsx, rotulos.tsx, visuales.tsx, escenas3d.tsx, efectos.tsx
public/         img/ (texturas y fotos NASA), musica/, audio/<ID>/ (voces), audio/sfx/
out/qa/         fotogramas de revisión (no se publican)
```

Licencia de Remotion: gratuita para particulares y equipos pequeños (ver https://remotion.dev/license).

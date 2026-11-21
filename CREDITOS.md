# Créditos y licencias

Todos los recursos de terceros de HORIZONTE: autor, licencia y enlace.
Esta lista también se mostrará en la pantalla de créditos del juego (Fase 5).

## Entornos HDRI · Poly Haven (CC0)
| Archivo | Autor | Enlace |
|---|---|---|
| `public/assets/hdri/venice_sunset_1k.hdr` | Greg Zaal | https://polyhaven.com/a/venice_sunset |
| `public/assets/hdri/studio_small_09_1k.hdr` | Sergej Majboroda | https://polyhaven.com/a/studio_small_09 |

## Texturas PBR · Poly Haven (CC0)
| Carpeta | Autor | Enlace |
|---|---|---|
| `public/assets/textures/pbr/painted_plaster_wall/` | Amal Kumar | https://polyhaven.com/a/painted_plaster_wall |
| `public/assets/textures/pbr/metal_plate/` | Rob Tuytel | https://polyhaven.com/a/metal_plate |
| `public/assets/textures/pbr/concrete_floor_worn_001/` | Dimitrios Savva, Rico Cilliers | https://polyhaven.com/a/concrete_floor_worn_001 |

## Texturas planetarias · Solar System Scope (CC BY 4.0)
Tierra (día, noche, nubes, normales, especular), Luna, Sol y Vía Láctea.
Archivos en `public/assets/textures/planets/`.
Autor: **Solar System Scope / INOVE** · https://www.solarsystemscope.com/textures/ · Licencia: https://creativecommons.org/licenses/by/4.0/
(Basadas en datos de la NASA. Los mapas normal y especular se han convertido de TIFF a PNG sin otros cambios.)

## Modelos 3D
| Archivo | Autor | Licencia | Enlace |
|---|---|---|---|
| `public/assets/models/RobotExpressive.glb` | Tomás Laulhé (Quaternius), modificado por Don McCurdy | CC0 | https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive |

## Tipografías (SIL Open Font License 1.1)
- **Orbitron**, de Matt McInerney · https://fonts.google.com/specimen/Orbitron
- **Exo 2**, de Natanael Gama · https://fonts.google.com/specimen/Exo+2
- **Inter**, de Rasmus Andersson · https://rsms.me/inter/
(Incluidas en local mediante los paquetes @fontsource.)

## Software
Three.js, React Three Fiber, drei, postprocessing, Rapier, zustand, KaTeX, math.js, howler.js e i18next (licencias MIT, Apache-2.0 o similares; ver `node_modules/<paquete>/LICENSE`).

## Música y efectos de sonido
Pendientes (ver `ASSETS_PENDIENTES.md`).

## Tráileres de misión (`public/trailers/`, proyecto `trailers/`)
| Recurso | Autor | Licencia | Enlace |
|---|---|---|---|
| Música «Five Armies» (tráiler F1.1) | Kevin MacLeod (incompetech.com) | CC BY 4.0 | https://incompetech.com/music/royalty-free/mp3-royaltyfree/Five%20Armies.mp3 · https://creativecommons.org/licenses/by/4.0/ |
| Foto «NASA's SDO Observes an X-class Solar Flare» (`trailers/public/img/nasa-sdo-llamarada-x.jpg`, virada de color) | NASA / SDO (Goddard Space Flight Center) | Dominio público (NASA) | https://images.nasa.gov/details/GSFC_20171208_Archive_e000934 |
| Foto «NASA's SDO Shows Images of Significant Solar Flare» (`trailers/public/img/nasa-sdo-llamarada-longitudes.jpg`, reserva) | NASA / SDO (Goddard Space Flight Center) | Dominio público (NASA) | https://images.nasa.gov/details/GSFC_20171208_Archive_e001208 |
| Texturas de la Tierra, Sol, Luna y Vía Láctea | Solar System Scope / INOVE | CC BY 4.0 | https://www.solarsystemscope.com/textures/ |
| Narración (voces «Álvaro» y «Elvira») | Síntesis neuronal Microsoft Edge TTS mediante `edge-tts` | Audio generado para el proyecto | https://github.com/rany2/edge-tts |
| Efectos de tráiler (braam, boom, hit, riser, whoosh, tick, glitch) | Sintetizados por código (`trailers/scripts/sfx.mjs`) | Propios | — |
| Animación y render | Remotion, @remotion/three, three.js | Licencia Remotion (gratuita para particulares/equipos pequeños), MIT | https://remotion.dev |

Atribución que se muestra en el propio tráiler: «Música: «Five Armies», Kevin MacLeod (incompetech.com) · CC BY 4.0 · Texturas: Solar System Scope · CC BY 4.0 · Voz: síntesis neuronal».

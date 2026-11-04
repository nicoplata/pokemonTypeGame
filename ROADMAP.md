# Hoja de ruta

Camino recomendado para seguir llevando el juego a otro nivel. El orden
busca que cada etapa deje la base lista para la siguiente: primero la
experiencia de uso y las herramientas, después el contenido de juego y, al
final, lo que necesita un servidor.

Estado: ✅ hecho · 🚧 en curso · ⬜ pendiente

## Etapa 0 — Experiencia de uso

| # | Tarea | Estado | Por qué ahora |
|---|-------|--------|---------------|
| 0 | **Mejoras de UI/UX** sin perder la estética retro: panel de juego siempre a la vista, información útil en los botones, atajos de teclado, velocidad del texto, fuente propia | ✅ | Todo lo que venga después se juega sobre esta interfaz. |
| 13 | **Accesibilidad auditada** (Lighthouse 100, lector de pantalla, contraste, teclado) | ⬜ | Conviene hacerla junto con la UI, antes de sumar pantallas nuevas. |

## Etapa 1 — Fundamentos técnicos

| # | Tarea | Estado | Por qué ahora |
|---|-------|--------|---------------|
| 12 | **Migrar a TypeScript** (empezando por el motor de combate) | ⬜ | Cuanto más código haya, más cuesta. Los tipos atrapan errores en las reglas de combate. |
| 14 | **Varios idiomas** (castellano e inglés) | ⬜ | Sacar los textos a archivos de idioma es más barato antes de sumar contenido. PokéAPI trae los nombres en varios idiomas. |

## Etapa 2 — Profundidad de juego

| # | Tarea | Estado | Por qué en este orden |
|---|-------|--------|------------------------|
| 5 | **Objetos**: pociones, curas de estado, objetos equipados (Restos, Banda Focus...) | ⬜ | Es la base de la captura (Pokébolas) y de la exploración. |
| 4 | **Exploración y captura**: mapa por zonas, Pokémon salvajes, Pokébolas | ⬜ | Le da sentido a armar el equipo y usa los objetos. |
| 7 | **IA más inteligente y dificultades** (fácil, normal, experto) | ⬜ | Con objetos y cambios, la IA necesita decidir mejor. |
| 6 | **Habilidades y clima** (Intimidación, Levitación, lluvia, sol...) | ⬜ | Requisito para que las generaciones nuevas se jueguen bien. |

## Etapa 3 — Contenido y rejugabilidad

| # | Tarea | Estado | Por qué en este orden |
|---|-------|--------|------------------------|
| 10 | **Modo Torre**: combates seguidos sin curarse | ⬜ | Reutiliza todo lo anterior con poco código nuevo. |
| 11 | **Logros y Pokédex de vistos/capturados** | ⬜ | Necesita la captura y da objetivos a largo plazo. |
| 9 | **Las 9 generaciones** | ⬜ | Después de habilidades y clima, para que los Pokémon nuevos funcionen completos. Hay que cuidar el tamaño de los datos. |
| 8 | **Combates dobles** (2 contra 2) | ⬜ | El cambio más grande del motor; mejor cuando ya está tipado y estable. |

## Etapa 4 — Social y en línea

| # | Tarea | Estado | Por qué al final |
|---|-------|--------|-------------------|
| 2 | **Compartir equipos** con un código o link | ⬜ | No necesita servidor y prepara el formato que usa el modo en línea. |
| 3 | **Desafíos diarios y ranking** | ⬜ | Necesita un servidor chico para guardar puntajes. |
| 1 | **Multijugador en línea** con código de sala | ⬜ | El más complejo (servidor de WebSockets o WebRTC). Reutiliza los controladores de combate que ya existen. |

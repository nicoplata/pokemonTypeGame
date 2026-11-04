# Pokémon Type Game

Juego de combate por turnos en el navegador. El Profesor Oak te recibe, elegís
tu Pokémon inicial (Bulbasaur, Charmander o Squirtle) y te enfrentás a un rival
(Chikorita, Cyndaquil o Totodile). Los datos de cada Pokémon se obtienen de
[PokéAPI](https://pokeapi.co/).

## Cómo jugar

1. Abrí el juego publicado en GitHub Pages, o levantalo en tu compu (ver abajo).
2. Ingresá tu nombre y elegí tu inicial y tu rival.
3. En cada turno elegí un ataque:

| Ataque   | Daño               | Precisión | Usos | Usa tipos |
|----------|--------------------|-----------|------|-----------|
| Rápido   | 25 % del ataque    | 100 %     | ∞    | No        |
| Pesado   | 40 % del ataque    | 80 %      | ∞    | No        |
| Especial | 45 % del ataque    | 100 %     | 3    | Sí        |

El **ataque especial** es del tipo de tu Pokémon: hace el doble de daño contra
un tipo débil (por ejemplo, Fuego contra Planta) y la mitad contra uno
resistente. Ataca primero el Pokémon con más velocidad. El rival elige sus
ataques con una pequeña estrategia.

Tus victorias y derrotas se guardan en el navegador (`localStorage`).

## Desarrollo

Necesitás [Node.js](https://nodejs.org/) 22 o superior.

```bash
npm install
```

```bash
npm start
```

Después abrí http://localhost:3000. El juego usa módulos de JavaScript, así
que hace falta un servidor: abrir `index.html` con doble click no funciona.

### Tests

```bash
npm test
```

```bash
npm run test:e2e
```

`npm test` corre los tests unitarios de la lógica (Vitest) y `npm run test:e2e`
juega partidas completas en un navegador (Playwright), en escritorio y móvil.
La primera vez que corras los e2e instalá el navegador con
`npx playwright install chromium`.

### Estilos

Los estilos se escriben en `sass/` y se compilan a `styles/styles.css`:

```bash
npm run build:css
```

### Integración continua y publicación

En cada push y pull request, GitHub Actions corre todos los tests
(`.github/workflows/ci.yml`). Cuando se actualiza `main` y los tests pasan,
publica el juego en GitHub Pages.

Para activarlo por única vez: en GitHub, **Settings → Pages → Build and
deployment → Source: GitHub Actions**.

## Estructura

```
index.html           Página
src/main.js          Flujo de la partida
src/motor/           Lógica de combate (sin DOM, testeada)
src/datos/           Textos, ataques y tabla de tipos
src/servicios/       PokéAPI y progreso guardado
src/ui/              Diálogo, ventana modal y fichas
sass/                Estilos fuente
styles/styles.css    Estilos compilados
tests/unit/          Tests unitarios
tests/e2e/           Tests en navegador
scripts/             Servidor local y armado del sitio
```

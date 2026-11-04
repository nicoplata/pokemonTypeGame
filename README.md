# Pokémon Type Game

Juego de combate por turnos en el navegador. El Profesor Oak te recibe, elegís
tu Pokémon y te enfrentás a un rival. Podés usar cualquiera de los 251 Pokémon
de las dos primeras generaciones: los iniciales clásicos, cualquier otro
buscándolo en la Pokédex (por nombre, número o tipo), o un rival al azar. Los datos de los Pokémon y sus movimientos
vienen de [PokéAPI](https://pokeapi.co/).

## Cómo jugar

1. Abrí el juego publicado en GitHub Pages, o levantalo en tu compu (ver abajo).
2. Ingresá tu nombre y elegí tu Pokémon y tu rival.
3. Armá un equipo de tres: tu inicial y dos compañeros (sugeridos, al azar o
   buscados en la Pokédex). El rival también tiene tres.
4. En cada turno elegí un movimiento o cambiá de Pokémon con **EQUIPO**. Los
   cambios ocurren antes que los ataques, así que el que entra recibe el
   golpe. Cuando un Pokémon se debilita, elegís quién sale. Gana quien deja
   al otro equipo sin Pokémon.

Cada Pokémon conoce los movimientos reales que aprende hasta su nivel
(Arañazo, Ascuas, Látigo Cepa...), con su tipo, potencia, precisión y PP.
Un movimiento hace el doble de daño contra un tipo débil (por ejemplo, Fuego
contra Planta) y la mitad contra uno resistente. Los movimientos con
prioridad (como Ataque Rápido) golpean primero; si no, ataca primero el más
veloz. El rival elige el movimiento que más daño le hace, aunque a veces
improvisa.

El daño usa la fórmula de los juegos: depende del nivel, de la potencia, del
ataque del que golpea contra la defensa del que recibe (física o especial
según el movimiento), con un 50 % extra si el movimiento es del mismo tipo
que el Pokémon (STAB), golpes críticos (x1,5) y una variación aleatoria del
85 % al 100 %. Las estadísticas también se calculan según el nivel.

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

### Datos

`data/pokedex.json` se genera a partir de los datos oficiales de PokéAPI
(los 251 Pokémon de las dos primeras generaciones, con sus movimientos en
castellano):

```bash
npm run datos
```

### Estilos

Los estilos se escriben en `sass/` y se compilan a `styles/styles.css`:

```bash
npm run build:css
```

### Integración continua y publicación

En cada push y pull request, GitHub Actions corre todos los tests
(`.github/workflows/ci.yml`).

Publicar en GitHub Pages es opcional. Para activarlo:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: crear
   `PUBLICAR_EN_PAGES` con el valor `true`.

Desde ahí, cada vez que se actualiza `main` y los tests pasan, el juego se
publica solo.

## Estructura

```
index.html           Página
src/main.js          Flujo de la partida
src/motor/           Lógica de combate (sin DOM, testeada)
src/datos/           Textos, configuración y tabla de tipos
src/servicios/       Carga de datos y progreso guardado
data/pokedex.json    Pokémon y movimientos (generado desde PokéAPI)
src/ui/              Diálogo, ventana modal y fichas
sass/                Estilos fuente
styles/styles.css    Estilos compilados
tests/unit/          Tests unitarios
tests/e2e/           Tests en navegador
scripts/             Servidor local, generador de datos y armado del sitio
```

# Pokémon Type Game

Juego de combate por turnos en el navegador. El Profesor Oak te recibe, elegís
tu Pokémon y te enfrentás a un rival. Podés usar cualquiera de los 251 Pokémon
de las dos primeras generaciones: los iniciales clásicos, cualquier otro
buscándolo en la Pokédex (por nombre, número o tipo), o un rival al azar. Los datos de los Pokémon y sus movimientos
vienen de [PokéAPI](https://pokeapi.co/).

## Cómo jugar

1. Abrí el juego publicado en GitHub Pages, o levantalo en tu compu (ver abajo).
2. Ingresá tu nombre y elegí un modo:
   - **Campaña**: enfrentás en orden a ocho entrenadores especializados en un
     tipo (cada victoria da una medalla) y al campeón final. Los equipos
     rivales evolucionan y suben de nivel con el tuyo, y los últimos
     entrenadores improvisan menos. El progreso se guarda.
   - **Combate libre**: elegís a tu rival (o al azar).
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

También hay movimientos de estado y efectos secundarios:

- **Estados alterados**: quemado (pierde 1/16 de salud por turno y hace la
  mitad de daño físico), envenenado (pierde 1/8 por turno), paralizado (más
  lento y a veces no se mueve), dormido (de 1 a 3 turnos) y congelado (no se
  mueve hasta descongelarse). Algunos tipos son inmunes (Fuego no se quema,
  Eléctrico no se paraliza...).
- **Cambios de estadísticas** de −6 a +6 (Gruñido, Danza Espada, Ataque
  Arena...), que se pierden al salir del campo.
- **Curación** (Recuperación), **drenaje** (Absorber), **daño de retroceso**
  (Doble Filo) y **retroceder** (Mordisco).

El daño usa la fórmula de los juegos: depende del nivel, de la potencia, del
ataque del que golpea contra la defensa del que recibe (física o especial
según el movimiento), con un 50 % extra si el movimiento es del mismo tipo
que el Pokémon (STAB), golpes críticos (x1,5) y una variación aleatoria del
85 % al 100 %. Las estadísticas también se calculan según el nivel.

Durante el combate, la escena muestra a los dos Pokémon enfrentados con sus
barras de salud, y anima los ataques, los golpes (con el daño flotando), los
debilitados y las entradas. Si tu sistema pide menos animaciones, el juego
las omite.

El juego tiene sonido 8-bit generado en el navegador (Web Audio): efectos
para ataques, golpes, súper eficaz, críticos, debilitados, cambios, subidas
de nivel y evolución, y dos músicas originales (menú y combate). El botón
**♪ SONIDO** lo silencia y recuerda tu elección.

### Experiencia y evolución

Cada vez que cae un Pokémon rival, el que lo derrotó gana experiencia y el
resto del equipo con vida recibe la mitad. Al subir de nivel mejoran las
estadísticas y pueden aprender movimientos nuevos (si ya conocen cuatro,
elegís cuál olvidar). Al terminar el combate, los que llegaron al nivel
necesario evolucionan (podés detenerlo). Los rivales tienen el nivel promedio
de tu equipo.

Tu equipo, tus victorias y tus derrotas se guardan en el navegador
(`localStorage`); en la próxima partida podés seguir con el mismo equipo.

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

### Instalar y jugar sin conexión

El juego es una PWA: desde el navegador (botón **⬇ INSTALAR** o el menú del
navegador) se puede instalar como app en el celular o la computadora, y
después de la primera visita funciona sin conexión. `sw.js` guarda los
archivos del juego; si agregás archivos nuevos, actualizá la lista con:

```bash
npm run precache
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
src/ui/              Diálogo, fichas, escena, sonido y ventanas
src/juego/           Bucle de combate, controladores y progresión
sass/                Estilos fuente
styles/styles.css    Estilos compilados
tests/unit/          Tests unitarios
tests/e2e/           Tests en navegador
scripts/             Servidor local, generador de datos, precache y armado del sitio
sw.js                Service worker (juego sin conexión)
```

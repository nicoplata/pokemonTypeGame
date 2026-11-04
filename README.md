# Pokémon Type Game

Juego de combate por turnos en el navegador. El Profesor Oak te recibe, elegís
tu Pokémon inicial (Bulbasaur, Charmander o Squirtle) y te enfrentás a un rival
(Chikorita, Cyndaquil o Totodile). Los datos de cada Pokémon se obtienen de
[PokéAPI](https://pokeapi.co/).

## Cómo jugar

1. Abrí `index.html` en el navegador.
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

## Estructura

```
index.html        Página
js/datos.js       Textos, ataques, Pokémon disponibles y tabla de tipos
js/index.js       Lógica del juego e interfaz
sass/             Estilos fuente (Sass, un parcial por sección)
styles/styles.css Estilos compilados
img/              Imágenes
```

## Compilar los estilos

```bash
npx sass --no-source-map sass/styles.scss styles/styles.css
```

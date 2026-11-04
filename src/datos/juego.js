// Configuración del juego.

// Números de Pokédex.
export const INICIALES = [1, 4, 7]
export const RIVALES = [152, 155, 158]

// Nivel de los Pokémon en combate (define qué movimientos conocen).
export const NIVEL_COMBATE = 10

// Imágenes locales (se usan en los botones de selección y como respaldo).
export const IMAGENES_LOCALES = {
    1: './img/001bulbasaur.png',
    4: './img/004charmander.png',
    7: './img/007squirtle.png',
    152: './img/152chikorita.png',
    155: './img/155cyndaquil.png',
    158: './img/158totodile.png'
}

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

export const imagenPokemon = (id) => `${SPRITES}/other/home/${id}.png`

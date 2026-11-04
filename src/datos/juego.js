// Configuración del juego.

// Números de Pokédex.
export const INICIALES = [1, 4, 7]
export const RIVALES = [152, 155, 158]

// Nivel con el que empieza un equipo nuevo.
export const NIVEL_INICIAL = 8

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

// Sprite pixelado pequeño (listas y escena de combate).
export const spritePokemon = (id) => `${SPRITES}/${id}.png`
export const spriteEspalda = (id) => `${SPRITES}/back/${id}.png`

export const numeroPokedex = (id) => `#${String(id).padStart(3, '0')}`

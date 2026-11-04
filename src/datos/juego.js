// Pokémon disponibles y ataques.

export const INICIALES = ['bulbasaur', 'charmander', 'squirtle']
export const RIVALES = ['chikorita', 'cyndaquil', 'totodile']

// Imagen local de cada Pokémon (se usa en los botones de selección).
export const IMAGENES = {
    bulbasaur: './img/001bulbasaur.png',
    charmander: './img/004charmander.png',
    squirtle: './img/007squirtle.png',
    chikorita: './img/152chikorita.png',
    cyndaquil: './img/155cyndaquil.png',
    totodile: './img/158totodile.png'
}

// La salud del combate es la salud base multiplicada por este factor,
// para que las peleas duren algunos turnos.
export const MULTIPLICADOR_SALUD = 2

// potencia: fracción del ataque que se convierte en daño.
// precision: probabilidad de acertar (0 a 1).
// pp: usos disponibles por combate (Infinity = ilimitado).
// usaTipo: si el daño depende de la efectividad de tipos.
export const ATAQUES = {
    rapido: { nombre: 'ATAQUE RÁPIDO', corto: 'RÁPIDO', potencia: 0.25, precision: 1, pp: Infinity, usaTipo: false },
    pesado: { nombre: 'ATAQUE PESADO', corto: 'PESADO', potencia: 0.4, precision: 0.8, pp: Infinity, usaTipo: false },
    especial: { nombre: 'ATAQUE ESPECIAL', corto: 'ESPECIAL', potencia: 0.45, precision: 1, pp: 3, usaTipo: true }
}

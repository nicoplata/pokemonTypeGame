// Estadísticas según el nivel, con la fórmula de los juegos (desde la
// tercera generación). Todos los Pokémon usan el mismo potencial
// individual (IV) y no tienen esfuerzo (EV), para que sea predecible.

export const IV = 15

export function calcularSaludMax (base, nivel) {
    return Math.floor(((2 * base + IV) * nivel) / 100) + nivel + 10
}

export function calcularEstadistica (base, nivel) {
    return Math.floor(((2 * base + IV) * nivel) / 100) + 5
}

export function calcularEstadisticas (base, nivel) {
    return {
        hp: calcularSaludMax(base.hp, nivel),
        atk: calcularEstadistica(base.atk, nivel),
        def: calcularEstadistica(base.def, nivel),
        spa: calcularEstadistica(base.spa, nivel),
        spd: calcularEstadistica(base.spd, nivel),
        spe: calcularEstadistica(base.spe, nivel)
    }
}

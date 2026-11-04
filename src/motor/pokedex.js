// Acceso a los datos de Pokémon y movimientos (data/pokedex.json).

export const ID_PLACAJE = 33
export const ID_FORCEJEO = 165

// Efectos de movimientos de daño que el motor sabe resolver. Los efectos
// secundarios (estados, cambios de estadísticas) se ignoran por ahora.
const EFECTOS_DE_DANIO = new Set([
    1, 3, 4, 5, 6, 7, 18, 30, 32, 37, 43, 44, 45, 49, 69, 70, 71, 72, 73, 74, 77, 104, 126, 139, 140, 141,
    147, 148, 150, 151, 153, 183, 199, 201, 203, 205, 208, 210, 219, 230, 254, 261, 262, 270, 274, 275,
    276, 277, 290, 296, 334, 349, 372, 379
])

export function crearPokedex (datos) {
    const especie = (id) => {
        const encontrada = datos.pokemon[id]
        if (!encontrada) throw new Error(`No existe el Pokémon #${id}`)
        return encontrada
    }
    const movimiento = (id) => {
        const encontrado = datos.movimientos[id]
        if (!encontrado) throw new Error(`No existe el movimiento #${id}`)
        return encontrado
    }
    return { especie, movimiento, especies: () => Object.values(datos.pokemon) }
}

export function movimientoSoportado (mov) {
    return mov.clase !== 'estado' && mov.potencia !== null && EFECTOS_DE_DANIO.has(mov.efecto)
}

// Los últimos cuatro movimientos (soportados) aprendidos hasta ese nivel,
// como en los juegos. Si no queda ninguno, conoce Placaje.
export function movimientosAlNivel (pokedex, especie, nivel) {
    const ids = []
    for (const [nivelAprende, idMovimiento] of especie.aprende) {
        if (nivelAprende > nivel) break
        if (ids.includes(idMovimiento) || !movimientoSoportado(pokedex.movimiento(idMovimiento))) continue
        ids.push(idMovimiento)
    }
    const ultimos = ids.slice(-4)
    return ultimos.length ? ultimos : [ID_PLACAJE]
}

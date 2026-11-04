// Acceso a los datos de Pokémon y movimientos (data/pokedex.json).

export const ID_PLACAJE = 33
export const ID_FORCEJEO = 165

// Efectos de movimientos de daño que el motor sabe resolver. Los efectos
// secundarios (estados, cambios de estadísticas) se ignoran por ahora.
// Daño fijo: 42 (Furia Dragón), 131 (Bomba Sónica), 88 (nivel del usuario),
// 41 (mitad de la salud del objetivo).
export const EFECTOS_DANIO_FIJO = new Set([41, 42, 88, 131])

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

// Movimientos de estado: provocar un estado (categoría 1), cambiar
// estadísticas (2) o curarse (3). Se excluyen los que tienen condiciones
// especiales (género, tipo Planta, envenenado...).
const ESTADOS_SOPORTADOS = new Set(['burn', 'poison', 'paralysis', 'sleep', 'freeze'])
const EFECTOS_DE_ESTADO_EXCLUIDOS = new Set([266, 340, 364, 367])
const EFECTOS_DE_CURACION = new Set([33, 133, 215])

export function movimientoDeEstadoSoportado (mov) {
    if (EFECTOS_DE_ESTADO_EXCLUIDOS.has(mov.efecto)) return false
    if (mov.categoria === 1) return ESTADOS_SOPORTADOS.has(mov.estado)
    if (mov.categoria === 2) return mov.cambios.length > 0
    if (mov.categoria === 3) return EFECTOS_DE_CURACION.has(mov.efecto) && mov.curacion > 0
    return false
}

export const esMovimientoDeDanio = (mov) => mov.clase !== 'estado'

export function movimientoSoportado (mov) {
    if (mov.clase === 'estado') return movimientoDeEstadoSoportado(mov)
    if (EFECTOS_DANIO_FIJO.has(mov.efecto)) return true
    return mov.potencia !== null && EFECTOS_DE_DANIO.has(mov.efecto)
}

// Los últimos cuatro movimientos (soportados) aprendidos hasta ese nivel,
// como en los juegos. Siempre incluye al menos uno de daño: el último que
// aprendió o, si no aprendió ninguno, Placaje.
export function movimientosAlNivel (pokedex, especie, nivel) {
    const ids = []
    for (const [nivelAprende, idMovimiento] of especie.aprende) {
        if (nivelAprende > nivel) break
        if (ids.includes(idMovimiento) || !movimientoSoportado(pokedex.movimiento(idMovimiento))) continue
        ids.push(idMovimiento)
    }
    const ultimos = ids.slice(-4)
    if (ultimos.some((id) => esMovimientoDeDanio(pokedex.movimiento(id)))) return ultimos
    const deDanio = ids.filter((id) => esMovimientoDeDanio(pokedex.movimiento(id))).at(-1) ?? ID_PLACAJE
    return [deDanio, ...ultimos].slice(0, 4)
}

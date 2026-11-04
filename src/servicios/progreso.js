// Progreso del jugador guardado en localStorage.

const CLAVE = 'pokemonTypeGame'

export function progresoVacio () {
    return { nombre: '', victorias: 0, derrotas: 0, equipo: [] }
}

const esEnteroPositivo = (valor) => Number.isInteger(valor) && valor >= 0

// Cada Pokémon guardado: { id, exp, movimientos: [ids] }.
function normalizarEquipo (equipo) {
    if (!Array.isArray(equipo)) return []
    return equipo
        .filter((p) => p && Number.isInteger(p.id) && p.id >= 1 && esEnteroPositivo(p.exp))
        .slice(0, 3)
        .map((p) => ({
            id: p.id,
            exp: p.exp,
            movimientos: Array.isArray(p.movimientos) ? p.movimientos.filter(Number.isInteger).slice(0, 4) : []
        }))
}

export function normalizarProgreso (datos) {
    const vacio = progresoVacio()
    if (!datos || typeof datos !== 'object') return vacio
    return {
        nombre: typeof datos.nombre === 'string' ? datos.nombre : '',
        victorias: Number.isInteger(datos.victorias) ? datos.victorias : 0,
        derrotas: Number.isInteger(datos.derrotas) ? datos.derrotas : 0,
        equipo: normalizarEquipo(datos.equipo)
    }
}

export function leerProgreso (almacen = globalThis.localStorage) {
    try {
        return normalizarProgreso(JSON.parse(almacen.getItem(CLAVE)))
    } catch {
        return progresoVacio()
    }
}

export function guardarProgreso (progreso, almacen = globalThis.localStorage) {
    try {
        almacen.setItem(CLAVE, JSON.stringify(progreso))
    } catch {
        // Sin acceso a localStorage (modo privado, permisos): el juego sigue igual.
    }
}

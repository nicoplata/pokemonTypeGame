// Progreso del jugador guardado en localStorage.

const CLAVE = 'pokemonTypeGame'

export function progresoVacio () {
    return { nombre: '', victorias: 0, derrotas: 0 }
}

export function normalizarProgreso (datos) {
    const vacio = progresoVacio()
    if (!datos || typeof datos !== 'object') return vacio
    return {
        nombre: typeof datos.nombre === 'string' ? datos.nombre : '',
        victorias: Number.isInteger(datos.victorias) ? datos.victorias : 0,
        derrotas: Number.isInteger(datos.derrotas) ? datos.derrotas : 0
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

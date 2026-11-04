// Experiencia, subida de nivel, movimientos nuevos y evolución.

import { calcularEstadisticas } from './estadisticas.js'
import { curarEstado, reiniciarEtapas } from './estados.js'
import { movimientoSoportado } from './pokedex.js'

export const NIVEL_MAXIMO = 100

// Experiencia total necesaria para llegar a un nivel, según la curva de
// crecimiento de la especie (las cuatro curvas de las dos primeras generaciones).
export function expParaNivel (crecimiento, nivel) {
    if (nivel <= 1) return 0
    const n3 = nivel ** 3
    switch (crecimiento) {
        case 'rapido': return Math.floor((4 * n3) / 5)
        case 'medio': return n3
        case 'medioLento': return Math.max(0, Math.floor((6 * n3) / 5 - 15 * nivel ** 2 + 100 * nivel - 140))
        case 'lento': return Math.floor((5 * n3) / 4)
        default: throw new Error(`Curva de crecimiento desconocida: ${crecimiento}`)
    }
}

export function nivelPorExp (crecimiento, exp) {
    let nivel = 1
    while (nivel < NIVEL_MAXIMO && exp >= expParaNivel(crecimiento, nivel + 1)) nivel++
    return nivel
}

// Fracción (0 a 1) del camino hacia el próximo nivel.
export function progresoDeNivel (crecimiento, nivel, exp) {
    if (nivel >= NIVEL_MAXIMO) return 1
    const desde = expParaNivel(crecimiento, nivel)
    const hasta = expParaNivel(crecimiento, nivel + 1)
    return Math.min(1, Math.max(0, (exp - desde) / (hasta - desde)))
}

// Experiencia por derrotar a un Pokémon de un entrenador (fórmula de la
// cuarta generación: 1,5 · experiencia base · nivel / 7).
export function expOtorgada (pokedex, derrotado) {
    return Math.max(1, Math.floor((1.5 * pokedex.especie(derrotado.id).experienciaBase * derrotado.nivel) / 7))
}

// El que estaba en el campo recibe toda la experiencia; el resto del equipo
// con vida recibe la mitad (como el Repartir Experiencia).
export function repartirExperiencia (equipo, indiceActivo, cantidad) {
    return equipo
        .map((luchador, indice) => ({ indice, luchador }))
        .filter(({ luchador }) => luchador.salud > 0 && luchador.nivel < NIVEL_MAXIMO)
        .map(({ indice }) => ({ indice, cantidad: indice === indiceActivo ? cantidad : Math.floor(cantidad / 2) }))
        .filter(({ cantidad: c }) => c > 0)
}

function recalcularEstadisticas (pokedex, luchador) {
    const anterior = luchador.saludMax
    luchador.stats = calcularEstadisticas(pokedex.especie(luchador.id).base, luchador.nivel)
    luchador.saludMax = luchador.stats.hp
    // La salud sube lo mismo que la salud máxima (si tenía vida).
    if (luchador.salud > 0) luchador.salud = Math.min(luchador.saludMax, luchador.salud + luchador.saludMax - anterior)
}

// Movimientos (soportados) que aprende exactamente en ese nivel.
export function movimientosNuevosEnNivel (pokedex, idEspecie, nivel) {
    return pokedex.especie(idEspecie).aprende
        .filter(([nivelAprende, id]) => nivelAprende === nivel && movimientoSoportado(pokedex.movimiento(id)))
        .map(([, id]) => id)
}

// Suma experiencia y sube los niveles que correspondan. Devuelve eventos:
//   { tipo: 'experiencia', cantidad }, { tipo: 'subeNivel', nivel },
//   { tipo: 'puedeAprender', movimiento } (la interfaz decide si lo aprende).
export function ganarExperiencia (pokedex, luchador, cantidad) {
    const especie = pokedex.especie(luchador.id)
    const eventos = [{ tipo: 'experiencia', nombre: luchador.nombre, cantidad }]
    luchador.exp = Math.min(luchador.exp + cantidad, expParaNivel(especie.crecimiento, NIVEL_MAXIMO))
    const nuevoNivel = nivelPorExp(especie.crecimiento, luchador.exp)
    while (luchador.nivel < nuevoNivel) {
        luchador.nivel++
        recalcularEstadisticas(pokedex, luchador)
        eventos.push({ tipo: 'subeNivel', nombre: luchador.nombre, nivel: luchador.nivel })
        for (const id of movimientosNuevosEnNivel(pokedex, luchador.id, luchador.nivel)) {
            if (!luchador.movimientos.some((m) => m.id === id)) eventos.push({ tipo: 'puedeAprender', nombre: luchador.nombre, movimiento: id })
        }
    }
    return eventos
}

export const conoceCuatro = (luchador) => luchador.movimientos.length >= 4

// Aprende un movimiento; si ya conoce cuatro, reemplaza el del índice dado.
export function aprenderMovimiento (pokedex, luchador, idMovimiento, indiceOlvidado = null) {
    const mov = pokedex.movimiento(idMovimiento)
    const nuevo = { id: idMovimiento, pp: mov.pp, ppMax: mov.pp }
    if (!conoceCuatro(luchador)) {
        luchador.movimientos.push(nuevo)
        return null
    }
    if (indiceOlvidado === null || !luchador.movimientos[indiceOlvidado]) throw new Error('Hay que elegir qué movimiento olvidar')
    const olvidado = luchador.movimientos[indiceOlvidado].id
    luchador.movimientos[indiceOlvidado] = nuevo
    return olvidado
}

// Id de la especie a la que evoluciona, o null.
export function evolucionPendiente (pokedex, luchador) {
    const evolucion = pokedex.especie(luchador.id).evolucion
    return evolucion && luchador.nivel >= evolucion.nivel ? evolucion.a : null
}

export function evolucionar (pokedex, luchador) {
    const destino = evolucionPendiente(pokedex, luchador)
    if (!destino) throw new Error(`${luchador.nombre} no puede evolucionar`)
    const especie = pokedex.especie(destino)
    const anterior = luchador.nombre
    luchador.id = especie.id
    luchador.nombre = especie.nombre.toUpperCase()
    luchador.tipos = especie.tipos
    luchador.crecimiento = especie.crecimiento
    recalcularEstadisticas(pokedex, luchador)
    return { tipo: 'evoluciona', nombre: anterior, nuevoNombre: luchador.nombre, id: especie.id }
}

// Centro Pokémon: salud y PP al máximo, sin estados ni cambios de etapa.
export function curar (luchador) {
    luchador.salud = luchador.saludMax
    curarEstado(luchador)
    reiniciarEtapas(luchador)
    for (const m of luchador.movimientos) m.pp = m.ppMax
}

// La especie que tendría un Pokémon de esa línea evolutiva a ese nivel.
export function evolucionarPorNivel (pokedex, idEspecie, nivel) {
    let id = idEspecie
    for (let evolucion = pokedex.especie(id).evolucion; evolucion && nivel >= evolucion.nivel; evolucion = pokedex.especie(id).evolucion) {
        id = evolucion.a
    }
    return id
}

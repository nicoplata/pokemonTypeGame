// Lógica de combate. No toca el DOM: modifica los luchadores y devuelve una
// lista de eventos que la interfaz muestra. El azar se inyecta (`azar`)
// para poder testearla.

import { EFECTIVIDAD } from '../datos/tipos.js'
import { ID_FORCEJEO } from './pokedex.js'

export const FORCEJEO = 'forcejeo'

export function efectividad (tipoAtaque, tiposDefensor) {
    return tiposDefensor.reduce((total, tipo) => total * (EFECTIVIDAD[tipoAtaque]?.[tipo] ?? 1), 1)
}

// Forcejeo no tiene tipo: golpea a todos con daño normal.
const multiplicadorDeTipo = (mov, defensor) => (mov.id === ID_FORCEJEO ? 1 : efectividad(mov.tipo, defensor.tipos))

export function calcularDanio (atacante, defensor, mov, azar = Math.random) {
    const multiplicador = multiplicadorDeTipo(mov, defensor)
    if (multiplicador === 0) return { danio: 0, multiplicador }
    const ataque = mov.clase === 'fisico' ? atacante.stats.atk : atacante.stats.spa
    const variacion = 0.85 + azar() * 0.15
    const danio = Math.max(1, Math.round((mov.potencia / 100) * ataque * 0.6 * multiplicador * variacion))
    return { danio, multiplicador }
}

export function acierta (mov, azar = Math.random) {
    return mov.precision === null || azar() * 100 < mov.precision
}

// Movimientos de 2 a 5 golpes: 35 % dos, 35 % tres, 15 % cuatro, 15 % cinco.
export function cantidadDeGolpes (mov, azar = Math.random) {
    if (!mov.golpes) return 1
    const [minimo, maximo] = mov.golpes
    if (minimo === maximo) return minimo
    if (minimo === 2 && maximo === 5) {
        const r = azar()
        return r < 0.35 ? 2 : r < 0.7 ? 3 : r < 0.85 ? 4 : 5
    }
    return minimo + Math.floor(azar() * (maximo - minimo + 1))
}

export function movimientosDisponibles (luchador) {
    return luchador.movimientos.map((m, indice) => ({ ...m, indice })).filter((m) => m.pp > 0)
}

// Traduce la elección (índice de movimiento o FORCEJEO) al movimiento real.
function movimientoElegido (pokedex, luchador, eleccion) {
    if (eleccion === FORCEJEO || movimientosDisponibles(luchador).length === 0) return pokedex.movimiento(ID_FORCEJEO)
    const elegido = luchador.movimientos[eleccion]
    if (!elegido || elegido.pp <= 0) throw new Error(`Movimiento inválido: ${eleccion}`)
    return pokedex.movimiento(elegido.id)
}

// true si el primer luchador actúa antes: prioridad, luego velocidad, luego azar.
export function actuaPrimero (a, movA, b, movB, azar = Math.random) {
    if (movA.prioridad !== movB.prioridad) return movA.prioridad > movB.prioridad
    if (a.stats.spe !== b.stats.spe) return a.stats.spe > b.stats.spe
    return azar() < 0.5
}

function ejecutarMovimiento (atacante, defensor, mov, azar) {
    const eventos = [{ tipo: 'usa', lado: atacante.lado, movimiento: mov.nombre }]

    if (!acierta(mov, azar)) {
        eventos.push({ tipo: 'falla', lado: atacante.lado })
        return eventos
    }
    if (multiplicadorDeTipo(mov, defensor) === 0) {
        eventos.push({ tipo: 'sinEfecto', lado: defensor.lado })
        return eventos
    }

    const golpes = cantidadDeGolpes(mov, azar)
    let total = 0
    let multiplicador = 1
    let golpesDados = 0
    for (let i = 0; i < golpes && defensor.salud > 0; i++) {
        const resultado = calcularDanio(atacante, defensor, mov, azar)
        multiplicador = resultado.multiplicador
        const danio = Math.min(resultado.danio, defensor.salud)
        defensor.salud -= danio
        total += danio
        golpesDados++
    }
    eventos.push({ tipo: 'danio', lado: defensor.lado, cantidad: total, multiplicador, golpes: golpesDados, salud: defensor.salud })

    if (mov.id === ID_FORCEJEO && atacante.salud > 0) {
        const retroceso = Math.min(atacante.salud, Math.max(1, Math.floor(atacante.saludMax / 4)))
        atacante.salud -= retroceso
        eventos.push({ tipo: 'retroceso', lado: atacante.lado, cantidad: retroceso, salud: atacante.salud })
    }

    for (const luchador of [defensor, atacante]) {
        if (luchador.salud === 0) eventos.push({ tipo: 'debilitado', lado: luchador.lado })
    }
    return eventos
}

// Resuelve un turno completo. `jugador` y `rival` deben tener `lado`.
export function resolverTurno (pokedex, jugador, eleccionJugador, rival, eleccionRival, azar = Math.random) {
    const acciones = [
        { atacante: jugador, defensor: rival, mov: movimientoElegido(pokedex, jugador, eleccionJugador), eleccion: eleccionJugador },
        { atacante: rival, defensor: jugador, mov: movimientoElegido(pokedex, rival, eleccionRival), eleccion: eleccionRival }
    ]
    if (!actuaPrimero(jugador, acciones[0].mov, rival, acciones[1].mov, azar)) acciones.reverse()

    const eventos = []
    for (const { atacante, defensor, mov, eleccion } of acciones) {
        if (atacante.salud === 0 || defensor.salud === 0) continue
        if (mov.id !== ID_FORCEJEO) atacante.movimientos[eleccion].pp--
        eventos.push(...ejecutarMovimiento(atacante, defensor, mov, azar))
    }
    return eventos
}

// Puntaje que usa la IA: daño esperado relativo.
function puntaje (pokedex, atacante, defensor, idMovimiento) {
    const mov = pokedex.movimiento(idMovimiento)
    const golpes = mov.golpes ? (mov.golpes[0] + mov.golpes[1]) / 2 : 1
    const precision = mov.precision === null ? 1 : mov.precision / 100
    const ataque = mov.clase === 'fisico' ? atacante.stats.atk : atacante.stats.spa
    return mov.potencia * ataque * multiplicadorDeTipo(mov, defensor) * precision * golpes
}

// El rival suele elegir el movimiento que más daño hace, pero a veces elige
// otro al azar para no ser predecible.
export function elegirMovimientoIA (pokedex, rival, jugador, azar = Math.random) {
    const disponibles = movimientosDisponibles(rival)
    if (disponibles.length === 0) return FORCEJEO
    if (azar() < 0.25) return disponibles[Math.floor(azar() * disponibles.length)].indice
    let mejor = disponibles[0]
    let mejorPuntaje = -1
    for (const m of disponibles) {
        const p = puntaje(pokedex, rival, jugador, m.id)
        if (p > mejorPuntaje) { mejor = m; mejorPuntaje = p }
    }
    return mejor.indice
}

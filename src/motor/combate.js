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

// Probabilidad de golpe crítico según el índice del movimiento (0 a 3+).
const PROBABILIDAD_CRITICO = [1 / 24, 1 / 8, 1 / 2, 1]

export const probabilidadCritico = (mov) => PROBABILIDAD_CRITICO[Math.min(mov.critico ?? 0, 3)]

// Movimientos de daño fijo (no dependen de ataque, defensa ni tipos).
export function danioFijo (atacante, defensor, mov) {
    switch (mov.efecto) {
        case 42: return 40 // Furia Dragón
        case 131: return 20 // Bomba Sónica
        case 88: return atacante.nivel // Movimiento Sísmico, Tinieblas
        case 41: return Math.max(1, Math.floor(defensor.salud / 2)) // Superdiente
        default: return null
    }
}

// Fórmula de daño de los juegos (quinta generación en adelante):
// ((2·nivel/5 + 2) · potencia · A/D) / 50 + 2, y después crítico (x1,5),
// variación aleatoria (85 % a 100 %), STAB (x1,5) y efectividad de tipos.
export function calcularDanio (atacante, defensor, mov, azar = Math.random) {
    const multiplicador = multiplicadorDeTipo(mov, defensor)
    if (multiplicador === 0) return { danio: 0, multiplicador, critico: false }

    const fijo = danioFijo(atacante, defensor, mov)
    if (fijo !== null) return { danio: fijo, multiplicador: 1, critico: false }

    const critico = azar() < probabilidadCritico(mov)
    const fisico = mov.clase === 'fisico'
    const ataque = fisico ? atacante.stats.atk : atacante.stats.spa
    const defensa = fisico ? defensor.stats.def : defensor.stats.spd

    let danio = Math.floor(Math.floor((Math.floor((2 * atacante.nivel) / 5 + 2) * mov.potencia * ataque) / defensa) / 50) + 2
    if (critico) danio = Math.floor(danio * 1.5)
    danio = Math.floor((danio * (85 + Math.floor(azar() * 16))) / 100)
    if (tieneStab(atacante, mov)) danio = Math.floor(danio * 1.5)
    danio = Math.floor(danio * multiplicador)
    return { danio: Math.max(1, danio), multiplicador, critico }
}

// Bonificación por usar un movimiento del mismo tipo que el Pokémon.
export const tieneStab = (atacante, mov) => mov.id !== ID_FORCEJEO && atacante.tipos.includes(mov.tipo)

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
    let criticos = 0
    for (let i = 0; i < golpes && defensor.salud > 0; i++) {
        const resultado = calcularDanio(atacante, defensor, mov, azar)
        multiplicador = resultado.multiplicador
        if (resultado.critico) criticos++
        const danio = Math.min(resultado.danio, defensor.salud)
        defensor.salud -= danio
        total += danio
        golpesDados++
    }
    eventos.push({
        tipo: 'danio', lado: defensor.lado, cantidad: total, multiplicador, golpes: golpesDados, criticos, salud: defensor.salud
    })

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

// Daño esperado de un movimiento, sin azar, para que la IA compare.
export function danioEstimado (atacante, defensor, mov) {
    const { danio, multiplicador } = calcularDanio(atacante, defensor, mov, () => 0.5)
    if (multiplicador === 0) return 0
    const golpes = mov.golpes ? (mov.golpes[0] + mov.golpes[1]) / 2 : 1
    const precision = mov.precision === null ? 1 : mov.precision / 100
    return Math.min(danio * golpes, defensor.salud) * precision
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
        const p = danioEstimado(rival, jugador, pokedex.movimiento(m.id))
        if (p > mejorPuntaje) { mejor = m; mejorPuntaje = p }
    }
    return mejor.indice
}

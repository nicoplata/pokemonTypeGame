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

// Datos que llevan los eventos para que la interfaz sepa a quién mostrar.
export const quien = (luchador) => ({ lado: luchador.lado, nombre: luchador.nombre })
export const salud = (luchador) => ({ salud: luchador.salud, saludMax: luchador.saludMax })

function ejecutarMovimiento (atacante, defensor, mov, azar) {
    const eventos = [{ tipo: 'usa', ...quien(atacante), movimiento: mov.nombre }]

    if (!acierta(mov, azar)) {
        eventos.push({ tipo: 'falla', ...quien(atacante) })
        return eventos
    }
    if (multiplicadorDeTipo(mov, defensor) === 0) {
        eventos.push({ tipo: 'sinEfecto', ...quien(defensor) })
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
        tipo: 'danio', ...quien(defensor), cantidad: total, multiplicador, golpes: golpesDados, criticos, ...salud(defensor)
    })

    if (mov.id === ID_FORCEJEO && atacante.salud > 0) {
        const retroceso = Math.min(atacante.salud, Math.max(1, Math.floor(atacante.saludMax / 4)))
        atacante.salud -= retroceso
        eventos.push({ tipo: 'retroceso', ...quien(atacante), cantidad: retroceso, ...salud(atacante) })
    }

    for (const luchador of [defensor, atacante]) {
        if (luchador.salud === 0) eventos.push({ tipo: 'debilitado', ...quien(luchador) })
    }
    return eventos
}

// Prepara una acción de movimiento: el atacante, su rival y el movimiento real.
export function prepararMovimiento (pokedex, atacante, defensor, eleccion) {
    return { atacante, defensor, eleccion, mov: movimientoElegido(pokedex, atacante, eleccion) }
}

// Ordena y ejecuta acciones de movimiento. Quien está debilitado no actúa.
export function ejecutarMovimientos (acciones, azar = Math.random) {
    if (acciones.length === 2 && !actuaPrimero(acciones[0].atacante, acciones[0].mov, acciones[1].atacante, acciones[1].mov, azar)) {
        acciones = [acciones[1], acciones[0]]
    }
    const eventos = []
    for (const { atacante, defensor, mov, eleccion } of acciones) {
        if (atacante.salud === 0 || defensor.salud === 0) continue
        if (mov.id !== ID_FORCEJEO) atacante.movimientos[eleccion].pp--
        eventos.push(...ejecutarMovimiento(atacante, defensor, mov, azar))
    }
    return eventos
}

// Resuelve un turno uno contra uno. `jugador` y `rival` deben tener `lado`.
export function resolverTurno (pokedex, jugador, eleccionJugador, rival, eleccionRival, azar = Math.random) {
    return ejecutarMovimientos([
        prepararMovimiento(pokedex, jugador, rival, eleccionJugador),
        prepararMovimiento(pokedex, rival, jugador, eleccionRival)
    ], azar)
}

// Daño esperado de un movimiento, sin azar, para que la IA compare.
export function danioEstimado (atacante, defensor, mov) {
    const { danio, multiplicador } = calcularDanio(atacante, defensor, mov, () => 0.5)
    if (multiplicador === 0) return 0
    const golpes = mov.golpes ? (mov.golpes[0] + mov.golpes[1]) / 2 : 1
    const precision = mov.precision === null ? 1 : mov.precision / 100
    return Math.min(danio * golpes, defensor.salud) * precision
}

// El mejor movimiento disponible según el daño estimado.
export function mejorMovimiento (pokedex, atacante, defensor) {
    const disponibles = movimientosDisponibles(atacante)
    if (disponibles.length === 0) {
        return { eleccion: FORCEJEO, danio: danioEstimado(atacante, defensor, pokedex.movimiento(ID_FORCEJEO)) }
    }
    let mejor = { eleccion: disponibles[0].indice, danio: -1 }
    for (const m of disponibles) {
        const danio = danioEstimado(atacante, defensor, pokedex.movimiento(m.id))
        if (danio > mejor.danio) mejor = { eleccion: m.indice, danio }
    }
    return mejor
}

// El rival suele elegir el movimiento que más daño hace, pero a veces elige
// otro al azar para no ser predecible.
export function elegirMovimientoIA (pokedex, rival, jugador, azar = Math.random) {
    const disponibles = movimientosDisponibles(rival)
    if (disponibles.length === 0) return FORCEJEO
    if (azar() < 0.25) return disponibles[Math.floor(azar() * disponibles.length)].indice
    return mejorMovimiento(pokedex, rival, jugador).eleccion
}

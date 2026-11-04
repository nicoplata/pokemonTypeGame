// Lógica de combate. No toca el DOM: modifica los luchadores y devuelve una
// lista de eventos que la interfaz muestra. El azar se inyecta (`azar`)
// para poder testearla.

import { EFECTIVIDAD } from '../datos/tipos.js'
import {
    aplicarCambios, aplicarEstado, curarEstado, danioDeFinDeTurno, esInmune, estadisticaEfectiva, intentarMoverse,
    multiplicadorPrecision, puedeRecibirEstado
} from './estados.js'
import { quien, salud } from './eventos.js'
import { EFECTOS_DANIO_FIJO, ID_FORCEJEO } from './pokedex.js'

export { quien, salud }

export const FORCEJEO = 'forcejeo'

// Objetivos de PokéAPI que apuntan al propio usuario (o su lado).
const OBJETIVOS_PROPIOS = new Set([4, 5, 7, 13])

export function efectividad (tipoAtaque, tiposDefensor) {
    return tiposDefensor.reduce((total, tipo) => total * (EFECTIVIDAD[tipoAtaque]?.[tipo] ?? 1), 1)
}

// Forcejeo no tiene tipo: golpea a todos con daño normal.
const multiplicadorDeTipo = (mov, defensor) => (mov.id === ID_FORCEJEO ? 1 : efectividad(mov.tipo, defensor.tipos))

const esDeEstado = (mov) => mov.clase === 'estado'

// Probabilidad de golpe crítico según el índice del movimiento (0 a 3+).
const PROBABILIDAD_CRITICO = [1 / 24, 1 / 8, 1 / 2, 1]

export const probabilidadCritico = (mov) => PROBABILIDAD_CRITICO[Math.min(mov.critico ?? 0, 3)]

// Movimientos de daño fijo (no dependen de ataque, defensa ni tipos).
export function danioFijo (atacante, defensor, mov) {
    if (!EFECTOS_DANIO_FIJO.has(mov.efecto)) return null
    switch (mov.efecto) {
        case 42: return 40 // Furia Dragón
        case 131: return 20 // Bomba Sónica
        case 88: return atacante.nivel // Movimiento Sísmico, Tinieblas
        default: return Math.max(1, Math.floor(defensor.salud / 2)) // Superdiente
    }
}

// Bonificación por usar un movimiento del mismo tipo que el Pokémon.
export const tieneStab = (atacante, mov) => mov.id !== ID_FORCEJEO && atacante.tipos.includes(mov.tipo)

// Fórmula de daño de los juegos (quinta generación en adelante):
// ((2·nivel/5 + 2) · potencia · A/D) / 50 + 2, y después crítico (x1,5),
// variación aleatoria (85 % a 100 %), STAB (x1,5), efectividad de tipos y
// quemadura (x0,5 en físicos). A y D incluyen los cambios de etapa (el
// crítico ignora los que perjudican al atacante).
export function calcularDanio (atacante, defensor, mov, azar = Math.random) {
    const multiplicador = multiplicadorDeTipo(mov, defensor)
    if (multiplicador === 0) return { danio: 0, multiplicador, critico: false }

    const fijo = danioFijo(atacante, defensor, mov)
    if (fijo !== null) return { danio: fijo, multiplicador: 1, critico: false }

    const critico = azar() < probabilidadCritico(mov)
    const fisico = mov.clase === 'fisico'
    const ataque = estadisticaEfectiva(atacante, fisico ? 'atk' : 'spa', critico ? 'negativas' : null)
    const defensa = estadisticaEfectiva(defensor, fisico ? 'def' : 'spd', critico ? 'positivas' : null)

    let danio = Math.floor(Math.floor((Math.floor((2 * atacante.nivel) / 5 + 2) * mov.potencia * ataque) / defensa) / 50) + 2
    if (critico) danio = Math.floor(danio * 1.5)
    danio = Math.floor((danio * (85 + Math.floor(azar() * 16))) / 100)
    if (tieneStab(atacante, mov)) danio = Math.floor(danio * 1.5)
    danio = Math.floor(danio * multiplicador)
    if (fisico && atacante.estado === 'burn') danio = Math.floor(danio / 2)
    return { danio: Math.max(1, danio), multiplicador, critico }
}

export function acierta (mov, azar = Math.random, atacante = null, defensor = null) {
    if (mov.precision === null) return true
    const multiplicador = atacante && defensor ? multiplicadorPrecision(atacante, defensor) : 1
    return azar() * 100 < mov.precision * multiplicador
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

// true si el primer luchador actúa antes: prioridad, luego velocidad
// (con etapas y parálisis), luego azar.
export function actuaPrimero (a, movA, b, movB, azar = Math.random) {
    if (movA.prioridad !== movB.prioridad) return movA.prioridad > movB.prioridad
    const velocidadA = estadisticaEfectiva(a, 'spe')
    const velocidadB = estadisticaEfectiva(b, 'spe')
    if (velocidadA !== velocidadB) return velocidadA > velocidadB
    return azar() < 0.5
}

const seCumple = (probabilidad, azar) => probabilidad >= 100 || (probabilidad > 0 && azar() * 100 < probabilidad)

function curarSalud (luchador, cantidad) {
    const curado = Math.min(cantidad, luchador.saludMax - luchador.salud)
    luchador.salud += curado
    return curado
}

// Efecto de un movimiento de estado (sin daño).
function efectoDeEstado (atacante, defensor, mov, azar) {
    if (mov.categoria === 1) {
        // Inmunidad al estado, o al tipo en Onda Trueno (Eléctrico contra Tierra).
        const inmunePorTipo = mov.tipo === 'electric' && efectividad(mov.tipo, defensor.tipos) === 0
        if (esInmune(defensor, mov.estado) || inmunePorTipo) return [{ tipo: 'sinEfecto', ...quien(defensor) }]
        const evento = aplicarEstado(defensor, mov.estado, azar)
        return [evento ?? { tipo: 'falla', ...quien(atacante) }]
    }
    if (mov.categoria === 2) {
        const objetivo = OBJETIVOS_PROPIOS.has(mov.objetivo) ? atacante : defensor
        return aplicarCambios(objetivo, mov.cambios)
    }
    if (mov.categoria === 3) {
        const curado = curarSalud(atacante, Math.floor((atacante.saludMax * mov.curacion) / 100))
        if (curado === 0) return [{ tipo: 'falla', ...quien(atacante) }]
        return [{ tipo: 'curacion', ...quien(atacante), cantidad: curado, ...salud(atacante) }]
    }
    return [{ tipo: 'falla', ...quien(atacante) }]
}

// Efectos secundarios de un movimiento de daño que acertó.
function efectosSecundarios (atacante, defensor, mov, danioTotal, azar) {
    const eventos = []
    if (mov.drenaje > 0 && atacante.salud > 0) {
        const curado = curarSalud(atacante, Math.max(1, Math.floor((danioTotal * mov.drenaje) / 100)))
        if (curado > 0) eventos.push({ tipo: 'drenaje', ...quien(atacante), cantidad: curado, ...salud(atacante) })
    }
    if (mov.drenaje < 0 && atacante.salud > 0) {
        const retroceso = Math.min(atacante.salud, Math.max(1, Math.floor((danioTotal * -mov.drenaje) / 100)))
        atacante.salud -= retroceso
        eventos.push({ tipo: 'retroceso', ...quien(atacante), cantidad: retroceso, ...salud(atacante) })
    }
    if (defensor.salud > 0) {
        if (mov.estado && puedeRecibirEstado(defensor, mov.estado) && seCumple(mov.probEstado, azar)) {
            eventos.push(aplicarEstado(defensor, mov.estado, azar))
        }
        if (mov.probRetroceso && seCumple(mov.probRetroceso, azar)) defensor.amedrentado = true
        if (mov.categoria === 6 && mov.cambios.length && seCumple(mov.probCambios, azar)) {
            eventos.push(...aplicarCambios(defensor, mov.cambios))
        }
    }
    if (mov.categoria === 7 && mov.cambios.length && atacante.salud > 0 && seCumple(mov.probCambios, azar)) {
        eventos.push(...aplicarCambios(atacante, mov.cambios))
    }
    return eventos
}

function ejecutarMovimiento (atacante, defensor, mov, azar) {
    const eventos = [{ tipo: 'usa', ...quien(atacante), movimiento: mov.nombre }]

    // Usar un movimiento de fuego descongela al usuario.
    if (atacante.estado === 'freeze' && mov.tipo === 'fire') curarEstado(atacante)

    const objetivo = OBJETIVOS_PROPIOS.has(mov.objetivo) ? atacante : defensor
    if (!acierta(mov, azar, atacante, objetivo)) {
        eventos.push({ tipo: 'falla', ...quien(atacante) })
        return eventos
    }
    if (esDeEstado(mov)) {
        eventos.push(...efectoDeEstado(atacante, defensor, mov, azar))
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

    // Un golpe de fuego descongela al que lo recibe.
    if (defensor.estado === 'freeze' && mov.tipo === 'fire' && defensor.salud > 0) {
        curarEstado(defensor)
        eventos.push({ tipo: 'descongela', ...quien(defensor) })
    }

    if (mov.id === ID_FORCEJEO && atacante.salud > 0) {
        const retroceso = Math.min(atacante.salud, Math.max(1, Math.floor(atacante.saludMax / 4)))
        atacante.salud -= retroceso
        eventos.push({ tipo: 'retroceso', ...quien(atacante), cantidad: retroceso, ...salud(atacante) })
    } else {
        eventos.push(...efectosSecundarios(atacante, defensor, mov, total, azar))
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

// Ordena y ejecuta acciones de movimiento. Quien está debilitado no actúa;
// el estado (sueño, congelación, parálisis) o retroceder pueden impedirlo.
// Al final, la quemadura y el veneno restan salud a los que están en
// `enCampo` (por defecto, todos los que participaron).
export function ejecutarMovimientos (acciones, azar = Math.random, enCampo = null) {
    if (acciones.length === 2 && !actuaPrimero(acciones[0].atacante, acciones[0].mov, acciones[1].atacante, acciones[1].mov, azar)) {
        acciones = [acciones[1], acciones[0]]
    }
    const eventos = []
    for (const { atacante, defensor, mov, eleccion } of acciones) {
        if (atacante.salud === 0 || defensor.salud === 0) continue
        if (atacante.amedrentado) {
            eventos.push({ tipo: 'impedido', ...quien(atacante), motivo: 'miedo' })
            continue
        }
        const intento = intentarMoverse(atacante, azar)
        eventos.push(...intento.eventos)
        if (!intento.puede) continue
        if (mov.id !== ID_FORCEJEO) atacante.movimientos[eleccion].pp--
        eventos.push(...ejecutarMovimiento(atacante, defensor, mov, azar))
    }
    const alFinal = enCampo ?? [...new Set(acciones.flatMap((a) => [a.atacante, a.defensor]))]
    for (const luchador of alFinal) {
        luchador.amedrentado = false
        eventos.push(...danioDeFinDeTurno(luchador))
    }
    return eventos
}

// Resuelve un turno uno contra uno. `jugador` y `rival` deben tener `lado`.
export function resolverTurno (pokedex, jugador, eleccionJugador, rival, eleccionRival, azar = Math.random) {
    return ejecutarMovimientos([
        prepararMovimiento(pokedex, jugador, rival, eleccionJugador),
        prepararMovimiento(pokedex, rival, jugador, eleccionRival)
    ], azar, [jugador, rival])
}

// Daño esperado de un movimiento, sin azar, para que la IA compare.
export function danioEstimado (atacante, defensor, mov) {
    if (esDeEstado(mov)) return 0
    const { danio, multiplicador } = calcularDanio(atacante, defensor, mov, () => 0.5)
    if (multiplicador === 0) return 0
    const golpes = mov.golpes ? (mov.golpes[0] + mov.golpes[1]) / 2 : 1
    const precision = mov.precision === null ? 1 : mov.precision / 100
    return Math.min(danio * golpes, defensor.salud) * precision
}

// Valor de un movimiento de estado para la IA, en "salud equivalente".
export function valorDeEstado (atacante, defensor, mov) {
    const precision = mov.precision === null ? 1 : mov.precision / 100
    if (mov.categoria === 1) {
        if (!puedeRecibirEstado(defensor, mov.estado)) return 0
        const peso = mov.estado === 'sleep' || mov.estado === 'freeze' ? 0.4 : mov.estado === 'paralysis' ? 0.3 : 0.25
        return defensor.salud * peso * precision
    }
    if (mov.categoria === 2) {
        const objetivo = OBJETIVOS_PROPIOS.has(mov.objetivo) ? atacante : defensor
        const util = mov.cambios.some(([stat, cantidad]) => {
            const etapa = objetivo.etapas?.[stat] ?? 0
            return objetivo === atacante ? cantidad > 0 && etapa < 2 : cantidad < 0 && etapa > -2
        })
        return util ? defensor.salud * 0.15 * precision : 0
    }
    if (mov.categoria === 3) {
        return atacante.salud < atacante.saludMax / 2 ? Math.floor((atacante.saludMax * mov.curacion) / 100) : 0
    }
    return 0
}

export const valorDeMovimiento = (atacante, defensor, mov) =>
    esDeEstado(mov) ? valorDeEstado(atacante, defensor, mov) : danioEstimado(atacante, defensor, mov)

// El mejor movimiento disponible según su valor (daño estimado o efecto).
// `danio` es solo el daño estimado del elegido (0 si es de estado).
export function mejorMovimiento (pokedex, atacante, defensor) {
    const disponibles = movimientosDisponibles(atacante)
    if (disponibles.length === 0) {
        return { eleccion: FORCEJEO, danio: danioEstimado(atacante, defensor, pokedex.movimiento(ID_FORCEJEO)), valor: 0 }
    }
    let mejor = { eleccion: disponibles[0].indice, danio: 0, valor: -1 }
    for (const m of disponibles) {
        const mov = pokedex.movimiento(m.id)
        const valor = valorDeMovimiento(atacante, defensor, mov)
        if (valor > mejor.valor) mejor = { eleccion: m.indice, danio: danioEstimado(atacante, defensor, mov), valor }
    }
    return mejor
}

// Daño máximo que puede hacer con los movimientos que le quedan.
export function mayorDanio (pokedex, atacante, defensor) {
    const disponibles = movimientosDisponibles(atacante)
    if (disponibles.length === 0) return danioEstimado(atacante, defensor, pokedex.movimiento(ID_FORCEJEO))
    return Math.max(...disponibles.map((m) => danioEstimado(atacante, defensor, pokedex.movimiento(m.id))))
}

// El rival suele elegir el mejor movimiento, pero a veces (con probabilidad
// `aleatoriedad`) elige otro al azar para no ser predecible.
export function elegirMovimientoIA (pokedex, rival, jugador, azar = Math.random, aleatoriedad = 0.2) {
    const disponibles = movimientosDisponibles(rival)
    if (disponibles.length === 0) return FORCEJEO
    if (azar() < aleatoriedad) return disponibles[Math.floor(azar() * disponibles.length)].indice
    return mejorMovimiento(pokedex, rival, jugador).eleccion
}

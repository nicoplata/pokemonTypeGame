// Estados alterados y cambios de estadísticas.

import { quien, salud } from './eventos.js'

export const ESTADOS = ['burn', 'poison', 'paralysis', 'sleep', 'freeze']

// Tipos inmunes a cada estado.
const INMUNIDADES = {
    burn: ['fire'],
    poison: ['poison', 'steel'],
    paralysis: ['electric'],
    freeze: ['ice'],
    sleep: []
}

export const ETAPAS = ['atk', 'def', 'spa', 'spd', 'spe', 'precision', 'evasion']
export const etapasIniciales = () => Object.fromEntries(ETAPAS.map((e) => [e, 0]))

const limitar = (valor) => Math.max(-6, Math.min(6, valor))

// Multiplicador de una etapa: estadísticas (2+e)/2, precisión y evasión (3+e)/3.
export function multiplicadorEtapa (etapa, base = 2) {
    return etapa >= 0 ? (base + etapa) / base : base / (base - etapa)
}

// Estadística con etapas y estados aplicados. `ignorar` ('positivas' o
// 'negativas') se usa en los golpes críticos.
export function estadisticaEfectiva (luchador, stat, ignorar = null) {
    let etapa = luchador.etapas?.[stat] ?? 0
    if ((ignorar === 'positivas' && etapa > 0) || (ignorar === 'negativas' && etapa < 0)) etapa = 0
    let valor = luchador.stats[stat] * multiplicadorEtapa(etapa)
    if (stat === 'spe' && luchador.estado === 'paralysis') valor *= 0.5
    return Math.floor(valor)
}

// Multiplicador de precisión combinando la precisión del atacante y la
// evasión del defensor.
export function multiplicadorPrecision (atacante, defensor) {
    const etapa = limitar((atacante.etapas?.precision ?? 0) - (defensor.etapas?.evasion ?? 0))
    return multiplicadorEtapa(etapa, 3)
}

export const esInmune = (luchador, estado) => (INMUNIDADES[estado] ?? []).some((tipo) => luchador.tipos.includes(tipo))

export const puedeRecibirEstado = (luchador, estado) =>
    ESTADOS.includes(estado) && !luchador.estado && luchador.salud > 0 && !esInmune(luchador, estado)

// Aplica el estado si es posible. Devuelve el evento o null.
export function aplicarEstado (luchador, estado, azar = Math.random) {
    if (!puedeRecibirEstado(luchador, estado)) return null
    luchador.estado = estado
    if (estado === 'sleep') luchador.turnosSueno = 1 + Math.floor(azar() * 3)
    return { tipo: 'estado', ...quien(luchador), estado }
}

export function curarEstado (luchador) {
    luchador.estado = null
    luchador.turnosSueno = 0
}

// Antes de actuar: ¿puede moverse? Devuelve { puede, eventos }.
export function intentarMoverse (luchador, azar = Math.random) {
    switch (luchador.estado) {
        case 'sleep':
            if (luchador.turnosSueno > 0) {
                luchador.turnosSueno--
                return { puede: false, eventos: [{ tipo: 'impedido', ...quien(luchador), motivo: 'sleep' }] }
            }
            curarEstado(luchador)
            return { puede: true, eventos: [{ tipo: 'despierta', ...quien(luchador) }] }
        case 'freeze':
            if (azar() < 0.2) {
                curarEstado(luchador)
                return { puede: true, eventos: [{ tipo: 'descongela', ...quien(luchador) }] }
            }
            return { puede: false, eventos: [{ tipo: 'impedido', ...quien(luchador), motivo: 'freeze' }] }
        case 'paralysis':
            if (azar() < 0.25) return { puede: false, eventos: [{ tipo: 'impedido', ...quien(luchador), motivo: 'paralysis' }] }
            return { puede: true, eventos: [] }
        default:
            return { puede: true, eventos: [] }
    }
}

// Daño de quemadura (1/16) o veneno (1/8) al final del turno.
export function danioDeFinDeTurno (luchador) {
    if (luchador.salud === 0 || (luchador.estado !== 'burn' && luchador.estado !== 'poison')) return []
    const fraccion = luchador.estado === 'burn' ? 16 : 8
    const cantidad = Math.min(luchador.salud, Math.max(1, Math.floor(luchador.saludMax / fraccion)))
    luchador.salud -= cantidad
    const eventos = [{ tipo: 'danioEstado', ...quien(luchador), estado: luchador.estado, cantidad, ...salud(luchador) }]
    if (luchador.salud === 0) eventos.push({ tipo: 'debilitado', ...quien(luchador) })
    return eventos
}

// Aplica cambios de etapa ([[stat, cantidad]]) y devuelve los eventos.
export function aplicarCambios (luchador, cambios) {
    luchador.etapas ??= etapasIniciales()
    return cambios.map(([stat, cantidad]) => {
        const antes = luchador.etapas[stat]
        const despues = limitar(antes + cantidad)
        luchador.etapas[stat] = despues
        return { tipo: 'etapa', ...quien(luchador), stat, cambio: despues - antes, pedido: cantidad }
    })
}

export function reiniciarEtapas (luchador) {
    luchador.etapas = etapasIniciales()
}

// Combate entre equipos: cada lado tiene varios Pokémon y uno en el campo.
//
// Acciones posibles en un turno:
//   { tipo: 'movimiento', eleccion }  (índice del movimiento o FORCEJEO)
//   { tipo: 'cambio', indice }        (índice del compañero que entra)
// Los cambios ocurren antes que los movimientos.

import { ejecutarMovimientos, elegirMovimientoIA, mejorMovimiento, prepararMovimiento, quien, salud } from './combate.js'

export const LADOS = ['jugador', 'rival']
export const otroLado = (lado) => (lado === 'jugador' ? 'rival' : 'jugador')

export function crearCombate (equipoJugador, equipoRival) {
    if (!equipoJugador.length || !equipoRival.length) throw new Error('Cada equipo necesita al menos un Pokémon')
    const preparar = (equipo, lado) => ({ equipo: equipo.map((l) => ({ ...l, lado })), activo: 0 })
    return { jugador: preparar(equipoJugador, 'jugador'), rival: preparar(equipoRival, 'rival') }
}

export const activo = (combate, lado) => combate[lado].equipo[combate[lado].activo]

export const indicesConVida = (combate, lado) =>
    combate[lado].equipo.map((l, i) => (l.salud > 0 ? i : -1)).filter((i) => i >= 0)

// Compañeros que pueden entrar al campo.
export const disponiblesParaCambio = (combate, lado) =>
    indicesConVida(combate, lado).filter((i) => i !== combate[lado].activo)

export function ganador (combate) {
    if (indicesConVida(combate, 'rival').length === 0) return 'jugador'
    if (indicesConVida(combate, 'jugador').length === 0) return 'rival'
    return null
}

export const necesitaReemplazo = (combate, lado) =>
    activo(combate, lado).salud === 0 && indicesConVida(combate, lado).length > 0

// Pone a otro Pokémon en el campo y devuelve el evento.
export function cambiar (combate, lado, indice) {
    if (!disponiblesParaCambio(combate, lado).includes(indice)) throw new Error(`Cambio inválido: ${lado} ${indice}`)
    const sale = activo(combate, lado)
    combate[lado].activo = indice
    const entra = activo(combate, lado)
    return { tipo: 'cambio', ...quien(entra), ...salud(entra), indice, sale: sale.salud > 0 ? sale.nombre : null }
}

export function resolverTurnoEquipos (pokedex, combate, acciones, azar = Math.random) {
    const eventos = []
    for (const lado of LADOS) {
        if (acciones[lado].tipo === 'cambio') eventos.push(cambiar(combate, lado, acciones[lado].indice))
    }
    const movimientos = LADOS
        .filter((lado) => acciones[lado].tipo === 'movimiento')
        .map((lado) => prepararMovimiento(pokedex, activo(combate, lado), activo(combate, otroLado(lado)), acciones[lado].eleccion))
    eventos.push(...ejecutarMovimientos(movimientos, azar))
    return eventos
}

// El compañero que más daño puede hacerle al Pokémon que tiene enfrente.
export function mejorCompanero (pokedex, combate, lado, candidatos) {
    const enfrente = activo(combate, otroLado(lado))
    let mejor = candidatos[0]
    let mejorDanio = -1
    for (const indice of candidatos) {
        const { danio } = mejorMovimiento(pokedex, combate[lado].equipo[indice], enfrente)
        if (danio > mejorDanio) { mejor = indice; mejorDanio = danio }
    }
    return { indice: mejor, danio: mejorDanio }
}

// El rival ataca; solo cambia si no puede hacerle daño al Pokémon de
// enfrente y tiene un compañero que sí.
export function elegirAccionIA (pokedex, combate, lado = 'rival', azar = Math.random) {
    const yo = activo(combate, lado)
    const enfrente = activo(combate, otroLado(lado))
    const candidatos = disponiblesParaCambio(combate, lado)
    if (candidatos.length && mejorMovimiento(pokedex, yo, enfrente).danio === 0) {
        const companero = mejorCompanero(pokedex, combate, lado, candidatos)
        if (companero.danio > 0) return { tipo: 'cambio', indice: companero.indice }
    }
    return { tipo: 'movimiento', eleccion: elegirMovimientoIA(pokedex, yo, enfrente, azar) }
}

export function elegirReemplazoIA (pokedex, combate, lado = 'rival') {
    return mejorCompanero(pokedex, combate, lado, disponiblesParaCambio(combate, lado)).indice
}

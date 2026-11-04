import { describe, expect, it } from 'vitest'
import {
    activo, cambiar, crearCombate, disponiblesParaCambio, elegirAccionIA, elegirReemplazoIA, ganador,
    necesitaReemplazo, resolverTurnoEquipos
} from '../../src/motor/equipos.js'
import { crearLuchador } from '../../src/motor/luchador.js'
import { indiceDe, pokedex, secuencia } from './ayudas.js'

const equipo = (...ids) => ids.map((id) => crearLuchador(pokedex, id, 10))
const atacar = (eleccion = 0) => ({ tipo: 'movimiento', eleccion })

describe('crearCombate', () => {
    it('arma ambos lados con el primero en el campo', () => {
        const c = crearCombate(equipo(4, 25, 133), equipo(152, 155))
        expect(activo(c, 'jugador').nombre).toBe('CHARMANDER')
        expect(activo(c, 'rival').lado).toBe('rival')
        expect(disponiblesParaCambio(c, 'jugador')).toEqual([1, 2])
    })
    it('no acepta equipos vacíos', () => {
        expect(() => crearCombate([], equipo(1))).toThrow()
    })
})

describe('cambios', () => {
    it('el cambio ocurre antes que los movimientos y el que entra recibe el golpe', () => {
        const c = crearCombate(equipo(4, 7), equipo(152))
        const eventos = resolverTurnoEquipos(pokedex, c, { jugador: { tipo: 'cambio', indice: 1 }, rival: atacar(0) }, secuencia(0.5))
        expect(eventos[0]).toMatchObject({ tipo: 'cambio', lado: 'jugador', nombre: 'SQUIRTLE', sale: 'CHARMANDER' })
        expect(eventos[1]).toMatchObject({ tipo: 'usa', lado: 'rival' })
        expect(eventos[2]).toMatchObject({ tipo: 'danio', lado: 'jugador', nombre: 'SQUIRTLE' })
        expect(activo(c, 'jugador').salud).toBeLessThan(activo(c, 'jugador').saludMax)
    })
    it('no permite cambiar al que ya está o a uno debilitado', () => {
        const c = crearCombate(equipo(4, 7, 1), equipo(152))
        c.jugador.equipo[2].salud = 0
        expect(() => cambiar(c, 'jugador', 0)).toThrow()
        expect(() => cambiar(c, 'jugador', 2)).toThrow()
        expect(disponiblesParaCambio(c, 'jugador')).toEqual([1])
    })
})

describe('debilitados y fin del combate', () => {
    it('pide reemplazo cuando el del campo se debilita y quedan compañeros', () => {
        const c = crearCombate(equipo(4), equipo(152, 155))
        c.rival.equipo[0].salud = 1
        resolverTurnoEquipos(pokedex, c, { jugador: atacar(indiceDe(c.jugador.equipo[0], 'ember')), rival: atacar(0) }, secuencia(0.5))
        expect(necesitaReemplazo(c, 'rival')).toBe(true)
        expect(ganador(c)).toBe(null)
        const evento = cambiar(c, 'rival', 1)
        expect(evento).toMatchObject({ tipo: 'cambio', nombre: 'CYNDAQUIL', sale: null })
        expect(necesitaReemplazo(c, 'rival')).toBe(false)
    })
    it('termina cuando un equipo no tiene Pokémon con vida', () => {
        const c = crearCombate(equipo(4), equipo(152))
        c.rival.equipo[0].salud = 0
        expect(ganador(c)).toBe('jugador')
        expect(necesitaReemplazo(c, 'rival')).toBe(false)
    })
})

describe('IA de equipos', () => {
    it('reemplaza con el compañero que más daño hace', () => {
        const c = crearCombate(equipo(152), equipo(1, 4, 7)) // jugador: Chikorita (Planta)
        c.rival.equipo[0].salud = 0
        expect(elegirReemplazoIA(pokedex, c, 'rival')).toBe(1) // Charmander
    })
    it('cambia si no puede hacerle daño al de enfrente', () => {
        // Gastly contra Rattata de nivel 4, que solo conoce movimientos Normales.
        const c = crearCombate(equipo(92), [crearLuchador(pokedex, 19, 4), crearLuchador(pokedex, 4, 10)])
        expect(elegirAccionIA(pokedex, c, 'rival', secuencia(0.9))).toEqual({ tipo: 'cambio', indice: 1 })
    })
    it('si puede hacer daño, ataca', () => {
        const c = crearCombate(equipo(152), equipo(4, 7))
        expect(elegirAccionIA(pokedex, c, 'rival', secuencia(0.9))).toMatchObject({ tipo: 'movimiento' })
    })
})

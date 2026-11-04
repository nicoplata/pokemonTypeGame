import { describe, expect, it } from 'vitest'
import { ID_PLACAJE, movimientoSoportado, movimientosAlNivel } from '../../src/motor/pokedex.js'
import { crearLuchador } from '../../src/motor/luchador.js'
import { datos, pokedex } from './ayudas.js'

const nombres = (ids) => ids.map((id) => pokedex.movimiento(id).nombre)

describe('datos generados', () => {
    it('incluye los 251 Pokémon con stats, tipos y movimientos', () => {
        const especies = pokedex.especies()
        expect(especies).toHaveLength(251)
        for (const e of especies) {
            expect(Object.keys(e.base).sort()).toEqual(['atk', 'def', 'hp', 'spa', 'spd', 'spe'])
            expect(e.tipos.length).toBeGreaterThan(0)
            for (const [, id] of e.aprende) expect(datos.movimientos[id]).toBeDefined()
        }
    })
    it('tiene nombres en castellano', () => {
        expect(pokedex.especie(4).nombre).toBe('Charmander')
        expect(pokedex.movimiento(52).nombre).toBe('Ascuas')
    })
    it('falla con ids inexistentes', () => {
        expect(() => pokedex.especie(999)).toThrow()
        expect(() => pokedex.movimiento(99999)).toThrow()
    })
})

describe('movimientosAlNivel', () => {
    it('devuelve los movimientos de daño aprendidos hasta ese nivel', () => {
        expect(nombres(movimientosAlNivel(pokedex, pokedex.especie(4), 10))).toEqual(['Arañazo', 'Ascuas'])
    })
    it('conserva solo los últimos cuatro', () => {
        const ids = movimientosAlNivel(pokedex, pokedex.especie(6), 100)
        expect(ids).toHaveLength(4)
        for (const id of ids) expect(movimientoSoportado(pokedex.movimiento(id))).toBe(true)
    })
    it('usa Placaje si el Pokémon no conoce movimientos de daño', () => {
        expect(movimientosAlNivel(pokedex, pokedex.especie(132), 10)).toEqual([ID_PLACAJE]) // Ditto
    })
    it('todos los Pokémon tienen al menos un movimiento a nivel 10', () => {
        for (const e of pokedex.especies()) expect(movimientosAlNivel(pokedex, e, 10).length).toBeGreaterThan(0)
    })
})

describe('crearLuchador', () => {
    it('arma el luchador con salud, nivel y PP', () => {
        const l = crearLuchador(pokedex, 4, 10)
        expect(l).toMatchObject({ id: 4, nombre: 'CHARMANDER', nivel: 10, tipos: ['fire'], saludMax: 78, salud: 78 })
        expect(l.movimientos).toEqual([{ id: 10, pp: 35, ppMax: 35 }, { id: 52, pp: 25, ppMax: 25 }])
    })
})

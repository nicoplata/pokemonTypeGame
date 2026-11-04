import { describe, expect, it } from 'vitest'
import { coincide, filtrarPokemon, normalizar, pokemonAlAzar } from '../../src/motor/busqueda.js'
import { pokedex, secuencia } from './ayudas.js'

const nombres = (lista) => lista.map((e) => e.nombre)

describe('búsqueda', () => {
    const especies = pokedex.especies()
    it('normaliza tildes y mayúsculas', () => {
        expect(normalizar('  PokÉmon ')).toBe('pokemon')
    })
    it('busca por nombre parcial', () => {
        expect(nombres(filtrarPokemon(especies, 'pika'))).toEqual(['Pikachu'])
        expect(nombres(filtrarPokemon(especies, 'CHAR'))).toEqual(['Charmander', 'Charmeleon', 'Charizard'])
    })
    it('busca por número', () => {
        expect(nombres(filtrarPokemon(especies, '25'))).toEqual(['Pikachu'])
        expect(nombres(filtrarPokemon(especies, '#001'))).toEqual(['Bulbasaur'])
    })
    it('busca por tipo en castellano o en inglés', () => {
        const fuego = filtrarPokemon(especies, 'fuego')
        expect(fuego.length).toBeGreaterThan(10)
        expect(fuego.every((e) => e.tipos.includes('fire'))).toBe(true)
        expect(filtrarPokemon(especies, 'electrico')).toEqual(filtrarPokemon(especies, 'electric'))
    })
    it('sin consulta devuelve todos', () => {
        expect(filtrarPokemon(especies, '')).toHaveLength(251)
        expect(coincide(especies[0], '   ')).toBe(true)
    })
})

describe('pokemonAlAzar', () => {
    const especies = pokedex.especies()
    it('nunca sortea legendarios', () => {
        for (let i = 0; i < 251; i++) {
            const id = pokemonAlAzar(especies, {}, secuencia(i / 251))
            expect(pokedex.especie(id).legendario).toBe(false)
        }
    })
    it('respeta los excluidos', () => {
        const id = pokemonAlAzar(especies, { excluir: [1] }, secuencia(0))
        expect(id).toBe(2)
    })
    it('falla si no hay candidatos', () => {
        expect(() => pokemonAlAzar([], {})).toThrow()
    })
})

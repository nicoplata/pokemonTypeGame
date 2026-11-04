import { describe, expect, it, vi } from 'vitest'
import { cargarDatos } from '../../src/servicios/datos.js'
import { guardarProgreso, leerProgreso, normalizarProgreso } from '../../src/servicios/progreso.js'

describe('cargarDatos', () => {
    it('devuelve los datos de la Pokédex', async () => {
        const fetchFn = vi.fn(async () => ({ ok: true, json: async () => ({ pokemon: {}, movimientos: {} }) }))
        await expect(cargarDatos(fetchFn)).resolves.toEqual({ pokemon: {}, movimientos: {} })
        expect(fetchFn).toHaveBeenCalledWith('./data/pokedex.json')
    })
    it('falla si la respuesta no es válida', async () => {
        await expect(cargarDatos(async () => ({ ok: false, status: 404 }))).rejects.toThrow('404')
        await expect(cargarDatos(async () => ({ ok: true, json: async () => ({}) }))).rejects.toThrow('formato')
    })
})

describe('progreso', () => {
    const almacen = () => {
        const datos = new Map()
        return { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, String(v)) }
    }
    it('guarda y lee el progreso', () => {
        const a = almacen()
        const equipo = [{ id: 4, exp: 1000, movimientos: [10, 52] }]
        guardarProgreso({ nombre: 'ASH', victorias: 2, derrotas: 1, equipo, campania: 3 }, a)
        expect(leerProgreso(a)).toEqual({ nombre: 'ASH', victorias: 2, derrotas: 1, equipo, campania: 3 })
    })
    it('devuelve un progreso vacío si no hay datos o están corruptos', () => {
        expect(leerProgreso(almacen())).toEqual({ nombre: '', victorias: 0, derrotas: 0, equipo: [], campania: 0 })
        const a = almacen()
        a.setItem('pokemonTypeGame', '{roto')
        expect(leerProgreso(a)).toEqual({ nombre: '', victorias: 0, derrotas: 0, equipo: [], campania: 0 })
    })
    it('descarta campos inválidos', () => {
        expect(normalizarProgreso({ nombre: 3, victorias: 'x', derrotas: 1.5, equipo: 'x', campania: -2 }))
            .toEqual({ nombre: '', victorias: 0, derrotas: 0, equipo: [], campania: 0 })
        expect(normalizarProgreso({ equipo: [{ id: 4, exp: -1 }, { id: 'a', exp: 3 }, { id: 7, exp: 5, movimientos: [1, 'x'] }, null] }).equipo)
            .toEqual([{ id: 7, exp: 5, movimientos: [1] }])
        expect(normalizarProgreso({ campania: 50 }).campania).toBe(9)
    })
    it('no falla si localStorage no está disponible', () => {
        const roto = { getItem () { throw new Error('bloqueado') }, setItem () { throw new Error('bloqueado') } }
        expect(() => guardarProgreso({ nombre: 'A', victorias: 0, derrotas: 0 }, roto)).not.toThrow()
        expect(leerProgreso(roto).nombre).toBe('')
    })
})

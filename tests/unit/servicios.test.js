import { describe, expect, it, vi } from 'vitest'
import { convertirPokemon, crearClientePokeApi } from '../../src/servicios/pokeapi.js'
import { guardarProgreso, leerProgreso, normalizarProgreso } from '../../src/servicios/progreso.js'

const respuestaApi = {
    name: 'bulbasaur',
    sprites: { front_default: 'f.png', other: { home: { front_default: 'home.png' } } },
    stats: [
        { base_stat: 45, stat: { name: 'hp' } },
        { base_stat: 49, stat: { name: 'attack' } },
        { base_stat: 45, stat: { name: 'speed' } }
    ],
    types: [{ slot: 2, type: { name: 'poison' } }, { slot: 1, type: { name: 'grass' } }]
}

describe('convertirPokemon', () => {
    it('extrae los datos que usa el juego y ordena los tipos', () => {
        expect(convertirPokemon('bulbasaur', respuestaApi)).toEqual({
            id: 'bulbasaur', nombre: 'BULBASAUR', imagen: 'home.png',
            saludBase: 45, ataque: 49, velocidad: 45, tipos: ['grass', 'poison']
        })
    })
    it('usa la imagen local si la API no trae sprites', () => {
        const sinSprites = { ...respuestaApi, sprites: null }
        expect(convertirPokemon('bulbasaur', sinSprites).imagen).toBe('./img/001bulbasaur.png')
    })
})

describe('crearClientePokeApi', () => {
    it('cachea los pedidos', async () => {
        const fetchFn = vi.fn(async () => ({ ok: true, json: async () => respuestaApi }))
        const cargar = crearClientePokeApi(fetchFn)
        await Promise.all([cargar('bulbasaur'), cargar('bulbasaur')])
        await cargar('bulbasaur')
        expect(fetchFn).toHaveBeenCalledTimes(1)
    })
    it('permite reintentar después de un error', async () => {
        const fetchFn = vi.fn()
            .mockResolvedValueOnce({ ok: false, status: 500 })
            .mockResolvedValueOnce({ ok: true, json: async () => respuestaApi })
        const cargar = crearClientePokeApi(fetchFn)
        await expect(cargar('bulbasaur')).rejects.toThrow('500')
        await expect(cargar('bulbasaur')).resolves.toMatchObject({ nombre: 'BULBASAUR' })
    })
})

describe('progreso', () => {
    const almacen = () => {
        const datos = new Map()
        return { getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, String(v)) }
    }
    it('guarda y lee el progreso', () => {
        const a = almacen()
        guardarProgreso({ nombre: 'ASH', victorias: 2, derrotas: 1 }, a)
        expect(leerProgreso(a)).toEqual({ nombre: 'ASH', victorias: 2, derrotas: 1 })
    })
    it('devuelve un progreso vacío si no hay datos o están corruptos', () => {
        expect(leerProgreso(almacen())).toEqual({ nombre: '', victorias: 0, derrotas: 0 })
        const a = almacen()
        a.setItem('pokemonTypeGame', '{roto')
        expect(leerProgreso(a)).toEqual({ nombre: '', victorias: 0, derrotas: 0 })
    })
    it('descarta campos inválidos', () => {
        expect(normalizarProgreso({ nombre: 3, victorias: 'x', derrotas: 1.5 }))
            .toEqual({ nombre: '', victorias: 0, derrotas: 0 })
    })
    it('no falla si localStorage no está disponible', () => {
        const roto = { getItem () { throw new Error('bloqueado') }, setItem () { throw new Error('bloqueado') } }
        expect(() => guardarProgreso({ nombre: 'A', victorias: 0, derrotas: 0 }, roto)).not.toThrow()
        expect(leerProgreso(roto).nombre).toBe('')
    })
})

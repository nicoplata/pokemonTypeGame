// Acceso a PokéAPI con caché de promesas.

import { IMAGENES } from '../datos/juego.js'

const URL_BASE = 'https://pokeapi.co/api/v2/pokemon'

export function convertirPokemon (id, datos) {
    const stat = (nombre) => datos.stats.find((s) => s.stat.name === nombre)?.base_stat ?? 1
    const sprites = datos.sprites ?? {}
    return {
        id,
        nombre: datos.name.toUpperCase(),
        imagen: sprites.other?.home?.front_default ||
            sprites.other?.['official-artwork']?.front_default ||
            sprites.front_default ||
            IMAGENES[id] || '',
        saludBase: stat('hp'),
        ataque: stat('attack'),
        velocidad: stat('speed'),
        tipos: [...datos.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name)
    }
}

export function crearClientePokeApi (fetchFn = (...args) => fetch(...args)) {
    const cache = new Map()

    async function pedir (id) {
        const respuesta = await fetchFn(`${URL_BASE}/${id}`)
        if (!respuesta.ok) throw new Error(`PokéAPI respondió ${respuesta.status} para "${id}"`)
        return convertirPokemon(id, await respuesta.json())
    }

    // Guarda la promesa para no repetir pedidos; si falla se borra para
    // poder reintentar.
    return function cargarPokemon (id) {
        if (!cache.has(id)) {
            const pedido = pedir(id)
            cache.set(id, pedido)
            pedido.catch(() => cache.delete(id))
        }
        return cache.get(id)
    }
}

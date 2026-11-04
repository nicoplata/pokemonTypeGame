// Búsqueda y sorteo de Pokémon.

import { TIPOS_ES } from '../datos/tipos.js'

// Minúsculas y sin tildes, para comparar "Pokémon" con "pokemon".
export const normalizar = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const nombreTipoNormalizado = Object.fromEntries(Object.entries(TIPOS_ES).map(([tipo, nombre]) => [tipo, normalizar(nombre)]))

// Coincide por nombre, por número ("25", "#025") o por tipo ("fuego", "fire").
export function coincide (especie, consulta) {
    const texto = normalizar(consulta).replace(/^#/, '')
    if (!texto) return true
    if (/^\d+$/.test(texto)) return especie.id === Number(texto)
    if (normalizar(especie.nombre).includes(texto)) return true
    return especie.tipos.some((tipo) => tipo === texto || nombreTipoNormalizado[tipo] === texto)
}

export function filtrarPokemon (especies, consulta) {
    return especies.filter((especie) => coincide(especie, consulta))
}

// Un Pokémon al azar que no sea legendario ni esté excluido.
export function pokemonAlAzar (especies, { excluir = [] } = {}, azar = Math.random) {
    const candidatos = especies.filter((e) => !e.legendario && !excluir.includes(e.id))
    if (candidatos.length === 0) throw new Error('No hay Pokémon para sortear')
    return candidatos[Math.floor(azar() * candidatos.length)].id
}

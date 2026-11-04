import { readFileSync } from 'node:fs'
import { crearPokedex } from '../../src/motor/pokedex.js'

export const datos = JSON.parse(readFileSync(new URL('../../data/pokedex.json', import.meta.url), 'utf8'))
export const pokedex = crearPokedex(datos)

// Generador de azar que devuelve los valores dados en orden (y repite el último).
export const secuencia = (...valores) => {
    let i = 0
    return () => valores[Math.min(i++, valores.length - 1)]
}

export const idMovimiento = (clave) => Object.values(datos.movimientos).find((m) => m.clave === clave).id

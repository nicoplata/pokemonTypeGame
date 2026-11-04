import { describe, expect, it } from 'vitest'
import { ENTRENADORES, TOTAL_MEDALLAS } from '../../src/datos/campania.js'
import { TIPOS_ES } from '../../src/datos/tipos.js'
import { aleatoriedad, especiesEntrenador, nivelEntrenador } from '../../src/motor/campania.js'
import { evolucionarPorNivel } from '../../src/motor/experiencia.js'
import { elegirMovimientoIA } from '../../src/motor/combate.js'
import { crearLuchador } from '../../src/motor/luchador.js'
import { pokedex, secuencia } from './ayudas.js'

describe('datos de la campaña', () => {
    it('tiene ocho medallas y un campeón', () => {
        expect(ENTRENADORES).toHaveLength(9)
        expect(TOTAL_MEDALLAS).toBe(8)
        expect(ENTRENADORES.at(-1).titulo).toBe('Campeón')
    })
    it('cada entrenador tiene un equipo válido y se vuelve más difícil', () => {
        let anterior = null
        for (const e of ENTRENADORES) {
            expect(TIPOS_ES[e.tipo]).toBeDefined()
            expect(e.equipo).toHaveLength(3)
            for (const id of e.equipo) expect(pokedex.especie(id).legendario).toBe(false)
            if (anterior) {
                expect(e.nivelMinimo).toBeGreaterThan(anterior.nivelMinimo)
                expect(e.dificultad).toBeGreaterThanOrEqual(anterior.dificultad)
                expect(e.astucia).toBeGreaterThanOrEqual(anterior.astucia)
            }
            anterior = e
        }
    })
})

describe('reglas de la campaña', () => {
    it('el nivel es el mínimo o el promedio del jugador más la dificultad', () => {
        const delfina = ENTRENADORES[2]
        expect(nivelEntrenador(delfina, 8)).toBe(14)
        expect(nivelEntrenador(delfina, 20)).toBe(21)
        expect(nivelEntrenador(ENTRENADORES[8], 99)).toBe(100)
    })
    it('los equipos evolucionan según el nivel', () => {
        expect(evolucionarPorNivel(pokedex, 147, 10)).toBe(147) // Dratini
        expect(evolucionarPorNivel(pokedex, 147, 30)).toBe(148) // Dragonair
        expect(evolucionarPorNivel(pokedex, 147, 55)).toBe(149) // Dragonite
        expect(especiesEntrenador(pokedex, ENTRENADORES[8], 40)).toEqual([148, 130, 247])
    })
    it('los entrenadores más astutos improvisan menos', () => {
        expect(aleatoriedad(ENTRENADORES[0])).toBeGreaterThan(aleatoriedad(ENTRENADORES[7]))
        expect(aleatoriedad(ENTRENADORES[8])).toBe(0)
    })
    it('sin aleatoriedad la IA siempre elige su mejor movimiento', () => {
        const r = { ...crearLuchador(pokedex, 4, 10), lado: 'rival' }
        const j = { ...crearLuchador(pokedex, 152, 10), lado: 'jugador' }
        const mejor = elegirMovimientoIA(pokedex, r, j, secuencia(0.99))
        expect(elegirMovimientoIA(pokedex, r, j, secuencia(0), 0)).toBe(mejor)
    })
})

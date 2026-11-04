import { describe, expect, it } from 'vitest'
import { calcularEstadisticas, calcularEstadistica, calcularSaludMax } from '../../src/motor/estadisticas.js'

describe('estadísticas por nivel', () => {
    it('calcula la salud máxima', () => {
        expect(calcularSaludMax(39, 10)).toBe(29)
        expect(calcularSaludMax(39, 100)).toBe(203)
    })
    it('calcula el resto de las estadísticas', () => {
        expect(calcularEstadistica(52, 10)).toBe(16)
        expect(calcularEstadistica(52, 100)).toBe(124)
    })
    it('calcula todas juntas', () => {
        expect(calcularEstadisticas({ hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65 }, 10))
            .toEqual({ hp: 29, atk: 16, def: 15, spa: 18, spd: 16, spe: 19 })
    })
})

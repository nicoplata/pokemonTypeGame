import { describe, expect, it } from 'vitest'
import { EFECTOS, PISTAS, frecuencia } from '../../src/ui/musica.js'

describe('frecuencia', () => {
    it('convierte notas a hercios', () => {
        expect(frecuencia('A4')).toBe(440)
        expect(frecuencia('A5')).toBe(880)
        expect(frecuencia('C4')).toBeCloseTo(261.63, 1)
        expect(frecuencia('G#4')).toBeCloseTo(415.3, 1)
    })
    it('rechaza notas inválidas', () => {
        expect(() => frecuencia('H2')).toThrow()
        expect(() => frecuencia('A')).toThrow()
    })
})

describe('partituras', () => {
    it('todas las notas de las pistas son válidas', () => {
        for (const pista of Object.values(PISTAS)) {
            expect(pista.melodia.length % 8).toBe(0)
            for (const nota of [...pista.melodia, ...pista.bajo]) if (nota) expect(frecuencia(nota)).toBeGreaterThan(20)
        }
    })
    it('todos los efectos tienen notas válidas y duración positiva', () => {
        for (const efecto of Object.values(EFECTOS)) {
            for (const [nota, duracion] of efecto) {
                if (nota !== 'ruido') expect(frecuencia(nota)).toBeGreaterThan(20)
                expect(duracion).toBeGreaterThan(0)
            }
        }
    })
})

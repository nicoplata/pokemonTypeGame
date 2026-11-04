import { describe, expect, it } from 'vitest'
import { construirPasos, nombreEnCombate } from '../../src/motor/mensajes.js'

// En el modo de dos jugadores los mensajes dicen de quién es cada Pokémon.
const opciones = {
    sufijos: { jugador: ' de NICO', rival: ' de LUCAS' },
    entrenadores: { jugador: 'NICO', rival: 'LUCAS' }
}

describe('mensajes con nombres de entrenadores', () => {
    it('nombra a cada Pokémon con su entrenador', () => {
        expect(nombreEnCombate({ nombre: 'PIKACHU', lado: 'jugador' }, opciones.sufijos)).toBe('PIKACHU de NICO')
        expect(nombreEnCombate({ nombre: 'ONIX', lado: 'rival' }, opciones.sufijos)).toBe('ONIX de LUCAS')
    })
    it('por defecto el rival es "rival" y el jugador no lleva nombre', () => {
        expect(nombreEnCombate({ nombre: 'ONIX', lado: 'rival' })).toBe('ONIX rival')
        expect(nombreEnCombate({ nombre: 'PIKACHU', lado: 'jugador' })).toBe('PIKACHU')
    })
    it('usa los nombres en ataques, debilitados y cambios', () => {
        const pasos = construirPasos([
            { tipo: 'usa', lado: 'jugador', nombre: 'PIKACHU', movimiento: 'Impactrueno' },
            { tipo: 'danio', lado: 'rival', nombre: 'SQUIRTLE', cantidad: 20, multiplicador: 2, golpes: 1, salud: 0 },
            { tipo: 'debilitado', lado: 'rival', nombre: 'SQUIRTLE' },
            { tipo: 'cambio', lado: 'rival', nombre: 'ONIX', sale: null },
            { tipo: 'cambio', lado: 'jugador', nombre: 'EEVEE', sale: 'PIKACHU' }
        ], opciones)
        expect(pasos.map((p) => p.texto)).toEqual([
            'PIKACHU de NICO usó IMPACTRUENO. ¡Es súper eficaz! Hizo 20 de daño.',
            '¡SQUIRTLE de LUCAS se debilitó!',
            'LUCAS envió a ONIX.',
            'NICO retiró a PIKACHU y envió a EEVEE.'
        ])
    })
})

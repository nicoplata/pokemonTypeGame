import { describe, expect, it } from 'vitest'
import {
    calcularAtaque, crearLuchador, efectividad, eleccionRival, jugadorAtacaPrimero, mensajeAtaque
} from '../../src/motor/combate.js'

// Generador de azar que devuelve los valores dados en orden (y repite el último).
const secuencia = (...valores) => {
    let i = 0
    return () => valores[Math.min(i++, valores.length - 1)]
}

const luchador = (extra) => crearLuchador({
    id: 'x', nombre: 'X', imagen: '', saludBase: 40, ataque: 50, velocidad: 50, tipos: ['normal'], ...extra
})

describe('efectividad', () => {
    it('fuego es súper eficaz contra planta', () => {
        expect(efectividad('fire', ['grass'])).toBe(2)
    })
    it('agua no es muy eficaz contra planta', () => {
        expect(efectividad('water', ['grass'])).toBe(0.5)
    })
    it('multiplica con tipos dobles', () => {
        expect(efectividad('fire', ['grass', 'poison'])).toBe(2)
        expect(efectividad('water', ['grass', 'poison'])).toBe(0.5)
        expect(efectividad('ice', ['grass', 'flying'])).toBe(4)
    })
    it('vale 0 cuando hay inmunidad', () => {
        expect(efectividad('normal', ['ghost'])).toBe(0)
        expect(efectividad('electric', ['ground'])).toBe(0)
    })
    it('vale 1 para combinaciones neutras o tipos desconocidos', () => {
        expect(efectividad('normal', ['fire'])).toBe(1)
        expect(efectividad('inventado', ['fire'])).toBe(1)
    })
})

describe('crearLuchador', () => {
    it('duplica la salud base y carga los PP', () => {
        const l = luchador()
        expect(l.saludMax).toBe(80)
        expect(l.salud).toBe(80)
        expect(l.pp).toEqual({ rapido: Infinity, pesado: Infinity, especial: 3 })
    })
})

describe('calcularAtaque', () => {
    it('el ataque pesado puede fallar', () => {
        const r = calcularAtaque(luchador(), luchador(), 'pesado', secuencia(0.9))
        expect(r).toEqual({ acierto: false, danio: 0, multiplicador: 1 })
    })
    it('el ataque rápido nunca falla', () => {
        const r = calcularAtaque(luchador(), luchador(), 'rapido', secuencia(0.999, 1 - 1e-9))
        expect(r.acierto).toBe(true)
    })
    it('el especial aplica la efectividad de tipos', () => {
        const fuego = luchador({ tipos: ['fire'] })
        const planta = luchador({ tipos: ['grass'] })
        const agua = luchador({ tipos: ['water'] })
        // variación máxima (azar 1) => daño = ataque * potencia * multiplicador
        const contraPlanta = calcularAtaque(fuego, planta, 'especial', secuencia(0, 1))
        const contraAgua = calcularAtaque(fuego, agua, 'especial', secuencia(0, 1))
        expect(contraPlanta).toEqual({ acierto: true, danio: 45, multiplicador: 2 })
        expect(contraAgua).toEqual({ acierto: true, danio: 11, multiplicador: 0.5 })
    })
    it('los ataques rápido y pesado ignoran los tipos', () => {
        const r = calcularAtaque(luchador({ tipos: ['fire'] }), luchador({ tipos: ['water'] }), 'rapido', secuencia(0, 1))
        expect(r.multiplicador).toBe(1)
        expect(r.danio).toBe(13)
    })
    it('no hace daño si el defensor es inmune', () => {
        const r = calcularAtaque(luchador({ tipos: ['electric'] }), luchador({ tipos: ['ground'] }), 'especial', secuencia(0))
        expect(r).toEqual({ acierto: true, danio: 0, multiplicador: 0 })
    })
    it('hace al menos 1 de daño', () => {
        const r = calcularAtaque(luchador({ ataque: 1 }), luchador(), 'rapido', secuencia(0, 0))
        expect(r.danio).toBe(1)
    })
})

describe('eleccionRival', () => {
    it('prefiere el especial cuando es súper eficaz', () => {
        const rival = luchador({ tipos: ['fire'] })
        expect(eleccionRival(rival, luchador({ tipos: ['grass'] }), secuencia(0.1))).toBe('especial')
    })
    it('evita el especial cuando no es eficaz', () => {
        const rival = luchador({ tipos: ['fire'] })
        const jugador = luchador({ tipos: ['water'] })
        for (const valor of [0, 0.5, 0.99]) {
            expect(eleccionRival(rival, jugador, secuencia(valor))).not.toBe('especial')
        }
    })
    it('no elige ataques sin PP', () => {
        const rival = luchador({ tipos: ['fire'] })
        rival.pp.especial = 0
        expect(eleccionRival(rival, luchador({ tipos: ['grass'] }), secuencia(0.99))).not.toBe('especial')
    })
})

describe('jugadorAtacaPrimero', () => {
    it('ataca primero el más rápido', () => {
        expect(jugadorAtacaPrimero(luchador({ velocidad: 60 }), luchador({ velocidad: 50 }))).toBe(true)
        expect(jugadorAtacaPrimero(luchador({ velocidad: 40 }), luchador({ velocidad: 50 }))).toBe(false)
    })
    it('desempata al azar', () => {
        expect(jugadorAtacaPrimero(luchador(), luchador(), secuencia(0.2))).toBe(true)
        expect(jugadorAtacaPrimero(luchador(), luchador(), secuencia(0.8))).toBe(false)
    })
})

describe('mensajeAtaque', () => {
    const a = luchador({ nombre: 'CHARMANDER' })
    const d = luchador({ nombre: 'CHIKORITA' })
    it('describe un golpe súper eficaz', () => {
        expect(mensajeAtaque(a, d, 'especial', { acierto: true, danio: 40, multiplicador: 2 }, false))
            .toBe('CHARMANDER usó ATAQUE ESPECIAL. ¡Es súper eficaz! Hizo 40 de daño.')
    })
    it('describe un fallo del rival', () => {
        expect(mensajeAtaque(a, d, 'pesado', { acierto: false, danio: 0, multiplicador: 1 }, true))
            .toBe('CHARMANDER rival usó ATAQUE PESADO... ¡pero falló!')
    })
    it('describe una inmunidad', () => {
        expect(mensajeAtaque(a, d, 'especial', { acierto: true, danio: 0, multiplicador: 0 }, false))
            .toBe('CHARMANDER usó ATAQUE ESPECIAL. No afecta a CHIKORITA rival...')
    })
})

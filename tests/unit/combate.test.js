import { describe, expect, it } from 'vitest'
import {
    FORCEJEO, actuaPrimero, acierta, calcularDanio, cantidadDeGolpes, efectividad, elegirMovimientoIA, resolverTurno
} from '../../src/motor/combate.js'
import { crearLuchador } from '../../src/motor/luchador.js'
import { construirPasos } from '../../src/motor/mensajes.js'
import { idMovimiento, pokedex, secuencia } from './ayudas.js'

const luchador = (id, lado, nivel = 10) => ({ ...crearLuchador(pokedex, id, nivel), lado })
const mov = (clave) => pokedex.movimiento(idMovimiento(clave))

describe('efectividad', () => {
    it('aplica la tabla de tipos, incluso con tipos dobles', () => {
        expect(efectividad('fire', ['grass'])).toBe(2)
        expect(efectividad('water', ['grass'])).toBe(0.5)
        expect(efectividad('fire', ['grass', 'poison'])).toBe(2)
        expect(efectividad('ice', ['grass', 'flying'])).toBe(4)
        expect(efectividad('normal', ['ghost'])).toBe(0)
        expect(efectividad('inventado', ['fire'])).toBe(1)
    })
})

describe('calcularDanio', () => {
    const charmander = luchador(4, 'jugador')
    const chikorita = luchador(152, 'rival')
    it('usa el ataque especial para movimientos especiales y aplica tipos', () => {
        // potencia 40, at. esp. 60, x2 => 0.4 * 60 * 0.6 * 2 = 28.8
        expect(calcularDanio(charmander, chikorita, mov('ember'), secuencia(1))).toEqual({ danio: 29, multiplicador: 2 })
    })
    it('usa el ataque físico para movimientos físicos', () => {
        // potencia 40, ataque 52 => 12.48
        expect(calcularDanio(charmander, chikorita, mov('scratch'), secuencia(1))).toEqual({ danio: 12, multiplicador: 1 })
    })
    it('no hace daño si hay inmunidad', () => {
        const gastly = luchador(92, 'rival')
        expect(calcularDanio(charmander, gastly, mov('scratch'))).toEqual({ danio: 0, multiplicador: 0 })
    })
    it('Forcejeo no tiene tipo', () => {
        const gastly = luchador(92, 'rival')
        expect(calcularDanio(charmander, gastly, mov('struggle'), secuencia(1)).multiplicador).toBe(1)
    })
})

describe('acierta y cantidadDeGolpes', () => {
    it('los movimientos sin precisión nunca fallan', () => {
        expect(acierta(mov('swift'), secuencia(0.9999))).toBe(true)
    })
    it('respeta la precisión', () => {
        expect(acierta(mov('hydro-pump'), secuencia(0.79))).toBe(true)
        expect(acierta(mov('hydro-pump'), secuencia(0.8))).toBe(false)
    })
    it('reparte los golpes múltiples', () => {
        expect(cantidadDeGolpes(mov('tackle'))).toBe(1)
        expect(cantidadDeGolpes(mov('double-kick'))).toBe(2)
        expect(cantidadDeGolpes(mov('fury-attack'), secuencia(0.1))).toBe(2)
        expect(cantidadDeGolpes(mov('fury-attack'), secuencia(0.5))).toBe(3)
        expect(cantidadDeGolpes(mov('fury-attack'), secuencia(0.8))).toBe(4)
        expect(cantidadDeGolpes(mov('fury-attack'), secuencia(0.9))).toBe(5)
    })
})

describe('actuaPrimero', () => {
    const lento = luchador(7, 'jugador') // velocidad 43
    const rapido = luchador(4, 'rival') // velocidad 65
    it('la prioridad gana a la velocidad', () => {
        expect(actuaPrimero(lento, mov('quick-attack'), rapido, mov('scratch'))).toBe(true)
    })
    it('a igual prioridad actúa el más rápido', () => {
        expect(actuaPrimero(lento, mov('tackle'), rapido, mov('scratch'))).toBe(false)
    })
    it('desempata al azar', () => {
        const otro = luchador(7, 'rival')
        expect(actuaPrimero(lento, mov('tackle'), otro, mov('tackle'), secuencia(0.2))).toBe(true)
        expect(actuaPrimero(lento, mov('tackle'), otro, mov('tackle'), secuencia(0.8))).toBe(false)
    })
})

describe('resolverTurno', () => {
    it('ejecuta ambos movimientos y descuenta PP', () => {
        const j = luchador(4, 'jugador')
        const r = luchador(152, 'rival')
        const eventos = resolverTurno(pokedex, j, 1, r, 0, secuencia(0))
        expect(eventos.map((e) => e.tipo)).toEqual(['usa', 'danio', 'usa', 'danio'])
        expect(j.movimientos[1].pp).toBe(24)
        expect(r.movimientos[0].pp).toBe(34)
        expect(eventos[1]).toMatchObject({ lado: 'rival', multiplicador: 2, salud: r.salud })
    })
    it('el que se debilita no ataca', () => {
        const j = luchador(4, 'jugador')
        const r = luchador(152, 'rival')
        r.salud = 1
        const eventos = resolverTurno(pokedex, j, 1, r, 0, secuencia(0))
        expect(eventos.map((e) => e.tipo)).toEqual(['usa', 'danio', 'debilitado'])
        expect(r.salud).toBe(0)
    })
    it('usa Forcejeo cuando no quedan PP y sufre retroceso', () => {
        const j = luchador(4, 'jugador')
        const r = luchador(152, 'rival')
        j.movimientos.forEach((m) => { m.pp = 0 })
        const eventos = resolverTurno(pokedex, j, FORCEJEO, r, 0, secuencia(0))
        const retroceso = eventos.find((e) => e.tipo === 'retroceso')
        expect(retroceso).toMatchObject({ lado: 'jugador', cantidad: Math.floor(j.saludMax / 4) })
    })
    it('rechaza movimientos sin PP', () => {
        const j = luchador(4, 'jugador')
        j.movimientos[0].pp = 0
        expect(() => resolverTurno(pokedex, j, 0, luchador(152, 'rival'), 0)).toThrow()
    })
})

describe('elegirMovimientoIA', () => {
    it('elige el movimiento que más daño hace', () => {
        const r = luchador(4, 'rival')
        const j = luchador(152, 'jugador')
        expect(elegirMovimientoIA(pokedex, r, j, secuencia(0.9))).toBe(1) // Ascuas
    })
    it('a veces elige al azar', () => {
        const r = luchador(4, 'rival')
        const j = luchador(152, 'jugador')
        expect(elegirMovimientoIA(pokedex, r, j, secuencia(0.1, 0))).toBe(0)
    })
    it('usa Forcejeo sin PP', () => {
        const r = luchador(4, 'rival')
        r.movimientos.forEach((m) => { m.pp = 0 })
        expect(elegirMovimientoIA(pokedex, r, luchador(152, 'jugador'))).toBe(FORCEJEO)
    })
})

describe('construirPasos', () => {
    const luchadores = { jugador: { nombre: 'CHARMANDER', lado: 'jugador' }, rival: { nombre: 'CHIKORITA', lado: 'rival' } }
    it('arma un mensaje por acción', () => {
        const pasos = construirPasos([
            { tipo: 'usa', lado: 'jugador', movimiento: 'Ascuas' },
            { tipo: 'danio', lado: 'rival', cantidad: 29, multiplicador: 2, golpes: 1, salud: 61 },
            { tipo: 'usa', lado: 'rival', movimiento: 'Placaje' },
            { tipo: 'falla', lado: 'rival' }
        ], luchadores)
        expect(pasos.map((p) => p.texto)).toEqual([
            'CHARMANDER usó ASCUAS. ¡Es súper eficaz! Hizo 29 de daño.',
            'CHIKORITA rival usó PLACAJE. ¡Pero falló!'
        ])
    })
    it('anuncia golpes múltiples, inmunidad y debilitados aparte', () => {
        const pasos = construirPasos([
            { tipo: 'usa', lado: 'jugador', movimiento: 'Doble Patada' },
            { tipo: 'danio', lado: 'rival', cantidad: 10, multiplicador: 0.5, golpes: 2, salud: 0 },
            { tipo: 'debilitado', lado: 'rival' },
            { tipo: 'usa', lado: 'rival', movimiento: 'Placaje' },
            { tipo: 'sinEfecto', lado: 'jugador' }
        ], luchadores)
        expect(pasos.map((p) => p.texto)).toEqual([
            'CHARMANDER usó DOBLE PATADA. No es muy eficaz... ¡Golpeó 2 veces! Hizo 10 de daño.',
            '¡CHIKORITA rival se debilitó!',
            'CHIKORITA rival usó PLACAJE. No afecta a CHARMANDER...'
        ])
    })
})

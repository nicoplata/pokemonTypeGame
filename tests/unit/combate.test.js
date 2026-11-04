import { describe, expect, it } from 'vitest'
import {
    FORCEJEO, actuaPrimero, acierta, calcularDanio, cantidadDeGolpes, efectividad, elegirMovimientoIA,
    probabilidadCritico, resolverTurno
} from '../../src/motor/combate.js'
import { crearLuchador } from '../../src/motor/luchador.js'
import { construirPasos } from '../../src/motor/mensajes.js'
import { idMovimiento, indiceDe, pokedex, secuencia } from './ayudas.js'

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
    const charmander = luchador(4, 'jugador') // nivel 10: at. 16, at. esp. 18
    const chikorita = luchador(152, 'rival') // nivel 10: def. 19, def. esp. 19

    // azar: primero decide el crítico y después la variación (0 => 85 %, 0,999 => 100 %).
    it('aplica la fórmula con STAB y efectividad', () => {
        // ((2·10/5+2)·40·18/19)/50 + 2 = 6 -> STAB 9 -> x2 18
        expect(calcularDanio(charmander, chikorita, mov('ember'), secuencia(0.99, 0.999)))
            .toEqual({ danio: 18, multiplicador: 2, critico: false })
    })
    it('aplica la variación mínima del 85 %', () => {
        // 6 -> 85 % = 5 -> STAB 7 -> x2 14
        expect(calcularDanio(charmander, chikorita, mov('ember'), secuencia(0.99, 0)).danio).toBe(14)
    })
    it('los golpes críticos multiplican por 1,5', () => {
        // 6 -> crítico 9 -> STAB 13 -> x2 26
        expect(calcularDanio(charmander, chikorita, mov('ember'), secuencia(0, 0.999)))
            .toEqual({ danio: 26, multiplicador: 2, critico: true })
    })
    it('los movimientos físicos usan ataque y defensa, sin STAB si no coincide el tipo', () => {
        // ((6·40·16)/19)/50 + 2 = 6
        expect(calcularDanio(charmander, chikorita, mov('scratch'), secuencia(0.99, 0.999)).danio).toBe(6)
    })
    it('el daño fijo ignora estadísticas y efectividad, pero no la inmunidad', () => {
        const clefairy = luchador(35, 'rival') // tipo Hada: inmune a Dragón
        expect(calcularDanio(charmander, chikorita, mov('dragon-rage'))).toEqual({ danio: 40, multiplicador: 1, critico: false })
        expect(calcularDanio(charmander, clefairy, mov('dragon-rage')).danio).toBe(0)
        expect(calcularDanio(charmander, chikorita, mov('seismic-toss')).danio).toBe(10)
        expect(calcularDanio(charmander, chikorita, mov('super-fang')).danio).toBe(15)
    })
    it('no hace daño si hay inmunidad', () => {
        const gastly = luchador(92, 'rival')
        expect(calcularDanio(charmander, gastly, mov('scratch'))).toEqual({ danio: 0, multiplicador: 0, critico: false })
    })
    it('Forcejeo no tiene tipo ni STAB', () => {
        const gastly = luchador(92, 'rival')
        expect(calcularDanio(charmander, gastly, mov('struggle'), secuencia(0.99)).multiplicador).toBe(1)
    })
    it('hace al menos 1 de daño', () => {
        const fuerte = luchador(95, 'rival', 50) // Onix nivel 50
        expect(calcularDanio(charmander, fuerte, mov('scratch'), secuencia(0.99, 0)).danio).toBe(1)
    })
    it('la probabilidad de crítico depende del movimiento', () => {
        expect(probabilidadCritico(mov('tackle'))).toBeCloseTo(1 / 24)
        expect(probabilidadCritico(mov('razor-leaf'))).toBe(1 / 8)
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
        const ascuas = indiceDe(j, 'ember')
        const eventos = resolverTurno(pokedex, j, ascuas, r, 0, secuencia(0.5))
        expect(eventos.map((e) => e.tipo)).toEqual(['usa', 'danio', 'usa', 'danio'])
        expect(j.movimientos[ascuas].pp).toBe(24)
        expect(r.movimientos[0].pp).toBe(34)
        expect(eventos[1]).toMatchObject({ lado: 'rival', multiplicador: 2, salud: r.salud })
    })
    it('el que se debilita no ataca', () => {
        const j = luchador(4, 'jugador')
        const r = luchador(152, 'rival')
        r.salud = 1
        const eventos = resolverTurno(pokedex, j, indiceDe(j, 'ember'), r, 0, secuencia(0))
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
        expect(elegirMovimientoIA(pokedex, r, j, secuencia(0.9))).toBe(indiceDe(r, 'ember'))
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
    const j = { lado: 'jugador', nombre: 'CHARMANDER' }
    const r = { lado: 'rival', nombre: 'CHIKORITA' }
    it('arma un mensaje por acción', () => {
        const pasos = construirPasos([
            { tipo: 'usa', ...j, movimiento: 'Ascuas' },
            { tipo: 'danio', ...r, cantidad: 29, multiplicador: 2, golpes: 1, salud: 61 },
            { tipo: 'usa', ...r, movimiento: 'Placaje' },
            { tipo: 'falla', ...r }
        ])
        expect(pasos.map((p) => p.texto)).toEqual([
            'CHARMANDER usó ASCUAS. ¡Es súper eficaz! Hizo 29 de daño.',
            'CHIKORITA rival usó PLACAJE. ¡Pero falló!'
        ])
    })
    it('anuncia los golpes críticos', () => {
        const pasos = construirPasos([
            { tipo: 'usa', ...j, movimiento: 'Ascuas' },
            { tipo: 'danio', ...r, cantidad: 26, multiplicador: 2, golpes: 1, criticos: 1, salud: 4 }
        ])
        expect(pasos[0].texto).toBe('CHARMANDER usó ASCUAS. ¡Un golpe crítico! ¡Es súper eficaz! Hizo 26 de daño.')
    })
    it('anuncia golpes múltiples, inmunidad y debilitados aparte', () => {
        const pasos = construirPasos([
            { tipo: 'usa', ...j, movimiento: 'Doble Patada' },
            { tipo: 'danio', ...r, cantidad: 10, multiplicador: 0.5, golpes: 2, salud: 0 },
            { tipo: 'debilitado', ...r },
            { tipo: 'usa', ...r, movimiento: 'Placaje' },
            { tipo: 'sinEfecto', ...j }
        ])
        expect(pasos.map((p) => p.texto)).toEqual([
            'CHARMANDER usó DOBLE PATADA. No es muy eficaz... ¡Golpeó 2 veces! Hizo 10 de daño.',
            '¡CHIKORITA rival se debilitó!',
            'CHIKORITA rival usó PLACAJE. No afecta a CHARMANDER...'
        ])
    })
    it('anuncia los cambios de Pokémon', () => {
        const pasos = construirPasos([
            { tipo: 'cambio', lado: 'jugador', nombre: 'PIKACHU', sale: 'CHARMANDER' },
            { tipo: 'cambio', lado: 'jugador', nombre: 'EEVEE', sale: null },
            { tipo: 'cambio', lado: 'rival', nombre: 'ONIX', sale: 'CHIKORITA' },
            { tipo: 'cambio', lado: 'rival', nombre: 'ZUBAT', sale: null }
        ])
        expect(pasos.map((p) => p.texto)).toEqual([
            '¡Vuelve, CHARMANDER! ¡Adelante, PIKACHU!',
            '¡Adelante, EEVEE!',
            'El rival retiró a CHIKORITA y envió a ONIX.',
            'El rival envió a ZUBAT.'
        ])
    })
})

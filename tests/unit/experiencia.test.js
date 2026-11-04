import { describe, expect, it } from 'vitest'
import {
    NIVEL_MAXIMO, aprenderMovimiento, curar, evolucionPendiente, evolucionar, expOtorgada, expParaNivel,
    ganarExperiencia, movimientosNuevosEnNivel, nivelPorExp, progresoDeNivel, repartirExperiencia
} from '../../src/motor/experiencia.js'
import { crearLuchador, resumirLuchador } from '../../src/motor/luchador.js'
import { idMovimiento, pokedex } from './ayudas.js'

describe('curvas de experiencia', () => {
    it('coinciden con las de los juegos', () => {
        expect(expParaNivel('medio', 10)).toBe(1000)
        expect(expParaNivel('rapido', 10)).toBe(800)
        expect(expParaNivel('lento', 10)).toBe(1250)
        expect(expParaNivel('medioLento', 10)).toBe(560)
        expect(expParaNivel('medioLento', 100)).toBe(1059860)
        expect(expParaNivel('medioLento', 2)).toBe(9)
        expect(expParaNivel('medio', 1)).toBe(0)
    })
    it('convierten experiencia en nivel', () => {
        expect(nivelPorExp('medio', 999)).toBe(9)
        expect(nivelPorExp('medio', 1000)).toBe(10)
        expect(nivelPorExp('medio', 10 ** 9)).toBe(NIVEL_MAXIMO)
    })
    it('calculan el progreso hacia el próximo nivel', () => {
        expect(progresoDeNivel('medio', 10, 1000)).toBe(0)
        expect(progresoDeNivel('medio', 10, 1000 + 331 / 2)).toBeCloseTo(0.5)
        expect(progresoDeNivel('medio', 100, 10 ** 6)).toBe(1)
    })
    it('fallan con una curva desconocida', () => {
        expect(() => expParaNivel('rarisima', 5)).toThrow()
    })
})

describe('experiencia ganada', () => {
    it('depende de la especie y el nivel del derrotado', () => {
        // Chikorita: experiencia base 64. 1,5 · 64 · 10 / 7 = 137
        expect(expOtorgada(pokedex, crearLuchador(pokedex, 152, 10))).toBe(137)
    })
    it('se reparte: completa al que peleó y la mitad al resto con vida', () => {
        const equipo = [crearLuchador(pokedex, 4, 10), crearLuchador(pokedex, 7, 10), crearLuchador(pokedex, 1, 10)]
        equipo[2].salud = 0
        expect(repartirExperiencia(equipo, 0, 137)).toEqual([{ indice: 0, cantidad: 137 }, { indice: 1, cantidad: 68 }])
    })
})

describe('ganarExperiencia', () => {
    it('sube de nivel, recalcula estadísticas y conserva el daño recibido', () => {
        const charmander = crearLuchador(pokedex, 4, 10)
        charmander.salud -= 10
        const eventos = ganarExperiencia(pokedex, charmander, expParaNivel('medioLento', 12) - charmander.exp)
        expect(eventos.filter((e) => e.tipo === 'subeNivel').map((e) => e.nivel)).toEqual([11, 12])
        expect(charmander.nivel).toBe(12)
        expect(charmander.saludMax).toBe(33) // ⌊93·12/100⌋ + 12 + 10
        expect(charmander.salud).toBe(23) // 19 + (33 - 29)
    })
    it('avisa los movimientos que puede aprender', () => {
        const bulbasaur = crearLuchador(pokedex, 1, 8)
        const nuevos = movimientosNuevosEnNivel(pokedex, 1, 9)
        const eventos = ganarExperiencia(pokedex, bulbasaur, expParaNivel('medioLento', 9) - bulbasaur.exp)
        expect(eventos.filter((e) => e.tipo === 'puedeAprender').map((e) => e.movimiento)).toEqual(nuevos)
    })
    it('no pasa del nivel 100', () => {
        const l = crearLuchador(pokedex, 4, 99)
        ganarExperiencia(pokedex, l, 10 ** 9)
        expect(l.nivel).toBe(100)
        expect(l.exp).toBe(expParaNivel('medioLento', 100))
    })
})

describe('aprenderMovimiento', () => {
    it('agrega si tiene lugar', () => {
        const l = crearLuchador(pokedex, 4, 10) // conoce 2
        expect(aprenderMovimiento(pokedex, l, idMovimiento('dragon-rage'))).toBe(null)
        expect(l.movimientos).toHaveLength(3)
    })
    it('reemplaza el elegido si ya conoce cuatro', () => {
        const l = crearLuchador(pokedex, 6, 50)
        const olvidado = l.movimientos[0].id
        expect(aprenderMovimiento(pokedex, l, idMovimiento('tackle'), 0)).toBe(olvidado)
        expect(l.movimientos[0]).toMatchObject({ id: idMovimiento('tackle'), pp: 35 })
        expect(() => aprenderMovimiento(pokedex, l, idMovimiento('ember'))).toThrow()
    })
})

describe('evolución', () => {
    it('evoluciona al llegar al nivel y conserva los movimientos', () => {
        const l = crearLuchador(pokedex, 4, 15)
        expect(evolucionPendiente(pokedex, l)).toBe(null)
        ganarExperiencia(pokedex, l, expParaNivel('medioLento', 16) - l.exp)
        expect(evolucionPendiente(pokedex, l)).toBe(5)
        const movimientos = l.movimientos.map((m) => m.id)
        expect(evolucionar(pokedex, l)).toMatchObject({ tipo: 'evoluciona', nombre: 'CHARMANDER', nuevoNombre: 'CHARMELEON' })
        expect(l).toMatchObject({ id: 5, nombre: 'CHARMELEON', tipos: ['fire'] })
        expect(l.movimientos.map((m) => m.id)).toEqual(movimientos)
        expect(l.stats.atk).toBeGreaterThan(crearLuchador(pokedex, 4, 16).stats.atk)
    })
    it('los que no evolucionan no tienen evolución pendiente', () => {
        expect(evolucionPendiente(pokedex, crearLuchador(pokedex, 128, 100))).toBe(null) // Tauros
        expect(() => evolucionar(pokedex, crearLuchador(pokedex, 128, 100))).toThrow()
    })
})

describe('equipo guardado', () => {
    it('se resume y se recrea igual', () => {
        const l = crearLuchador(pokedex, 4, 12)
        aprenderMovimiento(pokedex, l, idMovimiento('dragon-rage'))
        l.exp += 50
        const copia = crearLuchador(pokedex, l.id, 1, resumirLuchador(l))
        expect(copia).toMatchObject({ nivel: 12, exp: l.exp, saludMax: l.saludMax })
        expect(copia.movimientos.map((m) => m.id)).toEqual(l.movimientos.map((m) => m.id))
    })
    it('ignora movimientos inválidos guardados', () => {
        const copia = crearLuchador(pokedex, 4, 1, { exp: 1000, movimientos: [99999, 45] }) // 45 = Gruñido (de estado)
        expect(copia.movimientos.length).toBeGreaterThan(0)
        expect(copia.movimientos.map((m) => m.id)).not.toContain(99999)
    })
    it('curar restaura salud y PP', () => {
        const l = crearLuchador(pokedex, 4, 10)
        l.salud = 1
        l.movimientos[0].pp = 0
        curar(l)
        expect(l.salud).toBe(l.saludMax)
        expect(l.movimientos[0].pp).toBe(l.movimientos[0].ppMax)
    })
})

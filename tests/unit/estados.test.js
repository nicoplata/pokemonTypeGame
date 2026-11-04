import { describe, expect, it } from 'vitest'
import { calcularDanio, actuaPrimero, resolverTurno } from '../../src/motor/combate.js'
import { cambiar, crearCombate } from '../../src/motor/equipos.js'
import {
    aplicarCambios, aplicarEstado, danioDeFinDeTurno, estadisticaEfectiva, intentarMoverse, multiplicadorEtapa,
    multiplicadorPrecision
} from '../../src/motor/estados.js'
import { curar } from '../../src/motor/experiencia.js'
import { crearLuchador } from '../../src/motor/luchador.js'
import { construirPasos } from '../../src/motor/mensajes.js'
import { idMovimiento, pokedex, secuencia } from './ayudas.js'

const luchador = (id, lado = 'jugador', nivel = 20) => ({ ...crearLuchador(pokedex, id, nivel), lado })
const mov = (clave) => pokedex.movimiento(idMovimiento(clave))
// Le enseña un movimiento en la primera ranura y devuelve el índice.
const ensenar = (l, clave) => {
    const m = mov(clave)
    l.movimientos[0] = { id: m.id, pp: m.pp, ppMax: m.pp }
    return 0
}

describe('etapas de estadísticas', () => {
    it('multiplican como en los juegos', () => {
        expect(multiplicadorEtapa(0)).toBe(1)
        expect(multiplicadorEtapa(2)).toBe(2)
        expect(multiplicadorEtapa(-1)).toBeCloseTo(2 / 3)
        expect(multiplicadorEtapa(6)).toBe(4)
        expect(multiplicadorEtapa(-6)).toBe(0.25)
        expect(multiplicadorEtapa(1, 3)).toBeCloseTo(4 / 3)
    })
    it('se limitan entre -6 y +6 y avisan cuando no cambian', () => {
        const l = luchador(4)
        expect(aplicarCambios(l, [['atk', 4]])[0]).toMatchObject({ cambio: 4 })
        expect(aplicarCambios(l, [['atk', 4]])[0]).toMatchObject({ cambio: 2, pedido: 4 })
        expect(aplicarCambios(l, [['atk', 1]])[0]).toMatchObject({ cambio: 0, pedido: 1 })
        expect(l.etapas.atk).toBe(6)
    })
    it('afectan el daño, la velocidad y la precisión', () => {
        const a = luchador(4)
        const d = luchador(152, 'rival')
        const antes = calcularDanio(a, d, mov('scratch'), secuencia(0.99, 0.999)).danio
        aplicarCambios(a, [['atk', 2]])
        expect(calcularDanio(a, d, mov('scratch'), secuencia(0.99, 0.999)).danio).toBeGreaterThan(antes * 1.7)
        aplicarCambios(a, [['spe', -6]])
        expect(estadisticaEfectiva(a, 'spe')).toBe(Math.floor(a.stats.spe / 4))
        aplicarCambios(d, [['evasion', 1]])
        expect(multiplicadorPrecision(a, d)).toBeCloseTo(3 / 4)
    })
    it('el crítico ignora la defensa aumentada del rival', () => {
        const a = luchador(4)
        const d = luchador(152, 'rival')
        const normal = calcularDanio(a, d, mov('scratch'), secuencia(0, 0.999)).danio
        aplicarCambios(d, [['def', 6]])
        expect(calcularDanio(a, d, mov('scratch'), secuencia(0, 0.999)).danio).toBe(normal)
    })
    it('se reinician al salir del campo, pero el estado se mantiene', () => {
        const c = crearCombate([luchador(4), luchador(7)], [luchador(152)])
        aplicarCambios(c.jugador.equipo[0], [['atk', 2]])
        aplicarEstado(c.jugador.equipo[0], 'poison')
        cambiar(c, 'jugador', 1)
        expect(c.jugador.equipo[0].etapas.atk).toBe(0)
        expect(c.jugador.equipo[0].estado).toBe('poison')
    })
})

describe('estados alterados', () => {
    it('respetan las inmunidades por tipo y no se acumulan', () => {
        expect(aplicarEstado(luchador(4), 'burn')).toBe(null) // Fuego no se quema
        expect(aplicarEstado(luchador(25), 'paralysis')).toBe(null) // Eléctrico
        expect(aplicarEstado(luchador(1), 'poison')).toBe(null) // Veneno
        const l = luchador(7)
        expect(aplicarEstado(l, 'burn')).toMatchObject({ tipo: 'estado', estado: 'burn' })
        expect(aplicarEstado(l, 'poison')).toBe(null)
    })
    it('dormido: no actúa de 1 a 3 turnos y después se despierta', () => {
        const l = luchador(7)
        aplicarEstado(l, 'sleep', secuencia(0.99)) // 3 turnos
        expect(l.turnosSueno).toBe(3)
        for (let i = 0; i < 3; i++) expect(intentarMoverse(l).puede).toBe(false)
        const despierta = intentarMoverse(l)
        expect(despierta.puede).toBe(true)
        expect(despierta.eventos[0].tipo).toBe('despierta')
        expect(l.estado).toBe(null)
    })
    it('paralizado: a veces no se mueve y es más lento', () => {
        const l = luchador(7)
        const velocidad = estadisticaEfectiva(l, 'spe')
        aplicarEstado(l, 'paralysis')
        expect(estadisticaEfectiva(l, 'spe')).toBe(Math.floor(velocidad / 2))
        expect(intentarMoverse(l, secuencia(0.1)).puede).toBe(false)
        expect(intentarMoverse(l, secuencia(0.5)).puede).toBe(true)
    })
    it('congelado: se descongela con 20 % o con un golpe de fuego', () => {
        const l = luchador(7, 'rival')
        aplicarEstado(l, 'freeze')
        expect(intentarMoverse(l, secuencia(0.5)).puede).toBe(false)
        expect(intentarMoverse(l, secuencia(0.1)).eventos[0].tipo).toBe('descongela')
        aplicarEstado(l, 'freeze')
        const charmander = luchador(4)
        const eventos = resolverTurno(pokedex, charmander, ensenar(charmander, 'ember'), l, 0, secuencia(0.5))
        expect(eventos.some((e) => e.tipo === 'descongela')).toBe(true)
    })
    it('quemadura y veneno restan salud al final del turno', () => {
        const quemado = luchador(7)
        aplicarEstado(quemado, 'burn')
        expect(danioDeFinDeTurno(quemado)[0]).toMatchObject({ tipo: 'danioEstado', cantidad: Math.floor(quemado.saludMax / 16) })
        const envenenado = luchador(7)
        aplicarEstado(envenenado, 'poison')
        expect(danioDeFinDeTurno(envenenado)[0].cantidad).toBe(Math.floor(envenenado.saludMax / 8))
        envenenado.salud = 1
        expect(danioDeFinDeTurno(envenenado).map((e) => e.tipo)).toEqual(['danioEstado', 'debilitado'])
    })
    it('la quemadura reduce a la mitad el daño físico', () => {
        const a = luchador(7)
        const d = luchador(152, 'rival')
        const normal = calcularDanio(a, d, mov('tackle'), secuencia(0.99, 0.999)).danio
        aplicarEstado(a, 'burn')
        expect(calcularDanio(a, d, mov('tackle'), secuencia(0.99, 0.999)).danio).toBe(Math.floor(normal / 2))
    })
    it('curar quita estados y etapas', () => {
        const l = luchador(7)
        aplicarEstado(l, 'sleep')
        aplicarCambios(l, [['def', -2]])
        curar(l)
        expect(l.estado).toBe(null)
        expect(l.etapas.def).toBe(0)
    })
})

describe('movimientos de estado y efectos secundarios', () => {
    it('Onda Trueno paraliza y falla si ya tiene un estado', () => {
        const j = luchador(25)
        const r = luchador(7, 'rival')
        const eventos = resolverTurno(pokedex, j, ensenar(j, 'thunder-wave'), r, 0, secuencia(0.5))
        expect(eventos).toContainEqual(expect.objectContaining({ tipo: 'estado', lado: 'rival', estado: 'paralysis' }))
        const otra = resolverTurno(pokedex, j, 0, r, 0, secuencia(0.5))
        expect(otra.find((e) => e.lado === 'jugador' && e.tipo === 'falla')).toBeDefined()
    })
    it('Onda Trueno no afecta a los de tipo Tierra', () => {
        const j = luchador(25)
        const r = luchador(50, 'rival') // Diglett
        const eventos = resolverTurno(pokedex, j, ensenar(j, 'thunder-wave'), r, 0, secuencia(0.5))
        expect(eventos).toContainEqual(expect.objectContaining({ tipo: 'sinEfecto', lado: 'rival' }))
    })
    it('Gruñido baja el ataque del rival y Danza Espada sube el propio', () => {
        const j = luchador(4)
        const r = luchador(7, 'rival')
        resolverTurno(pokedex, j, ensenar(j, 'growl'), r, 0, secuencia(0.5))
        expect(r.etapas.atk).toBe(-1)
        resolverTurno(pokedex, j, ensenar(j, 'swords-dance'), r, 0, secuencia(0.5))
        expect(j.etapas.atk).toBe(2)
    })
    it('Recuperación cura la mitad y falla con la salud llena', () => {
        const j = luchador(137) // Porygon
        const r = luchador(79, 'rival') // Slowpoke, más lento
        const indice = ensenar(j, 'recover')
        expect(resolverTurno(pokedex, j, indice, r, 0, secuencia(0.5)).find((e) => e.lado === 'jugador' && e.tipo === 'falla')).toBeDefined()
        j.salud = 1
        const eventos = resolverTurno(pokedex, j, indice, r, 0, secuencia(0.99))
        expect(eventos.find((e) => e.tipo === 'curacion')).toMatchObject({ cantidad: Math.floor(j.saludMax / 2) })
    })
    it('Absorber recupera la mitad del daño y Doble Filo causa retroceso', () => {
        const j = luchador(1)
        const r = luchador(7, 'rival')
        j.salud = 1
        const absorber = resolverTurno(pokedex, j, ensenar(j, 'absorb'), r, 0, secuencia(0.99))
        const danio = absorber.find((e) => e.tipo === 'danio' && e.lado === 'rival').cantidad
        expect(absorber.find((e) => e.tipo === 'drenaje')).toMatchObject({ cantidad: Math.max(1, Math.floor(danio / 2)) })

        const t = luchador(128) // Tauros
        const doble = resolverTurno(pokedex, t, ensenar(t, 'double-edge'), luchador(7, 'rival'), 0, secuencia(0.99))
        const golpe = doble.find((e) => e.tipo === 'danio' && e.lado === 'rival').cantidad
        expect(doble.find((e) => e.tipo === 'retroceso' && e.lado === 'jugador').cantidad).toBe(Math.max(1, Math.floor((golpe * 33) / 100)))
    })
    it('Ascuas puede quemar (10 %)', () => {
        const j = luchador(4)
        const indice = ensenar(j, 'ember')
        const sinSuerte = resolverTurno(pokedex, j, indice, luchador(7, 'rival'), 0, secuencia(0.5))
        expect(sinSuerte.some((e) => e.tipo === 'estado')).toBe(false)
        const conSuerte = resolverTurno(pokedex, j, indice, luchador(7, 'rival'), 0, secuencia(0.05))
        expect(conSuerte.some((e) => e.tipo === 'estado' && e.estado === 'burn')).toBe(true)
    })
    it('Mordisco puede hacer retroceder al rival si golpea primero', () => {
        const j = luchador(19) // Rattata, rápido
        const r = luchador(7, 'rival')
        const eventos = resolverTurno(pokedex, j, ensenar(j, 'bite'), r, 0, secuencia(0.01))
        expect(eventos).toContainEqual(expect.objectContaining({ tipo: 'impedido', lado: 'rival', motivo: 'miedo' }))
        expect(r.amedrentado).toBe(false)
    })
    it('la parálisis hace más lento al Pokémon en el orden del turno', () => {
        const rapido = luchador(25) // Pikachu
        const lento = luchador(7, 'rival')
        expect(actuaPrimero(rapido, mov('tackle'), lento, mov('tackle'))).toBe(true)
        rapido.estado = 'paralysis'
        rapido.stats.spe = lento.stats.spe + 1
        expect(actuaPrimero(rapido, mov('tackle'), lento, mov('tackle'))).toBe(false)
    })
})

describe('mensajes de estados', () => {
    const j = { lado: 'jugador', nombre: 'PIKACHU' }
    const r = { lado: 'rival', nombre: 'SQUIRTLE' }
    it('describen estados, impedimentos y cambios de etapa', () => {
        const pasos = construirPasos([
            { tipo: 'usa', ...j, movimiento: 'Onda Trueno' },
            { tipo: 'estado', ...r, estado: 'paralysis' },
            { tipo: 'impedido', ...r, motivo: 'paralysis' },
            { tipo: 'usa', ...j, movimiento: 'Gruñido' },
            { tipo: 'etapa', ...r, stat: 'atk', cambio: -1, pedido: -1 },
            { tipo: 'usa', ...j, movimiento: 'Danza Espada' },
            { tipo: 'etapa', ...j, stat: 'atk', cambio: 0, pedido: 2 },
            { tipo: 'danioEstado', ...r, estado: 'poison', cantidad: 3, salud: 10, saludMax: 30 },
            { tipo: 'despierta', ...j },
            { tipo: 'impedido', ...r, motivo: 'miedo' }
        ])
        expect(pasos.map((p) => p.texto)).toEqual([
            'PIKACHU usó ONDA TRUENO. ¡SQUIRTLE rival está paralizado! Quizás no pueda moverse.',
            '¡SQUIRTLE rival está paralizado! No se puede mover.',
            'PIKACHU usó GRUÑIDO. ¡El ataque de SQUIRTLE rival bajó!',
            'PIKACHU usó DANZA ESPADA. ¡El ataque de PIKACHU no puede subir más!',
            'El veneno le resta salud a SQUIRTLE rival.',
            '¡PIKACHU se despertó!',
            '¡SQUIRTLE rival retrocedió y no pudo moverse!'
        ])
    })
    it('gradúan la intensidad del cambio', () => {
        const pasos = construirPasos([
            { tipo: 'etapa', ...j, stat: 'atk', cambio: 2, pedido: 2 },
            { tipo: 'etapa', ...r, stat: 'spe', cambio: -2, pedido: -2 },
            { tipo: 'etapa', ...j, stat: 'def', cambio: 3, pedido: 3 },
            { tipo: 'etapa', ...r, stat: 'precision', cambio: 0, pedido: -1 }
        ])
        expect(pasos[0].texto).toBe('¡El ataque de PIKACHU subió mucho! ¡La velocidad de SQUIRTLE rival bajó mucho! ' +
            '¡La defensa de PIKACHU subió muchísimo! ¡La precisión de SQUIRTLE rival no puede bajar más!')
    })
})

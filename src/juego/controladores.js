// Quién decide las acciones de cada lado del combate.

import { spritePokemon } from '../datos/juego.js'
import { TEXTOS } from '../datos/textos.js'
import { FORCEJEO, danioFijo, efectividad, movimientosDisponibles } from '../motor/combate.js'
import { activo, disponiblesParaCambio, elegirAccionIA, elegirReemplazoIA, otroLado } from '../motor/equipos.js'
import { decir, decirEntrenador } from '../ui/dialogo.js'
import { nombreTipo } from '../ui/fichas.js'

export function crearControladorIA (pokedex, { azar = Math.random, aleatoriedad = 0.2 } = {}) {
    return {
        elegirAccion: async (combate, lado) => elegirAccionIA(pokedex, combate, lado, azar, aleatoriedad),
        elegirReemplazo: async (combate, lado) => elegirReemplazoIA(pokedex, combate, lado)
    }
}

const FRACCIONES = { 0.25: '¼', 0.5: '½' }

// Insignia con la eficacia del movimiento contra el Pokémon de enfrente.
export function insigniaDeEficacia (mov, enfrente, atacante = null) {
    if (!enfrente || mov.clase === 'estado') return null
    const multiplicador = efectividad(mov.tipo, enfrente.tipos)
    if (multiplicador === 0) return { texto: 'x0', clase: 'nulo', titulo: 'No le afecta' }
    // El daño fijo no depende de la eficacia (solo de la inmunidad).
    if (atacante && danioFijo(atacante, enfrente, mov) !== null) return null
    if (multiplicador > 1) return { texto: `x${multiplicador}`, clase: 'super', titulo: 'Súper eficaz' }
    if (multiplicador < 1) return { texto: `x${FRACCIONES[multiplicador] ?? multiplicador}`, clase: 'poco', titulo: 'No es muy eficaz' }
    return null
}

function opcionesMovimientos (pokedex, luchador, enfrente) {
    if (movimientosDisponibles(luchador).length === 0) {
        return [{ texto: 'FORCEJEO', detalle: 'SIN PP', clase: 'movimiento tipo-normal', valor: FORCEJEO }]
    }
    return luchador.movimientos.map((m, indice) => {
        const mov = pokedex.movimiento(m.id)
        const precision = mov.precision ? `precisión ${mov.precision}%` : 'nunca falla'
        const deEstado = mov.clase === 'estado'
        const descripcion = deEstado
            ? `De estado · ${precision}`
            : `${mov.potencia ? `Potencia ${mov.potencia}` : 'Daño fijo'} · ${precision} · ${mov.clase === 'fisico' ? 'físico' : 'especial'}`
        return {
            texto: mov.nombre.toUpperCase(),
            detalle: `${nombreTipo(mov.tipo)} ${m.pp}/${m.ppMax}`,
            extra: deEstado
                ? 'ESTADO'
                : `POT ${mov.potencia ?? '-'} · ${mov.precision ? `${mov.precision}%` : 'NO FALLA'}`,
            insignia: insigniaDeEficacia(mov, enfrente, luchador),
            titulo: descripcion,
            clase: `movimiento tipo-${mov.tipo}${deEstado ? ' deEstado' : ' deDanio'}`,
            deshabilitado: m.pp <= 0,
            valor: indice
        }
    })
}

function opcionesEquipo (combate, lado) {
    return disponiblesParaCambio(combate, lado).map((indice) => {
        const luchador = combate[lado].equipo[indice]
        return {
            imagen: spritePokemon(luchador.id),
            texto: luchador.nombre,
            detalle: `${luchador.salud}/${luchador.saludMax}`,
            clase: 'companero',
            valor: indice
        }
    })
}

// Opciones para el modo de dos jugadores:
//   prefijo: se antepone a las preguntas (el nombre de quien juega).
//   privado: antes de cada elección pide pasar el dispositivo, para que
//            la otra persona no vea qué se elige.
//   silencioso: no anuncia la elección en el globo del entrenador.
export function crearControladorHumano (pokedex, { prefijo = '', privado = false, silencioso = false } = {}) {
    let primerTurno = true
    const preguntar = (texto, opciones) => decir(prefijo ? `${prefijo}: ${texto}` : texto, opciones)
    const anunciar = (texto) => { if (!silencioso) decirEntrenador(texto) }
    const pasarDispositivo = async () => {
        if (privado) await decir(TEXTOS.pasarDispositivo(prefijo), [{ texto: 'LISTO', detalle: prefijo, valor: true }])
    }

    async function elegirAccion (combate, lado) {
        await pasarDispositivo()
        const yo = activo(combate, lado)
        for (;;) {
            const companeros = disponiblesParaCambio(combate, lado)
            const opciones = [
                ...opcionesMovimientos(pokedex, yo, activo(combate, otroLado(lado))),
                { texto: 'EQUIPO', detalle: 'CAMBIAR', clase: 'accionEquipo', deshabilitado: companeros.length === 0, valor: 'equipo' }
            ]
            const eleccion = await preguntar(primerTurno ? TEXTOS.primerAtaque : TEXTOS.siguienteAtaque, opciones)

            if (eleccion === 'equipo') {
                const indice = await preguntar(TEXTOS.elegirCambio, [
                    ...opcionesEquipo(combate, lado),
                    { texto: 'VOLVER', clase: 'accionEquipo', valor: 'volver' }
                ])
                if (indice === 'volver') continue
                primerTurno = false
                anunciar(`¡Vuelve, ${yo.nombre}!`)
                return { tipo: 'cambio', indice }
            }

            primerTurno = false
            const nombre = eleccion === FORCEJEO ? 'FORCEJEO' : pokedex.movimiento(yo.movimientos[eleccion].id).nombre.toUpperCase()
            anunciar(`¡${yo.nombre}, usa ${nombre}!`)
            return { tipo: 'movimiento', eleccion }
        }
    }

    async function elegirReemplazo (combate, lado) {
        await pasarDispositivo()
        return preguntar(TEXTOS.elegirReemplazo, opcionesEquipo(combate, lado))
    }

    return { elegirAccion, elegirReemplazo }
}

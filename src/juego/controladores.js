// Quién decide las acciones de cada lado del combate.

import { spritePokemon } from '../datos/juego.js'
import { TEXTOS } from '../datos/textos.js'
import { FORCEJEO, movimientosDisponibles } from '../motor/combate.js'
import { activo, disponiblesParaCambio, elegirAccionIA, elegirReemplazoIA } from '../motor/equipos.js'
import { decir, decirEntrenador } from '../ui/dialogo.js'
import { nombreTipo } from '../ui/fichas.js'

export function crearControladorIA (pokedex, azar = Math.random) {
    return {
        elegirAccion: async (combate, lado) => elegirAccionIA(pokedex, combate, lado, azar),
        elegirReemplazo: async (combate, lado) => elegirReemplazoIA(pokedex, combate, lado)
    }
}

function opcionesMovimientos (pokedex, luchador) {
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

// `prefijo` se antepone a las preguntas (por ejemplo, el nombre de quien
// juega en el modo de dos jugadores).
export function crearControladorHumano (pokedex, { prefijo = '' } = {}) {
    let primerTurno = true
    const preguntar = (texto, opciones) => decir(prefijo ? `${prefijo}: ${texto}` : texto, opciones)

    async function elegirAccion (combate, lado) {
        const yo = activo(combate, lado)
        for (;;) {
            const companeros = disponiblesParaCambio(combate, lado)
            const opciones = [
                ...opcionesMovimientos(pokedex, yo),
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
                decirEntrenador(`¡Vuelve, ${yo.nombre}!`)
                return { tipo: 'cambio', indice }
            }

            primerTurno = false
            const nombre = eleccion === FORCEJEO ? 'FORCEJEO' : pokedex.movimiento(yo.movimientos[eleccion].id).nombre.toUpperCase()
            decirEntrenador(`¡${yo.nombre}, usa ${nombre}!`)
            return { tipo: 'movimiento', eleccion }
        }
    }

    async function elegirReemplazo (combate, lado) {
        return preguntar(TEXTOS.elegirReemplazo, opcionesEquipo(combate, lado))
    }

    return { elegirAccion, elegirReemplazo }
}

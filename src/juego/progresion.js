// Experiencia, movimientos nuevos y evolución, mostrados en pantalla.

import { TEXTOS } from '../datos/textos.js'
import { activo } from '../motor/equipos.js'
import {
    aprenderMovimiento, conoceCuatro, evolucionPendiente, evolucionar, expOtorgada, ganarExperiencia, repartirExperiencia
} from '../motor/experiencia.js'
import { decir } from '../ui/dialogo.js'
import { animarEntrada, animarSubidaDeNivel, ponerEnEscena } from '../ui/escena.js'
import { actualizarExperiencia, mostrarFicha, nombreTipo } from '../ui/fichas.js'

const nombreMovimiento = (pokedex, id) => pokedex.movimiento(id).nombre.toUpperCase()

async function preguntarAprender (pokedex, luchador, idMovimiento) {
    const nuevo = nombreMovimiento(pokedex, idMovimiento)
    if (!conoceCuatro(luchador)) {
        aprenderMovimiento(pokedex, luchador, idMovimiento)
        await decir(TEXTOS.aprendio(luchador.nombre, nuevo))
        return
    }
    const opciones = luchador.movimientos.map((m, indice) => {
        const mov = pokedex.movimiento(m.id)
        return { texto: mov.nombre.toUpperCase(), detalle: nombreTipo(mov.tipo), clase: `movimiento tipo-${mov.tipo}`, valor: indice }
    })
    const mov = pokedex.movimiento(idMovimiento)
    opciones.push({ texto: `NO APRENDER ${nuevo}`, detalle: nombreTipo(mov.tipo), clase: 'accionEquipo', valor: null })
    const indice = await decir(TEXTOS.quiereAprender(luchador.nombre, nuevo), opciones)
    if (indice === null) {
        await decir(TEXTOS.noAprendio(luchador.nombre, nuevo))
        return
    }
    const olvidado = aprenderMovimiento(pokedex, luchador, idMovimiento, indice)
    await decir(TEXTOS.olvido(luchador.nombre, nombreMovimiento(pokedex, olvidado), nuevo))
}

// Reparte la experiencia por el Pokémon rival que acaba de caer.
export function crearRepartoDeExperiencia (pokedex, cardJugador) {
    return async function alDebilitarse (combate, lado) {
        if (lado !== 'rival') return
        const cantidad = expOtorgada(pokedex, activo(combate, 'rival'))
        for (const { indice, cantidad: parte } of repartirExperiencia(combate.jugador.equipo, combate.jugador.activo, cantidad)) {
            const luchador = combate.jugador.equipo[indice]
            const enCampo = indice === combate.jugador.activo
            for (const evento of ganarExperiencia(pokedex, luchador, parte)) {
                if (evento.tipo === 'experiencia') {
                    if (enCampo) actualizarExperiencia(cardJugador, luchador)
                    await decir(TEXTOS.expGanada(luchador.nombre, evento.cantidad))
                } else if (evento.tipo === 'subeNivel') {
                    if (enCampo) {
                        mostrarFicha(cardJugador, luchador)
                        ponerEnEscena('jugador', luchador)
                        await animarSubidaDeNivel('jugador')
                    }
                    await decir(TEXTOS.subeNivel(luchador.nombre, evento.nivel))
                } else if (evento.tipo === 'puedeAprender') {
                    await preguntarAprender(pokedex, luchador, evento.movimiento)
                }
            }
        }
    }
}

// Al terminar el combate, evolucionan los que llegaron al nivel (se puede detener).
export async function procesarEvoluciones (pokedex, equipo, card) {
    for (const luchador of equipo) {
        if (!evolucionPendiente(pokedex, luchador)) continue
        mostrarFicha(card, luchador)
        ponerEnEscena('jugador', { ...luchador, salud: luchador.salud || luchador.saludMax })
        const nombre = luchador.nombre
        const seguir = await decir(TEXTOS.evolucionando(nombre), [
            { texto: '¡ADELANTE!', detalle: 'EVOLUCIONAR', valor: true },
            { texto: 'DETENER', detalle: 'NO EVOLUCIONAR', valor: false }
        ])
        if (!seguir) {
            await decir(TEXTOS.evolucionDetenida(nombre))
            continue
        }
        await animarSubidaDeNivel('jugador')
        const evento = evolucionar(pokedex, luchador)
        mostrarFicha(card, luchador)
        ponerEnEscena('jugador', { ...luchador, salud: luchador.salud || luchador.saludMax })
        await animarEntrada('jugador')
        await decir(TEXTOS.evoluciono(evento.nombre, evento.nuevoNombre))
    }
}

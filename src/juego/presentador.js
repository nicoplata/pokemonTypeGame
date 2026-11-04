// Muestra el combate en pantalla: escena, fichas, indicador de equipo y mensajes.

import { activo } from '../motor/equipos.js'
import { construirPasos } from '../motor/mensajes.js'
import { decir } from '../ui/dialogo.js'
import {
    actualizarSaludEscena, animarAtaque, animarDebilitado, animarEntrada, animarGolpe, animarSinEfecto,
    mostrarEscena, ponerEnEscena
} from '../ui/escena.js'
import { actualizarSalud, mostrarEquipo, mostrarFicha } from '../ui/fichas.js'
import { reproducir } from '../ui/sonido.js'

function sonidoDeGolpe ({ multiplicador = 1, criticos = 0 }) {
    if (criticos) return 'critico'
    if (multiplicador > 1) return 'superEficaz'
    if (multiplicador < 1) return 'poco'
    return 'golpe'
}

// `cards` = { jugador, rival }; `ocultarEquipo` = { rival: true } oculta
// qué Pokémon tiene ese lado hasta que los envía.
export function crearPresentador (cards, { ocultarEquipo = {} } = {}) {
    function mostrarEquipoDe (combate, lado) {
        mostrarEquipo(cards[lado], combate[lado].equipo, combate[lado].activo, { ocultar: ocultarEquipo[lado] })
    }

    function mostrarLado (combate, lado) {
        const luchador = activo(combate, lado)
        mostrarEscena()
        ponerEnEscena(lado, luchador)
        mostrarFicha(cards[lado], luchador)
        mostrarEquipoDe(combate, lado)
    }

    function actualizarSaludDe (lado, salud, saludMax) {
        actualizarSalud(cards[lado], salud, saludMax)
        actualizarSaludEscena(lado, salud, saludMax)
    }

    async function aplicarEvento (combate, evento) {
        switch (evento.tipo) {
            case 'usa':
                reproducir('ataque')
                await animarAtaque(evento.lado)
                break
            case 'danio':
                actualizarSaludDe(evento.lado, evento.salud, evento.saludMax)
                if (evento.cantidad > 0) {
                    reproducir(sonidoDeGolpe(evento))
                    await animarGolpe(evento.lado, evento)
                }
                break
            case 'retroceso':
                actualizarSaludDe(evento.lado, evento.salud, evento.saludMax)
                reproducir('golpe')
                await animarGolpe(evento.lado, evento)
                break
            case 'sinEfecto':
                reproducir('sinEfecto')
                await animarSinEfecto(evento.lado)
                break
            case 'cambio': {
                const entra = combate[evento.lado].equipo[evento.indice]
                mostrarFicha(cards[evento.lado], entra)
                ponerEnEscena(evento.lado, entra)
                actualizarSaludDe(evento.lado, evento.salud, evento.saludMax)
                mostrarEquipoDe(combate, evento.lado)
                reproducir('cambio')
                await animarEntrada(evento.lado)
                break
            }
            case 'debilitado':
                mostrarEquipoDe(combate, evento.lado)
                reproducir('debilitado')
                await animarDebilitado(evento.lado)
                break
            default:
                break
        }
    }

    async function mostrarEventos (combate, eventos) {
        for (const paso of construirPasos(eventos)) {
            for (const evento of paso.eventos) await aplicarEvento(combate, evento)
            await decir(paso.texto)
        }
    }

    return { mostrarLado, mostrarEventos }
}

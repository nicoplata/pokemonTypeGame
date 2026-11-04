// Muestra el combate en pantalla: fichas, indicador de equipo y mensajes.

import { activo } from '../motor/equipos.js'
import { construirPasos } from '../motor/mensajes.js'
import { decir } from '../ui/dialogo.js'
import { actualizarSalud, animarGolpe, mostrarEquipo, mostrarFicha } from '../ui/fichas.js'

// `cards` = { jugador, rival }; `ocultarEquipo` = { rival: true } oculta
// qué Pokémon tiene ese lado hasta que los envía.
export function crearPresentador (cards, { ocultarEquipo = {} } = {}) {
    function mostrarEquipoDe (combate, lado) {
        mostrarEquipo(cards[lado], combate[lado].equipo, combate[lado].activo, { ocultar: ocultarEquipo[lado] })
    }

    function mostrarLado (combate, lado) {
        mostrarFicha(cards[lado], activo(combate, lado))
        mostrarEquipoDe(combate, lado)
    }

    function aplicarEvento (combate, evento) {
        const card = cards[evento.lado]
        switch (evento.tipo) {
            case 'danio':
            case 'retroceso':
                actualizarSalud(card, evento.salud, evento.saludMax)
                if (evento.cantidad > 0) animarGolpe(card)
                break
            case 'cambio': {
                const entra = combate[evento.lado].equipo[evento.indice]
                mostrarFicha(card, entra)
                actualizarSalud(card, evento.salud, evento.saludMax)
                mostrarEquipoDe(combate, evento.lado)
                break
            }
            case 'debilitado':
                mostrarEquipoDe(combate, evento.lado)
                break
            default:
                break
        }
    }

    async function mostrarEventos (combate, eventos) {
        for (const paso of construirPasos(eventos)) {
            for (const evento of paso.eventos) aplicarEvento(combate, evento)
            await decir(paso.texto)
        }
    }

    return { mostrarLado, mostrarEventos }
}

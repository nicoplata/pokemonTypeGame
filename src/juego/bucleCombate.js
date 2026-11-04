// Bucle de un combate entre equipos. Cada lado tiene un "controlador" que
// decide sus acciones: una persona (con botones) o la IA.

import { LADOS, cambiar, ganador, necesitaReemplazo, resolverTurnoEquipos } from '../motor/equipos.js'

// Devuelve el lado ganador ('jugador' o 'rival'). `alDebilitarse(combate,
// lado)` se llama cuando cae el Pokémon en el campo de ese lado, antes de
// reemplazarlo (por ejemplo, para repartir experiencia).
export async function jugarCombate ({ pokedex, combate, controladores, presentador, alDebilitarse, azar = Math.random }) {
    for (const lado of LADOS) presentador.mostrarLado(combate, lado)

    while (!ganador(combate)) {
        const acciones = {}
        for (const lado of LADOS) acciones[lado] = await controladores[lado].elegirAccion(combate, lado)

        const eventos = resolverTurnoEquipos(pokedex, combate, acciones, azar)
        await presentador.mostrarEventos(combate, eventos)
        if (alDebilitarse) {
            for (const evento of eventos.filter((e) => e.tipo === 'debilitado')) await alDebilitarse(combate, evento.lado)
        }
        if (ganador(combate)) break

        // Primero reemplaza el rival, así quien juega sabe contra quién elige.
        for (const lado of ['rival', 'jugador']) {
            if (!necesitaReemplazo(combate, lado)) continue
            const indice = await controladores[lado].elegirReemplazo(combate, lado)
            await presentador.mostrarEventos(combate, [cambiar(combate, lado, indice)])
        }
    }
    return ganador(combate)
}

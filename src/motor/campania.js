// Reglas del modo campaña.

import { evolucionarPorNivel } from './experiencia.js'

// Nivel del equipo de un entrenador: su mínimo, o el promedio del equipo
// del jugador más su dificultad, lo que sea mayor (máximo 100).
export function nivelEntrenador (entrenador, nivelPromedioJugador) {
    return Math.min(100, Math.max(entrenador.nivelMinimo, nivelPromedioJugador + entrenador.dificultad))
}

// Ids de especie del equipo del entrenador, evolucionados según el nivel.
export function especiesEntrenador (pokedex, entrenador, nivel) {
    return entrenador.equipo.map((id) => evolucionarPorNivel(pokedex, id, nivel))
}

// Probabilidad de que el entrenador elija un movimiento al azar.
export const aleatoriedad = (entrenador) => Math.max(0, 0.4 * (1 - entrenador.astucia))

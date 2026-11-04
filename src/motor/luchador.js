// Crea un Pokémon listo para combatir.

import { calcularEstadisticas } from './estadisticas.js'
import { movimientosAlNivel } from './pokedex.js'

export function crearLuchador (pokedex, idEspecie, nivel) {
    const especie = pokedex.especie(idEspecie)
    const stats = calcularEstadisticas(especie.base, nivel)
    return {
        id: especie.id,
        nombre: especie.nombre.toUpperCase(),
        tipos: especie.tipos,
        nivel,
        stats,
        saludMax: stats.hp,
        salud: stats.hp,
        movimientos: movimientosAlNivel(pokedex, especie, nivel).map((id) => {
            const mov = pokedex.movimiento(id)
            return { id, pp: mov.pp, ppMax: mov.pp }
        })
    }
}

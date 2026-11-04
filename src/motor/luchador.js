// Crea un Pokémon listo para combatir.

import { movimientosAlNivel } from './pokedex.js'

const MULTIPLICADOR_SALUD = 2

export function crearLuchador (pokedex, idEspecie, nivel) {
    const especie = pokedex.especie(idEspecie)
    const saludMax = especie.base.hp * MULTIPLICADOR_SALUD
    return {
        id: especie.id,
        nombre: especie.nombre.toUpperCase(),
        tipos: especie.tipos,
        nivel,
        stats: { ...especie.base },
        saludMax,
        salud: saludMax,
        movimientos: movimientosAlNivel(pokedex, especie, nivel).map((id) => {
            const mov = pokedex.movimiento(id)
            return { id, pp: mov.pp, ppMax: mov.pp }
        })
    }
}

// Crea un Pokémon listo para combatir.

import { calcularEstadisticas } from './estadisticas.js'
import { etapasIniciales } from './estados.js'
import { expParaNivel, nivelPorExp } from './experiencia.js'
import { esMovimientoDeDanio, movimientoSoportado, movimientosAlNivel } from './pokedex.js'

// `guardado` (opcional) = { exp, movimientos: [ids] } para recrear un
// Pokémon del equipo guardado.
export function crearLuchador (pokedex, idEspecie, nivel, guardado = {}) {
    const especie = pokedex.especie(idEspecie)
    const exp = Number.isFinite(guardado.exp) ? guardado.exp : expParaNivel(especie.crecimiento, nivel)
    const nivelReal = Number.isFinite(guardado.exp) ? nivelPorExp(especie.crecimiento, exp) : nivel
    const stats = calcularEstadisticas(especie.base, nivelReal)
    const idsGuardados = (guardado.movimientos ?? []).filter((id) => {
        try { return movimientoSoportado(pokedex.movimiento(id)) } catch { return false }
    })
    // Si lo guardado no sirve (o no tiene ningún movimiento de daño), usa los de su nivel.
    const guardadoValido = idsGuardados.some((id) => esMovimientoDeDanio(pokedex.movimiento(id)))
    const ids = guardadoValido ? idsGuardados.slice(0, 4) : movimientosAlNivel(pokedex, especie, nivelReal)
    return {
        id: especie.id,
        nombre: especie.nombre.toUpperCase(),
        tipos: especie.tipos,
        nivel: nivelReal,
        exp,
        crecimiento: especie.crecimiento,
        stats,
        saludMax: stats.hp,
        salud: stats.hp,
        estado: null,
        turnosSueno: 0,
        etapas: etapasIniciales(),
        movimientos: ids.map((id) => {
            const mov = pokedex.movimiento(id)
            return { id, pp: mov.pp, ppMax: mov.pp }
        })
    }
}

// Lo mínimo para guardar un Pokémon del equipo y recrearlo después.
export const resumirLuchador = (luchador) => ({ id: luchador.id, exp: luchador.exp, movimientos: luchador.movimientos.map((m) => m.id) })

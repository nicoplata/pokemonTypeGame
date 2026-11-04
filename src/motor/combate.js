// Lógica de combate. No toca el DOM: recibe datos y devuelve resultados,
// y el azar se inyecta (`azar`) para poder testearla.

import { ATAQUES, MULTIPLICADOR_SALUD } from '../datos/juego.js'
import { EFECTIVIDAD } from '../datos/tipos.js'

export function crearLuchador (datos) {
    const saludMax = datos.saludBase * MULTIPLICADOR_SALUD
    const pp = {}
    for (const [clave, ataque] of Object.entries(ATAQUES)) pp[clave] = ataque.pp
    return { ...datos, saludMax, salud: saludMax, pp }
}

export function efectividad (tipoAtaque, tiposDefensor) {
    return tiposDefensor.reduce((total, tipo) => total * (EFECTIVIDAD[tipoAtaque]?.[tipo] ?? 1), 1)
}

export function calcularAtaque (atacante, defensor, clave, azar = Math.random) {
    const ataque = ATAQUES[clave]
    if (azar() >= ataque.precision) return { acierto: false, danio: 0, multiplicador: 1 }

    const multiplicador = ataque.usaTipo ? efectividad(atacante.tipos[0], defensor.tipos) : 1
    if (multiplicador === 0) return { acierto: true, danio: 0, multiplicador }

    const variacion = 0.85 + azar() * 0.15
    const danio = Math.max(1, Math.round(atacante.ataque * ataque.potencia * multiplicador * variacion))
    return { acierto: true, danio, multiplicador }
}

// El rival elige al azar entre los ataques que le quedan, prefiriendo el
// especial cuando es súper eficaz y evitándolo cuando no conviene.
export function eleccionRival (rival, jugador, azar = Math.random) {
    const disponibles = Object.keys(ATAQUES).filter((clave) => rival.pp[clave] > 0)
    const multiplicador = efectividad(rival.tipos[0], jugador.tipos)

    if (disponibles.includes('especial')) {
        if (multiplicador > 1 && azar() < 0.6) return 'especial'
        if (multiplicador < 1 && disponibles.length > 1) disponibles.splice(disponibles.indexOf('especial'), 1)
    }
    return disponibles[Math.floor(azar() * disponibles.length)]
}

export function jugadorAtacaPrimero (jugador, rival, azar = Math.random) {
    return jugador.velocidad > rival.velocidad ||
        (jugador.velocidad === rival.velocidad && azar() < 0.5)
}

export function nombreEnCombate (luchador, esRival) {
    return esRival ? `${luchador.nombre} rival` : luchador.nombre
}

export function mensajeAtaque (atacante, defensor, clave, resultado, esRival) {
    const quien = nombreEnCombate(atacante, esRival)
    const ataque = ATAQUES[clave].nombre
    if (!resultado.acierto) return `${quien} usó ${ataque}... ¡pero falló!`
    if (resultado.multiplicador === 0) {
        return `${quien} usó ${ataque}. No afecta a ${nombreEnCombate(defensor, !esRival)}...`
    }
    let efecto = ''
    if (resultado.multiplicador > 1) efecto = ' ¡Es súper eficaz!'
    else if (resultado.multiplicador < 1) efecto = ' No es muy eficaz...'
    return `${quien} usó ${ataque}.${efecto} Hizo ${resultado.danio} de daño.`
}

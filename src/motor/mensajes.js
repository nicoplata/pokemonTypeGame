// Convierte los eventos del combate en los pasos que muestra el profesor.
// Cada paso tiene un texto y los eventos que la interfaz aplica al mostrarlo.

export function nombreEnCombate (luchador) {
    return luchador.lado === 'rival' ? `${luchador.nombre} rival` : luchador.nombre
}

function textoEfectividad (multiplicador) {
    if (multiplicador > 1) return '¡Es súper eficaz!'
    if (multiplicador < 1) return 'No es muy eficaz...'
    return ''
}

// `luchadores` = { jugador, rival }
export function construirPasos (eventos, luchadores) {
    const nombre = (lado) => nombreEnCombate(luchadores[lado])
    const pasos = []
    let actual = null
    const agregar = (texto, evento) => {
        if (!actual) {
            actual = { texto: '', eventos: [] }
            pasos.push(actual)
        }
        if (texto) actual.texto = actual.texto ? `${actual.texto} ${texto}` : texto
        actual.eventos.push(evento)
    }

    for (const evento of eventos) {
        switch (evento.tipo) {
            case 'usa':
                actual = null
                agregar(`${nombre(evento.lado)} usó ${evento.movimiento.toUpperCase()}.`, evento)
                break
            case 'falla':
                agregar('¡Pero falló!', evento)
                break
            case 'sinEfecto':
                agregar(`No afecta a ${nombre(evento.lado)}...`, evento)
                break
            case 'danio': {
                const partes = [textoEfectividad(evento.multiplicador)]
                if (evento.golpes > 1) partes.push(`¡Golpeó ${evento.golpes} veces!`)
                partes.push(`Hizo ${evento.cantidad} de daño.`)
                agregar(partes.filter(Boolean).join(' '), evento)
                break
            }
            case 'retroceso':
                agregar(`${nombre(evento.lado)} se hizo ${evento.cantidad} de daño al forcejear.`, evento)
                break
            case 'debilitado':
                actual = null
                agregar(`¡${nombre(evento.lado)} se debilitó!`, evento)
                actual = null
                break
            default:
                throw new Error(`Evento desconocido: ${evento.tipo}`)
        }
    }
    return pasos
}

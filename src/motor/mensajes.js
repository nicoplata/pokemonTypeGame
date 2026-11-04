// Convierte los eventos del combate en los pasos que muestra el profesor.
// Cada paso tiene un texto y los eventos que la interfaz aplica al mostrarlo.

export function nombreEnCombate ({ nombre, lado }) {
    return lado === 'rival' ? `${nombre} rival` : nombre
}

function textoEfectividad (multiplicador) {
    if (multiplicador > 1) return '¡Es súper eficaz!'
    if (multiplicador < 1) return 'No es muy eficaz...'
    return ''
}

function textoCambio ({ lado, sale, nombre }) {
    if (lado === 'rival') return sale ? `El rival retiró a ${sale} y envió a ${nombre}.` : `El rival envió a ${nombre}.`
    return sale ? `¡Vuelve, ${sale}! ¡Adelante, ${nombre}!` : `¡Adelante, ${nombre}!`
}

export function construirPasos (eventos) {
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
                agregar(`${nombreEnCombate(evento)} usó ${evento.movimiento.toUpperCase()}.`, evento)
                break
            case 'falla':
                agregar('¡Pero falló!', evento)
                break
            case 'sinEfecto':
                agregar(`No afecta a ${nombreEnCombate(evento)}...`, evento)
                break
            case 'danio': {
                const partes = []
                if (evento.criticos === 1) partes.push('¡Un golpe crítico!')
                else if (evento.criticos > 1) partes.push(`¡${evento.criticos} golpes críticos!`)
                partes.push(textoEfectividad(evento.multiplicador))
                if (evento.golpes > 1) partes.push(`¡Golpeó ${evento.golpes} veces!`)
                partes.push(`Hizo ${evento.cantidad} de daño.`)
                agregar(partes.filter(Boolean).join(' '), evento)
                break
            }
            case 'retroceso':
                agregar(`${nombreEnCombate(evento)} se hizo ${evento.cantidad} de daño al forcejear.`, evento)
                break
            case 'cambio':
                actual = null
                agregar(textoCambio(evento), evento)
                actual = null
                break
            case 'debilitado':
                actual = null
                agregar(`¡${nombreEnCombate(evento)} se debilitó!`, evento)
                actual = null
                break
            default:
                throw new Error(`Evento desconocido: ${evento.tipo}`)
        }
    }
    return pasos
}

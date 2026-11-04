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

const TEXTO_ESTADO = {
    burn: (n) => `¡${n} se quemó!`,
    poison: (n) => `¡${n} fue envenenado!`,
    paralysis: (n) => `¡${n} está paralizado! Quizás no pueda moverse.`,
    sleep: (n) => `¡${n} se durmió!`,
    freeze: (n) => `¡${n} se congeló!`
}

const TEXTO_IMPEDIDO = {
    sleep: (n) => `${n} está dormido.`,
    freeze: (n) => `¡${n} está congelado!`,
    paralysis: (n) => `¡${n} está paralizado! No se puede mover.`,
    miedo: (n) => `¡${n} retrocedió y no pudo moverse!`
}

const TEXTO_FIN_DE_TURNO = {
    burn: (n) => `${n} sufre por la quemadura.`,
    poison: (n) => `El veneno le resta salud a ${n}.`
}

export const NOMBRE_ETAPA = {
    atk: 'el ataque',
    def: 'la defensa',
    spa: 'el ataque especial',
    spd: 'la defensa especial',
    spe: 'la velocidad',
    precision: 'la precisión',
    evasion: 'la evasión'
}

function textoEtapa ({ stat, cambio, pedido }, nombre) {
    const que = NOMBRE_ETAPA[stat]
    const sujeto = `${que.charAt(0).toUpperCase()}${que.slice(1)} de ${nombre}`
    if (cambio === 0) return `¡${sujeto} no puede ${pedido > 0 ? 'subir' : 'bajar'} más!`
    const verbo = cambio > 0 ? 'subió' : 'bajó'
    const intensidad = Math.abs(cambio) >= 3 ? ' muchísimo' : Math.abs(cambio) === 2 ? ' mucho' : ''
    return `¡${sujeto} ${verbo}${intensidad}!`
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
                agregar(`${nombreEnCombate(evento)} sufrió ${evento.cantidad} de daño de retroceso.`, evento)
                break
            case 'drenaje':
                agregar(`${nombreEnCombate(evento)} absorbió ${evento.cantidad} de salud.`, evento)
                break
            case 'curacion':
                agregar(`${nombreEnCombate(evento)} recuperó ${evento.cantidad} de salud.`, evento)
                break
            case 'estado':
                agregar(TEXTO_ESTADO[evento.estado](nombreEnCombate(evento)), evento)
                break
            case 'etapa':
                agregar(textoEtapa(evento, nombreEnCombate(evento)), evento)
                break
            case 'impedido':
                actual = null
                agregar(TEXTO_IMPEDIDO[evento.motivo](nombreEnCombate(evento)), evento)
                actual = null
                break
            case 'despierta':
                actual = null
                agregar(`¡${nombreEnCombate(evento)} se despertó!`, evento)
                actual = null
                break
            case 'descongela':
                agregar(`¡${nombreEnCombate(evento)} se descongeló!`, evento)
                actual = null
                break
            case 'danioEstado':
                actual = null
                agregar(TEXTO_FIN_DE_TURNO[evento.estado](nombreEnCombate(evento)), evento)
                actual = null
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

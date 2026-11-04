// Convierte los eventos del combate en los pasos que muestra el profesor.
// Cada paso tiene un texto y los eventos que la interfaz aplica al mostrarlo.

// Cómo se nombra a cada lado. En el modo de dos jugadores se usan los
// nombres de los entrenadores ("PIKACHU de NICO").
export const SUFIJOS_POR_DEFECTO = { jugador: '', rival: ' rival' }
export const ENTRENADORES_POR_DEFECTO = { jugador: null, rival: 'El rival' }

export function nombreEnCombate ({ nombre, lado }, sufijos = SUFIJOS_POR_DEFECTO) {
    return `${nombre}${sufijos[lado] ?? ''}`
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

function textoCambio ({ lado, sale, nombre }, entrenadores) {
    const entrenador = entrenadores[lado]
    if (entrenador) return sale ? `${entrenador} retiró a ${sale} y envió a ${nombre}.` : `${entrenador} envió a ${nombre}.`
    return sale ? `¡Vuelve, ${sale}! ¡Adelante, ${nombre}!` : `¡Adelante, ${nombre}!`
}

export function construirPasos (eventos, { sufijos = SUFIJOS_POR_DEFECTO, entrenadores = ENTRENADORES_POR_DEFECTO } = {}) {
    const nombreDe = (evento) => nombreEnCombate(evento, sufijos)
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
                agregar(`${nombreDe(evento)} usó ${evento.movimiento.toUpperCase()}.`, evento)
                break
            case 'falla':
                agregar('¡Pero falló!', evento)
                break
            case 'sinEfecto':
                agregar(`No afecta a ${nombreDe(evento)}...`, evento)
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
                agregar(`${nombreDe(evento)} sufrió ${evento.cantidad} de daño de retroceso.`, evento)
                break
            case 'drenaje':
                agregar(`${nombreDe(evento)} absorbió ${evento.cantidad} de salud.`, evento)
                break
            case 'curacion':
                agregar(`${nombreDe(evento)} recuperó ${evento.cantidad} de salud.`, evento)
                break
            case 'estado':
                agregar(TEXTO_ESTADO[evento.estado](nombreDe(evento)), evento)
                break
            case 'etapa':
                agregar(textoEtapa(evento, nombreDe(evento)), evento)
                break
            case 'impedido':
                actual = null
                agregar(TEXTO_IMPEDIDO[evento.motivo](nombreDe(evento)), evento)
                actual = null
                break
            case 'despierta':
                actual = null
                agregar(`¡${nombreDe(evento)} se despertó!`, evento)
                actual = null
                break
            case 'descongela':
                agregar(`¡${nombreDe(evento)} se descongeló!`, evento)
                actual = null
                break
            case 'danioEstado':
                actual = null
                agregar(TEXTO_FIN_DE_TURNO[evento.estado](nombreDe(evento)), evento)
                actual = null
                break
            case 'cambio':
                actual = null
                agregar(textoCambio(evento, entrenadores), evento)
                actual = null
                break
            case 'debilitado':
                actual = null
                agregar(`¡${nombreDe(evento)} se debilitó!`, evento)
                actual = null
                break
            default:
                throw new Error(`Evento desconocido: ${evento.tipo}`)
        }
    }
    return pasos
}

// Diálogo del profesor y botones de respuesta.

import { $, esperar, reducirMovimiento } from './dom.js'
import { reproducir } from './sonido.js'

const chatOak = $('#chatOak')
const burbuja = $('#oakChat .bubble')
const chatTrainer = $('#chatTrainer')
const anuncio = $('#anuncio')
const answers = $('#answers')

let turnoEscritura = 0
let escribiendo = false
let saltarEscritura = false

// ---------- Velocidad del texto ----------

const CLAVE_VELOCIDAD = 'pokemonTypeGame.velocidad'
export const VELOCIDADES = [
    { id: 'normal', nombre: 'NORMAL', pausa: 18 },
    { id: 'rapido', nombre: 'RÁPIDO', pausa: 6 },
    { id: 'instantaneo', nombre: 'INSTANT.', pausa: 0 }
]

let velocidad = (() => {
    try {
        return VELOCIDADES.find((v) => v.id === localStorage.getItem(CLAVE_VELOCIDAD)) ?? VELOCIDADES[0]
    } catch {
        return VELOCIDADES[0]
    }
})()
const alCambiar = new Set()

export const velocidadActual = () => velocidad

export function alternarVelocidad () {
    velocidad = VELOCIDADES[(VELOCIDADES.indexOf(velocidad) + 1) % VELOCIDADES.length]
    try {
        localStorage.setItem(CLAVE_VELOCIDAD, velocidad.id)
    } catch {
        // Sin localStorage la preferencia dura solo esta visita.
    }
    alCambiar.forEach((funcion) => funcion(velocidad))
    return velocidad
}

export function alCambiarVelocidad (funcion) {
    alCambiar.add(funcion)
    funcion(velocidad)
}

// ---------- Texto ----------

export const SIGUIENTE = [{ imagen: './img/arrowRight.png', etiqueta: 'Continuar', clase: 'continuar', valor: true }]

export function limpiarOpciones () {
    answers.replaceChildren()
}

export function mostrarTextoInmediato (texto) {
    turnoEscritura++
    escribiendo = false
    limpiarOpciones()
    chatOak.textContent = texto
    anuncio.textContent = texto
}

// Escribe el texto del profesor letra por letra (tocar el globo lo completa).
export async function escribir (texto) {
    const turno = ++turnoEscritura
    saltarEscritura = false
    anuncio.textContent = texto

    if (!reducirMovimiento() && velocidad.pausa > 0) {
        escribiendo = true
        for (let i = 1; i < texto.length; i++) {
            if (turno !== turnoEscritura) return
            if (saltarEscritura) break
            chatOak.textContent = texto.slice(0, i)
            await esperar(velocidad.pausa)
        }
    }
    if (turno === turnoEscritura) {
        escribiendo = false
        chatOak.textContent = texto
    }
}

// ---------- Opciones ----------

function crearBoton (opcion, indice) {
    const boton = document.createElement('button')
    boton.type = 'button'
    boton.className = opcion.clase ? `option ${opcion.clase}` : 'option'
    boton.disabled = Boolean(opcion.deshabilitado)
    if (opcion.titulo) boton.title = opcion.titulo
    if (opcion.etiqueta) boton.setAttribute('aria-label', opcion.etiqueta)

    // El número del atajo se dibuja con CSS (no forma parte del texto).
    if (indice < 9) boton.dataset.atajo = String(indice + 1)
    if (opcion.insignia) {
        const insignia = document.createElement('span')
        insignia.className = `eficacia ${opcion.insignia.clase ?? ''}`
        insignia.textContent = opcion.insignia.texto
        insignia.title = opcion.insignia.titulo ?? ''
        boton.append(insignia)
    }
    if (opcion.imagen) {
        const imagen = document.createElement('img')
        imagen.src = opcion.imagen
        imagen.alt = ''
        boton.append(imagen)
    }
    for (const [clase, contenido] of [['optionText', opcion.texto], ['optionDetail', opcion.detalle], ['optionDetail', opcion.extra]]) {
        if (!contenido) continue
        const span = document.createElement('span')
        span.className = clase
        span.textContent = contenido
        boton.append(span)
    }
    return boton
}

// Muestra botones y devuelve una promesa con el valor del que se toque.
export function mostrarOpciones (opciones) {
    return new Promise((resolve) => {
        const botones = opciones.map((opcion, indice) => {
            const boton = crearBoton(opcion, opciones.length > 1 ? indice : 99)
            boton.addEventListener('click', () => {
                reproducir('seleccion')
                limpiarOpciones()
                resolve(opcion.valor)
            })
            return boton
        })
        answers.replaceChildren(...botones)
        botones.find((b) => !b.disabled)?.focus({ preventScroll: true })
    })
}

const botonesHabilitados = () => [...answers.querySelectorAll('button:not(:disabled)')]

// Tocar el globo completa el texto o, si solo se puede continuar, avanza.
burbuja.addEventListener('click', () => {
    if (escribiendo) {
        saltarEscritura = true
        return
    }
    const botones = botonesHabilitados()
    if (botones.length === 1 && !document.querySelector('#nameInput')) botones[0].click()
})

// Atajos: 1-9 eligen la opción; Enter o espacio continúan (o completan el texto).
document.addEventListener('keydown', (evento) => {
    if (evento.altKey || evento.ctrlKey || evento.metaKey) return
    if (document.querySelector('dialog[open]')) return
    if (evento.target.closest?.('input, textarea, select')) return
    const botones = [...answers.querySelectorAll('button')]
    if (/^[1-9]$/.test(evento.key)) {
        const boton = botones[Number(evento.key) - 1]
        if (boton && !boton.disabled && botones.length > 1) {
            evento.preventDefault()
            boton.click()
        }
        return
    }
    if (evento.key === 'Enter' || evento.key === ' ') {
        if (escribiendo) {
            evento.preventDefault()
            saltarEscritura = true
            return
        }
        // Si el foco ya está en un botón, el navegador hace el click.
        if (evento.target.closest?.('button, summary, a')) return
        const habilitados = botonesHabilitados()
        if (habilitados.length === 1) {
            evento.preventDefault()
            habilitados[0].click()
        }
    }
})

// El profesor dice algo y espera a que el jugador elija una opción.
export async function decir (texto, opciones = SIGUIENTE) {
    limpiarOpciones()
    await escribir(texto)
    return mostrarOpciones(opciones)
}

export function decirEntrenador (texto) {
    const parrafo = document.createElement('p')
    parrafo.textContent = texto
    chatTrainer.replaceChildren(parrafo)
}

export function mostrarEnEntrenador (...elementos) {
    chatTrainer.replaceChildren(...elementos)
}

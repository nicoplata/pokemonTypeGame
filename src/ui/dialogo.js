// Diálogo del profesor y botones de respuesta.

import { $, esperar, reducirMovimiento } from './dom.js'

const chatOak = $('#chatOak')
const chatTrainer = $('#chatTrainer')
const anuncio = $('#anuncio')
const answers = $('#answers')

let turnoEscritura = 0
let saltarEscritura = false

$('#oakChat .bubble').addEventListener('click', () => { saltarEscritura = true })

export const SIGUIENTE = [{ imagen: './img/arrowRight.png', etiqueta: 'Continuar', valor: true }]

export function limpiarOpciones () {
    answers.replaceChildren()
}

export function mostrarTextoInmediato (texto) {
    turnoEscritura++
    limpiarOpciones()
    chatOak.textContent = texto
    anuncio.textContent = texto
}

// Escribe el texto del profesor letra por letra (tocar el globo lo completa).
export async function escribir (texto) {
    const turno = ++turnoEscritura
    saltarEscritura = false
    anuncio.textContent = texto

    if (!reducirMovimiento()) {
        for (let i = 1; i < texto.length; i++) {
            if (turno !== turnoEscritura) return
            if (saltarEscritura) break
            chatOak.textContent = texto.slice(0, i)
            await esperar(18)
        }
    }
    if (turno === turnoEscritura) chatOak.textContent = texto
}

function crearBoton (opcion) {
    const boton = document.createElement('button')
    boton.type = 'button'
    boton.className = 'option'
    boton.disabled = Boolean(opcion.deshabilitado)
    if (opcion.titulo) boton.title = opcion.titulo
    if (opcion.etiqueta) boton.setAttribute('aria-label', opcion.etiqueta)

    if (opcion.imagen) {
        const imagen = document.createElement('img')
        imagen.src = opcion.imagen
        imagen.alt = ''
        boton.append(imagen)
    }
    for (const [clase, contenido] of [['optionText', opcion.texto], ['optionDetail', opcion.detalle]]) {
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
        const botones = opciones.map((opcion) => {
            const boton = crearBoton(opcion)
            boton.addEventListener('click', () => {
                limpiarOpciones()
                resolve(opcion.valor)
            })
            return boton
        })
        answers.replaceChildren(...botones)
        botones.find((b) => !b.disabled)?.focus({ preventScroll: true })
    })
}

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

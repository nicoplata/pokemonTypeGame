// Ventana modal con <dialog>.

import { $ } from './dom.js'

const ventana = $('#modal')
const icono = $('#modalIcon')
const titulo = $('#modalTitle')
const texto = $('#modalText')
const botonera = $('#modalButtons')

export function modal ({ icono: simbolo = '', titulo: encabezado, texto: cuerpo, botones, valorAlCancelar = botones.at(-1).valor }) {
    return new Promise((resolve) => {
        let resuelto = false
        const terminar = (valor) => {
            if (resuelto) return
            resuelto = true
            if (ventana.open) ventana.close()
            resolve(valor)
        }

        icono.textContent = simbolo
        titulo.textContent = encabezado
        texto.textContent = cuerpo
        botonera.replaceChildren(...botones.map((b) => {
            const boton = document.createElement('button')
            boton.type = 'button'
            boton.textContent = b.texto
            boton.addEventListener('click', () => terminar(b.valor))
            return boton
        }))
        ventana.oncancel = () => terminar(valorAlCancelar)

        ventana.showModal()
        botonera.firstChild.focus()
    })
}

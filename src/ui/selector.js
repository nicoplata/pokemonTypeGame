// Ventana para elegir cualquier Pokémon de la Pokédex.

import { $ } from './dom.js'
import { crearListaPokemon } from './listaPokemon.js'

const ventana = $('#selector')
const titulo = $('#selectorTitulo')
const busqueda = $('#selectorBusqueda')
const botonAzar = $('#selectorAzar')
const botonCancelar = $('#selectorCancelar')

let lista = null
let resolver = null

function terminar (valor) {
    if (!resolver) return
    const resolve = resolver
    resolver = null
    if (ventana.open) ventana.close()
    resolve(valor)
}

export function prepararSelector (especies) {
    lista = crearListaPokemon($('#selectorLista'), $('#selectorVacio'), especies, (id) => terminar(id))
    busqueda.addEventListener('input', () => lista.filtrar(busqueda.value))
    // Enter elige el primer resultado.
    busqueda.addEventListener('keydown', (evento) => {
        if (evento.key !== 'Enter') return
        evento.preventDefault()
        lista.primerVisible()?.click()
    })
    botonAzar.addEventListener('click', () => terminar('azar'))
    botonCancelar.addEventListener('click', () => terminar(null))
    ventana.addEventListener('cancel', () => terminar(null))
}

// Devuelve el id elegido, 'azar' o null si se cancela.
export function elegirEnPokedex ({ titulo: encabezado, permitirAzar = false }) {
    if (!lista) throw new Error('El selector no está preparado')
    return new Promise((resolve) => {
        resolver = resolve
        titulo.textContent = encabezado
        botonAzar.hidden = !permitirAzar
        busqueda.value = ''
        lista.filtrar('')
        ventana.showModal()
        busqueda.focus()
    })
}

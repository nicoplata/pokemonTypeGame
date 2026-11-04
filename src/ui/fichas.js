// Tarjetas con los datos de cada Pokémon.

import { TIPOS_ES } from '../datos/tipos.js'
import { IMAGENES_LOCALES, imagenPokemon, spritePokemon } from '../datos/juego.js'
import { reducirMovimiento } from './dom.js'

const campo = (card, nombre) => card.querySelector(`[data-campo="${nombre}"]`)

export const nombreTipo = (tipo) => TIPOS_ES[tipo] ?? tipo.toUpperCase()
export const nombreTipos = (tipos) => tipos.map(nombreTipo).join(' / ')

export function mostrarFicha (card, luchador) {
    campo(card, 'nombre').textContent = luchador.nombre
    const imagen = campo(card, 'imagen')
    imagen.dataset.local = IMAGENES_LOCALES[luchador.id] ?? ''
    imagen.src = imagenPokemon(luchador.id)
    imagen.alt = luchador.nombre
    imagen.hidden = false
    campo(card, 'nivel').textContent = luchador.nivel
    campo(card, 'tipo').textContent = nombreTipos(luchador.tipos)
    campo(card, 'ataque').textContent = `${luchador.stats.atk} / ${luchador.stats.spa}`
    campo(card, 'defensa').textContent = `${luchador.stats.def} / ${luchador.stats.spd}`
    campo(card, 'velocidad').textContent = luchador.stats.spe
    actualizarSalud(card, luchador.salud, luchador.saludMax)
}

export function actualizarSalud (card, salud, saludMax) {
    campo(card, 'salud').textContent = `${salud}/${saludMax}`
    const porcentaje = (salud / saludMax) * 100
    const barra = campo(card, 'barra')
    barra.style.width = `${porcentaje}%`
    barra.classList.toggle('medio', porcentaje <= 50 && porcentaje > 20)
    barra.classList.toggle('bajo', porcentaje <= 20)
}

// Indicador del equipo: miniaturas (o pokébolas si `ocultar`), marcando al
// que está en el campo y a los debilitados.
export function mostrarEquipo (card, equipo, indiceActivo, { ocultar = false } = {}) {
    const lista = campo(card, 'equipo')
    lista.replaceChildren(...equipo.map((luchador, indice) => {
        const item = document.createElement('li')
        item.classList.toggle('activo', indice === indiceActivo)
        item.classList.toggle('debilitado', luchador.salud === 0)
        const estadoTexto = luchador.salud === 0 ? 'debilitado' : indice === indiceActivo ? 'en el campo' : 'listo'
        if (ocultar) {
            item.className += ' pokebola'
            item.title = `Pokémon ${indice + 1}: ${estadoTexto}`
        } else {
            const imagen = document.createElement('img')
            imagen.src = spritePokemon(luchador.id)
            imagen.alt = ''
            item.append(imagen)
            item.title = `${luchador.nombre} (${luchador.salud}/${luchador.saludMax}): ${estadoTexto}`
        }
        item.setAttribute('aria-label', item.title)
        return item
    }))
}

export function limpiarFicha (card) {
    for (const nombre of ['nombre', 'nivel', 'salud', 'tipo', 'ataque', 'defensa', 'velocidad']) {
        campo(card, nombre).textContent = '-'
    }
    const imagen = campo(card, 'imagen')
    imagen.removeAttribute('src')
    imagen.alt = ''
    imagen.hidden = true
    const barra = campo(card, 'barra')
    barra.style.width = '0%'
    barra.classList.remove('medio', 'bajo')
    campo(card, 'equipo').replaceChildren()
}

export function animarGolpe (card) {
    if (reducirMovimiento()) return
    const imagen = campo(card, 'imagen')
    imagen.classList.remove('golpe')
    void imagen.offsetWidth // reinicia la animación si ya estaba aplicada
    imagen.classList.add('golpe')
}

for (const card of document.querySelectorAll('.pokemonCard')) {
    const imagen = campo(card, 'imagen')
    imagen.addEventListener('animationend', () => imagen.classList.remove('golpe'))
    // Si no carga la imagen remota, usa la local (si existe) o la oculta.
    imagen.addEventListener('error', () => {
        const local = imagen.dataset.local
        if (local && !imagen.src.endsWith(local.slice(1))) imagen.src = local
        else imagen.hidden = true
    })
}

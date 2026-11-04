// Tarjetas con los datos de cada Pokémon.

import { TIPOS_ES } from '../datos/tipos.js'
import { reducirMovimiento } from './dom.js'

const campo = (card, nombre) => card.querySelector(`[data-campo="${nombre}"]`)

export const nombreTipo = (tipo) => TIPOS_ES[tipo] ?? tipo.toUpperCase()
export const nombreTipos = (tipos) => tipos.map(nombreTipo).join(' / ')

export function mostrarFicha (card, luchador) {
    campo(card, 'nombre').textContent = luchador.nombre
    const imagen = campo(card, 'imagen')
    imagen.src = luchador.imagen
    imagen.alt = luchador.nombre
    imagen.hidden = !luchador.imagen
    campo(card, 'ataque').textContent = luchador.ataque
    campo(card, 'velocidad').textContent = luchador.velocidad
    campo(card, 'tipo').textContent = nombreTipos(luchador.tipos)
    actualizarSalud(card, luchador)
}

export function actualizarSalud (card, luchador) {
    campo(card, 'salud').textContent = `${luchador.salud}/${luchador.saludMax}`
    const porcentaje = (luchador.salud / luchador.saludMax) * 100
    const barra = campo(card, 'barra')
    barra.style.width = `${porcentaje}%`
    barra.classList.toggle('medio', porcentaje <= 50 && porcentaje > 20)
    barra.classList.toggle('bajo', porcentaje <= 20)
}

export function limpiarFicha (card) {
    for (const nombre of ['nombre', 'salud', 'ataque', 'velocidad', 'tipo']) campo(card, nombre).textContent = '-'
    const imagen = campo(card, 'imagen')
    imagen.removeAttribute('src')
    imagen.alt = ''
    imagen.hidden = true
    const barra = campo(card, 'barra')
    barra.style.width = '0%'
    barra.classList.remove('medio', 'bajo')
}

export function animarGolpe (card) {
    if (reducirMovimiento()) return
    const imagen = campo(card, 'imagen')
    imagen.classList.remove('golpe')
    void imagen.offsetWidth // reinicia la animación si ya estaba aplicada
    imagen.classList.add('golpe')
}

for (const card of document.querySelectorAll('.pokemonCard')) {
    campo(card, 'imagen').addEventListener('animationend', (e) => e.target.classList.remove('golpe'))
}

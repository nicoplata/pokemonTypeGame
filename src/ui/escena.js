// Escena de combate: los dos Pokémon enfrentados, con sus barras de salud y
// animaciones. Cada animación devuelve una promesa que se resuelve al
// terminar (o al instante si se prefieren menos animaciones).

import { spriteEspalda, spritePokemon } from '../datos/juego.js'
import { ESTADOS_ES } from '../datos/tipos.js'
import { $, reducirMovimiento } from './dom.js'

const escena = $('#escena')
const lados = {
    jugador: escena.querySelector('[data-lado="jugador"]'),
    rival: escena.querySelector('[data-lado="rival"]')
}
const parte = (lado, nombre) => lados[lado].querySelector(`[data-e="${nombre}"]`)

// El sprite de espalda es para el jugador; si no carga, usa el de frente.
for (const lado of Object.keys(lados)) {
    const sprite = parte(lado, 'sprite')
    sprite.addEventListener('error', () => {
        const respaldo = spritePokemon(sprite.dataset.id)
        if (sprite.dataset.id && sprite.src !== respaldo) sprite.src = respaldo
    })
}

async function animar (elemento, cuadros, opciones) {
    if (reducirMovimiento() || typeof elemento.animate !== 'function') return
    try {
        await elemento.animate(cuadros, { easing: 'ease-out', ...opciones }).finished
    } catch {
        // Una animación cancelada no es un error.
    }
}

export function mostrarEscena () {
    escena.hidden = false
}

export function ocultarEscena () {
    escena.hidden = true
    for (const lado of Object.keys(lados)) {
        const sprite = parte(lado, 'sprite')
        sprite.removeAttribute('src')
        sprite.dataset.id = ''
        sprite.style.opacity = ''
        lados[lado].querySelectorAll('.textoFlotante').forEach((t) => t.remove())
    }
}

export function actualizarSaludEscena (lado, salud, saludMax) {
    const porcentaje = (salud / saludMax) * 100
    const barra = parte(lado, 'barra')
    barra.style.width = `${porcentaje}%`
    barra.classList.toggle('medio', porcentaje <= 50 && porcentaje > 20)
    barra.classList.toggle('bajo', porcentaje <= 20)
    parte(lado, 'salud').textContent = `${salud}/${saludMax}`
}

export function mostrarEstadoEnEscena (lado, estado) {
    const chip = parte(lado, 'estado')
    chip.hidden = !estado
    chip.textContent = estado ? ESTADOS_ES[estado].corto : ''
    chip.title = estado ? ESTADOS_ES[estado].nombre : ''
    chip.dataset.estado = estado ?? ''
}

export function ponerEnEscena (lado, luchador) {
    const sprite = parte(lado, 'sprite')
    sprite.dataset.id = luchador.id
    sprite.src = lado === 'jugador' ? spriteEspalda(luchador.id) : spritePokemon(luchador.id)
    sprite.style.opacity = luchador.salud > 0 ? '' : '0'
    parte(lado, 'nombre').textContent = luchador.nombre
    parte(lado, 'nivel').textContent = `Nv.${luchador.nivel}`
    mostrarEstadoEnEscena(lado, luchador.estado)
    actualizarSaludEscena(lado, luchador.salud, luchador.saludMax)
}

export function animarEntrada (lado) {
    return animar(parte(lado, 'sprite'), [
        { transform: 'scale(0.2)', opacity: 0, filter: 'brightness(3)' },
        { transform: 'scale(1)', opacity: 1, filter: 'brightness(1)' }
    ], { duration: 350 })
}

// El atacante se lanza hacia el rival.
export function animarAtaque (lado) {
    const direccion = lado === 'jugador' ? 1 : -1
    return animar(parte(lado, 'sprite'), [
        { transform: 'translate(0, 0)' },
        { transform: `translate(${24 * direccion}px, ${-12 * direccion}px)` },
        { transform: 'translate(0, 0)' }
    ], { duration: 260 })
}

function textoFlotante (lado, texto, clase) {
    if (reducirMovimiento()) return Promise.resolve()
    const etiqueta = document.createElement('span')
    etiqueta.className = `textoFlotante ${clase}`
    etiqueta.textContent = texto
    lados[lado].querySelector('.plataforma').append(etiqueta)
    return animar(etiqueta, [
        { transform: 'translate(-50%, 0)', opacity: 1 },
        { transform: 'translate(-50%, -36px)', opacity: 0 }
    ], { duration: 900 }).finally(() => etiqueta.remove())
}

// Parpadeo del que recibe el golpe, con el daño flotando encima.
export function animarGolpe (lado, { cantidad, multiplicador = 1, criticos = 0 }) {
    const clase = multiplicador > 1 ? 'superEficaz' : multiplicador < 1 ? 'poco' : ''
    const texto = `-${cantidad}${criticos ? '!' : ''}`
    return Promise.all([
        animar(parte(lado, 'sprite'), [
            { transform: 'translateX(0)', opacity: 1 },
            { transform: 'translateX(-8px)', opacity: 0.2 },
            { transform: 'translateX(8px)', opacity: 1 },
            { transform: 'translateX(-4px)', opacity: 0.2 },
            { transform: 'translateX(0)', opacity: 1 }
        ], { duration: 420 }),
        textoFlotante(lado, texto, clase)
    ])
}

export function animarSinEfecto (lado) {
    return textoFlotante(lado, '×', 'poco')
}

export async function animarDebilitado (lado) {
    const sprite = parte(lado, 'sprite')
    await animar(sprite, [
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(40px)', opacity: 0 }
    ], { duration: 500, easing: 'ease-in' })
    sprite.style.opacity = '0'
}

// Destello de color al recibir un estado o un cambio de estadísticas.
export function animarDestello (lado, color) {
    return animar(parte(lado, 'sprite'), [
        { filter: 'drop-shadow(0 0 0 transparent)' },
        { filter: `drop-shadow(0 0 10px ${color})` },
        { filter: 'drop-shadow(0 0 0 transparent)' }
    ], { duration: 450 })
}

export function animarSubidaDeNivel (lado) {
    return animar(parte(lado, 'sprite'), [
        { filter: 'brightness(1)' }, { filter: 'brightness(2.5)' }, { filter: 'brightness(1)' }
    ], { duration: 500 })
}

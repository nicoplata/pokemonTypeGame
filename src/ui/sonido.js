// Sonido 8-bit generado con Web Audio: efectos y música en bucle.
// El navegador solo permite sonar después de una interacción, así que el
// contexto de audio se crea con el primer toque o tecla.

import { EFECTOS, PISTAS, frecuencia } from './musica.js'

const CLAVE = 'pokemonTypeGame.silencio'
const VOLUMEN_MUSICA = 0.12
const VOLUMEN_EFECTOS = 0.3

let contexto = null
let general = null
let canalMusica = null
let canalEfectos = null
let silenciado = leerSilencio()
let pistaDeseada = null
let reproductor = null
const alCambiar = new Set()

function leerSilencio () {
    try {
        return localStorage.getItem(CLAVE) === '1'
    } catch {
        return false
    }
}

function guardarSilencio () {
    try {
        localStorage.setItem(CLAVE, silenciado ? '1' : '0')
    } catch {
        // Sin localStorage: la preferencia dura solo esta visita.
    }
}

function crearContexto () {
    if (contexto) return contexto
    const Contexto = globalThis.AudioContext ?? globalThis.webkitAudioContext
    if (!Contexto) return null
    try {
        contexto = new Contexto()
    } catch {
        return null
    }
    general = contexto.createGain()
    general.gain.value = silenciado ? 0 : 1
    general.connect(contexto.destination)
    canalMusica = contexto.createGain()
    canalMusica.gain.value = VOLUMEN_MUSICA
    canalMusica.connect(general)
    canalEfectos = contexto.createGain()
    canalEfectos.gain.value = VOLUMEN_EFECTOS
    canalEfectos.connect(general)
    return contexto
}

// Llamar desde un evento del usuario (click, tecla).
export function activarAudio () {
    const ctx = crearContexto()
    if (!ctx) return
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    if (pistaDeseada && !reproductor) arrancarPista(pistaDeseada)
}

function tono (canal, hz, inicio, duracion, onda = 'square', volumen = 1) {
    const oscilador = contexto.createOscillator()
    const envolvente = contexto.createGain()
    oscilador.type = onda
    oscilador.frequency.value = hz
    envolvente.gain.setValueAtTime(volumen, inicio)
    envolvente.gain.exponentialRampToValueAtTime(0.001, inicio + duracion)
    oscilador.connect(envolvente)
    envolvente.connect(canal)
    oscilador.start(inicio)
    oscilador.stop(inicio + duracion + 0.02)
}

let bufferRuido = null
function ruido (canal, inicio, duracion, volumen = 1) {
    if (!bufferRuido) {
        bufferRuido = contexto.createBuffer(1, contexto.sampleRate * 0.5, contexto.sampleRate)
        const datos = bufferRuido.getChannelData(0)
        for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1
    }
    const fuente = contexto.createBufferSource()
    const envolvente = contexto.createGain()
    fuente.buffer = bufferRuido
    envolvente.gain.setValueAtTime(volumen, inicio)
    envolvente.gain.exponentialRampToValueAtTime(0.001, inicio + duracion)
    fuente.connect(envolvente)
    envolvente.connect(canal)
    fuente.start(inicio)
    fuente.stop(inicio + duracion + 0.02)
}

export function reproducir (nombre) {
    const efecto = EFECTOS[nombre]
    if (!efecto) throw new Error(`Efecto desconocido: ${nombre}`)
    if (!contexto || contexto.state !== 'running' || silenciado) return
    let momento = contexto.currentTime + 0.01
    for (const [nota, duracion, onda] of efecto) {
        if (nota === 'ruido') ruido(canalEfectos, momento, duracion)
        else tono(canalEfectos, frecuencia(nota), momento, duracion, onda)
        momento += duracion
    }
}

// Secuenciador: programa las notas con un poco de anticipación para que el
// ritmo no dependa de los temporizadores del navegador.
function arrancarPista (nombre) {
    const pista = PISTAS[nombre]
    if (!pista) throw new Error(`Pista desconocida: ${nombre}`)
    if (!contexto) return
    const duracionPaso = 60 / pista.pulsos / 2
    let paso = 0
    let proximo = contexto.currentTime + 0.05
    const temporizador = setInterval(() => {
        while (proximo < contexto.currentTime + 0.15) {
            const nota = pista.melodia[paso % pista.melodia.length]
            const bajo = pista.bajo[paso % pista.bajo.length]
            if (nota) tono(canalMusica, frecuencia(nota), proximo, duracionPaso * 0.9, pista.ondaMelodia, 0.5)
            if (bajo) tono(canalMusica, frecuencia(bajo), proximo, duracionPaso * 0.9, 'triangle', 0.8)
            if (pista.percusion && paso % 2 === 1) ruido(canalMusica, proximo, 0.03, 0.25)
            proximo += duracionPaso
            paso++
        }
    }, 25)
    reproductor = { nombre, temporizador }
}

export function iniciarMusica (nombre) {
    if (!PISTAS[nombre]) throw new Error(`Pista desconocida: ${nombre}`)
    if (reproductor?.nombre === nombre) return
    detenerMusica()
    pistaDeseada = nombre
    if (contexto && contexto.state !== 'closed') arrancarPista(nombre)
}

export function detenerMusica () {
    pistaDeseada = null
    if (reproductor) clearInterval(reproductor.temporizador)
    reproductor = null
}

export const estaSilenciado = () => silenciado

export function alternarSilencio () {
    silenciado = !silenciado
    guardarSilencio()
    if (general) general.gain.setValueAtTime(silenciado ? 0 : 1, contexto.currentTime)
    alCambiar.forEach((funcion) => funcion(silenciado))
    return silenciado
}

export function alCambiarSilencio (funcion) {
    alCambiar.add(funcion)
    funcion(silenciado)
}

// Activa el audio con la primera interacción.
for (const tipo of ['pointerdown', 'keydown']) {
    document.addEventListener(tipo, activarAudio, { passive: true })
}

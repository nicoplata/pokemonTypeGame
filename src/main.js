// Flujo del juego: une la lógica de combate con la interfaz.

import { TEXTOS } from './datos/textos.js'
import { ATAQUES, IMAGENES, INICIALES, RIVALES } from './datos/juego.js'
import {
    calcularAtaque, crearLuchador, eleccionRival, jugadorAtacaPrimero, mensajeAtaque, nombreEnCombate
} from './motor/combate.js'
import { crearClientePokeApi } from './servicios/pokeapi.js'
import { guardarProgreso, leerProgreso } from './servicios/progreso.js'
import { $ } from './ui/dom.js'
import {
    SIGUIENTE, decir, decirEntrenador, escribir, limpiarOpciones, mostrarEnEntrenador, mostrarOpciones,
    mostrarTextoInmediato
} from './ui/dialogo.js'
import { actualizarSalud, animarGolpe, limpiarFicha, mostrarFicha, nombreTipo } from './ui/fichas.js'
import { modal } from './ui/modal.js'

const ui = {
    trainerName: $('#trainerName'),
    trainerPokemon: $('#trainerPokemon'),
    trainerRecord: $('#trainerRecord'),
    listHint: $('#listHint'),
    pokedexLinks: document.querySelectorAll('.pokemonLink'),
    cardJugador: $('#cardJugador'),
    cardRival: $('#cardRival')
}

const cargarPokemon = crearClientePokeApi()
const progreso = leerProgreso()

const estado = {
    nombre: '',
    jugador: null,
    rival: null
}

// ============================================================
//  Entrenador y Pokédex lateral
// ============================================================

function actualizarEntrenador () {
    ui.trainerName.textContent = estado.nombre || progreso.nombre || '-'
    ui.trainerPokemon.textContent = estado.jugador?.nombre ?? '-'
    ui.trainerRecord.textContent = `${progreso.victorias}V - ${progreso.derrotas}D`
}

function habilitarPokedex (habilitada) {
    ui.pokedexLinks.forEach((boton) => { boton.disabled = !habilitada })
    ui.listHint.textContent = habilitada ? 'Tocá uno para ver sus datos' : 'No disponible durante la partida'
}

// Consultar la Pokédex solo muestra datos: no cambia tu Pokémon y se
// desactiva una vez elegido el inicial.
ui.pokedexLinks.forEach((boton) => {
    boton.addEventListener('click', async () => {
        if (estado.jugador) return
        try {
            const datos = await cargarPokemon(boton.dataset.pokemon)
            if (!estado.jugador) mostrarFicha(ui.cardJugador, crearLuchador(datos))
        } catch (error) {
            console.error(error)
            await modal({ icono: '!', titulo: 'SIN CONEXIÓN', texto: TEXTOS.errorRed, botones: [{ texto: 'ACEPTAR', valor: true }] })
        }
    })
})

// Carga un Pokémon y, si falla la conexión, ofrece reintentar.
async function cargarConReintento (id) {
    for (;;) {
        mostrarTextoInmediato(TEXTOS.cargando)
        try {
            return await cargarPokemon(id)
        } catch (error) {
            console.error(error)
            await decir(TEXTOS.errorRed, [{ texto: 'REINTENTAR', valor: true }])
        }
    }
}

// ============================================================
//  Pasos de la partida
// ============================================================

async function pedirNombre () {
    limpiarOpciones()
    await escribir(TEXTOS.preguntaNombre)

    const formulario = document.createElement('form')
    formulario.id = 'nameForm'
    const etiqueta = document.createElement('label')
    etiqueta.htmlFor = 'nameInput'
    etiqueta.className = 'srOnly'
    etiqueta.textContent = 'Tu nombre'
    const campoNombre = document.createElement('input')
    campoNombre.id = 'nameInput'
    campoNombre.type = 'text'
    campoNombre.maxLength = 12
    campoNombre.autocomplete = 'off'
    campoNombre.value = progreso.nombre
    formulario.append(etiqueta, campoNombre)
    mostrarEnEntrenador(formulario)

    campoNombre.addEventListener('input', () => {
        ui.trainerName.textContent = campoNombre.value.trim().toUpperCase() || '-'
    })

    for (;;) {
        const enviado = new Promise((resolve) => {
            formulario.onsubmit = (evento) => {
                evento.preventDefault()
                resolve()
            }
        })
        const continuar = mostrarOpciones(SIGUIENTE)
        campoNombre.focus()
        await Promise.race([enviado, continuar])
        limpiarOpciones()

        const nombre = campoNombre.value.trim().toUpperCase()
        if (nombre) {
            mostrarEnEntrenador()
            return nombre
        }
        await modal({ icono: '!', titulo: '¡ATENCIÓN!', texto: TEXTOS.nombreInvalido, botones: [{ texto: 'ACEPTAR', valor: true }] })
    }
}

const opcionesPokemon = (lista) => lista.map((id) => ({
    imagen: IMAGENES[id],
    texto: id.toUpperCase(),
    valor: id
}))

function opcionesAtaque (luchador) {
    return Object.entries(ATAQUES).map(([clave, ataque]) => {
        const pp = luchador.pp[clave]
        const precision = `PREC. ${Math.round(ataque.precision * 100)}%`
        const detalle = ataque.usaTipo ? `${nombreTipo(luchador.tipos[0])} ${pp}/${ataque.pp}` : precision
        return {
            texto: ataque.corto,
            detalle,
            titulo: `${ataque.nombre} · ${precision}${Number.isFinite(ataque.pp) ? ` · PP ${pp}/${ataque.pp}` : ''}`,
            deshabilitado: pp <= 0,
            valor: clave
        }
    })
}

async function turno (claveJugador) {
    const { jugador, rival } = estado
    const claveRival = eleccionRival(rival, jugador)

    const acciones = [
        { atacante: jugador, defensor: rival, clave: claveJugador, esRival: false, cardDefensor: ui.cardRival },
        { atacante: rival, defensor: jugador, clave: claveRival, esRival: true, cardDefensor: ui.cardJugador }
    ]
    if (!jugadorAtacaPrimero(jugador, rival)) acciones.reverse()

    for (const { atacante, defensor, clave, esRival, cardDefensor } of acciones) {
        atacante.pp[clave]--
        const resultado = calcularAtaque(atacante, defensor, clave)
        defensor.salud = Math.max(0, defensor.salud - resultado.danio)
        actualizarSalud(cardDefensor, defensor)
        if (resultado.danio > 0) animarGolpe(cardDefensor)
        await decir(mensajeAtaque(atacante, defensor, clave, resultado, esRival))

        if (defensor.salud === 0) {
            await decir(`¡${nombreEnCombate(defensor, !esRival)} se debilitó!`)
            return
        }
    }
}

// Devuelve true si gana el jugador.
async function combate () {
    let primerTurno = true
    while (estado.jugador.salud > 0 && estado.rival.salud > 0) {
        const clave = await decir(primerTurno ? TEXTOS.primerAtaque : TEXTOS.siguienteAtaque, opcionesAtaque(estado.jugador))
        primerTurno = false
        decirEntrenador(`¡${estado.jugador.nombre}, usa ${ATAQUES[clave].nombre}!`)
        await turno(clave)
    }
    return estado.jugador.salud > 0
}

function reiniciarPantalla () {
    estado.jugador = null
    estado.rival = null
    limpiarFicha(ui.cardJugador)
    limpiarFicha(ui.cardRival)
    mostrarEnEntrenador()
    habilitarPokedex(true)
    actualizarEntrenador()
}

async function partida (esRevancha) {
    reiniciarPantalla()

    if (esRevancha && estado.nombre) {
        await decir(TEXTOS.saludoNuevamente(estado.nombre))
    } else {
        await decir(TEXTOS.bienvenida)
        estado.nombre = await pedirNombre()
        progreso.nombre = estado.nombre
        guardarProgreso(progreso)
        actualizarEntrenador()
        await decir(TEXTOS.saludo(estado.nombre))
        await decir(TEXTOS.camino)
        await decir(TEXTOS.decision)
    }

    const idInicial = await decir(TEXTOS.elegirInicial, opcionesPokemon(INICIALES))
    habilitarPokedex(false)
    decirEntrenador(`¡Elijo a ${idInicial.toUpperCase()}!`)
    estado.jugador = crearLuchador(await cargarConReintento(idInicial))
    mostrarFicha(ui.cardJugador, estado.jugador)
    actualizarEntrenador()

    await decir(TEXTOS.buenaEleccion(estado.jugador.nombre))
    await decir(TEXTOS.listo)
    await decir(TEXTOS.accion)
    await decir(TEXTOS.entrenamiento)

    const idRival = await decir(TEXTOS.elegirRival, opcionesPokemon(RIVALES))
    decirEntrenador(`¡Quiero combatir contra ${idRival.toUpperCase()}!`)
    estado.rival = crearLuchador(await cargarConReintento(idRival))
    mostrarFicha(ui.cardRival, estado.rival)
    mostrarEnEntrenador()
    await decir(TEXTOS.consejoTipos)

    const gano = await combate()
    if (gano) progreso.victorias++
    else progreso.derrotas++
    guardarProgreso(progreso)
    actualizarEntrenador()

    const jugarDeNuevo = await modal({
        icono: gano ? '★' : '✖',
        titulo: gano ? '¡GANASTE!' : '¡PERDISTE!',
        texto: '¿Deseas jugar nuevamente?',
        botones: [{ texto: '¡SÍ!', valor: true }, { texto: 'NO', valor: false }]
    })
    if (!jugarDeNuevo) await decir(TEXTOS.despedida, [{ texto: 'JUGAR DE NUEVO', valor: true }])
}

async function iniciar () {
    actualizarEntrenador()
    // Precarga en segundo plano para que la elección sea instantánea.
    for (const id of [...INICIALES, ...RIVALES]) cargarPokemon(id).catch(() => {})

    let esRevancha = false
    for (;;) {
        await partida(esRevancha)
        esRevancha = true
    }
}

iniciar().catch((error) => {
    console.error(error)
    mostrarTextoInmediato('Ocurrió un error inesperado. Recargá la página para volver a jugar.')
})

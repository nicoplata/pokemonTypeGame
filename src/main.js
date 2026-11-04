// Flujo del juego: une la lógica de combate con la interfaz.

import { TEXTOS } from './datos/textos.js'
import { IMAGENES_LOCALES, INICIALES, NIVEL_COMBATE, RIVALES } from './datos/juego.js'
import { FORCEJEO, elegirMovimientoIA, movimientosDisponibles, resolverTurno } from './motor/combate.js'
import { crearLuchador } from './motor/luchador.js'
import { construirPasos } from './motor/mensajes.js'
import { crearPokedex } from './motor/pokedex.js'
import { cargarDatos } from './servicios/datos.js'
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
    cards: { jugador: $('#cardJugador'), rival: $('#cardRival') }
}

const progreso = leerProgreso()

const estado = {
    pokedex: null,
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
    boton.addEventListener('click', () => {
        if (!estado.pokedex || estado.jugador) return
        mostrarFicha(ui.cards.jugador, crearLuchador(estado.pokedex, Number(boton.dataset.pokemon), NIVEL_COMBATE))
    })
})

// Carga los datos y, si falla la conexión, ofrece reintentar.
async function cargarPokedexConReintento () {
    for (;;) {
        mostrarTextoInmediato(TEXTOS.cargando)
        try {
            return crearPokedex(await cargarDatos())
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
    imagen: IMAGENES_LOCALES[id],
    texto: estado.pokedex.especie(id).nombre.toUpperCase(),
    valor: id
}))

function opcionesMovimientos (luchador) {
    if (movimientosDisponibles(luchador).length === 0) {
        return [{ texto: 'FORCEJEO', detalle: 'SIN PP', clase: 'movimiento tipo-normal', valor: FORCEJEO }]
    }
    return luchador.movimientos.map((m, indice) => {
        const mov = estado.pokedex.movimiento(m.id)
        const potencia = mov.potencia ? `Potencia ${mov.potencia}` : 'Sin potencia'
        const precision = mov.precision ? `precisión ${mov.precision}%` : 'nunca falla'
        return {
            texto: mov.nombre.toUpperCase(),
            detalle: `${nombreTipo(mov.tipo)} ${m.pp}/${m.ppMax}`,
            titulo: `${potencia} · ${precision} · ${mov.clase === 'fisico' ? 'físico' : 'especial'}`,
            clase: `movimiento tipo-${mov.tipo}`,
            deshabilitado: m.pp <= 0,
            valor: indice
        }
    })
}

function nombreDeEleccion (luchador, eleccion) {
    if (eleccion === FORCEJEO) return 'FORCEJEO'
    return estado.pokedex.movimiento(luchador.movimientos[eleccion].id).nombre.toUpperCase()
}

function aplicarEvento (evento) {
    const luchador = estado[evento.lado]
    const card = ui.cards[evento.lado]
    if (evento.tipo === 'danio' || evento.tipo === 'retroceso') {
        actualizarSalud(card, evento.salud, luchador.saludMax)
        if (evento.cantidad > 0) animarGolpe(card)
    }
}

async function turno (eleccion) {
    const { pokedex, jugador, rival } = estado
    const eleccionRival = elegirMovimientoIA(pokedex, rival, jugador)
    const eventos = resolverTurno(pokedex, jugador, eleccion, rival, eleccionRival)
    for (const paso of construirPasos(eventos, { jugador, rival })) {
        paso.eventos.forEach(aplicarEvento)
        await decir(paso.texto)
    }
}

// Devuelve true si gana el jugador.
async function combate () {
    let primerTurno = true
    while (estado.jugador.salud > 0 && estado.rival.salud > 0) {
        const pregunta = primerTurno ? TEXTOS.primerAtaque : TEXTOS.siguienteAtaque
        const eleccion = await decir(pregunta, opcionesMovimientos(estado.jugador))
        primerTurno = false
        decirEntrenador(`¡${estado.jugador.nombre}, usa ${nombreDeEleccion(estado.jugador, eleccion)}!`)
        await turno(eleccion)
    }
    return estado.jugador.salud > 0
}

function reiniciarPantalla () {
    estado.jugador = null
    estado.rival = null
    limpiarFicha(ui.cards.jugador)
    limpiarFicha(ui.cards.rival)
    mostrarEnEntrenador()
    habilitarPokedex(true)
    actualizarEntrenador()
}

function prepararLuchador (lado, id) {
    const luchador = { ...crearLuchador(estado.pokedex, id, NIVEL_COMBATE), lado }
    estado[lado] = luchador
    mostrarFicha(ui.cards[lado], luchador)
    return luchador
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
    const jugador = prepararLuchador('jugador', idInicial)
    decirEntrenador(`¡Elijo a ${jugador.nombre}!`)
    actualizarEntrenador()

    await decir(TEXTOS.buenaEleccion(jugador.nombre))
    await decir(TEXTOS.listo)
    await decir(TEXTOS.accion)
    await decir(TEXTOS.entrenamiento)

    const idRival = await decir(TEXTOS.elegirRival, opcionesPokemon(RIVALES))
    const rival = prepararLuchador('rival', idRival)
    decirEntrenador(`¡Quiero combatir contra ${rival.nombre}!`)
    await decir(TEXTOS.consejoTipos)
    mostrarEnEntrenador()

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
    estado.pokedex = await cargarPokedexConReintento()

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

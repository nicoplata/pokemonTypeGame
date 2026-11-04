// Flujo del juego: une la lógica de combate con la interfaz.

import { TEXTOS } from './datos/textos.js'
import { IMAGENES_LOCALES, INICIALES, NIVEL_INICIAL, RIVALES, spritePokemon } from './datos/juego.js'
import { pokemonAlAzar } from './motor/busqueda.js'
import { crearCombate } from './motor/equipos.js'
import { curar } from './motor/experiencia.js'
import { crearLuchador, resumirLuchador } from './motor/luchador.js'
import { crearPokedex } from './motor/pokedex.js'
import { cargarDatos } from './servicios/datos.js'
import { guardarProgreso, leerProgreso } from './servicios/progreso.js'
import { $ } from './ui/dom.js'
import {
    SIGUIENTE, decir, decirEntrenador, escribir, limpiarOpciones, mostrarEnEntrenador, mostrarOpciones,
    mostrarTextoInmediato
} from './ui/dialogo.js'
import { limpiarFicha, mostrarEquipo, mostrarFicha } from './ui/fichas.js'
import { crearListaPokemon } from './ui/listaPokemon.js'
import { ocultarEscena } from './ui/escena.js'
import { alCambiarSilencio, alternarSilencio, detenerMusica, iniciarMusica, reproducir } from './ui/sonido.js'
import { modal } from './ui/modal.js'
import { elegirEnPokedex, prepararSelector } from './ui/selector.js'
import { jugarCombate } from './juego/bucleCombate.js'
import { crearControladorHumano, crearControladorIA } from './juego/controladores.js'
import { crearPresentador } from './juego/presentador.js'
import { crearRepartoDeExperiencia, procesarEvoluciones } from './juego/progresion.js'

const ui = {
    trainerName: $('#trainerName'),
    trainerPokemon: $('#trainerPokemon'),
    trainerRecord: $('#trainerRecord'),
    listHint: $('#listHint'),
    busquedaLateral: $('#busquedaLateral'),
    cards: { jugador: $('#cardJugador'), rival: $('#cardRival') }
}

const progreso = leerProgreso()

let listaLateral = null

const estado = {
    pokedex: null,
    nombre: '',
    // Equipo del jugador mientras se arma (antes de empezar el combate).
    equipo: []
}

const TAMANIO_EQUIPO = 3

// ============================================================
//  Entrenador y Pokédex lateral
// ============================================================

function actualizarEntrenador () {
    ui.trainerName.textContent = estado.nombre || progreso.nombre || '-'
    ui.trainerPokemon.textContent = estado.equipo.length ? estado.equipo.map((l) => l.nombre).join(', ') : '-'
    ui.trainerRecord.textContent = `${progreso.victorias}V - ${progreso.derrotas}D`
}

function habilitarPokedex (habilitada) {
    ui.busquedaLateral.disabled = !habilitada
    listaLateral?.habilitar(habilitada)
    ui.listHint.textContent = habilitada ? 'Buscá por nombre, número o tipo' : 'No disponible durante la partida'
}

// La Pokédex lateral solo muestra datos: no cambia tu Pokémon y se
// desactiva una vez elegido el inicial.
function prepararPokedexLateral () {
    listaLateral = crearListaPokemon($('#listaLateral'), $('#vacioLateral'), estado.pokedex.especies(), (id) => {
        if (estado.equipo.length) return
        mostrarFicha(ui.cards.jugador, crearLuchador(estado.pokedex, id, NIVEL_INICIAL))
    })
    ui.busquedaLateral.addEventListener('input', () => listaLateral.filtrar(ui.busquedaLateral.value))
}

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
    imagen: IMAGENES_LOCALES[id] ?? spritePokemon(id),
    texto: estado.pokedex.especie(id).nombre.toUpperCase(),
    valor: id
}))

const OPCION_BUSCAR = { texto: 'OTRO', detalle: 'BUSCAR', valor: 'buscar' }
const OPCION_AZAR = { texto: 'AL AZAR', detalle: '?', valor: 'azar' }

// Pregunta por un Pokémon: opciones fijas, búsqueda en la Pokédex o azar.
async function elegirPokemon ({ pregunta, sugeridos, titulo, permitirAzar, excluir = [] }) {
    const opciones = [...opcionesPokemon(sugeridos), ...(permitirAzar ? [OPCION_AZAR] : []), OPCION_BUSCAR]
    for (;;) {
        let eleccion = await decir(pregunta, opciones)
        if (eleccion === 'buscar') eleccion = await elegirEnPokedex({ titulo, permitirAzar })
        if (eleccion === 'azar') return pokemonAlAzar(estado.pokedex.especies(), { excluir })
        if (eleccion !== null) return eleccion
    }
}

function reiniciarPantalla () {
    estado.equipo = []
    ocultarEscena()
    limpiarFicha(ui.cards.jugador)
    limpiarFicha(ui.cards.rival)
    mostrarEnEntrenador()
    habilitarPokedex(true)
    actualizarEntrenador()
}

const crear = (id, nivel = NIVEL_INICIAL) => crearLuchador(estado.pokedex, id, nivel)

// Recrea el equipo guardado (descarta Pokémon que ya no existan en los datos).
function equipoGuardado () {
    const equipo = []
    for (const guardado of progreso.equipo) {
        try {
            equipo.push(crearLuchador(estado.pokedex, guardado.id, NIVEL_INICIAL, guardado))
        } catch (error) {
            console.error(error)
        }
    }
    return equipo.length === TAMANIO_EQUIPO ? equipo : []
}

function guardarEquipo () {
    progreso.equipo = estado.equipo.map(resumirLuchador)
    guardarProgreso(progreso)
}

const resumenEquipo = (equipo) => equipo.map((l) => `${l.nombre} (Nv.\u00a0${l.nivel})`).join(', ')

const nivelPromedio = (equipo) => Math.round(equipo.reduce((suma, l) => suma + l.nivel, 0) / equipo.length)

// Sugiere Pokémon al azar distintos de los excluidos.
function sugerencias (cantidad, excluir) {
    const elegidos = []
    for (let i = 0; i < cantidad; i++) elegidos.push(pokemonAlAzar(estado.pokedex.especies(), { excluir: [...excluir, ...elegidos] }))
    return elegidos
}

function mostrarEquipoEnArmado () {
    mostrarFicha(ui.cards.jugador, estado.equipo.at(-1))
    mostrarEquipo(ui.cards.jugador, estado.equipo, estado.equipo.length - 1)
    actualizarEntrenador()
}

// Si hay un equipo guardado, pregunta si seguir con él. Devuelve true si sigue.
async function ofrecerEquipoGuardado () {
    const equipo = equipoGuardado()
    if (!equipo.length) return false
    const seguir = await decir(TEXTOS.seguirEquipo(resumenEquipo(equipo)), [
        { texto: 'SEGUIR', detalle: 'MI EQUIPO', valor: true },
        { texto: 'NUEVO', detalle: 'ARMAR OTRO', valor: false }
    ])
    if (!seguir) return false
    habilitarPokedex(false)
    estado.equipo = equipo
    mostrarFicha(ui.cards.jugador, equipo[0])
    mostrarEquipo(ui.cards.jugador, equipo, 0)
    actualizarEntrenador()
    return true
}

async function armarEquipo () {
    const idInicial = await elegirPokemon({ pregunta: TEXTOS.elegirInicial, sugeridos: INICIALES, titulo: TEXTOS.tituloInicial })
    habilitarPokedex(false)
    estado.equipo = [crear(idInicial)]
    mostrarEquipoEnArmado()
    decirEntrenador(`¡Elijo a ${estado.equipo[0].nombre}!`)
    await decir(TEXTOS.buenaEleccion(estado.equipo[0].nombre))

    await decir(TEXTOS.equipo)
    while (estado.equipo.length < TAMANIO_EQUIPO) {
        const ids = estado.equipo.map((l) => l.id)
        const id = await elegirPokemon({
            pregunta: TEXTOS.elegirCompanero(estado.equipo.length),
            sugeridos: sugerencias(3, ids),
            titulo: TEXTOS.tituloCompanero,
            permitirAzar: true,
            excluir: ids
        })
        estado.equipo.push(crear(id))
        mostrarEquipoEnArmado()
        decirEntrenador(`¡${estado.equipo.at(-1).nombre}, te elijo!`)
    }
    mostrarFicha(ui.cards.jugador, estado.equipo[0])
    mostrarEquipo(ui.cards.jugador, estado.equipo, 0)
    await decir(TEXTOS.equipoListo(estado.equipo.map((l) => l.nombre).join(', ')))
}

async function armarEquipoRival () {
    const ids = estado.equipo.map((l) => l.id)
    const idRival = await elegirPokemon({
        pregunta: TEXTOS.elegirRival, sugeridos: RIVALES, titulo: TEXTOS.tituloRival, permitirAzar: true, excluir: ids
    })
    const nivel = Math.max(NIVEL_INICIAL, nivelPromedio(estado.equipo))
    const equipo = [idRival, ...sugerencias(TAMANIO_EQUIPO - 1, [...ids, idRival])].map((id) => crear(id, nivel))
    decirEntrenador(`¡Quiero combatir contra ${equipo[0].nombre}!`)
    return equipo
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

    if (!(await ofrecerEquipoGuardado())) {
        await armarEquipo()
        guardarEquipo()
    }
    await decir(TEXTOS.listo)
    await decir(TEXTOS.accion)
    await decir(TEXTOS.entrenamiento)

    const equipoRival = await armarEquipoRival()
    const combate = crearCombate(estado.equipo, equipoRival)
    const presentador = crearPresentador(ui.cards, { ocultarEquipo: { rival: true } })
    presentador.mostrarLado(combate, 'rival')
    await decir(TEXTOS.equipoRival(equipoRival[0].nombre))
    await decir(TEXTOS.consejoTipos)
    mostrarEnEntrenador()

    iniciarMusica('combate')
    const ganador = await jugarCombate({
        pokedex: estado.pokedex,
        combate,
        presentador,
        controladores: { jugador: crearControladorHumano(estado.pokedex), rival: crearControladorIA(estado.pokedex) },
        alDebilitarse: crearRepartoDeExperiencia(estado.pokedex, ui.cards.jugador)
    })
    const gano = ganador === 'jugador'
    detenerMusica()
    reproducir(gano ? 'victoria' : 'derrota')
    if (gano) progreso.victorias++
    else progreso.derrotas++
    // El equipo de combate es una copia: se traen los cambios (nivel, movimientos).
    estado.equipo = combate.jugador.equipo
    guardarEquipo()
    actualizarEntrenador()
    await decir(gano ? TEXTOS.ganaste(estado.nombre) : TEXTOS.perdiste(estado.nombre))

    await procesarEvoluciones(estado.pokedex, estado.equipo, ui.cards.jugador)
    estado.equipo.forEach(curar)
    guardarEquipo()
    mostrarFicha(ui.cards.jugador, estado.equipo[0])
    mostrarEquipo(ui.cards.jugador, estado.equipo, 0)
    actualizarEntrenador()
    reproducir('curar')
    await decir(TEXTOS.centro)
    iniciarMusica('menu')

    const jugarDeNuevo = await modal({
        icono: gano ? '★' : '✖',
        titulo: gano ? '¡GANASTE!' : '¡PERDISTE!',
        texto: '¿Deseas jugar nuevamente?',
        botones: [{ texto: '¡SÍ!', valor: true }, { texto: 'NO', valor: false }]
    })
    if (!jugarDeNuevo) await decir(TEXTOS.despedida, [{ texto: 'JUGAR DE NUEVO', valor: true }])
}

function prepararBotonSonido () {
    const boton = $('#botonSonido')
    boton.addEventListener('click', () => alternarSilencio())
    alCambiarSilencio((silenciado) => {
        boton.setAttribute('aria-pressed', String(silenciado))
        boton.textContent = silenciado ? '♪ SIN SONIDO' : '♪ SONIDO'
        boton.title = silenciado ? 'Activar el sonido' : 'Silenciar'
    })
}

async function iniciar () {
    prepararBotonSonido()
    iniciarMusica('menu')
    actualizarEntrenador()
    estado.pokedex = await cargarPokedexConReintento()
    prepararPokedexLateral()
    prepararSelector(estado.pokedex.especies())

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

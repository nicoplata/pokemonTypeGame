// Flujo del juego: une la lógica de combate con la interfaz.

import { TEXTOS } from './datos/textos.js'
import { IMAGENES_LOCALES, INICIALES, NIVEL_INICIAL, RIVALES, spritePokemon } from './datos/juego.js'
import { ENTRENADORES, TOTAL_MEDALLAS } from './datos/campania.js'
import { pokemonAlAzar } from './motor/busqueda.js'
import { aleatoriedad, especiesEntrenador, nivelEntrenador } from './motor/campania.js'
import { crearCombate } from './motor/equipos.js'
import { curar } from './motor/experiencia.js'
import { crearLuchador, resumirLuchador } from './motor/luchador.js'
import { crearPokedex } from './motor/pokedex.js'
import { cargarDatos } from './servicios/datos.js'
import { guardarProgreso, leerProgreso } from './servicios/progreso.js'
import { prepararBotonInstalar, registrarServiceWorker } from './servicios/pwa.js'
import { $ } from './ui/dom.js'
import {
    SIGUIENTE, alCambiarVelocidad, alternarVelocidad, decir, decirEntrenador, escribir, limpiarOpciones,
    mostrarEnEntrenador, mostrarOpciones, mostrarTextoInmediato
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
    trainerMedallas: $('#trainerMedallas'),
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
    ui.trainerMedallas.textContent = progreso.campania >= ENTRENADORES.length
        ? `${TOTAL_MEDALLAS}/${TOTAL_MEDALLAS} ★`
        : `${Math.min(progreso.campania, TOTAL_MEDALLAS)}/${TOTAL_MEDALLAS}`
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
        // Con un equipo armado, la consulta se muestra en la ficha de la derecha.
        const card = estado.equipo.length ? ui.cards.rival : ui.cards.jugador
        mostrarFicha(card, crearLuchador(estado.pokedex, id, NIVEL_INICIAL))
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

// Pide un nombre en el globo del entrenador. `alEscribir` recibe el texto
// mientras se escribe.
async function pedirNombre ({ pregunta = TEXTOS.preguntaNombre, valorInicial = progreso.nombre, alEscribir, validar } = {}) {
    limpiarOpciones()
    await escribir(pregunta)

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
    campoNombre.value = valorInicial
    formulario.append(etiqueta, campoNombre)
    mostrarEnEntrenador(formulario)

    if (alEscribir) campoNombre.addEventListener('input', () => alEscribir(campoNombre.value.trim().toUpperCase()))

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
        const error = !nombre ? TEXTOS.nombreInvalido : validar?.(nombre)
        if (!error) {
            mostrarEnEntrenador()
            return nombre
        }
        await modal({ icono: '!', titulo: '¡ATENCIÓN!', texto: error, botones: [{ texto: 'ACEPTAR', valor: true }] })
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

// Deja la pantalla lista para un combate o para el menú: sin escena ni
// rival, con el equipo del jugador (si tiene) en su ficha.
function limpiarPantalla () {
    ocultarEscena()
    limpiarFicha(ui.cards.rival)
    mostrarEnEntrenador()
    if (estado.equipo.length) {
        mostrarFicha(ui.cards.jugador, estado.equipo[0])
        mostrarEquipo(ui.cards.jugador, estado.equipo, 0)
    } else {
        limpiarFicha(ui.cards.jugador)
    }
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
    estado.equipo = equipo
    limpiarPantalla()
    return true
}

async function armarEquipo () {
    estado.equipo = []
    limpiarPantalla()
    const idInicial = await elegirPokemon({ pregunta: TEXTOS.elegirInicial, sugeridos: INICIALES, titulo: TEXTOS.tituloInicial })
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
    limpiarPantalla()
    await decir(TEXTOS.equipoListo(estado.equipo.map((l) => l.nombre).join(', ')))
    guardarEquipo()
}

// Antes de combatir hace falta un equipo: el actual, el guardado o uno nuevo.
async function asegurarEquipo () {
    if (estado.equipo.length) return
    if (await ofrecerEquipoGuardado()) return
    await armarEquipo()
}

// Combate contra un equipo rival controlado por la IA. Reparte experiencia,
// procesa evoluciones y cura al equipo al final. Devuelve true si gana.
async function combatirContraIA (equipoRival, { aleatoriedad = 0.2, presentacion = [] } = {}) {
    habilitarPokedex(false)
    const combate = crearCombate(estado.equipo, equipoRival)
    const presentador = crearPresentador(ui.cards, { ocultarEquipo: { rival: true } })
    presentador.mostrarLado(combate, 'rival')
    for (const texto of presentacion) await decir(texto)
    mostrarEnEntrenador()

    iniciarMusica('combate')
    const ganador = await jugarCombate({
        pokedex: estado.pokedex,
        combate,
        presentador,
        controladores: {
            jugador: crearControladorHumano(estado.pokedex),
            rival: crearControladorIA(estado.pokedex, { aleatoriedad })
        },
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
    return gano
}

async function despuesDelCombate () {
    await procesarEvoluciones(estado.pokedex, estado.equipo, ui.cards.jugador)
    estado.equipo.forEach(curar)
    guardarEquipo()
    limpiarPantalla()
    reproducir('curar')
    await decir(TEXTOS.centro)
    iniciarMusica('menu')
}

async function mostrarResultado (gano, texto) {
    await modal({
        icono: gano ? '★' : '✖',
        titulo: gano ? '¡GANASTE!' : '¡PERDISTE!',
        texto,
        botones: [{ texto: 'CONTINUAR', valor: true }]
    })
}

// ---------- Combate libre ----------

async function combateLibre () {
    await asegurarEquipo()
    await decir(TEXTOS.listo)
    await decir(TEXTOS.accion)
    await decir(TEXTOS.entrenamiento)

    const ids = estado.equipo.map((l) => l.id)
    const idRival = await elegirPokemon({
        pregunta: TEXTOS.elegirRival, sugeridos: RIVALES, titulo: TEXTOS.tituloRival, permitirAzar: true, excluir: ids
    })
    const nivel = Math.max(NIVEL_INICIAL, nivelPromedio(estado.equipo))
    const equipoRival = [idRival, ...sugerencias(TAMANIO_EQUIPO - 1, [...ids, idRival])].map((id) => crear(id, nivel))
    decirEntrenador(`¡Quiero combatir contra ${equipoRival[0].nombre}!`)

    const gano = await combatirContraIA(equipoRival, {
        presentacion: [TEXTOS.equipoRival(equipoRival[0].nombre), TEXTOS.consejoTipos]
    })
    await decir(gano ? TEXTOS.ganaste(estado.nombre) : TEXTOS.perdiste(estado.nombre))
    await despuesDelCombate()
    await mostrarResultado(gano, gano ? TEXTOS.ganaste(estado.nombre) : TEXTOS.perdiste(estado.nombre))
}

// ---------- Campaña ----------

async function jugarCampania () {
    await asegurarEquipo()
    const completa = progreso.campania >= ENTRENADORES.length
    const indice = Math.min(progreso.campania, ENTRENADORES.length - 1)
    const entrenador = ENTRENADORES[indice]
    const nivel = nivelEntrenador(entrenador, nivelPromedio(estado.equipo))
    const equipoRival = especiesEntrenador(estado.pokedex, entrenador, nivel).map((id) => crear(id, nivel))

    await decir(completa ? TEXTOS.revanchaCampeon(entrenador.nombre) : TEXTOS.desafio(entrenador, indice))
    const gano = await combatirContraIA(equipoRival, {
        aleatoriedad: aleatoriedad(entrenador),
        presentacion: [TEXTOS.frase(entrenador.nombre, entrenador.saludo), TEXTOS.envia(entrenador.nombre, equipoRival[0].nombre)]
    })

    let resumen
    if (gano) {
        await decir(TEXTOS.frase(entrenador.nombre, entrenador.derrota))
        if (!completa) {
            progreso.campania = indice + 1
            guardarProgreso(progreso)
            actualizarEntrenador()
        }
        resumen = indice === ENTRENADORES.length - 1 ? TEXTOS.campeon(estado.nombre) : TEXTOS.medalla(entrenador.medalla)
    } else {
        resumen = TEXTOS.derrotaCampania(entrenador.nombre)
    }
    await decir(resumen)
    await despuesDelCombate()
    await mostrarResultado(gano, resumen)
}

// ---------- Dos jugadores ----------

const NIVELES_DUELO = [10, 50, 100]

async function armarEquipoDuelo (nombre, nivel) {
    await decir(TEXTOS.armaTuEquipo(nombre))
    const equipo = []
    while (equipo.length < TAMANIO_EQUIPO) {
        const ids = equipo.map((l) => l.id)
        const id = await elegirPokemon({
            pregunta: TEXTOS.elegirParaDuelo(nombre, equipo.length + 1),
            sugeridos: sugerencias(3, ids),
            titulo: TEXTOS.tituloDuelo(nombre),
            permitirAzar: true,
            excluir: ids
        })
        equipo.push(crear(id, nivel))
    }
    return equipo
}

async function dosJugadores () {
    const uno = estado.nombre
    const dos = await pedirNombre({
        pregunta: TEXTOS.preguntaJugador2,
        valorInicial: '',
        validar: (nombre) => (nombre === uno ? TEXTOS.nombreRepetido : null)
    })
    const nivel = await decir(TEXTOS.elegirNivelDuelo, NIVELES_DUELO.map((n) => ({ texto: `NIVEL ${n}`, valor: n })))

    // Los equipos del duelo son aparte: no usan ni modifican el equipo guardado.
    const equipoUno = await armarEquipoDuelo(uno, nivel)
    const equipoDos = await armarEquipoDuelo(dos, nivel)

    const mensajes = { sufijos: { jugador: ` de ${uno}`, rival: ` de ${dos}` }, entrenadores: { jugador: uno, rival: dos } }
    const combate = crearCombate(equipoUno, equipoDos)
    const presentador = crearPresentador(ui.cards, { mensajes })
    await decir(TEXTOS.comienzaDuelo(uno, dos))

    iniciarMusica('combate')
    const ganador = await jugarCombate({
        pokedex: estado.pokedex,
        combate,
        presentador,
        controladores: {
            jugador: crearControladorHumano(estado.pokedex, { prefijo: uno, privado: true, silencioso: true }),
            rival: crearControladorHumano(estado.pokedex, { prefijo: dos, privado: true, silencioso: true })
        }
    })
    detenerMusica()
    reproducir('victoria')
    const nombreGanador = ganador === 'jugador' ? uno : dos
    await decir(TEXTOS.ganaDuelo(nombreGanador))
    iniciarMusica('menu')
    await modal({
        icono: '★',
        titulo: `¡GANÓ ${nombreGanador}!`,
        texto: TEXTOS.ganaDuelo(nombreGanador),
        botones: [{ texto: 'CONTINUAR', valor: true }]
    })
}

// ---------- Menú ----------

async function menu () {
    limpiarPantalla()
    habilitarPokedex(true)
    const medallas = Math.min(progreso.campania, TOTAL_MEDALLAS)
    const opciones = [
        {
            texto: 'CAMPAÑA',
            detalle: progreso.campania >= ENTRENADORES.length ? 'CAMPEÓN' : `MEDALLAS ${medallas}/${TOTAL_MEDALLAS}`,
            valor: 'campania'
        },
        { texto: 'COMBATE LIBRE', detalle: 'ELEGÍS RIVAL', valor: 'libre' },
        { texto: 'DOS JUGADORES', detalle: 'MISMA PANTALLA', valor: 'dos' }
    ]
    if (estado.equipo.length || equipoGuardado().length) opciones.push({ texto: 'NUEVO EQUIPO', detalle: 'ARMAR OTRO', valor: 'equipo' })
    const eleccion = await decir(TEXTOS.menu(estado.nombre), opciones)
    habilitarPokedex(false)
    if (eleccion === 'campania') await jugarCampania()
    else if (eleccion === 'libre') await combateLibre()
    else if (eleccion === 'dos') await dosJugadores()
    else await armarEquipo()
}

async function introduccion () {
    await decir(TEXTOS.bienvenida)
    estado.nombre = await pedirNombre({ alEscribir: (texto) => { ui.trainerName.textContent = texto || '-' } })
    progreso.nombre = estado.nombre
    guardarProgreso(progreso)
    actualizarEntrenador()
    await decir(TEXTOS.saludo(estado.nombre))
    await decir(TEXTOS.camino)
    await decir(TEXTOS.decision)
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

function prepararBotonTexto () {
    const boton = $('#botonTexto')
    boton.addEventListener('click', () => alternarVelocidad())
    alCambiarVelocidad((velocidad) => { boton.textContent = `» TEXTO: ${velocidad.nombre}` })
}

async function iniciar () {
    // En el celular la Pokédex empieza plegada para dejar el juego a la vista.
    if (window.matchMedia('(max-width: 760px)').matches) $('#pokedexList').open = false
    prepararBotonTexto()
    registrarServiceWorker()
    prepararBotonInstalar($('#botonInstalar'))
    prepararBotonSonido()
    iniciarMusica('menu')
    actualizarEntrenador()
    estado.pokedex = await cargarPokedexConReintento()
    prepararPokedexLateral()
    habilitarPokedex(true)
    prepararSelector(estado.pokedex.especies())

    await introduccion()
    for (;;) await menu()
}

iniciar().catch((error) => {
    console.error(error)
    mostrarTextoInmediato('Ocurrió un error inesperado. Recargá la página para volver a jugar.')
})

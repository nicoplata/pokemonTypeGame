'use strict'

// ============================================================
//  Referencias a la página
// ============================================================

const $ = (selector) => document.querySelector(selector)

const ui = {
    chatOak: $('#chatOak'),
    burbujaOak: $('#oakChat .bubble'),
    chatTrainer: $('#chatTrainer'),
    anuncio: $('#anuncio'),
    answers: $('#answers'),
    trainerName: $('#trainerName'),
    trainerPokemon: $('#trainerPokemon'),
    trainerRecord: $('#trainerRecord'),
    listHint: $('#listHint'),
    pokedexLinks: document.querySelectorAll('.pokemonLink'),
    cardJugador: $('#cardJugador'),
    cardRival: $('#cardRival'),
    modal: $('#modal'),
    modalIcon: $('#modalIcon'),
    modalTitle: $('#modalTitle'),
    modalText: $('#modalText'),
    modalButtons: $('#modalButtons')
}

const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ============================================================
//  Progreso guardado (localStorage)
// ============================================================

const CLAVE_GUARDADO = 'pokemonTypeGame'

function leerProgreso () {
    const vacio = { nombre: '', victorias: 0, derrotas: 0 }
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_GUARDADO))
        if (!datos || typeof datos !== 'object') return vacio
        return {
            nombre: typeof datos.nombre === 'string' ? datos.nombre : '',
            victorias: Number.isInteger(datos.victorias) ? datos.victorias : 0,
            derrotas: Number.isInteger(datos.derrotas) ? datos.derrotas : 0
        }
    } catch {
        return vacio
    }
}

function guardarProgreso () {
    try {
        localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(progreso))
    } catch {
        // Sin acceso a localStorage (modo privado, permisos): el juego sigue igual.
    }
}

const progreso = leerProgreso()

// ============================================================
//  PokéAPI
// ============================================================

const cachePokemon = new Map()

// Devuelve los datos de un Pokémon. Guarda la promesa en caché para no
// repetir pedidos; si el pedido falla se borra para poder reintentar.
function cargarPokemon (id) {
    if (!cachePokemon.has(id)) {
        const pedido = pedirPokemon(id)
        cachePokemon.set(id, pedido)
        pedido.catch(() => cachePokemon.delete(id))
    }
    return cachePokemon.get(id)
}

async function pedirPokemon (id) {
    const respuesta = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
    if (!respuesta.ok) throw new Error(`PokéAPI respondió ${respuesta.status} para "${id}"`)
    const datos = await respuesta.json()

    const stat = (nombre) => datos.stats.find((s) => s.stat.name === nombre)?.base_stat ?? 1
    const sprites = datos.sprites ?? {}

    return {
        id,
        nombre: datos.name.toUpperCase(),
        imagen: sprites.other?.home?.front_default ||
            sprites.other?.['official-artwork']?.front_default ||
            sprites.front_default ||
            IMAGENES[id] || '',
        saludBase: stat('hp'),
        ataque: stat('attack'),
        velocidad: stat('speed'),
        tipos: [...datos.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name)
    }
}

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
//  Lógica de combate (sin acceso al DOM)
// ============================================================

function crearLuchador (datos) {
    const saludMax = datos.saludBase * MULTIPLICADOR_SALUD
    const pp = {}
    for (const [clave, ataque] of Object.entries(ATAQUES)) pp[clave] = ataque.pp
    return { ...datos, saludMax, salud: saludMax, pp }
}

function efectividad (tipoAtaque, tiposDefensor) {
    return tiposDefensor.reduce((total, tipo) => total * (EFECTIVIDAD[tipoAtaque]?.[tipo] ?? 1), 1)
}

function calcularAtaque (atacante, defensor, clave, azar = Math.random) {
    const ataque = ATAQUES[clave]
    if (azar() >= ataque.precision) return { acierto: false, danio: 0, multiplicador: 1 }

    const multiplicador = ataque.usaTipo ? efectividad(atacante.tipos[0], defensor.tipos) : 1
    if (multiplicador === 0) return { acierto: true, danio: 0, multiplicador }

    const variacion = 0.85 + azar() * 0.15
    const danio = Math.max(1, Math.round(atacante.ataque * ataque.potencia * multiplicador * variacion))
    return { acierto: true, danio, multiplicador }
}

// El rival elige al azar entre los ataques que le quedan, prefiriendo el
// especial cuando es súper eficaz y evitándolo cuando no conviene.
function eleccionRival (rival, jugador) {
    const disponibles = Object.keys(ATAQUES).filter((clave) => rival.pp[clave] > 0)
    const multiplicador = efectividad(rival.tipos[0], jugador.tipos)

    if (disponibles.includes('especial')) {
        if (multiplicador > 1 && Math.random() < 0.6) return 'especial'
        if (multiplicador < 1 && disponibles.length > 1) disponibles.splice(disponibles.indexOf('especial'), 1)
    }
    return disponibles[Math.floor(Math.random() * disponibles.length)]
}

function nombreEnCombate (luchador, esRival) {
    return esRival ? `${luchador.nombre} rival` : luchador.nombre
}

function mensajeAtaque (atacante, defensor, clave, resultado, esRival) {
    const quien = nombreEnCombate(atacante, esRival)
    const ataque = ATAQUES[clave].nombre
    if (!resultado.acierto) return `${quien} usó ${ataque}... ¡pero falló!`
    if (resultado.multiplicador === 0) {
        return `${quien} usó ${ataque}. No afecta a ${nombreEnCombate(defensor, !esRival)}...`
    }
    let efecto = ''
    if (resultado.multiplicador > 1) efecto = ' ¡Es súper eficaz!'
    else if (resultado.multiplicador < 1) efecto = ' No es muy eficaz...'
    return `${quien} usó ${ataque}.${efecto} Hizo ${resultado.danio} de daño.`
}

// ============================================================
//  Interfaz: fichas de Pokémon
// ============================================================

const campo = (card, nombre) => card.querySelector(`[data-campo="${nombre}"]`)

const nombreTipos = (tipos) => tipos.map((t) => TIPOS_ES[t] ?? t.toUpperCase()).join(' / ')

function mostrarFicha (card, luchador) {
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

function actualizarSalud (card, luchador) {
    campo(card, 'salud').textContent = `${luchador.salud}/${luchador.saludMax}`
    const porcentaje = (luchador.salud / luchador.saludMax) * 100
    const barra = campo(card, 'barra')
    barra.style.width = `${porcentaje}%`
    barra.classList.toggle('medio', porcentaje <= 50 && porcentaje > 20)
    barra.classList.toggle('bajo', porcentaje <= 20)
}

function limpiarFicha (card) {
    for (const nombre of ['nombre', 'salud', 'ataque', 'velocidad', 'tipo']) campo(card, nombre).textContent = '-'
    const imagen = campo(card, 'imagen')
    imagen.removeAttribute('src')
    imagen.alt = ''
    imagen.hidden = true
    const barra = campo(card, 'barra')
    barra.style.width = '0%'
    barra.classList.remove('medio', 'bajo')
}

function animarGolpe (card) {
    if (reducirMovimiento) return
    const imagen = campo(card, 'imagen')
    imagen.classList.remove('golpe')
    void imagen.offsetWidth // reinicia la animación si ya estaba aplicada
    imagen.classList.add('golpe')
}

campo(ui.cardJugador, 'imagen').addEventListener('animationend', (e) => e.target.classList.remove('golpe'))
campo(ui.cardRival, 'imagen').addEventListener('animationend', (e) => e.target.classList.remove('golpe'))

// ============================================================
//  Interfaz: diálogo, opciones y ventana modal
// ============================================================

let turnoEscritura = 0
let saltarEscritura = false

ui.burbujaOak.addEventListener('click', () => { saltarEscritura = true })

function mostrarTextoInmediato (texto) {
    turnoEscritura++
    ui.answers.replaceChildren()
    ui.chatOak.textContent = texto
    ui.anuncio.textContent = texto
}

// Escribe el texto del profesor letra por letra (tocar el globo lo completa).
async function escribir (texto) {
    const turno = ++turnoEscritura
    saltarEscritura = false
    ui.anuncio.textContent = texto

    if (!reducirMovimiento) {
        for (let i = 1; i < texto.length; i++) {
            if (turno !== turnoEscritura) return
            if (saltarEscritura) break
            ui.chatOak.textContent = texto.slice(0, i)
            await esperar(18)
        }
    }
    if (turno === turnoEscritura) ui.chatOak.textContent = texto
}

const SIGUIENTE = [{ imagen: './img/arrowRight.png', etiqueta: 'Continuar', valor: true }]

// Muestra botones y devuelve una promesa con el valor del que se toque.
function mostrarOpciones (opciones) {
    return new Promise((resolve) => {
        const botones = opciones.map((opcion) => {
            const boton = document.createElement('button')
            boton.type = 'button'
            boton.className = 'option'
            boton.disabled = Boolean(opcion.deshabilitado)
            if (opcion.titulo) boton.title = opcion.titulo
            if (opcion.etiqueta) boton.setAttribute('aria-label', opcion.etiqueta)

            if (opcion.imagen) {
                const imagen = document.createElement('img')
                imagen.src = opcion.imagen
                imagen.alt = ''
                boton.append(imagen)
            }
            if (opcion.texto) {
                const texto = document.createElement('span')
                texto.className = 'optionText'
                texto.textContent = opcion.texto
                boton.append(texto)
            }
            if (opcion.detalle) {
                const detalle = document.createElement('span')
                detalle.className = 'optionDetail'
                detalle.textContent = opcion.detalle
                boton.append(detalle)
            }

            boton.addEventListener('click', () => {
                ui.answers.replaceChildren()
                resolve(opcion.valor)
            })
            return boton
        })

        ui.answers.replaceChildren(...botones)
        botones.find((b) => !b.disabled)?.focus({ preventScroll: true })
    })
}

// El profesor dice algo y espera a que el jugador elija una opción.
async function decir (texto, opciones = SIGUIENTE) {
    ui.answers.replaceChildren()
    await escribir(texto)
    return mostrarOpciones(opciones)
}

function decirEntrenador (texto) {
    const parrafo = document.createElement('p')
    parrafo.textContent = texto
    ui.chatTrainer.replaceChildren(parrafo)
}

function modal ({ icono = '', titulo, texto, botones, valorAlCancelar = botones.at(-1).valor }) {
    return new Promise((resolve) => {
        let resuelto = false
        const terminar = (valor) => {
            if (resuelto) return
            resuelto = true
            if (ui.modal.open) ui.modal.close()
            resolve(valor)
        }

        ui.modalIcon.textContent = icono
        ui.modalTitle.textContent = titulo
        ui.modalText.textContent = texto
        ui.modalButtons.replaceChildren(...botones.map((b) => {
            const boton = document.createElement('button')
            boton.type = 'button'
            boton.textContent = b.texto
            boton.addEventListener('click', () => terminar(b.valor))
            return boton
        }))
        ui.modal.oncancel = () => terminar(valorAlCancelar)

        ui.modal.showModal()
        ui.modalButtons.firstChild.focus()
    })
}

// ============================================================
//  Interfaz: entrenador y Pokédex lateral
// ============================================================

const estado = {
    nombre: '',
    jugador: null,
    rival: null
}

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

// ============================================================
//  Flujo del juego
// ============================================================

async function pedirNombre () {
    ui.answers.replaceChildren()
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
    ui.chatTrainer.replaceChildren(formulario)

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
        ui.answers.replaceChildren()

        const nombre = campoNombre.value.trim().toUpperCase()
        if (nombre) {
            ui.chatTrainer.replaceChildren()
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
        const detalle = ataque.usaTipo
            ? `${TIPOS_ES[luchador.tipos[0]] ?? luchador.tipos[0].toUpperCase()} ${pp}/${ataque.pp}`
            : precision
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
    const jugadorPrimero = jugador.velocidad > rival.velocidad ||
        (jugador.velocidad === rival.velocidad && Math.random() < 0.5)

    const acciones = [
        { atacante: jugador, defensor: rival, clave: claveJugador, esRival: false, cardDefensor: ui.cardRival },
        { atacante: rival, defensor: jugador, clave: claveRival, esRival: true, cardDefensor: ui.cardJugador }
    ]
    if (!jugadorPrimero) acciones.reverse()

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
    ui.chatTrainer.replaceChildren()
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
        guardarProgreso()
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
    ui.chatTrainer.replaceChildren()
    await decir(TEXTOS.consejoTipos)

    const gano = await combate()
    if (gano) progreso.victorias++
    else progreso.derrotas++
    guardarProgreso()
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

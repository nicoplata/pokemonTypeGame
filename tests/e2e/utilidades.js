// Ayudas compartidas por los tests e2e. Las respuestas de PokéAPI se
// simulan para que los tests no dependan de la red.

import { expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// Prepara la página: bloquea recursos externos y sirve las imágenes de
// PokéAPI desde una imagen local. `fallosDatos` indica cuántas veces debe
// fallar la carga de la Pokédex antes de responder.
// `progreso` (opcional) se guarda en localStorage antes de abrir la página.
export async function prepararPagina (page, { fallosDatos = 0, progreso = null } = {}) {
    const errores = []
    page.on('pageerror', (e) => errores.push(e.message))
    page.on('console', (m) => {
        if (m.type() !== 'error') return
        const texto = m.text()
        if (texto.includes('No se pudo cargar la Pokédex') || texto.includes('Failed to load resource')) return
        errores.push(texto)
    })

    let pendientes = fallosDatos
    const imagen = await readFile('img/arrowRight.png')
    await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: '' }))
    await page.route('https://fonts.gstatic.com/**', (r) => r.abort())
    await page.route('https://raw.githubusercontent.com/PokeAPI/sprites/**', (r) => r.fulfill({ contentType: 'image/png', body: imagen }))
    await page.route('**/data/pokedex.json', (r) => {
        if (pendientes > 0) {
            pendientes--
            return r.fulfill({ status: 500, body: 'error' })
        }
        return r.continue()
    })
    if (progreso) {
        await page.addInitScript((datos) => {
            if (!sessionStorage.getItem('progresoCargado')) {
                localStorage.setItem('pokemonTypeGame', datos)
                sessionStorage.setItem('progresoCargado', '1')
            }
        }, JSON.stringify(progreso))
    }
    await page.goto('/')
    return errores
}

export const textoOak = (page) => page.locator('#chatOak')
export const botones = (page) => page.locator('#answers button')
export const continuar = (page) => page.locator('#answers button[aria-label="Continuar"]').click()

export async function esperarTexto (page, texto) {
    await expect(textoOak(page)).toContainText(texto)
}

export async function avanzar (page, ...textos) {
    for (const texto of textos) {
        await esperarTexto(page, texto)
        await continuar(page)
    }
}

// Elige un Pokémon en las opciones: por nombre, o buscándolo con "buscar:nombre".
export async function elegirPokemon (page, eleccion) {
    if (eleccion.startsWith('buscar:')) {
        await botones(page).filter({ hasText: 'OTRO' }).click()
        await page.locator('#selectorBusqueda').fill(eleccion.slice(7))
        await page.locator('#selectorBusqueda').press('Enter')
    } else {
        await botones(page).filter({ hasText: eleccion.toUpperCase() }).first().click()
    }
}

// La introducción: nombre y presentación del profesor, hasta el menú.
export async function introducir (page, nombre = 'ASH') {
    await avanzar(page, 'Bienvenido')
    await esperarTexto(page, 'llamas')
    await page.locator('#nameInput').fill(nombre)
    await continuar(page)
    await avanzar(page, 'conocerte', 'camino', 'ligera')
    await esperarTexto(page, 'Qué quieres hacer')
}

export const elegirModo = (page, modo) => botones(page).filter({ hasText: modo }).first().click()

// Arma un equipo nuevo con el inicial dado y dos compañeros al azar.
export async function armarEquipoNuevo (page, inicial) {
    await esperarTexto(page, 'eliges')
    await elegirPokemon(page, inicial)
    await avanzar(page, 'Excelente', 'nunca viaja solo')
    for (const numero of [1, 2]) {
        await esperarTexto(page, `número ${numero}`)
        await elegirPokemon(page, 'AL AZAR')
    }
    await avanzar(page, 'equipo está listo')
}

// Desde el inicio hasta tener el equipo armado en el combate libre.
export async function armarEquipo (page, { nombre = 'ASH', inicial }) {
    await introducir(page, nombre)
    await elegirModo(page, 'COMBATE LIBRE')
    await armarEquipoNuevo(page, inicial)
}

// Juega desde el inicio hasta el primer turno de un combate libre.
export async function llegarAlCombate (page, { nombre = 'ASH', inicial, rival }) {
    await armarEquipo(page, { nombre, inicial })
    await elegirRivalLibre(page, rival)
}

// En el combate libre, después de tener equipo: elige rival y llega al primer turno.
export async function elegirRivalLibre (page, rival) {
    await avanzar(page, 'listo', 'acción', 'entrenamiento')
    await esperarTexto(page, 'combatir')
    await elegirPokemon(page, rival)
    await avanzar(page, 'también tendrá un equipo', 'Recuerda')
    await esperarTexto(page, 'usarás primero')
}

// Pelea eligiendo el movimiento que contiene `preferido` (o el primero
// disponible) hasta que aparece la ventana con el resultado.
export async function pelear (page, preferido = '') {
    const modal = page.locator('#modal[open]')
    for (let i = 0; i < 200; i++) {
        await expect(botones(page).first().or(modal)).toBeVisible()
        if (await modal.isVisible()) return
        const deDanio = page.locator('#answers button.movimiento.deDanio:enabled')
        const movimientos = (await deDanio.count()) ? deDanio : page.locator('#answers button.movimiento:enabled')
        if (await movimientos.count()) {
            const elegido = movimientos.filter({ hasText: preferido })
            await ((preferido && await elegido.count()) ? elegido.first() : movimientos.first()).click()
        } else {
            await botones(page).first().click()
        }
    }
    throw new Error('El combate no terminó')
}

// Ayudas compartidas por los tests e2e. Las respuestas de PokéAPI se
// simulan para que los tests no dependan de la red.

import { expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

export const POKEMON = {
    bulbasaur: { hp: 45, atk: 49, spe: 45, tipos: ['grass', 'poison'], img: '001bulbasaur' },
    charmander: { hp: 39, atk: 52, spe: 65, tipos: ['fire'], img: '004charmander' },
    squirtle: { hp: 44, atk: 48, spe: 43, tipos: ['water'], img: '007squirtle' },
    chikorita: { hp: 45, atk: 49, spe: 45, tipos: ['grass'], img: '152chikorita' },
    cyndaquil: { hp: 39, atk: 52, spe: 65, tipos: ['fire'], img: '155cyndaquil' },
    totodile: { hp: 50, atk: 65, spe: 43, tipos: ['water'], img: '158totodile' }
}

// Prepara la página: bloquea recursos externos y simula PokéAPI.
// `fallos` indica cuántas veces debe fallar cada Pokémon antes de responder.
export async function prepararPagina (page, { fallos = {} } = {}) {
    const errores = []
    page.on('pageerror', (e) => errores.push(e.message))
    page.on('console', (m) => {
        if (m.type() !== 'error') return
        const texto = m.text()
        if (texto.includes('PokéAPI respondió') || texto.includes('Failed to load resource')) return
        errores.push(texto)
    })

    const pendientes = { ...fallos }
    await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: '' }))
    await page.route('https://fonts.gstatic.com/**', (r) => r.abort())
    await page.route('https://sprites.test/**', async (r) => {
        const nombre = new URL(r.request().url()).pathname.slice(1)
        r.fulfill({ contentType: 'image/png', body: await readFile(`img/${nombre}`) })
    })
    await page.route('https://pokeapi.co/api/v2/pokemon/*', (r) => {
        const id = r.request().url().split('/').pop()
        if (pendientes[id] > 0) {
            pendientes[id]--
            return r.fulfill({ status: 500, body: 'error' })
        }
        const p = POKEMON[id]
        if (!p) return r.fulfill({ status: 404, body: 'Not Found' })
        r.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
                name: id,
                sprites: { front_default: null, other: { home: { front_default: `https://sprites.test/${p.img}.png` } } },
                stats: [
                    { base_stat: p.hp, stat: { name: 'hp' } },
                    { base_stat: p.atk, stat: { name: 'attack' } },
                    { base_stat: 50, stat: { name: 'defense' } },
                    { base_stat: p.spe, stat: { name: 'speed' } }
                ],
                types: p.tipos.map((t, i) => ({ slot: i + 1, type: { name: t } }))
            })
        })
    })
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

// Juega desde el inicio hasta el primer turno del combate.
export async function llegarAlCombate (page, { nombre = 'ASH', inicial, rival }) {
    await avanzar(page, 'Bienvenido')
    await esperarTexto(page, 'llamas')
    await page.locator('#nameInput').fill(nombre)
    await continuar(page)
    await avanzar(page, 'conocerte', 'camino', 'ligera')
    await esperarTexto(page, 'eliges')
    await botones(page).filter({ hasText: inicial.toUpperCase() }).click()
    await avanzar(page, 'Excelente', 'listo', 'acción', 'entrenamiento')
    await esperarTexto(page, 'combatir')
    await botones(page).filter({ hasText: rival.toUpperCase() }).click()
    await avanzar(page, 'Recuerda')
    await esperarTexto(page, 'primer ataque')
}

// Pelea eligiendo siempre `preferido` (o PESADO si no le quedan PP) hasta
// que aparece la ventana con el resultado.
export async function pelear (page, preferido) {
    const modal = page.locator('#modal[open]')
    for (let i = 0; i < 100; i++) {
        if (await modal.isVisible()) return
        await expect(botones(page).first().or(modal)).toBeVisible()
        if (await modal.isVisible()) return
        const textos = await botones(page).allTextContents()
        if (textos.some((t) => t.startsWith('RÁPIDO'))) {
            let boton = botones(page).filter({ hasText: preferido })
            if (await boton.isDisabled()) boton = botones(page).filter({ hasText: 'PESADO' })
            await boton.click()
        } else {
            await botones(page).first().click()
        }
    }
    throw new Error('El combate no terminó')
}

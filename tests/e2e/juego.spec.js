import { expect, test } from '@playwright/test'
import { avanzar, botones, continuar, esperarTexto, llegarAlCombate, pelear, prepararPagina, textoOak } from './utilidades.js'

test('valida el nombre y lo muestra como texto', async ({ page }) => {
    const errores = await prepararPagina(page)
    await avanzar(page, 'Bienvenido')
    await esperarTexto(page, 'llamas')
    await continuar(page)
    await expect(page.locator('#modalTitle')).toHaveText('¡ATENCIÓN!')
    await page.locator('#modalButtons button').click()
    await page.locator('#nameInput').fill('<i>ab</i>')
    await expect(page.locator('#trainerName')).toHaveText('<I>AB</I>')
    await page.locator('#nameInput').fill('nico')
    await page.locator('#nameInput').press('Enter')
    await esperarTexto(page, 'conocerte, NICO')
    await expect(botones(page)).toHaveCount(1)
    expect(errores).toEqual([])
})

test('la Pokédex lateral muestra datos y se bloquea al elegir inicial', async ({ page }) => {
    const errores = await prepararPagina(page)
    await esperarTexto(page, 'Bienvenido')
    await page.locator('.pokemonLink[data-pokemon="7"]').click()
    await expect(page.locator('#cardJugador [data-campo="nombre"]')).toHaveText('SQUIRTLE')
    await llegarAlCombate(page, { inicial: 'charmander', rival: 'chikorita' })
    await expect(page.locator('.pokemonLink').first()).toBeDisabled()
    await expect(page.locator('#trainerPokemon')).toHaveText('CHARMANDER')
    await expect(page.locator('#cardJugador [data-campo="salud"]')).toHaveText('78/78')
    await expect(page.locator('#cardJugador [data-campo="tipo"]')).toHaveText('FUEGO')
    await expect(page.locator('#cardJugador [data-campo="nivel"]')).toHaveText('10')
    await expect(page.locator('#answers button.movimiento')).toHaveText(['ARAÑAZONORMAL 35/35', 'ASCUASFUEGO 25/25'])
    expect(errores).toEqual([])
})

test('ofrece reintentar si falla la carga de la Pokédex', async ({ page }) => {
    const errores = await prepararPagina(page, { fallosDatos: 1 })
    await esperarTexto(page, 'No pude cargar la Pokédex')
    await botones(page).filter({ hasText: 'REINTENTAR' }).click()
    await esperarTexto(page, 'Bienvenido')
    expect(errores).toEqual([])
})

const combinaciones = [
    ['charmander', 'chikorita', 'ASCUAS'],
    ['bulbasaur', 'cyndaquil', 'LÁTIGO CEPA'],
    ['squirtle', 'totodile', 'PISTOLA AGUA']
]

for (const [inicial, rival, ataque] of combinaciones) {
    test(`combate completo: ${inicial} contra ${rival}`, async ({ page }) => {
        const errores = await prepararPagina(page)
        await llegarAlCombate(page, { inicial, rival })
        await expect(page.locator('#answers button.movimiento').first()).toBeVisible()
        await pelear(page, ataque)

        const titulo = await page.locator('#modalTitle').textContent()
        const saludJugador = await page.locator('#cardJugador [data-campo="salud"]').textContent()
        const saludRival = await page.locator('#cardRival [data-campo="salud"]').textContent()
        if (titulo === '¡GANASTE!') {
            expect(saludRival).toMatch(/^0\//)
            expect(saludJugador).not.toMatch(/^0\//)
            await expect(page.locator('#trainerRecord')).toHaveText('1V - 0D')
        } else {
            expect(titulo).toBe('¡PERDISTE!')
            expect(saludJugador).toMatch(/^0\//)
            await expect(page.locator('#trainerRecord')).toHaveText('0V - 1D')
        }

        await page.locator('#modalButtons button').filter({ hasText: 'NO' }).click()
        await esperarTexto(page, 'Vuelve cuando')
        await botones(page).filter({ hasText: 'JUGAR DE NUEVO' }).click()
        await esperarTexto(page, 'Hola de nuevo, ASH')
        await expect(page.locator('.pokemonLink').first()).toBeEnabled()
        await expect(page.locator('#cardRival [data-campo="nombre"]')).toHaveText('-')
        expect(errores).toEqual([])
    })
}

test('Escape en la ventana final equivale a NO', async ({ page }) => {
    await prepararPagina(page)
    await llegarAlCombate(page, { inicial: 'squirtle', rival: 'cyndaquil' })
    await pelear(page)
    await page.keyboard.press('Escape')
    await esperarTexto(page, 'Vuelve cuando')
})

test('el récord se conserva al recargar', async ({ page }) => {
    await prepararPagina(page)
    await llegarAlCombate(page, { inicial: 'charmander', rival: 'chikorita' })
    await pelear(page)
    const record = await page.locator('#trainerRecord').textContent()
    await page.reload()
    await expect(page.locator('#trainerRecord')).toHaveText(record)
    await esperarTexto(page, 'Bienvenido')
    await continuar(page)
    await expect(page.locator('#nameInput')).toHaveValue('ASH')
})

test('sin scroll horizontal', async ({ page }) => {
    await prepararPagina(page)
    await esperarTexto(page, 'Bienvenido')
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(ancho).toBeLessThanOrEqual(0)
})

test('el texto aparece letra por letra y tocar el globo lo completa', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await prepararPagina(page)
    await expect(textoOak(page)).not.toHaveText('')
    await page.locator('#oakChat .bubble').click()
    await expect(textoOak(page)).toHaveText('¡Bienvenido a mi laboratorio!')
    await expect(botones(page)).toHaveCount(1)
})

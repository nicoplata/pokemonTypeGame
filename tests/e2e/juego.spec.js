import { expect, test } from '@playwright/test'
import {
    armarEquipoNuevo, avanzar, botones, continuar, elegirModo, elegirPokemon, esperarTexto, introducir, llegarAlCombate,
    pelear, prepararPagina, textoOak
} from './utilidades.js'

const continuarModal = (page) => page.locator('#modalButtons button').filter({ hasText: 'CONTINUAR' }).click()

// Con un equipo guardado: introducción, modo y "SEGUIR" con ese equipo.
async function seguirConEquipoGuardado (page, modo = 'COMBATE LIBRE') {
    await introducir(page)
    await elegirModo(page, modo)
    await esperarTexto(page, 'ya tienes un equipo')
    await botones(page).filter({ hasText: 'SEGUIR' }).click()
}

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
    await page.locator('#listaLateral button[data-pokemon="7"]').click()
    await expect(page.locator('#cardJugador [data-campo="nombre"]')).toHaveText('SQUIRTLE')
    await llegarAlCombate(page, { inicial: 'charmander', rival: 'chikorita' })
    await expect(page.locator('#listaLateral button').first()).toBeDisabled()
    await expect(page.locator('#busquedaLateral')).toBeDisabled()
    await expect(page.locator('#trainerPokemon')).toContainText('CHARMANDER')
    await expect(page.locator('#cardJugador .equipoIndicador li')).toHaveCount(3)
    await expect(page.locator('#cardRival .equipoIndicador li.pokebola')).toHaveCount(3)
    await expect(page.locator('#cardJugador [data-campo="salud"]')).toHaveText('25/25')
    await expect(page.locator('#cardJugador [data-campo="tipo"]')).toHaveText('FUEGO')
    await expect(page.locator('#cardJugador [data-campo="nivel"]')).toHaveText('8')
    await expect(page.locator('#answers button.movimiento')).toHaveText(['ARAÑAZONORMAL 35/35', 'GRUÑIDONORMAL 40/40', 'ASCUASFUEGO 25/25'])
    await expect(page.locator('#answers button.movimiento.deEstado')).toHaveText(['GRUÑIDONORMAL 40/40'])
    await expect(page.locator('#cardJugador [data-campo="estado"]')).toHaveText('-')
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
        if (titulo === '¡GANASTE!') {
            await expect(page.locator('#trainerRecord')).toHaveText('1V - 0D')
        } else {
            expect(titulo).toBe('¡PERDISTE!')
            await expect(page.locator('#trainerRecord')).toHaveText('0V - 1D')
        }
        // Después del combate el equipo queda curado.
        await expect(page.locator('#cardJugador .equipoIndicador li.debilitado')).toHaveCount(0)

        await continuarModal(page)
        // Vuelve al menú, con el equipo armado y la Pokédex disponible.
        await esperarTexto(page, 'Qué quieres hacer, ASH')
        await expect(page.locator('#listaLateral button').first()).toBeEnabled()
        await expect(page.locator('#cardRival [data-campo="nombre"]')).toHaveText('-')
        await expect(botones(page)).toHaveText(['CAMPAÑAMEDALLAS 0/8', 'COMBATE LIBREELEGÍS RIVAL', 'NUEVO EQUIPOARMAR OTRO'])
        // El siguiente combate libre usa el mismo equipo sin preguntar.
        await elegirModo(page, 'COMBATE LIBRE')
        await esperarTexto(page, 'listo')
        expect(errores).toEqual([])
    })
}

test('Escape en la ventana final vuelve al menú', async ({ page }) => {
    await prepararPagina(page)
    await llegarAlCombate(page, { inicial: 'squirtle', rival: 'cyndaquil' })
    await pelear(page)
    await page.keyboard.press('Escape')
    await esperarTexto(page, 'Qué quieres hacer')
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

test('la Pokédex lateral busca entre los 251', async ({ page }) => {
    const errores = await prepararPagina(page)
    await esperarTexto(page, 'Bienvenido')
    await expect(page.locator('#listaLateral li:not([hidden])')).toHaveCount(251)
    await page.locator('#busquedaLateral').fill('pika')
    await expect(page.locator('#listaLateral li:not([hidden])')).toHaveCount(1)
    await page.locator('#listaLateral li:not([hidden]) button').click()
    await expect(page.locator('#cardJugador [data-campo="nombre"]')).toHaveText('PIKACHU')
    await page.locator('#busquedaLateral').fill('fuego')
    await expect(page.locator('#listaLateral li:not([hidden])').first()).toContainText('CHARMANDER')
    await page.locator('#busquedaLateral').fill('zzz')
    await expect(page.locator('#vacioLateral')).toBeVisible()
    expect(errores).toEqual([])
})

test('se puede elegir cualquier Pokémon y un rival al azar', async ({ page }) => {
    const errores = await prepararPagina(page)
    await introducir(page)
    await elegirModo(page, 'COMBATE LIBRE')
    await esperarTexto(page, 'eliges')

    // Cancelar vuelve a las opciones.
    await botones(page).filter({ hasText: 'OTRO' }).click()
    await expect(page.locator('#selector')).toBeVisible()
    await expect(page.locator('#selectorAzar')).toBeHidden()
    await page.locator('#selectorCancelar').click()
    await expect(page.locator('#selector')).toBeHidden()
    await expect(botones(page).filter({ hasText: 'OTRO' })).toBeVisible()

    await elegirPokemon(page, 'buscar:eevee')
    await esperarTexto(page, 'Excelente')
    await expect(page.locator('#trainerPokemon')).toHaveText('EEVEE')
    await expect(page.locator('#cardJugador [data-campo="tipo"]')).toHaveText('NORMAL')
    await avanzar(page, 'Excelente', 'nunca viaja solo')

    // Compañeros: uno buscado y otro sugerido.
    await esperarTexto(page, 'número 1')
    await elegirPokemon(page, 'buscar:pikachu')
    await esperarTexto(page, 'número 2')
    await expect(botones(page)).toHaveCount(5) // 3 sugeridos + al azar + otro
    await botones(page).first().click()
    await esperarTexto(page, 'equipo está listo')
    await expect(page.locator('#trainerPokemon')).toContainText('EEVEE, PIKACHU, ')
    await avanzar(page, 'equipo está listo', 'listo', 'acción', 'entrenamiento')

    await esperarTexto(page, 'combatir')
    await elegirPokemon(page, 'AL AZAR')
    await esperarTexto(page, 'también tendrá un equipo')
    const rival = await page.locator('#cardRival [data-campo="nombre"]').textContent()
    expect(rival).not.toBe('-')
    expect(['EEVEE', 'PIKACHU']).not.toContain(rival)
    await avanzar(page, 'también tendrá un equipo', 'Recuerda')
    await pelear(page)
    await expect(page.locator('#modalTitle')).toHaveText(/GANASTE|PERDISTE/)
    expect(errores).toEqual([])
})

test('se puede cambiar de Pokémon durante el combate', async ({ page }) => {
    const errores = await prepararPagina(page)
    await llegarAlCombate(page, { inicial: 'charmander', rival: 'chikorita' })
    const segundo = (await page.locator('#trainerPokemon').textContent()).split(', ')[1]

    await botones(page).filter({ hasText: 'EQUIPO' }).click()
    await esperarTexto(page, 'A quién quieres enviar')
    await expect(botones(page)).toHaveCount(3) // 2 compañeros + volver
    await botones(page).filter({ hasText: 'VOLVER' }).click()
    await esperarTexto(page, 'usarás primero')

    await botones(page).filter({ hasText: 'EQUIPO' }).click()
    await botones(page).filter({ hasText: segundo }).click()
    await esperarTexto(page, `¡Vuelve, CHARMANDER! ¡Adelante, ${segundo}!`)
    await expect(page.locator('#cardJugador [data-campo="nombre"]')).toHaveText(segundo)
    await expect(page.locator('#cardJugador .equipoIndicador li').nth(1)).toHaveClass(/activo/)
    expect(errores).toEqual([])
})

const nivel = (page, card) => page.locator(`${card} [data-campo="nivel"]`)

test('el equipo se guarda con su nivel y evoluciona al terminar el combate', async ({ page }) => {
    // Charmander ya alcanzó el nivel 16 (2535 de experiencia) pero no evolucionó.
    const equipo = [{ id: 4, exp: 2600, movimientos: [] }, { id: 7, exp: 2600, movimientos: [] }, { id: 1, exp: 2600, movimientos: [] }]
    const errores = await prepararPagina(page, { progreso: { nombre: 'ASH', victorias: 0, derrotas: 0, equipo } })
    await avanzar(page, 'Bienvenido')
    await esperarTexto(page, 'llamas')
    await expect(page.locator('#nameInput')).toHaveValue('ASH')
    await continuar(page)
    await avanzar(page, 'conocerte', 'camino', 'ligera')
    await elegirModo(page, 'COMBATE LIBRE')
    await esperarTexto(page, 'ya tienes un equipo: CHARMANDER (Nv.\u00a016), SQUIRTLE (Nv.\u00a016), BULBASAUR (Nv.\u00a016)')
    await botones(page).filter({ hasText: 'SEGUIR' }).click()
    await expect(nivel(page, '#cardJugador')).toHaveText('16')
    await avanzar(page, 'listo', 'acción', 'entrenamiento')
    await elegirPokemon(page, 'chikorita')
    await expect(nivel(page, '#cardRival')).toHaveText('16')
    await avanzar(page, 'también tendrá un equipo', 'Recuerda')

    await pelear(page)
    // pelear() acepta la evolución (primer botón) antes de la ventana final.
    await expect(page.locator('#modalTitle')).toHaveText(/GANASTE|PERDISTE/)
    await expect(page.locator('#trainerPokemon')).toContainText('CHARMELEON')
    const guardado = await page.evaluate(() => JSON.parse(localStorage.getItem('pokemonTypeGame')).equipo)
    expect(guardado.map((p) => p.id)).toContain(5)
    expect(guardado.every((p) => p.movimientos.length > 0)).toBe(true)
    expect(errores).toEqual([])
})

test('gana experiencia al derrotar a un rival y sube de nivel', async ({ page }) => {
    // Equipo de nivel 30 (los rivales tienen el mismo nivel).
    const equipo = [{ id: 6, exp: 30000, movimientos: [] }, { id: 9, exp: 30000, movimientos: [] }, { id: 3, exp: 30000, movimientos: [] }]
    await prepararPagina(page, { progreso: { nombre: 'ASH', victorias: 0, derrotas: 0, equipo } })
    await seguirConEquipoGuardado(page)
    await avanzar(page, 'listo', 'acción', 'entrenamiento')
    await elegirPokemon(page, 'AL AZAR')
    await avanzar(page, 'también tendrá un equipo', 'Recuerda')
    const vistos = new Set()
    const modal = page.locator('#modal[open]')
    for (let i = 0; i < 200 && !(await modal.isVisible()); i++) {
        await expect(botones(page).first().or(modal)).toBeVisible()
        const texto = await page.locator('#chatOak').textContent()
        if (/rival se debilitó/.test(texto)) vistos.add('debilitado')
        if (/ganó \d+ puntos de experiencia/.test(texto)) vistos.add('exp')
        if (await modal.isVisible()) break
        const movimiento = page.locator('#answers button.movimiento.deDanio:enabled')
        await ((await movimiento.count()) ? movimiento.first() : botones(page).first()).click()
    }
    // Cada vez que cae un rival, el equipo gana experiencia.
    expect(vistos.has('debilitado')).toBe(vistos.has('exp'))
    await expect(page.locator('#modalTitle')).toHaveText(/GANASTE|PERDISTE/)
})

test('el sonido suena tras la primera interacción y se puede silenciar', async ({ page }) => {
    // Cuenta los osciladores creados para saber si se programaron sonidos.
    await page.addInitScript(() => {
        window.osciladores = 0
        const original = AudioContext.prototype.createOscillator
        AudioContext.prototype.createOscillator = function (...args) {
            window.osciladores++
            return original.apply(this, args)
        }
    })
    const errores = await prepararPagina(page)
    await esperarTexto(page, 'Bienvenido')
    const boton = page.locator('#botonSonido')
    await expect(boton).toHaveAttribute('aria-pressed', 'false')
    await continuar(page)
    await expect.poll(() => page.evaluate(() => window.osciladores)).toBeGreaterThan(0)

    await boton.click()
    await expect(boton).toHaveAttribute('aria-pressed', 'true')
    await expect(boton).toHaveText('♪ SIN SONIDO')
    await page.reload()
    await expect(page.locator('#botonSonido')).toHaveAttribute('aria-pressed', 'true')
    expect(errores).toEqual([])
})

test('los estados alterados se muestran en la escena y en la ficha', async ({ page }) => {
    // Pikachu de nivel 20 con Onda Trueno (86) e Impactrueno (84).
    const equipo = [{ id: 25, exp: 8000, movimientos: [86, 84] }, { id: 7, exp: 8000, movimientos: [] }, { id: 1, exp: 8000, movimientos: [] }]
    const errores = await prepararPagina(page, { progreso: { nombre: 'ASH', victorias: 0, derrotas: 0, equipo } })
    await seguirConEquipoGuardado(page)
    await avanzar(page, 'listo', 'acción', 'entrenamiento')
    await elegirPokemon(page, 'buscar:squirtle')
    await avanzar(page, 'también tendrá un equipo', 'Recuerda')
    await esperarTexto(page, 'usarás primero')

    const textos = []
    await botones(page).filter({ hasText: 'ONDA TRUENO' }).click()
    // Avanza hasta la siguiente pregunta guardando lo que dice el profesor.
    while (!(await textoOak(page).textContent()).includes('usarás ahora')) {
        await expect(botones(page).first()).toBeVisible()
        textos.push(await textoOak(page).textContent())
        if ((await textoOak(page).textContent()).includes('usarás ahora')) break
        if (await page.locator('#modal[open]').isVisible()) break
        await botones(page).first().click()
    }
    if (textos.some((t) => t.includes('ONDA TRUENO. ¡SQUIRTLE rival está paralizado!'))) {
        await expect(page.locator('#escena [data-lado="rival"] [data-e="estado"]')).toHaveText('PAR')
        await expect(page.locator('#cardRival [data-campo="estado"]')).toHaveText('PARALIZADO')
    } else {
        // Onda Trueno tiene 90 % de precisión.
        expect(textos.some((t) => t.includes('ONDA TRUENO. ¡Pero falló!'))).toBe(true)
    }
    expect(errores).toEqual([])
})

test('campaña: el primer desafío y la medalla', async ({ page }) => {
    const errores = await prepararPagina(page)
    await introducir(page)
    await expect(page.locator('#trainerMedallas')).toHaveText('0/8')
    await elegirModo(page, 'CAMPAÑA')
    await armarEquipoNuevo(page, 'charmander')
    await esperarTexto(page, 'próximo desafío: LUCÍA, Cazabichos')
    await continuar(page)
    await esperarTexto(page, 'LUCÍA: «')
    await expect(page.locator('#cardRival [data-campo="nivel"]')).toHaveText('8')
    await continuar(page)
    await esperarTexto(page, '¡LUCÍA envió a')
    await continuar(page)
    await pelear(page)
    const titulo = await page.locator('#modalTitle').textContent()
    const guardado = () => page.evaluate(() => JSON.parse(localStorage.getItem('pokemonTypeGame')).campania)
    if (titulo === '¡GANASTE!') {
        await expect(page.locator('#modalText')).toHaveText('¡Ganaste la Medalla Antena!')
        await expect(page.locator('#trainerMedallas')).toHaveText('1/8')
        expect(await guardado()).toBe(1)
        await continuarModal(page)
        await elegirModo(page, 'CAMPAÑA')
        await esperarTexto(page, 'próximo desafío: GONZALO')
    } else {
        await expect(page.locator('#modalText')).toContainText('vuelve a intentarlo')
        expect(await guardado()).toBe(0)
        await continuarModal(page)
        await elegirModo(page, 'CAMPAÑA')
        await esperarTexto(page, 'próximo desafío: LUCÍA')
    }
    expect(errores).toEqual([])
})

test('campaña: el campeón y la revancha', async ({ page }) => {
    const equipo = [{ id: 6, exp: 125000, movimientos: [] }, { id: 9, exp: 125000, movimientos: [] }, { id: 3, exp: 125000, movimientos: [] }]
    await prepararPagina(page, { progreso: { nombre: 'ASH', victorias: 8, derrotas: 0, equipo, campania: 8 } })
    await introducir(page)
    await expect(page.locator('#trainerMedallas')).toHaveText('8/8')
    await elegirModo(page, 'CAMPAÑA')
    await botones(page).filter({ hasText: 'SEGUIR' }).click()
    await esperarTexto(page, 'El Campeón LEONARDO te espera')
    await continuar(page)
    await avanzar(page, 'LEONARDO: «')
    await esperarTexto(page, 'envió a')
    // Al nivel 50 el campeón usa Dragonair, Gyarados y Pupitar.
    await expect(page.locator('#cardRival [data-campo="nombre"]')).toHaveText('DRAGONAIR')
})

test('campaña completa: el menú muestra al campeón', async ({ page }) => {
    const equipo = [{ id: 6, exp: 125000, movimientos: [] }, { id: 9, exp: 125000, movimientos: [] }, { id: 3, exp: 125000, movimientos: [] }]
    await prepararPagina(page, { progreso: { nombre: 'ASH', victorias: 9, derrotas: 0, equipo, campania: 9 } })
    await introducir(page)
    await expect(page.locator('#trainerMedallas')).toHaveText('8/8 ★')
    await expect(botones(page).first()).toHaveText('CAMPAÑACAMPEÓN')
    await elegirModo(page, 'CAMPAÑA')
    await botones(page).filter({ hasText: 'SEGUIR' }).click()
    await esperarTexto(page, 'quiere la revancha')
})

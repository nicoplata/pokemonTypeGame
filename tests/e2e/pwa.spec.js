import { expect, test } from '@playwright/test'

// Este archivo prueba el service worker, así que lo deja registrarse
// (el resto de los tests los bloquea para que no interfiera).
test.use({ serviceWorkers: 'allow' })

test('se puede instalar y jugar sin conexión', async ({ page, context }) => {
    await context.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: '' }))
    await page.goto('/')
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', './manifest.webmanifest')
    await expect(page.locator('#chatOak')).toContainText('Bienvenido')

    // Espera a que el service worker tome el control de la página.
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready
        if (!navigator.serviceWorker.controller) {
            await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
        }
    })
    const enCache = await page.evaluate(async () => {
        const claves = await caches.keys()
        const cache = await caches.open(claves.find((c) => c.startsWith('juego-')))
        return Boolean(await cache.match('./data/pokedex.json')) && Boolean(await cache.match('./src/main.js'))
    })
    expect(enCache).toBe(true)

    await context.setOffline(true)
    await page.reload()
    await expect(page.locator('#chatOak')).toContainText('Bienvenido')
    await expect(page.locator('#listaLateral li')).toHaveCount(251)
    await context.setOffline(false)
})

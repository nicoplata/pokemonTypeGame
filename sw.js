// Service worker: permite jugar sin conexión.
// - Archivos del juego: primero la red (para tener siempre la última versión)
//   y, si no hay conexión, la copia guardada.
// - Imágenes de PokéAPI y fuentes: primero la copia guardada.

const VERSION = 'v1'
const CACHE_JUEGO = `juego-${VERSION}`
const CACHE_EXTERNO = 'externo-v1'

// Lista verificada por tests/unit/pwa.test.js.
const ARCHIVOS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './data/pokedex.json',
    './img/001bulbasaur.png',
    './img/004charmander.png',
    './img/007squirtle.png',
    './img/152chikorita.png',
    './img/155cyndaquil.png',
    './img/158totodile.png',
    './img/apple-touch-icon.png',
    './img/arrowRight.png',
    './img/ashKetchum.png',
    './img/icono-192.png',
    './img/icono-512.png',
    './img/icono-maskable-512.png',
    './img/pokemonLogo.png',
    './img/profesorOak.png',
    './src/main.js',
    './styles/styles.css',
    './src/datos/campania.js',
    './src/datos/juego.js',
    './src/datos/textos.js',
    './src/datos/tipos.js',
    './src/juego/bucleCombate.js',
    './src/juego/controladores.js',
    './src/juego/presentador.js',
    './src/juego/progresion.js',
    './src/motor/busqueda.js',
    './src/motor/campania.js',
    './src/motor/combate.js',
    './src/motor/equipos.js',
    './src/motor/estadisticas.js',
    './src/motor/estados.js',
    './src/motor/eventos.js',
    './src/motor/experiencia.js',
    './src/motor/luchador.js',
    './src/motor/mensajes.js',
    './src/motor/pokedex.js',
    './src/servicios/datos.js',
    './src/servicios/progreso.js',
    './src/servicios/pwa.js',
    './src/ui/dialogo.js',
    './src/ui/dom.js',
    './src/ui/escena.js',
    './src/ui/fichas.js',
    './src/ui/listaPokemon.js',
    './src/ui/modal.js',
    './src/ui/musica.js',
    './src/ui/selector.js',
    './src/ui/sonido.js'
]

const ORIGENES_EXTERNOS = ['https://raw.githubusercontent.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com']

self.addEventListener('install', (evento) => {
    evento.waitUntil(caches.open(CACHE_JUEGO).then((cache) => cache.addAll(ARCHIVOS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (evento) => {
    evento.waitUntil(
        caches.keys()
            .then((claves) => Promise.all(claves.filter((c) => c !== CACHE_JUEGO && c !== CACHE_EXTERNO).map((c) => caches.delete(c))))
            .then(() => self.clients.claim())
    )
})

async function redPrimero (pedido) {
    const cache = await caches.open(CACHE_JUEGO)
    try {
        const respuesta = await fetch(pedido)
        if (respuesta.ok) cache.put(pedido, respuesta.clone())
        return respuesta
    } catch (error) {
        const guardada = await cache.match(pedido, { ignoreSearch: true })
        if (guardada) return guardada
        if (pedido.mode === 'navigate') return cache.match('./index.html')
        throw error
    }
}

async function cachePrimero (pedido) {
    const cache = await caches.open(CACHE_EXTERNO)
    const guardada = await cache.match(pedido)
    if (guardada) return guardada
    const respuesta = await fetch(pedido)
    // Las respuestas opacas (status 0) también sirven para imágenes y fuentes.
    if (respuesta.ok || respuesta.type === 'opaque') cache.put(pedido, respuesta.clone())
    return respuesta
}

self.addEventListener('fetch', (evento) => {
    const { request: pedido } = evento
    if (pedido.method !== 'GET') return
    const url = new URL(pedido.url)
    if (url.origin === self.location.origin) evento.respondWith(redPrimero(pedido))
    else if (ORIGENES_EXTERNOS.includes(url.origin)) evento.respondWith(cachePrimero(pedido))
})

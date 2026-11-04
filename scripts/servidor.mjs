// Servidor estático mínimo para desarrollo y para los tests e2e.
// Uso: npm start  (o PORT=4000 npm start)

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const PUERTO = Number(process.env.PORT) || 3000

const TIPOS = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
}

createServer(async (pedido, respuesta) => {
    try {
        const ruta = decodeURIComponent(new URL(pedido.url, 'http://localhost').pathname)
        let archivo = normalize(join(RAIZ, ruta))
        if (!archivo.startsWith(RAIZ.endsWith(sep) ? RAIZ : RAIZ + sep)) throw Object.assign(new Error(), { code: 'ENOENT' })
        if ((await stat(archivo)).isDirectory()) archivo = join(archivo, 'index.html')
        const contenido = await readFile(archivo)
        respuesta.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream' })
        respuesta.end(contenido)
    } catch {
        respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        respuesta.end('No encontrado')
    }
}).listen(PUERTO, () => console.log(`Juego disponible en http://localhost:${PUERTO}`))

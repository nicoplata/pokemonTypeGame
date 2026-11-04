// Copia a dist/ solo los archivos que necesita el sitio publicado.

import { cp, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const DESTINO = new URL('../dist/', import.meta.url)
const ARCHIVOS = ['index.html', 'src', 'styles', 'img']

await rm(DESTINO, { recursive: true, force: true })
for (const archivo of ARCHIVOS) {
    await cp(new URL(archivo, `file://${RAIZ}`), new URL(archivo, DESTINO), { recursive: true })
}
console.log(`Sitio armado en dist/ (${ARCHIVOS.join(', ')})`)

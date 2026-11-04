// Actualiza la lista ARCHIVOS de sw.js con los archivos del juego.
// Uso: npm run precache  (tests/unit/pwa.test.js avisa si quedó desactualizada)

import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))

async function archivosEn (carpeta, extension) {
    const encontrados = []
    for (const nombre of await readdir(join(RAIZ, carpeta))) {
        const ruta = join(RAIZ, carpeta, nombre)
        if ((await stat(ruta)).isDirectory()) encontrados.push(...await archivosEn(relative(RAIZ, ruta), extension))
        else if (nombre.endsWith(extension)) encontrados.push(`./${relative(RAIZ, ruta)}`)
    }
    return encontrados
}

const archivos = [
    './', './index.html', './manifest.webmanifest', './styles/styles.css', './data/pokedex.json', './fonts/press-start-2p.woff2',
    ...await archivosEn('src', '.js'), ...await archivosEn('img', '.png')
]
const ordenados = [...new Set(archivos)].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))
const sw = await readFile(join(RAIZ, 'sw.js'), 'utf8')
const lista = `const ARCHIVOS = [\n${ordenados.map((a) => `    '${a}'`).join(',\n')}\n]`
await writeFile(join(RAIZ, 'sw.js'), sw.replace(/const ARCHIVOS = \[[\s\S]*?\n\]/, lista))
console.log(`sw.js: ${ordenados.length} archivos para usar sin conexión`)

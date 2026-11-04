import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = new URL('../../', import.meta.url).pathname

function archivosEn (carpeta, extension) {
    const encontrados = []
    for (const nombre of readdirSync(join(RAIZ, carpeta))) {
        const ruta = join(RAIZ, carpeta, nombre)
        if (statSync(ruta).isDirectory()) encontrados.push(...archivosEn(relative(RAIZ, ruta), extension))
        else if (nombre.endsWith(extension)) encontrados.push(`./${relative(RAIZ, ruta)}`)
    }
    return encontrados
}

const sw = readFileSync(join(RAIZ, 'sw.js'), 'utf8')
const lista = [...sw.match(/const ARCHIVOS = \[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1])

describe('service worker', () => {
    it('guarda todos los módulos, imágenes y datos del juego', () => {
        const necesarios = [
            './', './index.html', './manifest.webmanifest', './styles/styles.css', './data/pokedex.json',
            ...archivosEn('src', '.js'), ...archivosEn('img', '.png')
        ]
        expect([...lista].sort()).toEqual([...new Set(necesarios)].sort())
    })
    it('todos los archivos de la lista existen', () => {
        for (const archivo of lista) {
            if (archivo === './') continue
            expect(existsSync(join(RAIZ, archivo)), archivo).toBe(true)
        }
    })
})

describe('manifiesto', () => {
    const manifiesto = JSON.parse(readFileSync(join(RAIZ, 'manifest.webmanifest'), 'utf8'))
    it('tiene lo necesario para instalar la app', () => {
        expect(manifiesto).toMatchObject({ lang: 'es', display: 'standalone', start_url: './' })
        expect(manifiesto.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
        expect(manifiesto.icons.some((i) => i.purpose === 'maskable')).toBe(true)
        for (const icono of manifiesto.icons) expect(existsSync(join(RAIZ, icono.src)), icono.src).toBe(true)
    })
})

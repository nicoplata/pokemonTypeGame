// Genera data/pokedex.json a partir de los datos oficiales de PokéAPI
// (https://github.com/PokeAPI/pokeapi, carpeta data/v2/csv).
//
// Uso: npm run datos
//
// Incluye los Pokémon 1 a 251 con sus estadísticas base, tipos, evolución,
// curva de experiencia y los movimientos que aprenden por nivel (según
// Ultrasol/Ultraluna, que tiene datos para los 251 y la tabla de tipos actual).

import { mkdir, writeFile } from 'node:fs/promises'

const URL_CSV = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'
const ULTIMO_POKEMON = 251
const GRUPO_VERSION = '18' // ultra-sun-ultra-moon
const METODO_NIVEL = '1'
const ESPANOL = '7'
const MOVIMIENTOS_EXTRA = ['33', '165'] // Placaje y Forcejeo (respaldo del motor)

// Nivel de evolución cuando PokéAPI no lo define (piedras, intercambio, amistad).
const NIVEL_EVOLUCION_SIN_DATO = { 1: 20, 2: 36, 3: 30 }

const ESTADISTICAS = { 1: 'hp', 2: 'atk', 3: 'def', 4: 'spa', 5: 'spd', 6: 'spe', 7: 'precision', 8: 'evasion' }
const CLASES = { 1: 'estado', 2: 'fisico', 3: 'especial' }
const CRECIMIENTO = { 1: 'lento', 2: 'medio', 3: 'rapido', 4: 'medioLento' }

// Parser de CSV que respeta comillas y saltos de línea dentro de campos.
function parsearCsv (texto) {
    const filas = []
    let fila = []
    let campo = ''
    let entreComillas = false
    for (let i = 0; i < texto.length; i++) {
        const c = texto[i]
        if (entreComillas) {
            if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++ } else if (c === '"') entreComillas = false
            else campo += c
        } else if (c === '"') entreComillas = true
        else if (c === ',') { fila.push(campo); campo = '' } else if (c === '\n' || c === '\r') {
            if (c === '\r' && texto[i + 1] === '\n') i++
            fila.push(campo); filas.push(fila); fila = []; campo = ''
        } else campo += c
    }
    if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila) }
    const [encabezado, ...resto] = filas.filter((f) => f.length > 1 || f[0] !== '')
    return resto.map((f) => Object.fromEntries(encabezado.map((clave, i) => [clave, f[i] ?? ''])))
}

async function leer (nombre) {
    const respuesta = await fetch(`${URL_CSV}/${nombre}.csv`)
    if (!respuesta.ok) throw new Error(`No se pudo descargar ${nombre}.csv (${respuesta.status})`)
    return parsearCsv(await respuesta.text())
}

const entero = (valor) => (valor === '' ? null : Number(valor))

const tablas = Object.fromEntries(await Promise.all([
    'pokemon', 'pokemon_stats', 'pokemon_types', 'types', 'pokemon_species', 'pokemon_species_names',
    'pokemon_evolution', 'pokemon_moves', 'moves', 'move_names', 'move_meta', 'move_meta_ailments',
    'move_meta_stat_changes'
].map(async (nombre) => [nombre, await leer(nombre)])))

const tipos = Object.fromEntries(tablas.types.map((t) => [t.id, t.identifier]))
const estadosMeta = Object.fromEntries(tablas.move_meta_ailments
    .filter((a) => Number(a.id) > 0).map((a) => [a.id, a.identifier]))
const enRango = (id) => Number(id) >= 1 && Number(id) <= ULTIMO_POKEMON

// ---------- Pokémon ----------
const especies = new Map(tablas.pokemon_species.filter((e) => enRango(e.id)).map((e) => [e.id, e]))
const nombresEspecie = Object.fromEntries(tablas.pokemon_species_names
    .filter((n) => n.local_language_id === ESPANOL && enRango(n.pokemon_species_id))
    .map((n) => [n.pokemon_species_id, n.name]))

const pokemon = {}
for (const p of tablas.pokemon) {
    if (!enRango(p.id)) continue
    pokemon[p.id] = {
        id: Number(p.id),
        clave: p.identifier,
        nombre: nombresEspecie[p.id] ?? p.identifier,
        tipos: [],
        base: {},
        experienciaBase: entero(p.base_experience),
        crecimiento: CRECIMIENTO[especies.get(p.id).growth_rate_id],
        legendario: especies.get(p.id).is_legendary === '1' || especies.get(p.id).is_mythical === '1',
        evolucion: null,
        aprende: []
    }
}
for (const s of tablas.pokemon_stats) {
    if (pokemon[s.pokemon_id]) pokemon[s.pokemon_id].base[ESTADISTICAS[s.stat_id]] = Number(s.base_stat)
}
for (const t of [...tablas.pokemon_types].sort((a, b) => a.slot - b.slot)) {
    if (pokemon[t.pokemon_id]) pokemon[t.pokemon_id].tipos.push(tipos[t.type_id])
}

// ---------- Evoluciones ----------
// Por cada especie evolucionada se toma una sola regla, prefiriendo la que
// tiene nivel mínimo. Si una especie tiene varias evoluciones posibles
// (Eevee, Gloom...), se usa la de menor número de Pokédex.
const reglas = new Map()
for (const regla of tablas.pokemon_evolution) {
    if (!enRango(regla.evolved_species_id)) continue
    const actual = reglas.get(regla.evolved_species_id)
    if (!actual || (actual.minimum_level === '' && regla.minimum_level !== '')) reglas.set(regla.evolved_species_id, regla)
}
const nivelDeEvolucion = new Map()
const calcularNivel = (idEspecie) => {
    if (nivelDeEvolucion.has(idEspecie)) return nivelDeEvolucion.get(idEspecie)
    const regla = reglas.get(idEspecie)
    const previa = especies.get(idEspecie).evolves_from_species_id
    const nivelPrevio = previa && reglas.has(previa) ? calcularNivel(previa) : 0
    const nivel = regla.minimum_level !== ''
        ? Number(regla.minimum_level)
        : Math.max(NIVEL_EVOLUCION_SIN_DATO[regla.evolution_trigger_id] ?? 30, nivelPrevio + 10)
    nivelDeEvolucion.set(idEspecie, nivel)
    return nivel
}
for (const [id, especie] of especies) {
    const desde = especie.evolves_from_species_id
    if (!desde || !enRango(desde) || !reglas.has(id)) continue
    const actual = pokemon[desde].evolucion
    if (!actual || Number(id) < actual.a) pokemon[desde].evolucion = { a: Number(id), nivel: calcularNivel(id) }
}

// ---------- Movimientos aprendidos por nivel ----------
const usados = new Set(MOVIMIENTOS_EXTRA)
for (const m of tablas.pokemon_moves) {
    if (m.version_group_id !== GRUPO_VERSION || m.pokemon_move_method_id !== METODO_NIVEL || !pokemon[m.pokemon_id]) continue
    pokemon[m.pokemon_id].aprende.push([Number(m.level), Number(m.move_id), Number(m.order || 0)])
    usados.add(m.move_id)
}
for (const p of Object.values(pokemon)) {
    p.aprende.sort((a, b) => a[0] - b[0] || a[2] - b[2] || a[1] - b[1])
    const vistos = new Set()
    p.aprende = p.aprende.filter(([, mov]) => !vistos.has(mov) && vistos.add(mov)).map(([nivel, mov]) => [nivel, mov])
}

// ---------- Datos de cada movimiento ----------
const nombresMovimiento = Object.fromEntries(tablas.move_names
    .filter((n) => n.local_language_id === ESPANOL).map((n) => [n.move_id, n.name]))
const metas = Object.fromEntries(tablas.move_meta.map((m) => [m.move_id, m]))
const cambios = {}
for (const c of tablas.move_meta_stat_changes) {
    (cambios[c.move_id] ??= []).push([ESTADISTICAS[c.stat_id], Number(c.change)])
}

const movimientos = {}
for (const m of tablas.moves) {
    if (!usados.has(m.id)) continue
    const meta = metas[m.id] ?? {}
    movimientos[m.id] = {
        id: Number(m.id),
        clave: m.identifier,
        nombre: nombresMovimiento[m.id] ?? m.identifier,
        tipo: tipos[m.type_id],
        clase: CLASES[m.damage_class_id],
        potencia: entero(m.power),
        precision: entero(m.accuracy),
        pp: entero(m.pp),
        prioridad: Number(m.priority),
        objetivo: Number(m.target_id),
        efecto: entero(m.effect_id),
        probEfecto: entero(m.effect_chance),
        categoria: entero(meta.meta_category_id),
        estado: estadosMeta[meta.meta_ailment_id] ?? null,
        probEstado: entero(meta.ailment_chance) ?? 0,
        golpes: meta.min_hits ? [Number(meta.min_hits), Number(meta.max_hits)] : null,
        drenaje: entero(meta.drain) ?? 0,
        curacion: entero(meta.healing) ?? 0,
        critico: entero(meta.crit_rate) ?? 0,
        probRetroceso: entero(meta.flinch_chance) ?? 0,
        probCambios: entero(meta.stat_chance) ?? 0,
        cambios: cambios[m.id] ?? []
    }
}

const datos = {
    fuente: 'PokéAPI (https://pokeapi.co) — generado con scripts/generar-datos.mjs',
    pokemon,
    movimientos
}

await mkdir(new URL('../data/', import.meta.url), { recursive: true })
await writeFile(new URL('../data/pokedex.json', import.meta.url), JSON.stringify(datos))
console.log(`Listo: ${Object.keys(pokemon).length} Pokémon y ${Object.keys(movimientos).length} movimientos en data/pokedex.json`)

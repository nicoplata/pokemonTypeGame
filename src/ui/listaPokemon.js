// Lista de Pokémon con búsqueda (Pokédex lateral y ventana de selección).

import { numeroPokedex, spritePokemon } from '../datos/juego.js'
import { coincide } from '../motor/busqueda.js'
import { nombreTipos } from './fichas.js'

// Crea un botón por especie una sola vez; filtrar solo los muestra u oculta.
export function crearListaPokemon (lista, vacio, especies, alElegir) {
    const items = especies.map((especie) => {
        const item = document.createElement('li')
        const boton = document.createElement('button')
        boton.type = 'button'
        boton.className = 'itemPokemon'
        boton.dataset.pokemon = especie.id
        boton.title = nombreTipos(especie.tipos)

        const imagen = document.createElement('img')
        imagen.src = spritePokemon(especie.id)
        imagen.alt = ''
        imagen.loading = 'lazy'
        imagen.width = 48
        imagen.height = 48
        imagen.addEventListener('error', () => { imagen.style.visibility = 'hidden' }, { once: true })

        const numero = document.createElement('span')
        numero.className = 'numeroPokemon'
        numero.textContent = numeroPokedex(especie.id)
        const nombre = document.createElement('span')
        nombre.className = 'nombrePokemon'
        nombre.textContent = especie.nombre.toUpperCase()

        boton.append(imagen, numero, nombre)
        boton.addEventListener('click', () => alElegir(especie.id))
        item.append(boton)
        lista.append(item)
        return { especie, item, boton }
    })

    return {
        filtrar (consulta) {
            let visibles = 0
            for (const { especie, item } of items) {
                const mostrar = coincide(especie, consulta)
                item.hidden = !mostrar
                if (mostrar) visibles++
            }
            vacio.hidden = visibles > 0
            return visibles
        },
        habilitar (habilitada) {
            for (const { boton } of items) boton.disabled = !habilitada
        },
        primerVisible () {
            return items.find(({ item }) => !item.hidden)?.boton ?? null
        }
    }
}

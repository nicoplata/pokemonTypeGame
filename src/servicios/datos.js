// Carga data/pokedex.json (generado a partir de PokéAPI).

export async function cargarDatos (fetchFn = (...args) => fetch(...args), url = './data/pokedex.json') {
    const respuesta = await fetchFn(url)
    if (!respuesta.ok) throw new Error(`No se pudo cargar la Pokédex (${respuesta.status})`)
    const datos = await respuesta.json()
    if (!datos?.pokemon || !datos?.movimientos) throw new Error('La Pokédex tiene un formato inválido')
    return datos
}

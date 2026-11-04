// Entrenadores del modo campaña, en orden. Los equipos se indican con la
// primera forma de cada Pokémon: al nivel del combate se usa la evolución
// que corresponda.
//   nivelMinimo: nivel mínimo de su equipo.
//   dificultad: niveles por encima del promedio de tu equipo.
//   astucia: 0 a 1; cuanto más alta, menos improvisa al elegir movimientos.

export const ENTRENADORES = [
    {
        nombre: 'LUCÍA', titulo: 'Cazabichos', tipo: 'bug', medalla: 'Medalla Antena',
        equipo: [13, 165, 167], nivelMinimo: 6, dificultad: 0, astucia: 0.6,
        saludo: '¡Mis bichos están listos! ¿Y los tuyos?',
        derrota: '¡Uf! Mis bichos necesitan descansar.'
    },
    {
        nombre: 'GONZALO', titulo: 'Montañero', tipo: 'rock', medalla: 'Medalla Peñasco',
        equipo: [74, 27, 95], nivelMinimo: 10, dificultad: 0, astucia: 0.65,
        saludo: 'Mis Pokémon son duros como la roca.',
        derrota: 'Hasta la roca más dura se parte...'
    },
    {
        nombre: 'DELFINA', titulo: 'Nadadora', tipo: 'water', medalla: 'Medalla Oleaje',
        equipo: [120, 54, 183], nivelMinimo: 14, dificultad: 1, astucia: 0.7,
        saludo: '¡Te voy a llevar con la corriente!',
        derrota: 'Me arrastraste como una ola gigante.'
    },
    {
        nombre: 'RAMIRO', titulo: 'Electricista', tipo: 'electric', medalla: 'Medalla Chispa',
        equipo: [81, 100, 179], nivelMinimo: 18, dificultad: 1, astucia: 0.75,
        saludo: '¡Prepárate para una descarga de alto voltaje!',
        derrota: 'Me dejaste sin batería.'
    },
    {
        nombre: 'AMPARO', titulo: 'Jardinera', tipo: 'grass', medalla: 'Medalla Brote',
        equipo: [43, 69, 114], nivelMinimo: 22, dificultad: 1, astucia: 0.8,
        saludo: 'Mis plantas crecen fuertes con cada combate.',
        derrota: 'Cortaste mis flores de raíz...'
    },
    {
        nombre: 'OCTAVIO', titulo: 'Médium', tipo: 'ghost', medalla: 'Medalla Niebla',
        equipo: [92, 63, 200], nivelMinimo: 26, dificultad: 2, astucia: 0.85,
        saludo: 'Siento una presencia... ¡es tu derrota!',
        derrota: 'Los espíritus no me avisaron de esto.'
    },
    {
        nombre: 'IGNACIO', titulo: 'Herrero', tipo: 'fire', medalla: 'Medalla Fragua',
        equipo: [126, 227, 58], nivelMinimo: 30, dificultad: 2, astucia: 0.9,
        saludo: '¡En mi fragua se templan los mejores Pokémon!',
        derrota: 'Me enfriaste la fragua.'
    },
    {
        nombre: 'NIEVES', titulo: 'Esquiadora', tipo: 'ice', medalla: 'Medalla Escarcha',
        equipo: [86, 220, 124], nivelMinimo: 34, dificultad: 2, astucia: 0.95,
        saludo: '¿Tienes frío? Todavía no empezamos.',
        derrota: 'Derretiste mi equipo...'
    },
    {
        nombre: 'LEONARDO', titulo: 'Campeón', tipo: 'dragon', medalla: 'Copa del Campeón',
        equipo: [147, 129, 246], nivelMinimo: 40, dificultad: 3, astucia: 1,
        saludo: 'Llegaste hasta aquí. Muéstrame lo que aprendiste.',
        derrota: '¡Increíble! Eres el nuevo campeón.'
    }
]

export const TOTAL_MEDALLAS = ENTRENADORES.length - 1

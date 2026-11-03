// Datos estáticos del juego: textos, Pokémon disponibles, ataques y tabla de tipos.
// Se cargan como script normal (no con fetch) para que el juego funcione
// también abriendo index.html directamente desde el disco.

const TEXTOS = {
    bienvenida: '¡Bienvenido a mi laboratorio!',
    preguntaNombre: '¿Cómo te llamas?',
    nombreInvalido: 'Ingresá un nombre válido.',
    saludo: (nombre) => `¡Gusto en conocerte, ${nombre}!`,
    saludoNuevamente: (nombre) => `¡Hola de nuevo, ${nombre}!`,
    camino: 'Para iniciar tu camino como maestro Pokémon deberás elegir tu primer Pokémon...',
    decision: 'Esta decisión no debe tomarse a la ligera, ya que te acompañará hasta convertirte en maestro Pokémon...',
    elegirInicial: '¿Qué Pokémon eliges? ¿BULBASAUR, CHARMANDER o SQUIRTLE?',
    buenaEleccion: (pokemon) => `¡Excelente elección! ${pokemon} será tu compañero.`,
    listo: '¿Estás listo?',
    accion: '¿Qué te parece poner a tu Pokémon en acción?',
    entrenamiento: 'Un poco de entrenamiento le sentará de maravilla. Elige a tu rival.',
    elegirRival: '¿Contra qué Pokémon deseas combatir? ¿CHIKORITA, CYNDAQUIL o TOTODILE?',
    consejoTipos: 'Recuerda: el ATAQUE ESPECIAL usa el tipo de tu Pokémon. ¡Contra el tipo correcto hace el doble de daño!',
    primerAtaque: '¿Cuál será tu primer ataque?',
    siguienteAtaque: '¿Cuál será tu siguiente ataque?',
    cargando: 'Consultando la Pokédex...',
    errorRed: 'No pude conectarme con la Pokédex. Revisá tu conexión e intentá de nuevo.',
    despedida: '¡Vuelve cuando quieras!'
}

const INICIALES = ['bulbasaur', 'charmander', 'squirtle']
const RIVALES = ['chikorita', 'cyndaquil', 'totodile']

// Imagen local de cada Pokémon (se usa en los botones de selección).
const IMAGENES = {
    bulbasaur: './img/001bulbasaur.png',
    charmander: './img/004charmander.png',
    squirtle: './img/007squirtle.png',
    chikorita: './img/152chikorita.png',
    cyndaquil: './img/155cyndaquil.png',
    totodile: './img/158totodile.png'
}

// La salud del combate es la salud base multiplicada por este factor,
// para que las peleas duren algunos turnos.
const MULTIPLICADOR_SALUD = 2

// potencia: fracción del ataque que se convierte en daño.
// precision: probabilidad de acertar (0 a 1).
// pp: usos disponibles por combate (Infinity = ilimitado).
// usaTipo: si el daño depende de la efectividad de tipos.
const ATAQUES = {
    rapido: { nombre: 'ATAQUE RÁPIDO', corto: 'RÁPIDO', potencia: 0.25, precision: 1, pp: Infinity, usaTipo: false },
    pesado: { nombre: 'ATAQUE PESADO', corto: 'PESADO', potencia: 0.4, precision: 0.8, pp: Infinity, usaTipo: false },
    especial: { nombre: 'ATAQUE ESPECIAL', corto: 'ESPECIAL', potencia: 0.45, precision: 1, pp: 3, usaTipo: true }
}

const TIPOS_ES = {
    normal: 'NORMAL', fire: 'FUEGO', water: 'AGUA', electric: 'ELÉCTRICO', grass: 'PLANTA',
    ice: 'HIELO', fighting: 'LUCHA', poison: 'VENENO', ground: 'TIERRA', flying: 'VOLADOR',
    psychic: 'PSÍQUICO', bug: 'BICHO', rock: 'ROCA', ghost: 'FANTASMA', dragon: 'DRAGÓN',
    dark: 'SINIESTRO', steel: 'ACERO', fairy: 'HADA'
}

// Tabla de efectividad: EFECTIVIDAD[tipoAtaque][tipoDefensor].
// Las combinaciones que no figuran valen 1 (daño normal).
const EFECTIVIDAD = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
}

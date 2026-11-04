// Partituras originales del juego y conversión de notas a frecuencias.
// Cada pista es una lista de pasos (corcheas); null es silencio.

const SEMITONOS = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 }

// 'A4' => 440 Hz. Acepta sostenidos ('G#4').
export function frecuencia (nota) {
    const coincidencia = /^([A-G]#?)(\d)$/.exec(nota)
    if (!coincidencia) throw new Error(`Nota inválida: ${nota}`)
    const [, nombre, octava] = coincidencia
    return 440 * 2 ** ((SEMITONOS[nombre] + (Number(octava) - 4) * 12) / 12)
}

const _ = null

// Combate: La menor, enérgico.
const COMBATE_MELODIA = [
    'A4', _, 'C5', 'E5', 'A5', _, 'G5', 'E5',
    'F5', _, 'E5', 'D5', 'E5', _, 'C5', _,
    'A4', _, 'C5', 'E5', 'G5', _, 'F5', 'E5',
    'D5', 'E5', 'F5', _, 'E5', _, _, _,
    'C5', _, 'D5', 'E5', 'F5', _, 'A5', _,
    'G5', 'F5', 'E5', _, 'D5', _, 'C5', _,
    'B4', _, 'C5', 'D5', 'E5', _, 'G#4', _,
    'A4', _, _, _, _, _, _, _
]
const COMBATE_BAJO = ['A2', 'F2', 'A2', 'D2', 'F2', 'C3', 'E2', 'A2']
    .flatMap((raiz) => {
        const octava = raiz.replace(/\d$/, (n) => String(Number(n) + 1))
        return [raiz, octava, raiz, octava, raiz, octava, raiz, octava]
    })

// Menú: Do mayor, tranquilo.
const MENU_MELODIA = [
    'C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'G4', 'C5',
    'A3', 'C4', 'E4', 'A4', 'E4', 'C4', 'E4', 'A4',
    'F3', 'A3', 'C4', 'F4', 'C4', 'A3', 'C4', 'F4',
    'G3', 'B3', 'D4', 'G4', 'D4', 'B3', 'D4', 'B3'
]
const MENU_BAJO = ['C3', _, _, _, _, _, _, _, 'A2', _, _, _, _, _, _, _, 'F2', _, _, _, _, _, _, _, 'G2', _, _, _, _, _, _, _]

export const PISTAS = {
    combate: { pulsos: 150, melodia: COMBATE_MELODIA, bajo: COMBATE_BAJO, percusion: true, ondaMelodia: 'square' },
    menu: { pulsos: 96, melodia: MENU_MELODIA, bajo: MENU_BAJO, percusion: false, ondaMelodia: 'triangle' }
}

// Efectos: listas de [nota o frecuencia, duración en segundos, onda].
export const EFECTOS = {
    seleccion: [['E6', 0.05, 'square']],
    ataque: [['A3', 0.06, 'square'], ['E4', 0.06, 'square']],
    golpe: [['ruido', 0.15]],
    superEficaz: [['ruido', 0.12], ['ruido', 0.18]],
    poco: [['ruido', 0.08]],
    critico: [['C6', 0.05, 'square'], ['ruido', 0.2]],
    sinEfecto: [['C3', 0.15, 'triangle']],
    debilitado: [['G4', 0.12, 'square'], ['E4', 0.12, 'square'], ['C4', 0.12, 'square'], ['G3', 0.3, 'square']],
    cambio: [['C5', 0.06, 'square'], ['G5', 0.06, 'square'], ['C6', 0.1, 'square']],
    nivel: [['C5', 0.08, 'square'], ['E5', 0.08, 'square'], ['G5', 0.08, 'square'], ['C6', 0.25, 'square']],
    evolucion: [['C4', 0.1, 'triangle'], ['E4', 0.1, 'triangle'], ['G4', 0.1, 'triangle'], ['C5', 0.1, 'triangle'],
        ['E5', 0.1, 'triangle'], ['G5', 0.1, 'triangle'], ['C6', 0.4, 'triangle']],
    curar: [['C5', 0.12, 'triangle'], ['E5', 0.12, 'triangle'], ['G5', 0.12, 'triangle'], ['E5', 0.12, 'triangle'], ['C6', 0.3, 'triangle']],
    victoria: [['G4', 0.12, 'square'], ['C5', 0.12, 'square'], ['E5', 0.12, 'square'], ['G5', 0.24, 'square'],
        ['E5', 0.12, 'square'], ['G5', 0.5, 'square']],
    derrota: [['E4', 0.25, 'triangle'], ['D#4', 0.25, 'triangle'], ['D4', 0.25, 'triangle'], ['C#4', 0.6, 'triangle']]
}

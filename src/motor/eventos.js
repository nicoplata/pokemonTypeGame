// Datos que llevan los eventos para que la interfaz sepa a quién mostrar.
export const quien = (luchador) => ({ lado: luchador.lado, nombre: luchador.nombre })
export const salud = (luchador) => ({ salud: luchador.salud, saludMax: luchador.saludMax })

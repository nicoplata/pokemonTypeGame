// Instalación como app (PWA): registra el service worker y ofrece instalar.

export function registrarServiceWorker () {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return
    navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('No se pudo registrar el service worker', error))
}

// Muestra el botón cuando el navegador permite instalar la app.
export function prepararBotonInstalar (boton) {
    let aviso = null
    window.addEventListener('beforeinstallprompt', (evento) => {
        evento.preventDefault()
        aviso = evento
        boton.hidden = false
    })
    window.addEventListener('appinstalled', () => {
        aviso = null
        boton.hidden = true
    })
    boton.addEventListener('click', async () => {
        if (!aviso) return
        boton.hidden = true
        aviso.prompt()
        await aviso.userChoice.catch(() => null)
        aviso = null
    })
}

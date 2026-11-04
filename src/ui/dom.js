export const $ = (selector) => document.querySelector(selector)

export const reducirMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

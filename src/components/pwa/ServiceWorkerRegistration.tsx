'use client'

import { useEffect } from 'react'

const CACHE_PREFIX = 'facil-organizacao-'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      // Prevent a production worker from serving cached assets during local development.
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => void registration.unregister())
      })
      if ('caches' in window) {
        void caches.keys().then((keys) => {
          keys.filter((key) => key.startsWith(CACHE_PREFIX)).forEach((key) => void caches.delete(key))
        })
      }
      return
    }

    const register = () => {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => {
        void registration.update()
      }).catch((error) => {
        console.error('Não foi possível registrar o service worker.', error)
      })
    }

    if (document.readyState === 'complete') {
      register()
      return
    }

    window.addEventListener('load', register, { once: true })
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}

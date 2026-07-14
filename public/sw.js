const CACHE_VERSION = 'v1'
const CACHE_NAME = `facil-organizacao-${CACHE_VERSION}`
const OFFLINE_URL = '/offline.html'
const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('facil-organizacao-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  const isVersionedNextAsset = url.pathname.startsWith('/_next/static/')
  const isPwaAsset = url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest'

  if (!isVersionedNextAsset && !isPwaAsset) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response
        const copy = response.clone()
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)))
        return response
      })
    })
  )
})

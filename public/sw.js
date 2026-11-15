const SHELL = ['/offline', '/brand/logo-192.png', '/brand/logo-512.png', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open('liftoff-shell-v1')
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request)
      return cached || (await caches.match('/offline')) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    }),
  )
})

self.addEventListener('push', (event) => {
  let payload = { title: 'Liftoff Club', body: '', url: '/', tag: 'liftoff' }
  try {
    payload = { ...payload, ...(event.data ? event.data.json() : {}) }
  } catch {
    payload.body = event.data ? event.data.text() : ''
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/brand/logo-192.png',
      badge: '/brand/logo-192.png',
      data: { url: payload.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
      return undefined
    }),
  )
})

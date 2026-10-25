// Ayush Enterprises — shows owner notifications sent by the server (Firebase Cloud Messaging, data messages).
// Kept separate from the offline-cache service worker (different scope), and uses no libraries.
self.addEventListener('push', (event) => {
  let msg = {}
  try {
    const raw = event.data ? event.data.json() : {}
    msg = raw.data || raw.notification || raw // FCM puts our fields under "data"
  } catch {
    msg = { title: 'Ayush Enterprises', body: event.data ? event.data.text() : '' }
  }
  const title = msg.title || 'Ayush Enterprises'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: msg.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: msg.tag || undefined, // same tag replaces an older notification instead of stacking duplicates
      renotify: !!msg.tag,
      data: { link: msg.link || '/#/owner/home' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = new URL(event.notification.data?.link || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin)) {
          w.navigate(link).catch(() => {})
          return w.focus()
        }
      }
      return self.clients.openWindow(link)
    }),
  )
})

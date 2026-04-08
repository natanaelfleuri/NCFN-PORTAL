const CACHE_NAME = 'ncfn-cache-v2';
const STATIC_URLS = [
    '/',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
];

// ── Install: cache static assets ─────────────────────────────────────────────
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_URLS).catch(() => {}))
    );
});

// ── Activate: limpa caches antigos ───────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// ── Fetch: network-first para API, cache-first para estático ─────────────────
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    // Sempre busca na rede para APIs e páginas dinâmicas
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin/')) {
        event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
        return;
    }
    // Cache-first para assets estáticos
    event.respondWith(
        caches.match(event.request)
            .then(cached => cached || fetch(event.request)
                .then(response => {
                    if (response.ok && event.request.method === 'GET') {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
            )
    );
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', event => {
    let data = { title: 'NCFN', body: 'Nova notificação do sistema.', icon: '/icon-192.png', tag: 'ncfn-default' };
    try {
        if (event.data) data = { ...data, ...event.data.json() };
    } catch {}

    const options = {
        body: data.body,
        icon: data.icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || 'ncfn-default',
        renotify: true,
        requireInteraction: data.requireInteraction || false,
        data: { url: data.url || '/admin' },
        actions: data.actions || [],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

// ── Notification click: abre a URL correspondente ────────────────────────────
self.addEventListener('notificationclick', event => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/admin';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(targetUrl);
                        return client.focus();
                    }
                }
                return clients.openWindow(targetUrl);
            })
    );
});

// ── Background sync (futuro) ──────────────────────────────────────────────────
self.addEventListener('sync', event => {
    if (event.tag === 'ncfn-bg-sync') {
        event.waitUntil(fetch('/api/admin/sse').catch(() => {}));
    }
});

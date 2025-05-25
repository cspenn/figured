// Service Worker for Figured Chrome Extension

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
    event.waitUntil(
        caches.open('figured-v1').then(cache => {
            return cache.addAll([
                '/newtab/newtab.html',
                '/newtab/newtab.css',
                '/newtab/newtab.js',
                '/common/locations.json',
                '/icons/icon16.png',
                '/icons/icon48.png',
                '/icons/icon128.png'
            ]);
        })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    // Clean up old caches
    const cacheWhitelist = ['figured-v1']; // Define current cache name
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim(); // Ensure the activated SW takes control immediately
});

// Fetch event
self.addEventListener('fetch', (event) => {
    // Only cache GET requests for extension resources
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        event.respondWith(fetch(event.request));
        return;
    }
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).then(fetchResponse => {
                // Optionally, dynamically cache new resources if needed, but be careful with cache size.
                // For this extension, explicit caching on install is likely sufficient.
                return fetchResponse;
            });
        })
    );
});

console.log('Service Worker loaded');

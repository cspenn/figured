// Service Worker for Figured Chrome Extension

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker installed');
    event.waitUntil(
        caches.open('figured-v1').then(cache => {
            return cache.addAll([
                '/',
                '/newtab/newtab.html',
                '/newtab/newtab.css',
                '/newtab/newtab.js',
                '/common/locations.json'
            ]);
        })
    );
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    // Clean up old caches
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(cacheName => {
                    return cacheName.startsWith('figured-') && 
                           cacheName !== 'figured-v1';
                }).map(cacheName => {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

// Message handler for storage operations
self.addEventListener('message', (event) => {
    if (event.data.type === 'GET_STORAGE') {
        chrome.storage.local.get(event.data.key, (result) => {
            event.ports[0].postMessage(result);
        });
    } else if (event.data.type === 'SET_STORAGE') {
        chrome.storage.local.set({[event.data.key]: event.data.value}, () => {
            event.ports[0].postMessage({success: true});
        });
    }
});

console.log('Service Worker loaded');

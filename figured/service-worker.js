// figured/figured/service-worker.js

const FIG_ALARM_NAME = 'figUpdateTimeAlarm';
// const FIG_CACHE_NAME = 'figured-v1'; // We might not need a cache for local assets

// Install event - Simplified
self.addEventListener('install', (event) => {
    console.log('Service Worker installed. Skipping explicit caching of local assets.');
    // We still want to ensure the alarm is created after the SW is ready.
    // event.waitUntil can be used to delay activation until a promise resolves.
    // For simplicity now, just creating the alarm. If other async setup is needed, use waitUntil.
    try {
        console.log('Creating update alarm during install.');
        chrome.alarms.create(FIG_ALARM_NAME, {
            delayInMinutes: 0.01,
            periodInMinutes: 1 / 60 // Every second
        });
        console.log('Update alarm created.');
    } catch (error) {
        console.error('Failed to create alarm during install:', error);
        // If alarm creation is critical, you might want to handle this failure.
    }
    // If you had other async setup, you would do:
    // event.waitUntil(
    //     Promise.resolve() // Replace with your actual async setup promise
    //     .then(() => {
    //         chrome.alarms.create(FIG_ALARM_NAME, { /* ... */ });
    //         console.log('Core setup complete and alarm created.');
    //     })
    //     .catch(error => {
    //         console.error('Failed during install setup or alarm creation:', error);
    //     })
    // );
});

// Activate event - Can remove cache cleanup if no cache is being actively managed by SW
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated');
    // If FIG_CACHE_NAME was used for other purposes and needs cleanup, keep this.
    // Otherwise, if no caching is done by the SW, this cache cleanup can be removed.
    // For now, let's assume we might use cache for other things later, or just clear old unrelated caches.
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Example: Define a whitelist of caches to keep, if any.
                    // const cacheWhitelist = ['some-other-cache-v1'];
                    // if (cacheWhitelist.indexOf(cacheName) === -1) {
                    //    console.log('Deleting potentially old cache:', cacheName);
                    //    return caches.delete(cacheName);
                    // }
                    // For now, let's be cautious and not delete caches unless we know which ones.
                    // If FIG_CACHE_NAME was used, it would be:
                    // if (cacheName !== FIG_CACHE_NAME) { ... delete ... }
                })
            );
        }).then(() => self.clients.claim()) // Ensure the activated SW takes control immediately
    );
});

// Listen for the alarm
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === FIG_ALARM_NAME) {
        // console.log('Figured update alarm triggered by service worker');
        chrome.runtime.sendMessage({ type: 'FIG_UPDATE_TIME' }, (response) => {
            if (chrome.runtime.lastError) {
                // This can happen if no new tab page is open to receive the message.
                // console.log('Error sending update message or no receiver:', chrome.runtime.lastError.message);
            } else {
                // console.log('Update message sent, response:', response);
            }
        });
    }
});

// Optional: Re-create alarm on browser startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Browser started, checking alarm state.');
    chrome.alarms.get(FIG_ALARM_NAME, (alarm) => {
        if (!alarm) {
            console.log('Alarm not found on startup, recreating.');
            chrome.alarms.create(FIG_ALARM_NAME, {
                delayInMinutes: 0.01,
                periodInMinutes: 1 / 60
            });
        } else {
            console.log('Alarm already exists on startup.');
        }
    });
});

// Fetch event - This will now serve local extension files directly if requested.
self.addEventListener('fetch', (event) => {
    // Only intercept requests for resources within our extension's origin
    if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
        // console.log('Service Worker intercepting fetch for:', event.request.url); // For debugging
        // For local extension files, simply fetching them will retrieve them from the package.
        // No need to interact with Cache API here for these local files if not precached.
        event.respondWith(fetch(event.request).catch(error => {
            console.error('Fetch failed in service worker for local resource:', event.request.url, error);
            // Optionally, provide a generic error response or rethrow
            throw error;
        }));
    }
    // For other requests (e.g., to external domains, or non-GET), let the browser handle them normally.
});

console.log('Service Worker loaded (Simplified install, direct fetch for local assets)');
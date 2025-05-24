// Figured Service Worker
// Version 1.0

console.log("Figured Service Worker Started.");

// For Manifest V3, a service worker is required if you use certain APIs,
// or just to have a background presence. For v1 of Figured, its role is minimal.

// Example of listening for extension installation or update
self.addEventListener('install', (event) => {
  console.log('Figured extension installing...');
  // Perform any first-time setup if needed, e.g., initializing storage defaults
  // For Figured, most initialization is handled by newtab.js on first run.
});

self.addEventListener('activate', (event) => {
  console.log('Figured extension activated.');
});

// No complex background tasks like chrome.alarms for time updates are planned for V1,
// as newtab.js will handle its own time updates with setInterval when the page is visible.
// This service worker primarily fulfills the Manifest V3 requirement for an extension
// that might use 'storage' or other permissions that imply a background context.

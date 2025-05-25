# System Patterns

## Architecture Overview
- Manifest V3 Chrome Extension.
- Primary UI and logic reside in the New Tab page (`newtab.html`, `newtab.css`, `newtab.js`).
- Service worker (`service-worker.js`) for essential background tasks (e.g., caching).
- Local JSON file (`locations.json`) as the sole data source for timezone information.
- User preferences stored via `chrome.storage.local`.

## Key Technical Decisions
- Using Memory Bank documentation system (.clinerules)
- Time updates managed by `setInterval` within `newtab.js` for V1.0/V1.1.
+ Time updates managed by `chrome.alarms` API, coordinated by the service worker, for enhanced efficiency (Target: V1.1).

## Design Patterns
- Documentation-driven development

## Component Relationships
- `manifest.json` references `newtab.html` and `service-worker.js`.
- `newtab.html` links to `newtab.css` and `newtab.js`.
- `newtab.js` fetches data from `common/locations.json` and interacts with `chrome.storage.local`.

## Critical Implementation Paths
- Timezone data loading and parsing.
- Real-time display updates of timezone cards.
- User interaction for adding/removing timezones.
- Persistence of user settings.

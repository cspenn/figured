# Project Progress

## Current Phase
Polish Phase (Revised Plan)

## Completed Tasks (Initial Build)
- Created all extension icons (16px, 48px, 128px)
- Implemented locations.json with expanded global cities (140 entries)
- Created manifest.json with proper configuration
- Developed newtab page:
  - HTML structure with timezone cards template
  - CSS styling with day/night color coding
  - JavaScript for timezone display and updates
- Implemented service worker with caching and storage

## Polish Phase Tasks (Revised)
- [x] **Manifest Optimization:**
    - [x] Verify and potentially remove `web_accessible_resources` for `locations.json` if not strictly necessary (`figured/manifest.json`).
- [x] **Update Mechanism Overhaul (NFR2.2):**
    - [x] Implement `chrome.alarms` API in `figured/service-worker.js` to trigger time updates every second.
    - [x] Modify `figured/newtab/newtab.js` to listen for update messages from the service worker via `chrome.runtime.onMessage` and remove the existing `setInterval` based update mechanism.
- [x] **Timezone Information Accuracy (FR3.5):**
    - [x] In `figured/newtab/newtab.js`, enhance the robustness of parsing UTC offset from `Intl.DateTimeFormat('en-US', {timeZone: tz.iana, timeZoneName: 'longOffset'})`.
    - [x] Remove or replace the incorrect fallback logic for UTC offset calculation that uses `new Date().getTimezoneOffset()`.
- [x] **System Timezone Logic Refinement (FR6):**
    - [x] In `figured/newtab/newtab.js`, ensure `addCurrentSystemTimezone()` correctly applies `isSystemMarker = true` to an already user-added timezone if it matches the system's IANA.
- [x] **Display Order Persistence Verification (FR10.1):**
    - [x] Verify that the current implementation of saving and loading `userTimezones` in `figured/newtab/newtab.js` implicitly preserves the intended display order (e.g., Home first, then System, then user-added in order of addition). Document this behavior. No code change if current implicit order is sufficient for V1.
- [x] **Alarm Permission Fix:**
    - [x] Added "alarms" permission to `figured/manifest.json`.

## Next Steps
Proceeding with the Testing & Validation phase as outlined in `docs/polish.md`. This includes performance profiling, accessibility checks, cross-browser/OS spot checks, and regression testing.

## Testing Instructions
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable "Developer mode" (toggle in the top right).
3. Click "Load unpacked" and select the `figured` directory.
4. Open a new tab to test the extension.
5. Verify all timezone functionality works as per PRD (add/remove cities, home timezone, system timezone, shared locations).
6. Check console for any errors.
7. Test edge cases (max timezones, invalid inputs).
8. Verify styling and responsiveness.
9. **New:** Verify time updates are smooth and consistent (now driven by `chrome.alarms`).
10. **New:** Test performance with 24 timezones.
11. **New:** Conduct accessibility checks (keyboard navigation, color contrast).

## Known Issues
- Confirmed as resolved: `TypeError` during service worker installation due to incorrect URL formatting for `cache.addAll()`.

None yet - needs thorough testing

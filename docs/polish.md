Okay, here is a detailed work plan to implement the necessary changes, fixes, and updates for the "Figured" Chrome extension. This plan focuses on addressing root causes and provides granular, file-by-file instructions.

---

## **Workplan: Figured Extension - Phase 2 Implementation & Refinement**

This workplan details the steps to complete the core functionality of the "Figured" Chrome extension, addressing items identified in the previous code review and aligning with the PRD and original workplan.

### **General Development Notes:**

*   **Version Control:** Commit changes frequently with clear messages.
*   **Testing:** After each significant change or feature implementation, manually test the functionality in an unpacked Chrome extension.
*   **DevTools:** Use Chrome DevTools extensively for debugging, performance profiling, and inspecting elements.
*   **PRD/Workplan Reference:** Keep the `prd.md` and the original `workplan.md` handy for functional requirements and overall goals.

---

### **1. File: `figured/common/locations.json`**

*   **File Path:** `figured/common/locations.json`
*   **Intent:** To serve as the primary, local data source for cities and their corresponding IANA timezone identifiers.
*   **Changes Needed:**
    1.  **Verify Data Integrity & Structure:**
        *   Ensure each object in the JSON array strictly follows the defined structure:
            *   `city` (String): Common city name.
            *   `countryCode` (String): Short country identifier.
            *   `countryName` (String): Full country name.
            *   `iana` (String): Canonical IANA timezone name.
            *   `lat` (Number, Optional): Latitude.
            *   `lon` (Number, Optional): Longitude.
        *   Example:
            ```json
            [
              {
                "city": "London",
                "countryCode": "GBR", // Or "UK" as per workplan example, ensure consistency
                "countryName": "United Kingdom",
                "iana": "Europe/London",
                "lat": 51.5074,
                "lon": 0.1278
              },
              // ... other locations
            ]
            ```
    2.  **Ensure Sufficient & Diverse Data (FR2.1):**
        *   Confirm that the file contains an adequate initial set of diverse global cities (e.g., 50-100 as suggested in the original workplan, or more if readily available and verified). This is crucial for the "Add City" and "Shared Locations" features.
        *   Include cities from various continents and timezones, including those with and without DST, and those with non-integer hour offsets if possible (though `Intl` handles this, good for testing).
*   **Upstream Dependencies:** None (this is primary data).
*   **Downstream Dependencies:** `figured/figured/newtab/newtab.js` (fetches and parses this file).

---

### **2. File: `figured/manifest.json`**

*   **File Path:** `figured/manifest.json`
*   **Intent:** Define the core properties, permissions, and components of the Chrome extension.
*   **Changes Needed:**
    1.  **Review Version:**
        *   Ensure the `"version"` field is appropriate (e.g., `"1.0.0"` for a first release, or an incremental development version like `"0.2.0"`).
            ```diff
            --- a/figured/manifest.json
            +++ b/figured/manifest.json
            @@ -2,7 +2,7 @@
               "manifest_version": 3,
               "name": "Figured",
            -  "version": "1.0",
            +  "version": "1.0.0",
               "description": "Display multiple timezones on your new tab page with day/night color coding. Reimagining FIO, locally.",
               "icons": {
                 "16": "icons/icon16.png",
            ```
    2.  **Verify Content Security Policy (CSP) (NFR4.2):**
        *   The current CSP `"extension_pages": "script-src 'self'; object-src 'self';"` is good and strict.
        *   Confirm no other sources are needed. If, for example, you decide to load fonts from Google Fonts (not in PRD), you'd need to add `font-src https://fonts.gstatic.com;` and adjust `style-src` if using `@import` in CSS. For now, assume no external resources.
    3.  **Ensure Minimal Permissions (NFR4.1):**
        *   The current permissions `["storage", "activeTab"]` (as per best practices document example; actual `manifest.json` for Figured was `["storage"]`) are minimal for the core features described. If `activeTab` was added, ensure it's actually used (not currently for a newtab page override). The PRD implies only `storage` and `chrome_url_overrides` are needed.
        *   Verify `host_permissions` is empty or not present if not strictly needed.
*   **Upstream Dependencies:** `figured/icons/*` (icon paths).
*   **Downstream Dependencies:** This file is the entry point for the Chrome browser; all other extension files are downstream.

---

### **3. File: `figured/figured/service-worker.js`**

*   **File Path:** `figured/figured/service-worker.js`
*   **Intent:** Handle background tasks, primarily caching for this extension as of now.
*   **Changes Needed:**
    1.  **Remove Unused Storage Message Handler:**
        *   The `message` event listener for `GET_STORAGE` and `SET_STORAGE` is not used by `newtab.js` (which uses `chrome.storage.local` directly). Remove this to prevent dead code and potential confusion.
        ```diff
        --- a/figured/figured/service-worker.js
        +++ b/figured/figured/service-worker.js
        @@ -31,18 +31,4 @@
         })
     );
 });
-
-// Message handler for storage operations
-self.addEventListener('message', (event) => {
-    if (event.data.type === 'GET_STORAGE') {
-        chrome.storage.local.get(event.data.key, (result) => {
-            event.ports[0].postMessage(result);
-        });
-    } else if (event.data.type === 'SET_STORAGE') {
-        chrome.storage.local.set({[event.data.key]: event.data.value}, () => {
-            event.ports[0].postMessage({success: true});
-        });
-    }
-});
-
 console.log('Service Worker loaded');
        ```
    2.  **Review Cache Name and Versioning:**
        *   The current cache name is `'figured-v1'`. This is good. If significant changes are made to cached assets in the future, increment this version (e.g., `'figured-v2'`) and ensure the `activate` event correctly cleans up old caches (which it currently does by checking `startsWith('figured-')`). No change needed now, but a point for future maintenance.
*   **Upstream Dependencies:** `figured/manifest.json` (references this file).
*   **Downstream Dependencies:** `newtab/*` assets (these are cached by the service worker).

---

### **4. File: `figured/figured/newtab/newtab.html`**

*   **File Path:** `figured/figured/newtab/newtab.html`
*   **Intent:** Define the HTML structure for the new tab page.
*   **Changes Needed:**
    1.  **Add Elements for City Search Suggestions:**
        *   Below the `city-search-input`, add a container for displaying search suggestions.
        ```diff
        --- a/figured/figured/newtab/newtab.html
        +++ b/figured/figured/newtab/newtab.html
        @@ -14,6 +14,7 @@
     <div class="add-timezone-wrapper">
         <input type="text" id="city-search-input" placeholder="Add another timezone...">
         <button id="add-city-btn">Add</button>
        +        <div id="city-suggestions-container"></div> <!-- Suggestions will be populated here -->
         <div id="location-not-found-msg" style="display: none;">
             Location not found. <a href="#" id="search-on-google">Search on Google</a>
         </div>
        ```
    2.  **Ensure ARIA Attributes for Accessibility:**
        *   The remove button in the template (`<button class="remove-tz-btn">×</button>`) should ideally have an `aria-label` if not already visually clear. The template comment in `workplan.md` did include `aria-label="Remove Timezone"`. Ensure this is in the actual template.
        ```diff
        --- a/figured/figured/newtab/newtab.html
        +++ b/figured/figured/newtab/newtab.html
        @@ -21,7 +22,7 @@
         <!-- Timezone cards will be inserted here -->
         <template id="timezone-card-template">
             <div class="timezone-card">
        -                <button class="remove-tz-btn">×</button>
        +                <button class="remove-tz-btn" aria-label="Remove Timezone">×</button>
                 <div class="city-name"></div>
                 <div class="country-name"></div>
                 <div class="current-time">
        ```
*   **Upstream Dependencies:** None directly for structure, but relies on concepts from `prd.md`.
*   **Downstream Dependencies:** `figured/figured/newtab/newtab.css` (styles these elements), `figured/figured/newtab/newtab.js` (manipulates these DOM elements).

---

### **5. File: `figured/figured/newtab/newtab.css`**

*   **File Path:** `figured/figured/newtab/newtab.css`
*   **Intent:** Style the new tab page.
*   **Changes Needed:**
    1.  **Add Styles for City Search Suggestions (`#city-suggestions-container`):**
        *   Style the suggestion list to appear below the search input, with appropriate background, borders, and item styling.
        ```css
        /* Add at the end of the file or in a relevant section */
        #city-suggestions-container {
            position: absolute;
            background-color: #3f3f3f;
            border: 1px solid #555;
            border-top: none;
            border-radius: 0 0 4px 4px;
            width: calc(100% - 88px); /* Adjust based on add-city-btn width and padding */
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .suggestion-item {
            padding: 8px 12px;
            color: #e0e0e0;
            cursor: pointer;
        }

        .suggestion-item:hover {
            background-color: #555;
        }

        .suggestion-item.selected { /* Optional: for keyboard navigation */
            background-color: #1a73e8;
            color: white;
        }
        ```
        *   *Note:* The `width` for `#city-suggestions-container` might need adjustment based on the layout of `#city-search-input` and `#add-city-btn` within `.add-timezone-wrapper`. You might need to wrap the input and suggestions container in a `div` with `position: relative;` for the `position: absolute;` on the suggestions container to work as expected relative to the input.
    2.  **Style for "Location Not Found" Message:**
        *   Ensure `#location-not-found-msg` is clearly visible when displayed. The current style is `color: #ff6b6b; margin-top: 5px;`. This is likely sufficient.
    3.  **Accessibility Review - Color Contrast (NFR3.3):**
        *   Re-evaluate color contrasts for text on `.timezone-card.day`, `.timezone-card.evening`, and `.timezone-card.night` backgrounds. Use a contrast checker tool.
        *   Example adjustment if contrast is low on `.timezone-card.evening`:
            ```diff
            --- a/figured/figured/newtab/newtab.css
            +++ b/figured/figured/newtab/newtab.css
            @@ -70,7 +70,7 @@
 
             .timezone-card.evening {
                 background-color: #f0c14b; /* Existing */
            -    color: #333; /* Check contrast against #f0c14b */
            +    color: #222; /* Example: Darken if #333 was too light */
             }
 
             .timezone-card.night {
            ```
    4.  **Remove Button Styling:**
        *   Ensure `.remove-tz-btn` is easily clickable and visually distinct. The current styling (`color: #ff6b6b; font-size: 1.2em;`) is a good start. Consider adding a slight hover effect for better feedback.
        ```diff
        --- a/figured/figured/newtab/newtab.css
        +++ b/figured/figured/newtab/newtab.css
        @@ -89,6 +89,10 @@
             color: #ff6b6b;
             font-size: 1.2em;
             cursor: pointer;
        +    transition: color 0.2s ease;
        +}
        +.remove-tz-btn:hover {
        +    color: #e74c3c; /* Darker red on hover */
         }
 
         .city-name {
        ```
*   **Upstream Dependencies:** `figured/figured/newtab/newtab.html` (defines the HTML structure being styled).
*   **Downstream Dependencies:** `figured/figured/newtab/newtab.js` (may toggle classes that these styles depend on).

---

### **6. File: `figured/figured/newtab/newtab.js`**

*   **File Path:** `figured/figured/newtab/newtab.js`
*   **Intent:** Implement all core client-side logic for the extension. This is where most changes will occur.
*   **Changes Needed:**

    **A. Initialization & Setup:**
    1.  **Uncomment Event Listeners:**
        ```diff
        --- a/figured/figured/newtab/newtab.js
        +++ b/figured/figured/newtab/newtab.js
        @@ -10,6 +10,7 @@
 const homeTimezoneSelect = document.getElementById('home-timezone-select');
 const setHomeBtn = document.getElementById('set-home-btn');
 const addCityBtn = document.getElementById('add-city-btn');
+const citySuggestionsContainer = document.getElementById('city-suggestions-container');
 const citySearchInput = document.getElementById('city-search-input');
 const locationNotFoundMsg = document.getElementById('location-not-found-msg');
 
@@ -25,8 +26,8 @@
     
     // Setup event listeners
     setHomeBtn.addEventListener('click', handleSetHomeTimezone);
-    // addCityBtn.addEventListener('click', handleAddCity);
-    // citySearchInput.addEventListener('input', handleCitySearchInput);
+    addCityBtn.addEventListener('click', handleAddCity);
+    citySearchInput.addEventListener('input', debounce(handleCitySearchInput, 300)); // Added debounce
 }
 
 // Load locations data from JSON file
        ```
    2.  **Add Debounce Utility Function:**
        (Place this helper function near the top or in a utility section of the file)
        ```javascript
        // Debounce utility
        function debounce(func, delay) {
            let timeout;
            return function(...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), delay);
            };
        }
        ```

    **B. Implement Adding Timezones (FR7, FR12):**
    1.  **`handleCitySearchInput(event)` Function:**
        (This function will be called by the debounced event listener)
        ```javascript
        // Add this new function
        async function handleCitySearchInput(event) {
            const searchTerm = event.target.value.trim().toLowerCase();
            citySuggestionsContainer.innerHTML = ''; // Clear previous suggestions
            locationNotFoundMsg.style.display = 'none';

            if (searchTerm.length < 2) { // Min length to start searching
                return;
            }

            if (allLocations.length === 0) {
                await loadLocationsData(); // Ensure locations are loaded
            }

            const suggestions = allLocations.filter(loc => 
                loc.city.toLowerCase().includes(searchTerm) || 
                loc.countryName.toLowerCase().includes(searchTerm) ||
                loc.iana.toLowerCase().includes(searchTerm)
            ).slice(0, 10); // Limit to 10 suggestions for performance

            if (suggestions.length > 0) {
                suggestions.forEach(loc => {
                    const item = document.createElement('div');
                    item.classList.add('suggestion-item');
                    item.textContent = `${loc.city}, ${loc.countryName} (${loc.iana})`;
                    item.dataset.iana = loc.iana;
                    item.addEventListener('click', () => {
                        citySearchInput.value = `${loc.city}, ${loc.countryName}`;
                        citySuggestionsContainer.innerHTML = '';
                        // Optionally, directly call handleAddCity here with the selected location data
                        // For now, let user click "Add" button after selection populates input
                    });
                    citySuggestionsContainer.appendChild(item);
                });
            } else {
                // No suggestions from local data, still allow "Add" to be clicked for FR12
            }
        }
        ```
    2.  **`handleAddCity()` Function:**
        ```javascript
        // Add this new function (or modify if a stub existed)
        async function handleAddCity() {
            const searchTermOrSelected = citySearchInput.value.trim();
            citySuggestionsContainer.innerHTML = ''; // Clear suggestions

            if (!searchTermOrSelected) {
                alert("Please enter or select a city.");
                return;
            }

            if (userTimezones.length >= 24) { // FR7.2
                alert("You have reached the maximum of 24 timezones.");
                locationNotFoundMsg.textContent = "Maximum of 24 timezones reached.";
                locationNotFoundMsg.style.display = 'block';
                return;
            }

            // Try to find an exact match from suggestions or direct IANA if user pasted one
            let locationData = allLocations.find(loc => loc.iana === searchTermOrSelected); // If IANA was directly entered/selected
            if (!locationData) { // If not IANA, search by city, country from input
                 locationData = allLocations.find(loc => 
                    `${loc.city}, ${loc.countryName}`.toLowerCase() === searchTermOrSelected.toLowerCase() ||
                    loc.city.toLowerCase() === searchTermOrSelected.toLowerCase() // Simpler match if country not specified
                );
            }
            
            if (locationData) {
                if (userTimezones.some(tz => tz.iana === locationData.iana)) {
                    alert(`${locationData.city} is already in your list.`);
                    citySearchInput.value = '';
                    return;
                }

                const newTimezone = { ...locationData, userAdded: true, isHome: false };
                userTimezones.push(newTimezone); // Add to end, or implement ordering logic
                await saveUserTimezones();
                renderTimezones();
                await addSharedLocations(newTimezone); // FR8
                citySearchInput.value = '';
                locationNotFoundMsg.style.display = 'none';

            } else { // FR12 - Handling Unlisted Locations
                locationNotFoundMsg.innerHTML = `Location "${searchTermOrSelected}" not found. Try the nearest major city. 
                                                 <a href="https://www.google.com/search?q=${encodeURIComponent(searchTermOrSelected + " timezone")}" target="_blank" id="search-on-google">Search on Google</a>`;
                locationNotFoundMsg.style.display = 'block';
            }
        }
        ```

    **C. Implement "Shared Locations" Logic (FR8):**
    1.  **`addSharedLocations(addedTimezone)` Function:**
        ```javascript
        // Add this new function
        async function addSharedLocations(addedTimezone) {
            const now = new Date();
            // Determine the effective offset (including DST) for the added timezone
            // A reliable way is to format with 'Z' (UTC offset) and parse
            const addedTimezoneOffsetString = new Intl.DateTimeFormat('en-US', {
                timeZone: addedTimezone.iana,
                timeZoneName: 'longOffset'
            }).format(now);

            let newLocationsAdded = false;

            for (const loc of allLocations) {
                if (userTimezones.length >= 24) break; // Respect limit
                if (loc.iana === addedTimezone.iana || userTimezones.some(tz => tz.iana === loc.iana)) {
                    continue; // Skip if it's the added one or already present
                }

                const currentLocOffsetString = new Intl.DateTimeFormat('en-US', {
                    timeZone: loc.iana,
                    timeZoneName: 'longOffset'
                }).format(now);
                
                if (currentLocOffsetString === addedTimezoneOffsetString) {
                    const sharedTimezone = { ...loc, userAdded: false, isHome: false, sharedFrom: addedTimezone.iana };
                    userTimezones.push(sharedTimezone);
                    newLocationsAdded = true;
                }
            }

            if (newLocationsAdded) {
                await saveUserTimezones();
                renderTimezones(); // Re-render to show newly added shared locations
                console.log("Added shared locations for:", addedTimezone.city);
            }
        }
        ```

    **D. Implement Removing Timezones (FR9):**
    1.  **Uncomment Event Listener in `renderTimezones()`:**
        ```diff
        --- a/figured/figured/newtab/newtab.js
        +++ b/figured/figured/newtab/newtab.js
        @@ -158,7 +194,7 @@
         const removeBtn = cardElement.querySelector('.remove-tz-btn');
         if (removeBtn) {
             removeBtn.dataset.iana = tzData.iana;
-            // removeBtn.addEventListener('click', handleRemoveTimezone);
+            removeBtn.addEventListener('click', handleRemoveTimezone);
         }
 
         timezoneGrid.appendChild(cardElement);
        ```
    2.  **`handleRemoveTimezone(event)` Function:**
        ```javascript
        // Add this new function
        async function handleRemoveTimezone(event) {
            const ianaToRemove = event.target.dataset.iana;
            if (!ianaToRemove) return;

            userTimezones = userTimezones.filter(tz => tz.iana !== ianaToRemove);
            
            // If removing home timezone, unset it
            const homeWasRemoved = !userTimezones.some(tz => tz.isHome);
            if (homeWasRemoved && ianaToRemove === homeTimezoneSelect.value) { // Check if the *current* home selection was removed
                 const homeTimezoneData = await chrome.storage.local.get('homeTimezoneSet');
                 if(homeTimezoneData.homeTimezoneSet){ // Only if a home was actually set
                    // Decide behavior: prompt again, or just remove?
                    // For now, just remove. User can set a new one via settings (future) or by clearing all and starting over.
                    // Or, if only one timezone left, make it home?
                    // Simplest: just remove. If no home is set, the prompt might reappear if logic in checkFirstRun allows.
                    // Let's refine `checkFirstRun` to only prompt if `userTimezones` is empty or no `isHome=true` exists.
                 }
            }
            // If home was removed, and it was the *only* 'isHome=true' timezone, update 'homeTimezoneSet'
            const stillHasHome = userTimezones.some(tz => tz.isHome);
            if (!stillHasHome) {
                await chrome.storage.local.set({ homeTimezoneSet: false });
            }


            await saveUserTimezones();
            renderTimezones();
            checkFirstRun(); // Re-check if home prompt needs to be shown
        }
        ```
    3.  **Refine `checkFirstRun()` and `handleSetHomeTimezone()` for home removal:**
        In `handleSetHomeTimezone()`: Before adding new home, ensure any existing `isHome: true` flags are cleared.
        ```diff
        --- a/figured/figured/newtab/newtab.js
        +++ b/figured/figured/newtab/newtab.js
        @@ -107,6 +257,9 @@
         alert("Error setting home timezone. Data inconsistency.");
         return;
     }
+    // Clear any existing home timezone flag
+    userTimezones.forEach(tz => tz.isHome = false);
+
 
     const homeTimezone = { ...homeLocationData, isHome: true, userAdded: true };
 
        ```
        Modify `checkFirstRun` to also show prompt if no timezone has `isHome: true`.
        ```diff
        --- a/figured/figured/newtab/newtab.js
        +++ b/figured/figured/newtab/newtab.js
        @@ -61,8 +314,9 @@
 
 // Check if this is the first run (no home timezone set)
 function checkFirstRun() {
-    chrome.storage.local.get('homeTimezoneSet', (result) => {
-        if (!result.homeTimezoneSet) {
+    // Also check if userTimezones array contains any 'isHome=true'
+    const homeExistsInUserList = userTimezones.some(tz => tz.isHome);
+    chrome.storage.local.get('homeTimezoneSet', (result) => {        if (!result.homeTimezoneSet || !homeExistsInUserList) {
             homePrompt.style.display = 'block';
             populateHomeTimezoneSelect();
         } else {
        ```

    **E. Implement "Current System" Timezone Display (FR6):**
    1.  **Add to `init()` or as a user-triggered action (e.g., a button later):**
        For now, let's add it to `init()` to always try and add it if not present.
        Modify `init()`:
        ```diff
        --- a/figured/figured/newtab/newtab.js
        +++ b/figured/figured/newtab/newtab.js
        @@ -19,6 +353,7 @@
 async function init() {
     await loadLocationsData();
     await loadUserTimezones();
+    await addCurrentSystemTimezone(); // Add this call
     checkFirstRun();
     renderTimezones();
     startUpdateInterval();
        ```
    2.  **`addCurrentSystemTimezone()` Function:**
        ```javascript
        // Add this new function
        async function addCurrentSystemTimezone() {
            try {
                const systemIANA = Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (userTimezones.some(tz => tz.iana === systemIANA && tz.isSystem)) {
                    return; // Already added as system timezone
                }

                // If a user-added timezone matches systemIANA, mark it or just skip adding system?
                // For now, let's add it specifically as a system one.
                // Remove any non-system one that matches systemIANA to avoid duplicates where one is user-added and one is system.
                userTimezones = userTimezones.filter(tz => !(tz.iana === systemIANA && !tz.isSystem));


                let systemLocationData = allLocations.find(loc => loc.iana === systemIANA);

                if (!systemLocationData) {
                    // If system IANA is not in our list (e.g. "Etc/GMT+5")
                    // Create a placeholder.
                    // This part can be complex as city/country might not be easily known.
                    // For V1, we might only add if it's in allLocations.
                    console.warn(`System timezone ${systemIANA} not found in locations.json. Cannot add as 'Current System'.`);
                    return; 
                }
                
                // Check if it's already present (user might have added it manually)
                const existingIndex = userTimezones.findIndex(tz => tz.iana === systemIANA);
                if (existingIndex > -1) {
                    userTimezones[existingIndex].isSystem = true; // Mark it as system
                    // Potentially move to front or a designated spot for system timezone? (Out of scope for now)
                } else {
                     if (userTimezones.length < 24) {
                        const systemTimezone = { ...systemLocationData, isSystem: true, userAdded: false, isHome: false };
                        userTimezones.unshift(systemTimezone); // Add to the beginning
                    } else {
                        console.warn("Cannot add system timezone, maximum limit reached.");
                        return;
                    }
                }
                // No need to save here if init calls loadUserTimezones after this, then save.
                // Let's ensure save happens after this. It's better to save after modifications.
                await saveUserTimezones();
                // renderTimezones() will be called in init after this.

            } catch (error) {
                console.error("Error detecting or adding system timezone:", error);
            }
        }
        ```
        *Modify `renderTimezones` to visually distinguish system timezone if desired (e.g., special icon or border - out of scope for this pass but consider for CSS).*

    **F. Performance Optimization for `startUpdateInterval()` (NFR2.2):**
    1.  **Cache Card Elements:** Instead of querying `timezoneGrid.querySelectorAll('.timezone-card')` every second, associate card elements with their timezone data when initially rendered or store references.
        *   This is a slightly more complex refactor. A simpler immediate improvement is to ensure `updateTimezoneCard` is efficient. The current `updateTimezoneCard` is already quite optimized by directly updating text content. The main cost would be the `querySelectorAll`.
        *   Let's keep the current `startUpdateInterval` for now, as its performance impact might be acceptable for up to 24 cards if `updateTimezoneCard` remains efficient. Re-evaluate after testing with 24 cards. The current approach re-fetches cards by index which is reasonably direct.

    **G. General Code Improvements:**
    1.  **Error Handling:** Add more specific `try...catch` blocks or checks for `chrome.runtime.lastError` where appropriate, especially for `chrome.storage` operations if not using promises correctly (though MV3 promises are better). The current `await chrome.storage.local.set/get` should correctly use promises.
    2.  **User Feedback (NFR3.4):** Add simple visual feedback.
        *   Example: After successfully adding a city, briefly flash a "City Added!" message or highlight the new card. (Out of scope for this detailed pass, but keep in mind).
    3.  **DST Indicator in `updateTimezoneCard`:** The `dstIndicator.style.display = isDST ? 'inline' : 'none';` is correct.

*   **Upstream Dependencies:** `figured/figured/newtab/newtab.html` (DOM structure), `figured/figured/newtab/newtab.css` (styles), `figured/common/locations.json` (data source), Chrome APIs (`storage`, `Intl`).
*   **Downstream Dependencies:** None (this is the main application logic driver).

---

This detailed work plan should guide the developer through implementing the remaining features and fixes. Remember to test thoroughly at each step.
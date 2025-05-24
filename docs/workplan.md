# **Workplan: "Figured" Chrome Extension (v1.0)**

Based on PRD: figured\_prd\_v1\_1  
Extension Name: Figured  
This workplan outlines the development steps for the "Figured" Chrome Extension, file by file. It is intended to be granular enough for a developer to implement the features defined in the Product Requirements Document.

## **Overall Project Structure:**

figured/  
├── manifest.json  
├── icons/  
│   ├── icon16.png  
│   ├── icon48.png  
│   └── icon128.png  
├── newtab/  
│   ├── newtab.html  
│   ├── newtab.css  
│   └── newtab.js  
├── common/  
│   └── locations.json  
└── service-worker.js

## **Phase 1: Core Setup & Assets**

### **1\. File: icons/icon16.png, icons/icon48.png, icons/icon128.png**

* **File Path:** figured/icons/icon16.png, figured/icons/icon48.png, figured/icons/icon128.png  
* **Intent:** Provide the necessary icons for the Chrome extension (browser toolbar, extension management page, Chrome Web Store).  
* **Changes Needed:**  
  * Create or procure three PNG icons for the "Figured" extension at the specified sizes:  
    * icon16.png: 16x16 pixels  
    * icon48.png: 48x48 pixels  
    * icon128.png: 128x128 pixels  
  * Ensure icons are visually representative of a timezone/clock/global theme.  
  * Place these files in the figured/icons/ directory.  
* **Upstream Dependencies:** None (asset creation).  
* **Downstream Dependencies:** manifest.json (will reference these icon paths).  
* **PRD Reference:** Implied by standard Chrome extension requirements.

### **2\. File: common/locations.json**

* **File Path:** figured/common/locations.json  
* **Intent:** Store the bundled list of cities and their corresponding IANA timezone identifiers. This is the primary data source for timezone lookups. (FR2.1)  
* **Changes Needed:**  
  * Create a JSON file.  
  * The root of the JSON should be an array of objects.  
  * Each object should represent a location and have the following properties:  
    * city (String): The common name of the city (e.g., "London").  
    * countryCode (String): A short country identifier (e.g., "UK", "USA", "JPN").  
    * countryName (String): Full country name (e.g., "United Kingdom", "United States", "Japan").  
    * iana (String): The canonical IANA timezone name (e.g., "Europe/London", "America/New\_York", "Asia/Tokyo").  
    * lat (Number, Optional but recommended for future advanced color logic): Latitude.  
    * lon (Number, Optional but recommended for future advanced color logic): Longitude.  
  * Populate with an initial set of diverse global cities (e.g., 50-100 cities to start, can be expanded later).  
    Example Entry:  
    {  
      "city": "New York",  
      "countryCode": "USA",  
      "countryName": "United States",  
      "iana": "America/New\_York",  
      "lat": 40.7128,  
      "lon": \-74.0060  
    }

* **Upstream Dependencies:** None (data creation).  
* **Downstream Dependencies:** newtab/newtab.js (will fetch and parse this file to populate location search and retrieve IANA zones).  
* **PRD Reference:** FR2.1

### **3\. File: manifest.json**

* **File Path:** figured/manifest.json  
* **Intent:** Define the core properties, permissions, and components of the "Figured" Chrome extension. (DR4, NFR5.2)  
* **Changes Needed:**  
  * Create manifest.json with the following structure and content:  
    {  
      "manifest\_version": 3,  
      "name": "Figured",  
      "version": "1.0.0", // Or initial dev version like "0.1.0"  
      "description": "Display multiple timezones on your new tab page with day/night color coding. Reimagining FIO, locally.",  
      "icons": {  
        "16": "icons/icon16.png",  
        "48": "icons/icon48.png",  
        "128": "icons/icon128.png"  
      },  
      "chrome\_url\_overrides": {  
        "newtab": "newtab/newtab.html" // FR1  
      },  
      "permissions": \[  
        "storage" // FR10.1, NFR4.1 (for saving user preferences)  
        // "alarms" // NFR2.2 (Consider adding if chrome.alarms API is used for updates)  
      \],  
      "host\_permissions": \[\], // NFR4.1 (No host permissions needed for core functionality)  
      "background": {  
        "service\_worker": "service-worker.js" // NFR5.2 (Even if minimal, required by Mv3 if background logic exists)  
      },  
      "content\_security\_policy": { // NFR4.2  
        "extension\_pages": "script-src 'self'; object-src 'self';"  
        // Further refinement might be needed based on specific libraries if any are added (none planned for V1 core)  
      },  
      "web\_accessible\_resources": \[ // If newtab.js needs to fetch locations.json  
        {  
          "resources": \["common/locations.json"\],  
          "matches": \["\<all\_urls\>"\] // Or be more specific if possible, though newtab context might require broad access to its own resources.  
                                  // For newtab page, it might be able to fetch directly without this. Test this.  
                                  // If newtab.html can fetch common/locations.json directly, this might not be needed.  
        }  
      \]  
    }

  * Ensure "name" is "Figured".  
  * Update "version" as appropriate.  
  * Verify icon paths.  
* **Upstream Dependencies:** icons/ (for icon paths), newtab/newtab.html (path), service-worker.js (path).  
* **Downstream Dependencies:** This file is the entry point for the Chrome browser to load the extension. All other files are effectively downstream of it.  
* **PRD Reference:** FR1, FR10.1, DR4, NFR1.2, NFR4.1, NFR4.2, NFR5.2.

## **Phase 2: New Tab Page UI Structure & Basic Styling**

### **4\. File: newtab/newtab.html**

* **File Path:** figured/newtab/newtab.html  
* **Intent:** Define the HTML structure for the new tab page where timezones will be displayed.  
* **Changes Needed:**  
  * Create a basic HTML5 document.  
  * Include a \<head\> section:  
    * \<meta charset="UTF-8"\>  
    * \<meta name="viewport" content="width=device-width, initial-scale=1.0"\>  
    * \<title\>Figured \- Your Timezones\</title\>  
    * Link to newtab.css: \<link rel="stylesheet" href="newtab.css"\>  
  * Include a \<body\> section with the following main areas:  
    * **Header/Controls Area (Top):**  
      * Container for adding new timezones (e.g., an input field for city search, an "Add" button).  
      * Placeholder for "Home" timezone prompt (initially hidden).  
      * (Optional) A settings icon/button for future enhancements.  
    * **Timezone Display Area (Main):**  
      * A main container (e.g., \<div id="timezone-grid" class="timezone-grid"\>\</div\>) that will hold individual timezone columns.  
      * Define a template structure for a single timezone column (this can be a \<template\> tag or just a conceptual structure that newtab.js will replicate):  
        \<\!-- \<div class="timezone-card"\>  
            \<button class="remove-tz-btn" aria-label="Remove Timezone"\>×\</button\>  
            \<div class="location-info"\>  
                \<h2 class="city-name"\>City Name\</h2\>  
                \<p class="country-name"\>Country\</p\>  
            \</div\>  
            \<div class="time-info"\>  
                \<p class="current-time"\>HH:MM \<span class="am-pm"\>AM/PM\</span\>\</p\>  
                \<p class="current-date"\>Day, Mon DDth\</p\>  
            \</div\>  
            \<div class="zone-details"\>  
                \<span class="tz-abbr"\>PST\</span\> | \<span class="utc-offset"\>UTC-X\</span\>  
                \<span class="dst-indicator" style="display:none;"\>☀️ DST\</span\>  
            \</div\>  
        \</div\> \--\>

        * A \<template id="timezone-card-template"\> is recommended for cleaner JS.  
    * **Footer Area (Optional, Bottom):**  
      * Could contain links to a potential future options page, about info, etc. (Out of scope for V1 core).  
  * Link to newtab.js at the end of the \<body\>: \<script src="newtab.js"\>\</script\>  
* **Upstream Dependencies:** manifest.json (references this file).  
* **Downstream Dependencies:** newtab.css (styles elements defined here), newtab.js (manipulates DOM elements defined here).  
* **PRD Reference:** FR1, FR3 (defines elements to be displayed).

### **5\. File: newtab/newtab.css**

* **File Path:** figured/newtab/newtab.css  
* **Intent:** Style the new tab page, including the layout of timezone columns, text appearance, and the dynamic background colors.  
* **Changes Needed:**  
  * **Global Styles:**  
    * Basic reset/normalize if desired.  
    * Set box-sizing: border-box; for easier layout.  
    * Define body styles: font family (sans-serif), background color (a default, perhaps a neutral dark or light theme), text color, margin: 0; padding: 0;.  
    * Ensure the layout is responsive and uses the full viewport height.  
  * **Header/Controls Area Styling:**  
    * Style the search input and "Add" button.  
    * Style the first-run prompt.  
  * **Timezone Grid (\#timezone-grid):**  
    * Use CSS Grid or Flexbox to arrange timezone columns.  
    * Allow for horizontal scrolling if the number of columns exceeds viewport width (up to 24 columns as per FR7.2).  
    * Ensure columns have appropriate spacing.  
  * **Timezone Card (.timezone-card or template equivalent):**  
    * Define width, height (or min-height), padding, margin, border-radius.  
    * Style the text elements (city name, country, time, date, tz-abbr, utc-offset). Ensure good contrast and readability (NFR3.3).  
    * Style the remove button (e.g., an 'X' icon, positioned appropriately).  
    * Style the DST indicator.  
  * **Dynamic Background Colors (Placeholders/Base):**  
    * Define CSS variables or classes for the conceptual color gradient (goldenrod, sunset hues, midnight blue) mentioned in FR4.2. JavaScript will apply these.  
    * Example:  
      /\* :root {  
          \--color-day: goldenrod;  
          \--color-sunset1: orange;  
          \--color-sunset2: purple;  
          \--color-night: midnightblue;  
      } \*/  
      .timezone-card.day { background-color: goldenrod; /\* or var(--color-day) \*/ }  
      .timezone-card.evening { background-color: orange; }  
      .timezone-card.night { background-color: midnightblue; }  
      /\* Transitions for smooth color changes \*/  
      .timezone-card { transition: background-color 0.5s ease-in-out; }

  * **Accessibility:** Ensure sufficient color contrast for text against all potential background colors (NFR3.3).  
* **Upstream Dependencies:** newtab/newtab.html (defines the HTML structure being styled).  
* **Downstream Dependencies:** newtab.js (will add/remove classes that trigger these styles, especially for background colors).  
* **PRD Reference:** FR4, NFR3.1, NFR3.3.

## **Phase 3: Core Logic & Functionality**

### **6\. File: service-worker.js**

* **File Path:** figured/service-worker.js  
* **Intent:** Handle background tasks. For V1, this might be minimal, primarily for listening to chrome.alarms if that's chosen for the 1-second update mechanism, or for future background needs.  
* **Changes Needed:**  
  * Basic service worker registration console log: console.log("Figured Service Worker Started.");  
  * **If using chrome.alarms for updates (NFR2.2 consideration):**  
    * On install/startup, create a periodic alarm: chrome.alarms.create("updateTimezones", { periodInMinutes: 1/60 }); (for every second).  
    * Add an alarm listener: chrome.alarms.onAlarm.addListener((alarm) \=\> { if (alarm.name \=== "updateTimezones") { /\* Send message to newtab.js to update UI \*/ } });  
    * *Note:* Sending messages from a service worker to a new tab page to trigger UI updates every second can be complex due to the new tab page's lifecycle. Direct DOM manipulation from the new tab page's script using setInterval or requestAnimationFrame might be more straightforward and performant for this specific use case. **Prioritize setInterval in newtab.js first.** This file might remain minimal if alarms aren't used for the primary tick.  
  * For now, keep it simple. It can be expanded if more background tasks are identified.  
* **Upstream Dependencies:** manifest.json (references this file).  
* **Downstream Dependencies:** Potentially newtab.js if message passing is implemented for alarms.  
* **PRD Reference:** NFR2.2, NFR5.2.

### **7\. File: newtab/newtab.js**

* **File Path:** figured/newtab/newtab.js  
* **Intent:** Implement all core client-side logic for the "Figured" extension. This includes fetching data, handling user interactions, calculating and displaying times, managing storage, and updating the UI.  
* **Changes Needed (Breakdown by Feature/Requirement):**  
  **A. Initialization & Setup:**  
  * Add DOMContentLoaded listener to ensure the DOM is ready.  
  * Global variables/constants:  
    * References to key DOM elements (timezone grid, add city input, add city button, template).  
    * userTimezones \= \[\] (array to hold current user's selected timezone objects).  
    * allLocations \= \[\] (array to hold data from locations.json).  
  * **init() function:**  
    * Call loadLocationsData() to fetch common/locations.json.  
    * Call loadUserTimezones() from chrome.storage.local.  
    * Call checkFirstRun() to handle initial "Home" timezone prompt.  
    * Call renderTimezones() to display loaded/default timezones.  
    * Call startUpdateInterval() to begin the 1-second time updates.  
    * Setup event listeners (add city, remove city clicks \- delegated if possible).

  **B. Data Loading:**

  * **loadLocationsData() function:** (FR2.1)  
    * Fetch ../common/locations.json.  
    * Parse JSON and store in allLocations.  
    * Handle potential fetch errors.  
  * **loadUserTimezones() function:** (FR10)  
    * Use chrome.storage.local.get(\['userTimezonesConfig'\], (result) \=\> { ... }).  
    * If data exists, parse it and populate userTimezones.  
    * If no data, userTimezones remains empty (or set to a default if desired after first run).  
  * **saveUserTimezones() function:** (FR10)  
    * Use chrome.storage.local.set({ userTimezonesConfig: userTimezones }, () \=\> { ... }).  
    * Call this whenever userTimezones array is modified (add, remove, reorder).

  **C. First Run & "Home" Timezone:** (FR11, FR5)

  * **checkFirstRun() function:**  
    * Use chrome.storage.local.get(\['homeTimezoneSet'\], (result) \=\> { ... }).  
    * If homeTimezoneSet is not true, display a modal/prompt for the user to select their "Home" timezone from allLocations.  
    * Once selected, add it to userTimezones with a isHome: true flag, save, and set homeTimezoneSet: true in storage.  
  * The "Home" timezone should be visually distinct or always appear first if reordering isn't implemented in V1.

  **D. Rendering Timezones:** (FR3, FR4, FR9.1)

  * **renderTimezones() function:**  
    * Clear the current content of \#timezone-grid.  
    * Iterate through the userTimezones array.  
    * For each timezone object:  
      * Clone the timezone card template.  
      * Call updateTimezoneCard(cardElement, timezoneData) to populate and style it.  
      * Append the card to \#timezone-grid.  
      * Add event listener to the "remove" button on the card, linking it to removeTimezone(ianaIdentifier).  
  * **updateTimezoneCard(cardElement, timezoneData) function:** (This is called by renderTimezones and the update interval)  
    * timezoneData would be an object like { iana: 'America/New\_York', city: 'New York', ... userAdded: true, isHome: false }.  
    * Use Intl.DateTimeFormat to get current time, date, parts:  
      const now \= new Date();  
      const formatter \= new Intl.DateTimeFormat(undefined, { // Use user's locale for formatting  
          timeZone: timezoneData.iana,  
          hour: 'numeric', minute: 'numeric', // FR3.1  
          day: 'numeric', month: 'short', weekday: 'short', // FR3.2  
          timeZoneName: 'short', // FR3.4  
          // For UTC offset and DST, more complex parsing or multiple calls might be needed  
      });  
      const parts \= formatter.formatToParts(now);  
      // Extract hour, minute, am/pm, day, month, weekday, timeZoneName from parts

    * **UTC Offset (FR3.5):**  
      * Get offset: const offsetMinutes \= new Date().getTimezoneOffset(); // This is local offset  
      * To get offset for a *specific IANA zone*:  
        // Create a date in the target timezone, then get its UTC string and parse offset  
        // Or, more reliably:  
        const nowInZone \= new Date(now.toLocaleString('en-US', { timeZone: timezoneData.iana }));  
        const localNow \= new Date(now.toLocaleString('en-US')); // Get 'now' in a fixed locale to avoid local DST issues in calculation  
        const diff \= (localNow.getTime() \- nowInZone.getTime()) / (1000 \* 60 \* 60); // This is tricky due to DST in BOTH zones.  
        // Better: use Intl.DateTimeFormat with timeZoneName: 'longOffset' or 'shortOffset' if available and parse.  
        // Example: new Intl.DateTimeFormat('en-US', {timeZone: tz.iana, timeZoneName: 'longOffset'}).formatToParts(now)  
        // Look for a part with type: 'timeZoneName' or 'literal' that contains GMT/UTC offset.  
        // This needs careful implementation. For a simpler start, focus on timeZoneName: 'short'.  
        // A robust way:  
        const utcDate \= new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));  
        const zoneDate \= new Date(now.toLocaleString('en-US', { timeZone: timezoneData.iana }));  
        const offsetHours \= (zoneDate.getTime() \- utcDate.getTime()) / (1000 \* 60 \* 60);  
        const formattedOffset \= \`UTC${offsetHours \>= 0 ? '+' : ''}${Math.floor(offsetHours)}:${('0' \+ Math.abs(offsetHours % 1 \* 60)).slice(-2)}\`;

    * **DST Indicator (FR3.6):**  
      * Check if formatter.resolvedOptions().timeZoneName (if 'long' was used) contains "Daylight".  
      * Or compare standard vs current offset if a library was used. For Intl, check if the abbreviation changes (e.g. PST vs PDT).  
      * A simple check: const isDST \= new Intl.DateTimeFormat(undefined, { timeZone: timezoneData.iana, timeZoneName: 'long' }).format(now).toLowerCase().includes('daylight');  
    * **Background Color (FR4):**  
      * Get the current hour in the target timezone (from parts or a separate Intl call).  
      * getBackgroundColorForHour(hour) function:  
        * Takes an hour (0-23).  
        * Returns a CSS class name (e.g., "day", "evening-transition", "night") or a direct color value.  
        * Logic: e.g., 6-17 is 'day', 18-20 is 'evening', 21-5 is 'night'.  
      * Apply the class/style to cardElement.  
    * Populate the card's DOM elements with the formatted time, date, city, country, tz-abbr, UTC offset, and show/hide DST icon.

  **E. Time Update Interval:** (NFR2.2)

  * **startUpdateInterval() function:**  
    * setInterval(() \=\> { userTimezones.forEach(tz \=\> { /\* Find card for tz, call updateTimezoneCard \*/ }); }, 1000);  
    * Iterate through displayed timezone cards and call updateTimezoneCard for each.

  **F. Adding Timezones:** (FR7, FR12)

  * Event listener on "Add City" button.  
  * Get search term from input. **Implement debouncing on the input field itself (FR7.1)** to trigger autocomplete/search suggestions as user types.  
  * **searchLocations(term) function:**  
    * Filter allLocations based on the term (match city or country).  
    * Display suggestions to the user (e.g., in a dropdown).  
  * When a suggestion is clicked or "Add" is pressed with a valid selection:  
    * Check if timezone limit (24) is reached (FR7.2).  
    * Check if already added.  
    * Create new timezone object, add to userTimezones, save, and re-render.  
    * Call addSharedLocations(newlyAddedTimezone).  
  * **Handling Unlisted Locations (FR12):**  
    * If search yields no results from allLocations:  
      * Display "Location not found."  
      * Suggest searching for nearest major city.  
      * Optionally show a button to "Search on Google" which opens https://www.google.com/search?q=\<searchTerm\> in a new tab.

  **G. "Shared Locations" Logic:** (FR8)

  * **addSharedLocations(addedTimezone) function:**  
    * Get current effective time (specifically, the current UTC offset and DST status combined) for addedTimezone.iana.  
    * Iterate through allLocations:  
      * For each location, determine *its* current effective time.  
      * If it matches addedTimezone's effective time, and it's not already in userTimezones, and limit not reached:  
        * Add it to userTimezones.  
    * Re-render after adding shared locations. This needs to be efficient.

  **H. Removing Timezones:** (FR9)

  * **removeTimezone(ianaIdentifier) function:**  
    * Filter ianaIdentifier out of userTimezones.  
    * Save and re-render.

  **I. "Current System" Timezone:** (FR6)

  * **addCurrentSystemTimezone() (optional, called during init or by user action):**  
    * const systemIANA \= Intl.DateTimeFormat().resolvedOptions().timeZone;  
    * Find this IANA in allLocations (or create a temporary entry if not found, though less ideal).  
    * Add to userTimezones with a flag like isSystem: true.  
    * Ensure it's not duplicative and can be removed by the user.  
* **Upstream Dependencies:** newtab.html (DOM structure), newtab.css (styles), common/locations.json (data source), Chrome APIs (storage, Intl).  
* **Downstream Dependencies:** None (this is the main application logic driver).  
* **PRD Reference:** FR2.2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, NFR2.2.

## **Phase 4: Testing & Refinement**

* **Manual Testing:**  
  * Test all functionalities defined in the PRD user stories and functional requirements.  
  * Test adding/removing various cities.  
  * Verify time accuracy across different zones, including DST transitions (by manually changing system time if needed for testing).  
  * Check color transitions.  
  * Test first-run experience.  
  * Test "Shared Locations" feature.  
  * Test responsiveness and layout with many columns.  
  * Test in Chrome Developer Mode by loading the unpacked extension.  
* **Debugging:** Use Chrome DevTools extensively.  
* **Performance Profiling:** Check for any performance bottlenecks, especially in the update loop and rendering. (NFR2)  
* **Code Review:** Review code for clarity, efficiency, and adherence to best practices.  
* **Refinement:** Address any bugs or usability issues found. Optimize based on profiling. Ensure all NFRs related to security, performance, and accessibility are met.

This workplan provides a structured approach to developing the "Figured" extension. Each step builds upon the previous ones, aiming for a functional and robust application that meets the PRD requirements.
## **Product Requirements Document: "Figured" (FIO Recreation)**

Version: 1.1.1 (Incorporating 2025 Best Practices & Polish)
Date: May 24, 2025  
1\. Introduction  
This document outlines the requirements for "Figured," a Google Chrome extension designed to recreate and enhance the core functionality of the formerly available "Figure It Out" (FIO) extension. Figured will allow users to view multiple timezones simultaneously on their Chrome new tab page. A key design principle is that the extension will be completely locally run and self-contained, with no external network dependencies for its core operations at runtime, adhering to a single, focused purpose.  
**2\. Goals & Objectives**

* Provide an intuitive, visually appealing, and efficient way for users to track current times across multiple global locations.  
* Ensure all operations are local to the browser with no external server dependencies.  
* Offer clear visual cues for time of day and DST status.  
* Maintain user-configured timezones persistently.  
* Develop in strict adherence to modern Chrome Extension best practices, including security, performance, and user privacy.

**3\. User Personas** (Illustrative)

* **Global Collaborator (e.g., Remote Worker, Project Manager):** Needs to efficiently schedule meetings and coordinate with team members in different timezones.  
* **Frequent Traveler:** Needs to stay aware of time at their "home" base, current location, and potential destinations.  
* **International Connector:** Has friends, family, or business contacts in various parts of the world and wants to know appropriate times to communicate.

**4\. User Stories**

* **Epic: Core Timezone Display & Information**  
  * As a user, I want to see multiple timezones displayed as distinct columns on my new tab page so that I can quickly compare times across locations.  
  * As a user, I want each timezone column to clearly display the current time (in HH:MM AM/PM format), the current date (e.g., "Wed 26th"), the city name, and a country/region identifier (e.g., "USA," "DNK") so that all necessary information is readily available.  
  * As a user, I want each timezone column to show the current official time zone abbreviation (e.g., "PST," "CEST") for that location.  
  * As a user, I want each timezone column to display its current UTC offset (e.g., "UTC-7," "UTC+2") so I have a clear understanding of its relation to Coordinated Universal Time.  
  * As a user, I want to see a distinct visual icon within a timezone's display if Daylight Saving Time (DST) is currently active for that location.  
* **Epic: Personalized & Contextual Timezones**  
  * As a user, I want to set a "Home" timezone that remains fixed and always visible, regardless of my computer's system timezone, so I have a constant primary reference.  
  * As a user, I want the extension to optionally display my computer's current system-detected local timezone, so I can easily see my current time in context with other selected zones.  
* **Epic: Visual Day/Night Indication**  
  * As a user, I want the background of each timezone column to be dynamically color-coded based on the current hour in that specific zone (e.g., a conceptual gradient from goldenrod for daytime, through sunset hues, to midnight blue for nighttime) so I can visually and quickly gauge the time of day there.  
* **Epic: Managing Timezone Selections**  
  * As a user, I want to add new timezones to my display by searching for city names from a predefined list.  
  * As a user, I want to be able to display up to 24 timezones simultaneously.  
  * As a user, I want to easily remove any displayed timezone (including my "Current System" zone if I choose) with a simple click, but the "Home" timezone should require setting a new "Home" timezone before it can be removed.
  * As a user, when I add a city, I want other major cities that are currently observing the exact same effective time (e.g., all cities in CEST) to be automatically added from the extension's known list, provided they are not already displayed and the total count does not exceed the maximum, so I get broader coverage for that time region effortlessly.  
  * As a user, I want all my selected timezones, including my "Home" choice and their display order, to be saved locally and automatically reloaded when I open a new tab or restart my browser.  
* **Epic: First-Run Experience & Configuration**  
  * As a new user opening the extension for the first time, I want to be prompted to select and set my "Home" timezone so I can personalize the extension immediately.  
* **Epic: Handling Unlisted Locations**  
  * As a user, if I search for a city that is not in the extension's built-in list, I want to be clearly informed that the city was not found.  
  * As a user, in such a case, I want to be advised to try searching for the nearest major city in that intended location.  
  * As a user, I want the extension to optionally provide a convenient link that, when clicked, opens a new browser tab to perform a web search (e.g., Google) for the city name I entered, to help me identify a suitable alternative.

**5\. Functional Requirements (FR)**

* **FR1: New Tab Page Override:** The extension MUST override Chrome's default new tab page and display its own interface.  
* **FR2: Timezone Data & Calculation Engine:**  
  * FR2.1: The extension MUST include a bundled, local data source (e.g., JSON file) mapping cities to their canonical IANA time zone identifiers.  
  * FR2.2: All time calculations, including conversions to local times and determination of DST, MUST be performed using the browser's built-in Intl API and the IANA time zone identifiers.  
* **FR3: Timezone Column Display Elements:** Each displayed timezone column MUST show:  
  * FR3.1: Current Time: In HH:MM format, with an AM/PM indicator.  
  * FR3.2: Current Date: Formatted (e.g., "Wed 26th" or similar locale-aware concise format).  
  * FR3.3: Location Name: City name and a country/region identifier (e.g., "London, UK"; "Tokyo, JPN").  
  * FR3.4: Time Zone Abbreviation: Current, short time zone name (e.g., "PDT," "EEST").  
  * FR3.5: UTC Offset: Current offset from UTC (e.g., "UTC-07:00," "UTC+03:00").  
  * FR3.6: DST Indicator: A distinct visual icon MUST be displayed if DST is active for the location at the current time.  
* **FR4: Dynamic Background Color-Coding:**  
  * FR4.1: The background of each timezone column MUST dynamically change color to represent the time of day in that specific zone.  
  * FR4.2: The color scheme SHOULD transition conceptually from bright/warm colors for midday (e.g., goldenrod/yellows), through intermediate colors for morning/evening (e.g., oranges, purples), to dark/cool colors for night (e.g., midnight blue/dark indigos).  
* **FR5: "Home" Timezone:**  
  * FR5.1: The user MUST be able to designate one selected timezone as their "Home" timezone.  
  * FR5.2: This "Home" timezone selection MUST persist and remain fixed regardless of changes to the user's system timezone.  
* **FR6: "Current System" Timezone Display:**  
  * FR6.1: The extension SHOULD attempt to detect the user's current system timezone as reported by the browser.  
  * FR6.2: If detected, this "Current System" timezone SHOULD be displayed as a distinct column, unless it is identical to an already displayed zone or if the user chooses to hide it (if such a setting is implemented).  
* **FR7: Adding Timezones:**  
  * FR7.1: Users MUST be able to search for and add locations from the bundled database. An autocomplete feature SHOULD assist the search. **Input during search SHOULD be debounced to optimize performance.**  
  * FR7.2: The extension MUST support displaying a maximum of 24 timezone columns simultaneously.  
* **FR8: "Shared Locations" Automatic Addition:**  
  * FR8.1: Upon a user adding a location, the system MUST check its bundled database for other distinct city entries that currently resolve to the exact same effective time zone (i.e., same UTC offset and DST rules at that moment).  
  * FR8.2: Any such identified "shared locations" MUST be automatically added to the user's display if not already present and if the 24-column limit is not exceeded.  
* **FR9: Removing Timezones:**  
  * FR9.1: Users MUST be able to remove any displayed timezone column (including "Current System," or auto-added ones) via a clear and accessible UI element (e.g., an 'X' icon on the column). The designated "Home" timezone cannot be directly removed; users should be prompted to set a different "Home" timezone if they attempt to remove the current one, or the removal option for the active "Home" timezone should be disabled/hidden.
* **FR10: Data Persistence:**  
  * FR10.1: All user-selected timezones (including the "Home" timezone) and their display order MUST be saved locally using chrome.storage.local. (Note: User-selected city preferences are not considered highly sensitive data for V1; advanced encryption for this specific local data is a future consideration if deemed necessary).  
  * FR10.2: Saved configurations MUST be automatically loaded when a new tab is opened.  
* **FR11: First-Run User Experience:**  
  * FR11.1: On the very first launch after installation (or if no configuration is found), the extension MUST prompt the user to select their "Home" timezone.  
* **FR12: Handling Unlisted Location Searches:**  
  * FR12.1: If a user's search for a city yields no match in the bundled database, a "Location not found" message MUST be displayed.  
  * FR12.2: The message SHOULD advise the user to search for the nearest major city within their desired region.  
  * FR12.3: The extension MAY offer a clickable link or button that, when activated, opens a new browser tab pre-populating a web search engine (e.g., Google) with the user's original search term to aid their external search.

**6\. Non-Functional Requirements (NFR)**

* **NFR1: Complete Locality & Self-Containment:**  
  * NFR1.1: All core functionalities, including time calculations, location data processing, and user settings, MUST operate entirely locally within the user's browser without requiring any external network requests at runtime.  
  * NFR1.2: All executable code MUST be bundled within the extension package. **No remotely hosted code is permitted**, in line with Manifest V3 security policies.  
* **NFR2: Performance & Efficiency:**  
  * NFR2.1: The new tab page incorporating the extension MUST load quickly (e.g., aiming for interactive within 1-2 seconds on an average system).  
  * NFR2.2: Real-time updates of displayed times (target update frequency: every second) across all visible columns MUST be efficient. **Consideration SHOULD be given to using the chrome.alarms API for periodic updates** to ensure efficiency and potentially allow updates even if the new tab page is not active or the device was asleep, leveraging its improved capabilities.  
  * NFR2.3: **Resource Management:** The extension MUST efficiently manage resources, including the prompt cleanup of event listeners, observers, and other allocated resources to prevent memory leaks.  
  * NFR2.4: **Back/Forward Cache Compatibility:** The new tab page implementation SHOULD be designed to avoid inadvertently invalidating the browser's back/forward cache.  
  * NFR2.5: **Storage Operations:** Minimize read/write operations to chrome.storage.local by batching updates or using efficient data structures where applicable.  
* **NFR3: Usability & User Experience:**  
  * NFR3.1: The interface MUST be clean, intuitive, visually uncluttered, and adhere to consistent UI patterns.  
  * NFR3.2: Adding, removing, and identifying timezones MUST be straightforward and require minimal user effort.  
  * NFR3.3: **Accessibility (WCAG):** The UI SHOULD be designed with accessibility in mind, aiming to adhere to Web Content Accessibility Guidelines (WCAG) (e.g., ensuring keyboard navigability, ARIA attributes for custom interactive elements, sufficient color contrast for text and important UI elements).  
  * NFR3.4: **Clear Feedback Mechanisms:** Provide clear and timely visual feedback to users for their actions (e.g., confirmation of adding/removing locations, loading states if any asynchronous operations occur).  
* **NFR4: Security:**  
  * NFR4.1: **Minimal Permissions:** The extension MUST request only the absolute minimum permissions necessary for its core functionality (expected: storage for saving preferences, and chrome\_url\_overrides for the new tab page).  
  * NFR4.2: **Content Security Policy (CSP):** A strict Content Security Policy (CSP) MUST be implemented and configured in manifest.json to control resource loading and mitigate risks such as Cross-Site Scripting (XSS).  
  * NFR4.3: **Input Sanitization:** While primary input (city search) is against a known local dataset, any mechanisms involving user-generated text that might be rendered as HTML or script (even if planned for future features) MUST incorporate robust input sanitization.  
* **NFR5: Browser Compatibility & Platform Adherence:**  
  * NFR5.1: The extension MUST be compatible with recent stable versions of Google Chrome.  
  * NFR5.2: The extension **MUST be built using Manifest V3** and adhere to all its requirements, including the use of a service worker for any background processing needs (though primary logic will be in the new tab page context).  
* **NFR6: Store Compliance (Conditional \- If Published to Chrome Web Store):**  
  * NFR6.1: **Privacy Policy:** If the extension is published, a clear, comprehensive, and easily accessible privacy policy MUST be provided, detailing any data (even local preference data) the extension handles.  
  * NFR6.2: **Transparency:** All permission requests and data usage practices MUST be clearly and accurately justified in the Chrome Web Store listing.  
  * NFR6.3: The extension must adhere to all Chrome Web Store Developer Program Policies.

**7\. Domain Requirements (DR)**

* **DR1: Time Standard Reference:** All displayed times should be based on accurate conversions from Coordinated Universal Time (UTC).  
* **DR2: IANA Time Zone Database Identifiers:** The internal mapping of locations MUST use standard IANA time zone names (e.g., "America/New\_York," "Europe/Paris") for compatibility with the Intl API.  
* **DR3: Daylight Saving Time (DST) Rules:** The determination and application of DST rules are handled by the browser's Intl API based on the IANA zone. The extension relies on this for accuracy.  
* **DR4: Chrome Manifest V3 Adherence:** The extension MUST be developed in full compliance with Google Chrome's Manifest V3 specification, including its structure, API usage, and security model. (Reinforced by NFR5.2)

**8\. Out of Scope (for Version 1.0)**

* User-customizable color themes or fonts beyond the default.  
* User-defined aliases or labels for displayed locations (uses city names from database).  
* Time-based alarms, reminders, or calendar integrations.  
* Automatic live updates of the bundled city/timezone database (such updates would require a new version of the extension).  
* Advanced sorting or filtering of displayed timezones beyond user-arranged order.  
* Localization of the extension's UI into multiple languages (defaults to English).

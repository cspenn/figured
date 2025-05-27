# Figured
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

**Figured** is a Google Chrome extension by [Christopher Penn](https://www.christopherspenn.com/), sponsored by [TrustInsights.ai](https://www.trustinsights.ai/). It's a resurrection of the old "Figure It Out" service, which has been defunct for years, reimagined for the modern web with a focus on privacy and local operation.

Figured provides an intuitive and efficient way to view multiple timezones simultaneously on your Chrome new tab page. It emphasizes local operation, user privacy, and a clean, informative interface.

---

<!-- Optional: Add a GIF or screenshot of the extension in action here -->
<!-- ![Figured Screenshot/GIF](placeholder.gif) -->

## Overview

In a globally connected world, keeping track of time across different regions can be challenging. Figured aims to simplify this by transforming your new tab page into a dynamic timezone dashboard. Whether you're coordinating with international teams, connecting with friends and family overseas, or planning your next trip, Figured provides the time information you need at a glance.

The core principle is to display distinct IANA timezone zones, with the ability to show multiple user-added cities that fall under the same IANA zone on a single, consolidated card. All operations are performed locally within your browser, ensuring your data remains private and the extension works seamlessly even offline.

Built with modern Chrome Extension best practices (Manifest V3), Figured is lightweight, performant, and respects your privacy.

## Key Features

*   ✨ **New Tab Dashboard:** Replaces your new tab page with a customizable timezone display.
*   🏙️ **IANA Zone Grouping:** Consolidates multiple cities (e.g., "New York" and "Boston") onto a single card if they share the same IANA timezone (e.g., `America/New_York`).
*   🕒 **Detailed Time Info:** Each card shows:
    *   Current time (HH:MM AM/PM).
    *   Current date (e.g., "Wed, May 26").
    *   Official timezone abbreviation (e.g., "PDT", "CEST").
    *   Current UTC offset (e.g., "UTC-7", "UTC+2").
    *   ☀️ A clear indicator for Daylight Saving Time (DST) when active.
*   🏠 **Personalized "Home" Timezone:** Designate a "Home" timezone, marked with a 🏠 icon, which serves as the central reference for sorting other timezones.
*   💻 **System Timezone Display:** Automatically detects and can display your computer's current system timezone, marked with a 🕰️ icon.
*   🎨 **Granular Time-of-Day Theming:** Timezone card backgrounds dynamically change based on the current hour in that specific zone, using a beautiful 2-hour interval gradient system (e.g., bright yellows for midday, deep blues for night, and transitional hues for dawn/dusk).
*   🔍 **Easy Management:**
    *   Add timezones by searching for cities from a comprehensive built-in list, with autocomplete suggestions.
    *   Remove timezone cards with a single click.
    *   Supports up to 24 distinct IANA timezone cards.
*   ↔️ **Relative Sorting:** Timezone cards are intelligently sorted relative to your "Home" timezone – times behind "Home" to the left, times ahead to the right.
*   🔒 **Local & Private:** All core operations are performed locally. No external network requests for its primary functions. Your selected timezones and settings are stored only in your browser.
*   💾 **Data Persistence:** Your timezone configurations are saved locally and automatically reloaded.
*   🚀 **Manifest V3 Compliant:** Built using the latest Chrome extension platform for enhanced security, performance, and privacy.
*   👋 **First-Run Setup:** A simple prompt to set your "Home" timezone when you first install.
*   ❓ **Unlisted Location Handling:** Clear "Location not found" messages with advice and a link to search on Google.

## How It Works

Figured is built as a Manifest V3 Chrome Extension, ensuring it adheres to the latest standards for security and performance.

1.  **New Tab Override:** The extension overrides Chrome's default new tab page to display the Figured dashboard.
2.  **Local Data:** It uses a bundled JSON file (`common/locations.json`) containing a comprehensive list of cities and their corresponding IANA timezone identifiers.
3.  **Time Calculations:** All time calculations, including current time, date, DST status, and UTC offsets, are performed using the browser's built-in `Intl` API with IANA timezone identifiers. This ensures accuracy and leverages the user's system updates for timezone rules.
4.  **Dynamic Updates:** A service worker (`service-worker.js`) uses the `chrome.alarms` API to trigger updates every second. This prompts the new tab page to refresh displayed times.
5.  **User Interface:** The main interface (`newtab.html`, `newtab.css`, `newtab.js`) is responsible for:
    *   Rendering timezone cards.
    *   Applying the dynamic time-of-day background themes.
    *   Handling user interactions like adding/removing timezones and setting the home timezone.
    *   Displaying search suggestions.
6.  **Local Storage:** User preferences, including selected timezones, the home timezone, and associated cities per card, are stored locally using `chrome.storage.local`. No data is sent externally.

## Technology Stack

*   **Core:** JavaScript (ES6+), HTML5, CSS3
*   **Platform:** Google Chrome Extension (Manifest V3)
*   **Key Chrome APIs:**
    *   `chrome.storage.local` (for saving user settings)
    *   `chrome.alarms` (for scheduling time updates)
    *   `chrome.runtime` (for messaging between service worker and new tab page)
*   **JavaScript APIs:** `Intl` (Internationalization API for date/time formatting and timezone operations)
*   **Data:** Local JSON file for city and timezone data.

## Installation

1.  **From Chrome Web Store (Recommended):**
    *   (Link will be provided here once the extension is published)
2.  **Manual Installation (for development or testing):**
    *   Download or clone this repository.
    *   Open Google Chrome and navigate to `chrome://extensions`.
    *   Enable "Developer mode" using the toggle in the top-right corner.
    *   Click on the "Load unpacked" button.
    *   Select the `figured/figured` directory (the one containing `manifest.json`).
    *   The Figured extension should now be installed and active.

## Usage Guide

### First Run
Upon first installation, Figured will prompt you to select your "Home" timezone. Choose your city from the dropdown list and click "Set Home Timezone." This will be your primary reference point.

### Adding Timezones
1.  In the "Add another timezone..." input field at the top of the page, start typing the name of a city.
2.  A list of suggestions will appear. Click on a suggestion, or finish typing and click the "Add" button.
3.  If the city's IANA timezone is new, a new card will be added to the grid.
4.  If the city's IANA timezone is already on a card, the city name will be added to that existing card (e.g., adding "Boston" after "New York" will list both on the `America/New_York` card).

### Managing Timezones
*   **Removing a Card:** Click the "×" button on the top-right of any timezone card. This removes the entire card and all cities associated with its IANA zone.
*   **Home Timezone:** Your "Home" timezone card (marked with 🏠) cannot be removed directly. To remove it, you must first set another timezone as your Home.
*   **System Timezone:** A card representing your computer's current timezone may be automatically added and marked with 🕰️.

### Understanding the Display
*   **Timezone Cards:** Each card represents a unique IANA timezone.
*   **Location List:** Displays the city/cities you've added that fall under that card's IANA zone.
*   **Time & Date:** Current local time and date for that zone.
*   **TZ Abbr & UTC Offset:** Standard timezone abbreviation and its offset from UTC.
*   **DST Indicator:** Appears when Daylight Saving Time is active in that zone.
*   **Color Coding:** Card backgrounds change based on the time of day in that zone:
    *   **Deep Night (00:00-05:59):** Shades of dark blue and slate.
    *   **Morning/Dawn (06:00-11:59):** Transitions from purples/peaches to light blues and yellows.
    *   **Midday (12:00-13:59):** Bright pale yellows.
    *   **Afternoon (14:00-17:59):** Warm yellows, peaches, and oranges.
    *   **Evening/Dusk (18:00-21:59):** Coral, pinks, and darker blues.
    *   **Late Night (22:00-23:59):** Dark slate returning to deep night blues.
*   **Sorting:** Cards are sorted relative to your "Home" timezone. Timezones "behind" your home time appear to the left, and those "ahead" appear to the right.

## Sponsorship & Advertisement

Figured is sponsored by TrustInsights.ai. You'll see a small banner in the extension.

<div align="center" style="padding: 10px 0;">
    <a href="https://www.trustinsights.ai/contact?utm_source=figured&utm_medium=chrome_extension&utm_campaign=figured" target="_blank" rel="noopener noreferrer" style="font-size: 0.9em; color: #00AEEF; text-decoration: none; font-weight: 500;">
        Learn more about how TrustInsights.ai can solve your analytics, data science, and AI challenges.
    </a>
</div>

---

## Privacy
Figured is designed with your privacy as a priority:
*   **100% Local Operation:** All core functionalities, including time calculations and data storage, happen locally within your browser.
*   **No External Data Transmission:** The extension does not send your selected cities, timezone preferences, or any other personal data to external servers.
*   **Self-Contained Data:** The city and timezone database is bundled with the extension.
*   **Minimal Permissions:** Figured requests only the essential permissions needed to function (`storage` for saving your settings, `alarms` for updates, and `chrome_url_overrides` to display on the new tab page).

## Current Status
*   **Phase:** Polish Phase.
*   **Recent Major Implementations:**
    *   A fixed advertisement banner for TrustInsights.ai has been added to the bottom of the new tab page.
    *   The timezone card background color logic has been refactored to a more granular 2-hour interval system, providing richer visual feedback for the time of day.
*   **Known Issues:**
    *   The `padding-bottom` for the main content area (`body`) in `newtab.css` might need minor visual adjustment to perfectly accommodate the fixed ad banner across various window sizes and card counts.

## Future Enhancements (Out of Scope for Current Version)

*   User-customizable color themes or fonts.
*   Time-based alarms or reminders.
*   Localization of the extension's UI into other languages.
*   Drag-and-drop reordering of timezone cards.
*   Ability to remove individual cities from a multi-city card (currently, removing a card removes all associated cities for that IANA zone).

## License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](figured/LICENSE) file for full details.

## Contributing

Contributions are welcome! If you have ideas for improvements, new features, or bug fixes, please feel free to:
1.  Open an issue to discuss the proposed changes.
2.  Fork the repository and submit a pull request.

## Acknowledgements

This extension is a labor of love by **Christopher Penn** and sponsored by **TrustInsights.ai**. It is a modern resurrection of the beloved (but long-defunct) "Figure It Out" timezone service, aiming to bring that utility to today's web users with a strong emphasis on privacy, local operation, and a delightful user experience.
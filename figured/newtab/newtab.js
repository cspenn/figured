// DOM Elements
const timezoneGrid = document.getElementById('timezone-grid');
const timezoneCardTemplate = document.getElementById('timezone-card-template');
const homePrompt = document.getElementById('home-prompt');
const homeTimezoneSelect = document.getElementById('home-timezone-select');
const setHomeBtn = document.getElementById('set-home-btn');
const addCityBtn = document.getElementById('add-city-btn');
const citySearchInput = document.getElementById('city-search-input');
const citySuggestionsList = document.getElementById('city-suggestions-list');
const locationNotFoundMsg = document.getElementById('location-not-found-msg');
const notificationArea = document.getElementById('notification-area');
const notificationMessage = document.getElementById('notification-message');
const notificationCloseBtn = document.getElementById('notification-close-btn');

// Notification System
function showNotification(message, type = 'info', duration = 3000) {
    notificationMessage.textContent = message;
    notificationArea.className = 'notification-area';
    if (type === 'error') {
        notificationArea.classList.add('error');
    } else if (type === 'success') {
        notificationArea.classList.add('success');
    }
    notificationArea.style.display = 'block';

    if (duration) {
        setTimeout(() => {
            hideNotification();
        }, duration);
    }
}

function hideNotification() {
    notificationArea.style.display = 'none';
}

// Data
let allLocations = [];
let userTimezones = [];
let isSuggestionClicked = false; // Flag for mousedown interaction

// Initialize the extension
// Debounce utility
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        const context = this; // Capture the correct 'this' context
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            // func.apply(this, args); // Original
            func.apply(context, args); // Use captured context and spread arguments
        }, delay);
    };
}

async function init() {
    await loadLocationsData();
    console.log('[Figured] init: allLocations loaded, count:', allLocations.length); // Verification log
    await loadUserTimezones();
    await addCurrentSystemTimezone(); // Add this call
    checkFirstRun(); // This might interact with system timezone; ensure logic is sound
    renderTimezones(); // This will do the initial render
    // startUpdateInterval(); // REMOVE THIS LINE
    
    // Setup event listeners (existing)
    setHomeBtn.addEventListener('click', handleSetHomeTimezone);
    addCityBtn.addEventListener('click', handleAddCity);
    notificationCloseBtn.addEventListener('click', hideNotification);
    citySearchInput.addEventListener('input', debounce(handleCitySearchInput, 300));
    citySearchInput.addEventListener('blur', () => {
        console.log('[Figured] citySearchInput blur event triggered. isSuggestionClicked:', isSuggestionClicked);
        // Delay hiding to allow mousedown on suggestions to process
        setTimeout(() => {
            if (!isSuggestionClicked) {
                citySuggestionsList.style.display = 'none';
                console.log('[Figured] Hiding citySuggestionsList due to blur timeout (no suggestion click).');
            }
            // Reset flag regardless, for next interaction
            isSuggestionClicked = false; 
        }, 200); // Increased delay slightly to be safer
    });
}

// Load locations data from JSON file
async function loadLocationsData() {
    try {
        const response = await fetch('../common/locations.json');
        if (!response.ok) {
            throw new Error(`Failed to load locations data. Status: ${response.status}`);
        }
        allLocations = await response.json();
        console.log(`Successfully loaded ${allLocations.length} locations.`);
    } catch (error) {
        console.error("Error loading locations.json:", error);
        showNotification(`Error: Could not load city data. Some features may not work. (${error.message})`, 'error', null); // null duration = sticky
        allLocations = [];
    }
}

// Load user's saved timezones
async function loadUserTimezones() {
    try {
        const result = await chrome.storage.local.get(['userTimezonesConfig', 'homeTimezoneSet']);
        if (result.userTimezonesConfig) {
            userTimezones = result.userTimezonesConfig;
            console.log("User timezones loaded from storage:", userTimezones);
        } else {
            userTimezones = [];
            console.log("No user timezones found in storage. Initializing empty.");
        }
    } catch (error) {
        console.error("Error loading user timezones from storage:", error);
        userTimezones = [];
    }
}

// Save user's timezones to storage
async function saveUserTimezones() {
    try {
        await chrome.storage.local.set({ userTimezonesConfig: userTimezones });
        console.log("User timezones saved successfully.");
    } catch (error) {
        console.error("Error saving user timezones to storage:", error);
    }
}

// Check if this is the first run (no home timezone set)
function checkFirstRun() {
    chrome.storage.local.get('homeTimezoneSet', (result) => {
        if (!result.homeTimezoneSet) {
            homePrompt.style.display = 'block';
            populateHomeTimezoneSelect();
        } else {
            homePrompt.style.display = 'none';
        }
    });
}

// Populate the home timezone select dropdown
function populateHomeTimezoneSelect() {
    if (!allLocations || allLocations.length === 0) {
        console.warn("Cannot populate home timezone select: allLocations is empty.");
        return;
    }
    homeTimezoneSelect.innerHTML = '<option value="">Select your home city...</option>';
    allLocations
        .sort((a, b) => a.city.localeCompare(b.city))
        .forEach(location => {
            const option = document.createElement('option');
            option.value = location.iana;
            option.textContent = `${location.city}, ${location.countryName} (${location.iana})`;
            homeTimezoneSelect.appendChild(option);
        });
}

// Handle setting the home timezone
async function handleSetHomeTimezone() {
    const selectedIANATimezone = homeTimezoneSelect.value;
    if (!selectedIANATimezone) {
        alert("Please select a home timezone.");
        return;
    }

    // Find the full location data from allLocations
    const homeLocationData = allLocations.find(loc => loc.iana === selectedIANATimezone);
    if (!homeLocationData) {
        console.error("Selected home location not found in allLocations data:", selectedIANATimezone);
        alert("Error setting home timezone. Data inconsistency.");
        return;
    }
    
    // Unset any existing home timezone
    userTimezones.forEach(tz => tz.isHome = false);

    const existingTzCardEntry = userTimezones.find(tz => tz.iana === selectedIANATimezone);
    if (existingTzCardEntry) {
        existingTzCardEntry.isHome = true;
    } else {
        // If the IANA zone isn't even on a card yet, create a new card for it and mark as home
        const newHomeTimezoneCardEntry = {
            iana: homeLocationData.iana,
            locations: [{ city: homeLocationData.city, countryName: homeLocationData.countryName, countryCode: homeLocationData.countryCode }],
            isHome: true,
            userAdded: true // Since user explicitly set it as home via selection
        };
        userTimezones.unshift(newHomeTimezoneCardEntry); // Add to the beginning
    }

    await saveUserTimezones();
    await chrome.storage.local.set({ homeTimezoneSet: true });

    homePrompt.style.display = 'none';
    renderTimezones();
    console.log("Home timezone IANA set to:", selectedIANATimezone);
}

// Render all timezones to the grid
function renderTimezones() {
    const nowForSorting = new Date(); // Use a consistent 'now' for all offset calculations in this sort pass

    // New Sorting Logic: Relative to Home, or fallback
    const homeTimezoneEntry = userTimezones.find(tz => tz.isHome);
    const homeIana = homeTimezoneEntry ? homeTimezoneEntry.iana : null;

    userTimezones.sort((a, b) => {
        if (homeIana) {
            // Sort relative to home
            const homeOffsetMinutes = getSortableUtcOffsetInMinutes(homeIana, nowForSorting);

            const offsetA = getSortableUtcOffsetInMinutes(a.iana, nowForSorting);
            const offsetB = getSortableUtcOffsetInMinutes(b.iana, nowForSorting);

            const relativeOffsetA = offsetA - homeOffsetMinutes;
            const relativeOffsetB = offsetB - homeOffsetMinutes;

            // If one is home, it should be '0' relative, ensuring it's central among items with same actual offset diff
            if (a.iana === homeIana) return relativeOffsetB === 0 ? 0 : -1; // Home comes before others if diffs are equal, or sorts by its 0
            if (b.iana === homeIana) return relativeOffsetA === 0 ? 0 : 1;  // Others come after home if diffs are equal

            return relativeOffsetA - relativeOffsetB; // Ascending by relative difference
        } else {
            // Fallback sort: furthest ahead (largest positive offset) to furthest behind (smallest negative offset).
            const offsetA = getSortableUtcOffsetInMinutes(a.iana, nowForSorting);
            const offsetB = getSortableUtcOffsetInMinutes(b.iana, nowForSorting);
            return offsetB - offsetA; // Descending by absolute offset
        }
    });

    timezoneGrid.innerHTML = '';

    if (!userTimezones || userTimezones.length === 0) {
        console.log("No user timezones to render.");
        return;
    }

    userTimezones.forEach(tzData => { // tzData is now an object like { iana: "...", locations: [...] }
        if (!timezoneCardTemplate) {
            console.error("Timezone card template not found!");
            return;
        }
        if (!tzData.iana || !tzData.locations || tzData.locations.length === 0) {
            console.error("Invalid tzData structure in renderTimezones:", tzData);
            return;
        }

        const cardClone = timezoneCardTemplate.content.cloneNode(true);
        const cardElement = cardClone.querySelector('.timezone-card');
        const locationsContainer = cardElement.querySelector('.locations-container');
        locationsContainer.innerHTML = ''; // Clear any template placeholders

        // Create indicator spans (once per card)
        const homeIndicatorSpan = document.createElement('span');
        homeIndicatorSpan.className = 'home-indicator';
        homeIndicatorSpan.textContent = '🏠';
        if (tzData.isHome) homeIndicatorSpan.style.display = 'inline'; else homeIndicatorSpan.style.display = 'none';

        const systemIndicatorSpan = document.createElement('span');
        systemIndicatorSpan.className = 'system-indicator';
        systemIndicatorSpan.textContent = '🕰️';
        if (tzData.isSystemMarker) systemIndicatorSpan.style.display = 'inline'; else systemIndicatorSpan.style.display = 'none';

        tzData.locations.forEach((loc, index) => { // Get index
            const locationEntryDiv = document.createElement('div');
            locationEntryDiv.classList.add('location-entry');

            const cityNameWrapper = document.createElement('div'); // Optional wrapper
            cityNameWrapper.classList.add('city-name-wrapper');


            const cityNameDiv = document.createElement('div');
            cityNameDiv.classList.add('city-name');
            cityNameDiv.textContent = loc.city || 'N/A';

            // Prepend indicators to the first city's name wrapper
            if (index === 0) { // Only for the first location listed on the card
                cityNameWrapper.appendChild(homeIndicatorSpan); // Appending the actual span, not a clone
                cityNameWrapper.appendChild(systemIndicatorSpan);
            }
            cityNameWrapper.appendChild(cityNameDiv);
            locationEntryDiv.appendChild(cityNameWrapper);


            const countryNameDiv = document.createElement('div');
            countryNameDiv.classList.add('country-name');
            countryNameDiv.textContent = `${loc.countryName || ''} (${loc.countryCode || 'N/A'})`;
            locationEntryDiv.appendChild(countryNameDiv);

            locationsContainer.appendChild(locationEntryDiv);
        });

        // Add class for system timezone if applicable to the card
        cardElement.classList.toggle('system-timezone-card', tzData.isSystemMarker); // isSystemMarker applies to the IANA card

        // Update with current time - pass the whole tzData (which includes IANA)
        updateTimezoneCard(cardElement, tzData, new Date());

        // Setup remove button - it removes the entire IANA card
        const removeBtn = cardElement.querySelector('.remove-tz-btn');
        if (removeBtn) {
            removeBtn.dataset.iana = tzData.iana; // Removing is by IANA
            removeBtn.addEventListener('click', handleRemoveTimezone);
        }

        timezoneGrid.appendChild(cardElement);
    });
}

// Update a single timezone card with current time data
function updateTimezoneCard(cardElement, timezoneData, now) {
    try {
        // timezoneData now is { iana: "...", locations: [{city:"...", countryName:"..."}], ... }
        if (!timezoneData || !timezoneData.iana || typeof timezoneData.iana !== 'string') {
            console.error("Invalid timezoneData or missing/invalid IANA in updateTimezoneCard:", timezoneData);
            // Fallback content setters with null checks
            const fallbackTime = cardElement.querySelector('.time-value'); 
            if (fallbackTime) fallbackTime.textContent = "Error";
            // ... other fallbacks ...
            return;
        }
        const cleanIana = timezoneData.iana.trim(); // IANA is at the top level of tzData
        const optionsTime = { timeZone: cleanIana, hour: 'numeric', minute: 'numeric', hour12: true };
        const optionsDate = { timeZone: cleanIana, weekday: 'short', month: 'short', day: 'numeric' };

        // Format time
        const timeFormatter = new Intl.DateTimeFormat(navigator.language, optionsTime);
        const timeString = timeFormatter.format(now);
        const [timeValue, amPmValue = ''] = timeString.split(' ');
    
        // Correctly target the '.time-value' span for the main time
        const timeValueElement = cardElement.querySelector('.time-value');
        if (timeValueElement) {
            timeValueElement.textContent = timeValue;
        } else {
            // Use IANA for logging as city is now an array
            console.error("Element with class '.time-value' not found in card for IANA:", cleanIana);
        }
    
        // Target the '.am-pm' span
        const amPmElement = cardElement.querySelector('.am-pm');
        if (amPmElement) {
            amPmElement.textContent = amPmValue;
        } else {
            // console.warn("Element with class '.am-pm' not found in card for IANA:", cleanIana);
        }
            
        // Format date
        const dateFormatter = new Intl.DateTimeFormat(navigator.language, optionsDate);
        const dateElement = cardElement.querySelector('.current-date');
        if (dateElement) {
            dateElement.textContent = dateFormatter.format(now);
        } else {
            console.error("Element with class '.current-date' not found for IANA:", cleanIana);
        }
    
        // Timezone abbreviation and UTC offset
        const tzAbbr = new Intl.DateTimeFormat(navigator.language, {timeZone: cleanIana, timeZoneName: 'short'}).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || 'N/A';
        
        let formattedUtcOffset = 'N/A';
        try {
            const offsetParts = new Intl.DateTimeFormat('en-US', {timeZone: cleanIana, timeZoneName: 'longOffset'}).formatToParts(now);
            const offsetStringPart = offsetParts.find(p => p.type === 'timeZoneName'); // find the part object
            if (offsetStringPart) {
                const offsetStringValue = offsetStringPart.value;
                if (offsetStringValue && offsetStringValue.startsWith('GMT')) {
                    formattedUtcOffset = 'UTC' + offsetStringValue.substring(3);
                } else if (offsetStringValue) {
                    formattedUtcOffset = offsetStringValue; // Use as is if not GMT prefixed but found
                }
            } // else formattedUtcOffset remains 'N/A' if part not found
        } catch (e) {
            console.error(`Error getting longOffset for ${cleanIana}:`, e);
            // formattedUtcOffset remains 'N/A'
        }
    
        const tzAbbrElement = cardElement.querySelector('.tz-abbr');
        if (tzAbbrElement) {
            tzAbbrElement.textContent = tzAbbr;
        } else {
            console.error("Element with class '.tz-abbr' not found for IANA:", cleanIana);
        }
    
        const utcOffsetElement = cardElement.querySelector('.utc-offset');
        if (utcOffsetElement) {
            utcOffsetElement.textContent = formattedUtcOffset;
        } else {
            console.error("Element with class '.utc-offset' not found for IANA:", cleanIana);
        }
    
        // DST indicator
        const dstCheckFormatter = new Intl.DateTimeFormat('en-US', { timeZone: cleanIana, timeZoneName: 'long' });
        const isDST = dstCheckFormatter.format(now).toLowerCase().includes('daylight');
        const dstIndicator = cardElement.querySelector('.dst-indicator');
        if (dstIndicator) {
            dstIndicator.style.display = isDST ? 'inline' : 'none';
        } else {
            console.error("Element with class '.dst-indicator' not found for IANA:", cleanIana);
        }
            
        // Set day/night color based on the IANA zone's hour
        const hourInZone = new Date(now.toLocaleString('en-US', {timeZone: cleanIana})).getHours();
        cardElement.classList.remove('day', 'evening', 'night');
        if (hourInZone >= 6 && hourInZone < 18) {
            cardElement.classList.add('day');
        } else if (hourInZone >= 18 && hourInZone < 21) {
            cardElement.classList.add('evening');
        } else {
            cardElement.classList.add('night');
        }

    } catch (error) {
        // Log primary city if available, or just IANA
        console.error(`Error updating card for IANA ${timezoneData?.iana?.trim()} (Primary city: ${timezoneData?.locations?.[0]?.city}):`, error);
        // Fallback content setters with null checks
        const fallbackTime = cardElement.querySelector('.time-value'); // Target specific element
        if (fallbackTime) fallbackTime.textContent = "Error";
        
        const fallbackAmPm = cardElement.querySelector('.am-pm');
        if (fallbackAmPm) fallbackAmPm.textContent = "";

        const fallbackDate = cardElement.querySelector('.current-date');
        if (fallbackDate) fallbackDate.textContent = "N/A";

        const fallbackTzAbbr = cardElement.querySelector('.tz-abbr');
        if (fallbackTzAbbr) fallbackTzAbbr.textContent = "ERR";
        
        const fallbackUtcOffset = cardElement.querySelector('.utc-offset');
        if (fallbackUtcOffset) fallbackUtcOffset.textContent = "ERR";
    }
}

// Update all displayed timezone cards
function updateAllDisplayedTimes() {
    const now = new Date();
    const cards = timezoneGrid.querySelectorAll('.timezone-card'); // Ensure timezoneGrid is defined
    if (!userTimezones || !cards.length) return;

    userTimezones.forEach((tzData, index) => {
        const cardElement = cards[index]; // Assumes cards are in same order as userTimezones
        if (cardElement) {
            updateTimezoneCard(cardElement, tzData, now);
        } else {
            // This case might indicate a mismatch, e.g., if renderTimezones hasn't completed
            // or if the card structure is unexpectedly different.
            // console.warn(`Card not found for timezone at index ${index}: ${tzData.city}`);
        }
    });
}

// Handle adding a new city
async function handleAddCity() {
    console.log('[Figured] handleAddCity triggered. Input value:', citySearchInput.value);
    const searchInputValue = citySearchInput.value.trim();
    if (!searchInputValue) {
        locationNotFoundMsg.style.display = 'none';
        return;
    }

    const foundLocation = allLocations.find(loc => {
        const searchTermLower = searchInputValue.toLowerCase();
        // Check city, "city, country", and IANA (case-insensitive for search, then case-sensitive for direct IANA match)
        return (loc.city && loc.city.toLowerCase().includes(searchTermLower)) || // Broader search for suggestions
               (loc.countryName && `${loc.city}, ${loc.countryName}`.toLowerCase().includes(searchTermLower)) ||
               (loc.iana && loc.iana.toLowerCase().includes(searchTermLower)) ||
               (loc.iana === searchInputValue); // Allow direct IANA input
    });

    if (!foundLocation) {
        updateLocationNotFoundMessage(searchInputValue);
        console.log('[Figured] Location not found, displaying message for:', searchInputValue);
        locationNotFoundMsg.style.display = 'block';
        return;
    }

    locationNotFoundMsg.style.display = 'none';

    // Check if the IANA timezone of the found location is already in userTimezones
    const existingTzCardEntry = userTimezones.find(tz => tz.iana === foundLocation.iana);

    if (existingTzCardEntry) {
        // IANA zone already exists on a card. Add this city to its list of locations, if not already present.
        const cityAlreadyOnThisCard = existingTzCardEntry.locations.some(
            locOnCard => locOnCard.city.toLowerCase() === foundLocation.city.toLowerCase() &&
                         locOnCard.countryCode === foundLocation.countryCode // Use countryCode for more precise match
        );

        if (!cityAlreadyOnThisCard) {
            existingTzCardEntry.locations.push({
                city: foundLocation.city,
                countryName: foundLocation.countryName,
                countryCode: foundLocation.countryCode
                // lat/lon from foundLocation can be added if needed by other features
            });
            await saveUserTimezones();
            renderTimezones(); // Re-render to update the existing card
            showNotification(`Added ${foundLocation.city} to the card for ${foundLocation.iana}.`, 'success');
        } else {
            showNotification(`${foundLocation.city} is already listed on the card for ${foundLocation.iana}.`, 'info');
        }
        citySearchInput.value = '';
        citySuggestionsList.style.display = 'none';
        return;
    }

    // This IANA zone is new to the user's display. Create a new card entry.
    // Check timezone card limit (max 24 distinct IANA cards)
    if (userTimezones.length >= 24) {
        showNotification("Maximum of 24 timezone cards reached. Cannot add new IANA zone.", 'error');
        return;
    }

    const newTimezoneCardEntry = {
        iana: foundLocation.iana,
        locations: [{ // Initialize with the first location for this new IANA card
            city: foundLocation.city,
            countryName: foundLocation.countryName,
            countryCode: foundLocation.countryCode
            // lat: foundLocation.lat, 
            // lon: foundLocation.lon
        }],
        isHome: false, // Default, can be changed later
        userAdded: true, // This card was initiated by user adding a city
        isSystemMarker: false // Default
    };
    userTimezones.push(newTimezoneCardEntry);

    citySearchInput.value = '';
    citySuggestionsList.style.display = 'none';
    
    // The call to findAndAddSharedLocations is now removed.

    await saveUserTimezones();
    renderTimezones();
    showNotification(`Added new card for ${foundLocation.city} (${foundLocation.iana}).`, 'success');
}

// Function to get effective offset string (UTC and DST considered)
function getEffectiveOffsetString(iana) {
    try {
        if (!iana || typeof iana !== 'string') {
            console.error(`Invalid IANA input to getEffectiveOffsetString: ${iana}`);
            return `error_invalid_input`;
        }
        const cleanIana = iana.trim(); // Trim the IANA string
        const now = new Date();
        // Using longOffset to capture full offset including minutes, and timeZoneName for DST info.
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: cleanIana, // Use the cleaned IANA string
            timeZoneName: 'longOffset'
        }).formatToParts(now);
        const offsetPart = parts.find(p => p.type === 'timeZoneName');
        if (offsetPart && offsetPart.value) {
            return offsetPart.value; // e.g., "GMT-07:00"
        }
        console.warn(`Could not determine offset string for ${cleanIana}.`);
        return `error_offset_unavailable_${cleanIana}`; // More specific error
    } catch (e) {
        console.error(`Error getting effective offset for ${iana.trim()}:`, e);
        return `error_exception_${iana.trim()}`; // Ensure non-match on error
    }
}

// Add this new function somewhere near other utility functions

/**
 * Calculates the UTC offset in minutes for a given IANA timezone.
 * Positive for zones ahead of UTC, negative for zones behind.
 * @param {string} iana The IANA timezone string.
 * @param {Date} now The current date object to calculate offset against.
 * @returns {number} The offset in minutes, or -Infinity/Infinity for errors to aid sorting.
 */
function getSortableUtcOffsetInMinutes(iana, now = new Date()) {
    try {
        if (!iana || typeof iana !== 'string') {
            console.error(`Invalid IANA input to getSortableUtcOffsetInMinutes: ${iana}`);
            return -Infinity; // Push to one end
        }
        const cleanIana = iana.trim();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: cleanIana,
            timeZoneName: 'longOffset' // e.g., GMT+05:30, GMT-08:00, GMT
        });
        const parts = formatter.formatToParts(now);
        const offsetStringPart = parts.find(p => p.type === 'timeZoneName');

        if (offsetStringPart && offsetStringPart.value) {
            const gmtValue = offsetStringPart.value; // "GMT", "GMT+X", "GMT-X", "GMT+X:Y", "GMT-X:Y"

            if (gmtValue === "GMT") return 0; // UTC itself

            const offsetMatch = gmtValue.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
            if (offsetMatch) {
                const sign = offsetMatch[1] === '+' ? 1 : -1;
                const hours = parseInt(offsetMatch[2], 10);
                const minutesPart = offsetMatch[3] ? parseInt(offsetMatch[3], 10) : 0;
                return sign * (hours * 60 + minutesPart);
            }
        }
        console.warn(`Could not parse offset for ${cleanIana} from "${offsetStringPart?.value}" in getSortableUtcOffsetInMinutes. Defaulting sort order.`);
        return -Infinity; // Push to one end if unparsable or format is unexpected
    } catch (e) {
        // This catch is important if the IANA name itself is invalid (e.g., after trim but still bad)
        console.error(`Error in getSortableUtcOffsetInMinutes for IANA '${iana}': ${e.message}. This might indicate an invalid IANA name in locations.json.`);
        return -Infinity; // If IANA is invalid, push to one end
    }
}


function updateLocationNotFoundMessage(searchTerm) {
    locationNotFoundMsg.textContent = `Location "${searchTerm}" not found. Try the nearest major city. `;
    const searchLink = document.createElement('a');
    searchLink.id = 'search-on-google-link';
    searchLink.href = `https://www.google.com/search?q=${encodeURIComponent(searchTerm + ' timezone')}`;
    searchLink.textContent = 'Search on Google';
    searchLink.target = '_blank';
    searchLink.rel = 'noopener noreferrer';
    locationNotFoundMsg.appendChild(searchLink);
}

// Handle city search input
function handleCitySearchInput() {
    console.log('[Figured] handleCitySearchInput triggered.');
    locationNotFoundMsg.style.display = 'none';
    const searchTerm = citySearchInput.value.trim().toLowerCase();
    console.log('[Figured] Search Term:', searchTerm);

    if (allLocations.length === 0) {
        console.warn('[Figured] Warning: allLocations array is empty during city search. Data might not have loaded.');
        citySuggestionsList.innerHTML = '';
        citySuggestionsList.style.display = 'none';
        return;
    }
    if (searchTerm.length < 2) {
        citySuggestionsList.innerHTML = '';
        citySuggestionsList.style.display = 'none';
        console.log('[Figured] Search term too short, hiding suggestions.');
        return;
    }

    const suggestions = allLocations.filter(loc => {
        const cityMatch = loc.city && loc.city.toLowerCase().includes(searchTerm);
        const countryMatch = loc.countryName && loc.countryName.toLowerCase().includes(searchTerm);
        const ianaMatch = loc.iana && loc.iana.toLowerCase().includes(searchTerm);
        return cityMatch || countryMatch || ianaMatch;
    }).slice(0, 10); // Limit to 10 suggestions

    console.log(`[Figured] Suggestions found for "${searchTerm}":`, suggestions.length, suggestions);
    // Detailed check if "Boston" is specifically being missed by the filter:
    if (searchTerm === "boston") {
        const bostonExplicitCheck = allLocations.find(loc => loc.city && loc.city.toLowerCase() === "boston");
        console.log('[Figured] Explicit check for Boston in allLocations:', bostonExplicitCheck);
    }
    
    renderSuggestions(suggestions);
}

function renderSuggestions(suggestions) {
    console.log('[Figured] renderSuggestions called with:', suggestions.length, 'suggestions.');
    citySuggestionsList.innerHTML = '';
    if (suggestions.length === 0) {
        citySuggestionsList.style.display = 'none';
        return;
    }

    suggestions.forEach(loc => {
        const li = document.createElement('li');
        li.textContent = `${loc.city}, ${loc.countryName} (${loc.iana})`;
        li.dataset.iana = loc.iana;
        li.dataset.cityName = loc.city;
        li.addEventListener('mousedown', () => {
            isSuggestionClicked = true; // Set flag on mousedown
            console.log('[Figured] Suggestion mousedown. isSuggestionClicked set to true.');
            citySearchInput.value = `${loc.city}, ${loc.countryName}`; // Set input value before calling handleAddCity
            console.log('[Figured] Suggestion clicked. Input set to:', citySearchInput.value);
            // citySuggestionsList.style.display = 'none'; // Let blur handler take care of this, or handleAddCity
            handleAddCity(); // This will now use the value set above
        });
        citySuggestionsList.appendChild(li);
    });
    citySuggestionsList.style.display = 'block';
}

// Handle removing a timezone
async function handleRemoveTimezone(event) {
    const ianaTimezone = event.target.dataset.iana;
    if (!ianaTimezone) return;

    // Don't allow removing home timezone
    const timezoneToRemove = userTimezones.find(tz => tz.iana === ianaTimezone);
    if (timezoneToRemove?.isHome) {
        alert("Cannot remove your home timezone. Set a different home timezone first.");
        return;
    }

    // Remove from array
    userTimezones = userTimezones.filter(tz => tz.iana !== ianaTimezone);
    await saveUserTimezones();
    renderTimezones();
}

// Add near other utility functions or within init sequence logic
async function addCurrentSystemTimezone() {
    try {
        const systemIANA = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!systemIANA) {
            console.warn("Could not determine system timezone IANA name.");
            return;
        }

        const existingSystemTzCard = userTimezones.find(tz => tz.iana === systemIANA);
        if (existingSystemTzCard) {
            console.log("System timezone already present in user's list:", systemIANA);
            // Ensure it's marked as system, even if user added it manually before
            if (!existingSystemTzCard.isSystemMarker) {
                existingSystemTzCard.isSystemMarker = true;
                // Potentially save and re-render if this state needs to persist & reflect immediately
                // await saveUserTimezones();
                // renderTimezones(); 
            }
            return; // Stop further processing to avoid adding a duplicate
        }

        const systemLocationData = allLocations.find(loc => loc.iana === systemIANA);
        if (!systemLocationData) {
            console.warn(`System timezone "${systemIANA}" not found in locations.json. Cannot add as a card.`);
            // Optional: could create a basic entry if truly needed, but better to have it in locations.json
            // showNotification(`Your system timezone (${systemIANA}) is not in our city list.`, 'info');
            return; // Cannot add if not in our master list
        }

        // Limit check before adding system timezone card
        if (userTimezones.length >= 24) {
            showNotification("Maximum of 24 timezones reached, cannot add system timezone automatically.", 'info');
            return;
        }

        const systemTimezoneCardEntry = {
            iana: systemLocationData.iana,
            locations: [{ city: systemLocationData.city, countryName: systemLocationData.countryName, countryCode: systemLocationData.countryCode }],
            isSystemMarker: true, // Mark it as the system's current timezone card
            userAdded: false // Not directly added by user search (though it might be if they search for it)
        };
        userTimezones.push(systemTimezoneCardEntry); // Or unshift to place it consistently
        // No need to call saveUserTimezones() here if we don't want to persist it as a *user choice*
        console.log("System timezone IANA card added:", systemIANA);
        // renderTimezones() will be called by init, or call it if adding dynamically later
    } catch (error) {
        console.error("Error adding current system timezone:", error);
        showNotification("Could not determine or add your system timezone.", 'error');
    }
}

// Add this listener (typically towards the end of the file or after init is defined)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FIG_UPDATE_TIME') {
        // console.log('Newtab received FIG_UPDATE_TIME from service worker');
        updateAllDisplayedTimes();
        sendResponse({ status: "Times updated on newtab" }); // Optional: send a response
        return true; // Indicates you wish to send a response asynchronously (if needed)
    }
});

// Initialize the extension
init();

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
    console.log('[Figured] INIT: allLocations post-load. Length:', allLocations.length);
    if (allLocations.length > 0) {
        console.log('[Figured] INIT: First 3 allLocations entries:', JSON.stringify(allLocations.slice(0, 3)));
    } else {
        console.error('[Figured] INIT: allLocations IS EMPTY OR UNDEFINED AFTER LOAD. THIS IS A CRITICAL ISSUE.');
    }
    await loadUserTimezones();
    await addCurrentSystemTimezone();
    checkFirstRun();
    renderTimezones();
    
    // Setup event listeners (existing)
    setHomeBtn.addEventListener('click', handleSetHomeTimezone);
    addCityBtn.addEventListener('click', handleAddCity);
    notificationCloseBtn.addEventListener('click', hideNotification);
    citySearchInput.addEventListener('input', debounce(handleCitySearchInput, 300));
    citySearchInput.addEventListener('blur', () => {
        setTimeout(() => {
            console.log('[Figured] Blur timeout. isSuggestionClicked:', isSuggestionClicked); // Log before the if
            if (!isSuggestionClicked) {
                citySuggestionsList.style.display = 'none';
                console.log('[Figured] Hiding citySuggestionsList due to blur timeout (no suggestion click).');
            }
            // Reset flag regardless, for next interaction
            isSuggestionClicked = false; 
            console.log('[Figured] isSuggestionClicked reset to false.');
        }, 200);
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
    // TODO: For future releases, consider adding migration logic here
    // if the structure of 'userTimezonesConfig' objects changes significantly
    // from a previous version, to prevent errors or data loss for existing users.
    // Current version expects an array of "group card" objects.
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
    const selectedHomeCityIana = homeTimezoneSelect.value; // This is an IANA string from the dropdown
    if (!selectedHomeCityIana) {
        alert("Please select a home timezone.");
        return;
    }
    
    const now = new Date();
    const homeGroupKey = getEffectiveTimeGroupKey(selectedHomeCityIana, now);
    
    if (homeGroupKey.startsWith('error_')) {
        showNotification(`Error setting home timezone for ${selectedHomeCityIana}: ${homeGroupKey}.`, 'error');
        return;
    }
    
    // Unset any existing home timezone
    userTimezones.forEach(card => card.isHome = false);
    
    let homeCard = userTimezones.find(card => card.groupKey === homeGroupKey);
    
    if (homeCard) {
        homeCard.isHome = true;
    } else {
        // The group for this home city isn't on a card yet. We need to add it.
        // Find the full location data for the selectedHomeCityIana
        const homeLocationData = allLocations.find(loc => loc.iana === selectedHomeCityIana);
        if (!homeLocationData) {
            console.error("Selected home location's IANA not found in allLocations:", selectedHomeCityIana);
            alert("Error setting home timezone. Data inconsistency.");
            return;
        }
        // Create a new card and mark it as home
        const newHomeCard = {
            groupKey: homeGroupKey,
            representativeIana: homeLocationData.iana,
            locations: [{ city: homeLocationData.city, countryName: homeLocationData.countryName, countryCode: homeLocationData.countryCode, originalIana: homeLocationData.iana }],
            isHome: true,
            userAdded: true, // Since user explicitly set it as home
            isSystemMarker: false
        };
        userTimezones.unshift(newHomeCard); // Add to the beginning or push
    }
    
    await saveUserTimezones();
    await chrome.storage.local.set({ homeTimezoneSet: true });
    
    homePrompt.style.display = 'none';
    renderTimezones();
    console.log(`Home groupKey set to: ${homeGroupKey} (Rep. IANA: ${selectedHomeCityIana})`);
}

// Render all timezones to the grid
function renderTimezones() {
    const nowForSorting = new Date(); // Use a consistent 'now' for all offset calculations in this sort pass
    
    // Sorting Logic: Relative to Home group, or fallback
    const homeCard = userTimezones.find(card => card.isHome);
    // Use the representative IANA of the home card for offset calculation
    const homeRepresentativeIana = homeCard ? homeCard.representativeIana : null; 
    
    userTimezones.sort((a, b) => {
        if (homeRepresentativeIana) {
            // Sort relative to home
            const homeOffsetMinutes = getSortableUtcOffsetInMinutes(homeRepresentativeIana, nowForSorting);
    
            const offsetA = getSortableUtcOffsetInMinutes(a.representativeIana, nowForSorting);
            const offsetB = getSortableUtcOffsetInMinutes(b.representativeIana, nowForSorting);
    
            const relativeOffsetA = offsetA - homeOffsetMinutes;
            const relativeOffsetB = offsetB - homeOffsetMinutes;
    
            // The home card will have a relativeOffset of 0.
            // Standard ascending sort by relative offset will place home correctly.
            // No special pivoting needed if relative offsets are calculated correctly.
            return relativeOffsetA - relativeOffsetB; // Ascending by relative difference
        } else {
            // Fallback sort: furthest ahead (largest positive offset) to furthest behind (smallest negative offset).
            const offsetA = getSortableUtcOffsetInMinutes(a.representativeIana, nowForSorting);
            const offsetB = getSortableUtcOffsetInMinutes(b.representativeIana, nowForSorting);
            return offsetB - offsetA; // Descending by absolute offset
        }
    });
    
    timezoneGrid.innerHTML = '';
    
    if (!userTimezones || userTimezones.length === 0) {
        console.log("No user timezones to render.");
        return;
    }
    
    userTimezones.forEach(cardData => { // cardData is now a group card object
        if (!timezoneCardTemplate) {
            console.error("Timezone card template not found!");
            return;
        }
        if (!cardData.groupKey || !cardData.representativeIana || !cardData.locations || cardData.locations.length === 0) {
            console.error("Invalid cardData structure in renderTimezones:", cardData);
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
        if (cardData.isHome) homeIndicatorSpan.style.display = 'inline'; else homeIndicatorSpan.style.display = 'none';
    
        const systemIndicatorSpan = document.createElement('span');
        systemIndicatorSpan.className = 'system-indicator';
        systemIndicatorSpan.textContent = '🕰️';
        if (cardData.isSystemMarker) systemIndicatorSpan.style.display = 'inline'; else systemIndicatorSpan.style.display = 'none';
    
        cardData.locations.forEach((loc, index) => { // loc is {city, countryName, countryCode, originalIana}
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
        cardElement.classList.toggle('system-timezone-card', cardData.isSystemMarker);
    
        // Update with current time - pass the whole tzData (which includes IANA)
        updateTimezoneCard(cardElement, cardData, new Date()); // Pass the group card object
    
        // Setup remove button - it removes the entire IANA card
        const removeBtn = cardElement.querySelector('.remove-tz-btn');
        if (removeBtn) {
            removeBtn.dataset.groupKey = cardData.groupKey; // Removing is now by groupKey
            removeBtn.addEventListener('click', handleRemoveTimezone);
        }
    
        timezoneGrid.appendChild(cardElement);
    });
}

// Update a single timezone card with current time data
function updateTimezoneCard(cardElement, groupCardData, now) {
    try {
        // groupCardData now is { groupKey: "...", representativeIana: "...", locations: [...] }
        if (!groupCardData || !groupCardData.representativeIana || typeof groupCardData.representativeIana !== 'string') {
            console.error("Invalid groupCardData or missing/invalid representativeIana in updateTimezoneCard:", groupCardData);
            // Fallback content setters with null checks
            const fallbackTime = cardElement.querySelector('.time-value'); 
            if (fallbackTime) fallbackTime.textContent = "Error";
            // ... other fallbacks ...
            return;
        }
        const representativeIana = groupCardData.representativeIana.trim();
        const optionsTime = { timeZone: representativeIana, hour: 'numeric', minute: 'numeric', hour12: true };
        const optionsDate = { timeZone: representativeIana, weekday: 'short', month: 'short', day: 'numeric' };
    
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
            console.error("Element with class '.time-value' not found in card for representative IANA:", representativeIana);
        }
    
        // Target the '.am-pm' span
        const amPmElement = cardElement.querySelector('.am-pm');
        if (amPmElement) {
            amPmElement.textContent = amPmValue;
        } else {
            // console.warn("Element with class '.am-pm' not found in card for representative IANA:", representativeIana);
        }
            
        // Format date
        const dateFormatter = new Intl.DateTimeFormat(navigator.language, optionsDate);
        const dateElement = cardElement.querySelector('.current-date');
        if (dateElement) {
            dateElement.textContent = dateFormatter.format(now);
        } else {
            console.error("Element with class '.current-date' not found for representative IANA:", representativeIana);
        }
    
        // Timezone abbreviation and UTC offset
        const tzAbbr = new Intl.DateTimeFormat(navigator.language, {timeZone: representativeIana, timeZoneName: 'short'}).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || 'N/A';
        
        let formattedUtcOffset = 'N/A';
        try {
            const offsetParts = new Intl.DateTimeFormat('en-US', {timeZone: representativeIana, timeZoneName: 'longOffset'}).formatToParts(now);
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
            console.error(`Error getting longOffset for ${representativeIana}:`, e);
            // formattedUtcOffset remains 'N/A'
        }
    
        const tzAbbrElement = cardElement.querySelector('.tz-abbr');
        if (tzAbbrElement) {
            tzAbbrElement.textContent = tzAbbr;
        } else {
            console.error("Element with class '.tz-abbr' not found for representative IANA:", representativeIana);
        }
    
        const utcOffsetElement = cardElement.querySelector('.utc-offset');
        if (utcOffsetElement) {
            utcOffsetElement.textContent = formattedUtcOffset;
        } else {
            console.error("Element with class '.utc-offset' not found for representative IANA:", representativeIana);
        }
    
        // DST indicator
        const dstCheckFormatter = new Intl.DateTimeFormat('en-US', { timeZone: representativeIana, timeZoneName: 'long' });
        const isDST = dstCheckFormatter.format(now).toLowerCase().includes('daylight');
        const dstIndicator = cardElement.querySelector('.dst-indicator');
        if (dstIndicator) {
            dstIndicator.style.display = isDST ? 'inline' : 'none';
        } else {
            console.error("Element with class '.dst-indicator' not found for representative IANA:", representativeIana);
        }
            
        // Define this map if not already defined globally or in an accessible scope
        const hourToSlotClassMap = {
            0: 'slot-00-01', 1: 'slot-00-01',
            2: 'slot-02-03', 3: 'slot-02-03',
            4: 'slot-04-05', 5: 'slot-04-05',
            6: 'slot-06-07', 7: 'slot-06-07',
            8: 'slot-08-09', 9: 'slot-08-09',
            10: 'slot-10-11', 11: 'slot-10-11',
            12: 'slot-12-13', 13: 'slot-12-13', // Midday
            14: 'slot-14-15', 15: 'slot-14-15',
            16: 'slot-16-17', 17: 'slot-16-17',
            18: 'slot-18-19', 19: 'slot-18-19',
            20: 'slot-20-21', 21: 'slot-20-21',
            22: 'slot-22-23', 23: 'slot-22-23'
        };
        // Create an array of all unique slot class names for efficient removal
        const ALL_SLOT_CLASSES = Object.values(hourToSlotClassMap).filter((v, i, a) => a.indexOf(v) === i);
    
        const hourInZone = new Date(now.toLocaleString('en-US', {timeZone: representativeIana})).getHours();
        
        // Remove all existing slot classes and old day/evening/night classes
        cardElement.classList.remove(...ALL_SLOT_CLASSES, 'day', 'evening', 'night');
    
        const slotClass = hourToSlotClassMap[hourInZone];
        if (slotClass) {
            cardElement.classList.add(slotClass);
        }
    
    } catch (error) {
        // Log primary city if available, or just IANA
        console.error(`Error updating card for groupKey ${groupCardData?.groupKey} (Rep. IANA: ${groupCardData?.representativeIana}, Primary city: ${groupCardData?.locations?.[0]?.city}):`, error);
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
    console.log('[Figured] handleAddCity: Input value:', citySearchInput.value);
    const searchInputValue = citySearchInput.value.trim();
    if (!searchInputValue) {
        locationNotFoundMsg.style.display = 'none';
        return;
    }
    
    // Find location data from allLocations (this part remains similar)
    const foundLocation = allLocations.find(loc => {
        const searchTermLower = searchInputValue.toLowerCase();
        return (loc.city && loc.city.toLowerCase().includes(searchTermLower)) ||
               (loc.countryName && `${loc.city}, ${loc.countryName}`.toLowerCase().includes(searchTermLower)) ||
               (loc.iana && loc.iana.toLowerCase().includes(searchTermLower)) ||
               (loc.iana === searchInputValue); // Allow direct IANA input
    });
    
    if (!foundLocation) {
        updateLocationNotFoundMessage(searchInputValue);
        locationNotFoundMsg.style.display = 'block';
        return;
    }
    
    locationNotFoundMsg.style.display = 'none';
    
    const now = new Date();
    const newLocationGroupKey = getEffectiveTimeGroupKey(foundLocation.iana, now);
    
    if (newLocationGroupKey.startsWith('error_')) {
        showNotification(`Error processing timezone for ${foundLocation.city}: ${newLocationGroupKey}. Cannot add.`, 'error');
        console.error(`Failed to get valid group key for ${foundLocation.iana}: ${newLocationGroupKey}`);
        return;
    }
    
    let existingGroupCard = userTimezones.find(card => card.groupKey === newLocationGroupKey);
    
    if (existingGroupCard) {
        // Group already exists, add this city to its locations if not already there
        const cityAlreadyInGroup = existingGroupCard.locations.some(
            locInGroup => locInGroup.city.toLowerCase() === foundLocation.city.toLowerCase() &&
                          locInGroup.countryCode === foundLocation.countryCode && // For specificity
                          locInGroup.originalIana === foundLocation.iana // Also check original IANA if duplicates possible
        );

        if (!cityAlreadyInGroup) {
            existingGroupCard.locations.push({
                city: foundLocation.city,
                countryName: foundLocation.countryName,
                countryCode: foundLocation.countryCode,
                originalIana: foundLocation.iana // Store the original IANA
            });
            // Optional: Sort locations within the card alphabetically by city
            existingGroupCard.locations.sort((a,b) => a.city.localeCompare(b.city));
            await saveUserTimezones();
            renderTimezones();
            showNotification(`Added ${foundLocation.city} to existing card (Group: ${newLocationGroupKey}).`, 'success');
        } else {
            showNotification(`${foundLocation.city} (${foundLocation.iana}) is already on the card for this time group.`, 'info');
        }
    } else {
        // This effective time group is new. Create a new card entry.
        if (userTimezones.length >= 24) { // Check card limit
            showNotification("Maximum of 24 timezone cards reached. Cannot add new time group.", 'error');
            return;
        }
        const newGroupCard = {
            groupKey: newLocationGroupKey,
            representativeIana: foundLocation.iana, // The IANA of the first city forming this group
            locations: [{
                city: foundLocation.city,
                countryName: foundLocation.countryName,
                countryCode: foundLocation.countryCode,
                originalIana: foundLocation.iana
            }],
            isHome: false,
            userAdded: true, 
            isSystemMarker: false
        };
        userTimezones.push(newGroupCard);
        await saveUserTimezones();
        renderTimezones();
        showNotification(`Added new card for ${foundLocation.city} (Group: ${newLocationGroupKey}).`, 'success');
    }
    
    citySearchInput.value = '';
    citySuggestionsList.style.display = 'none';
}

/**
 * Generates a unique key based on a given IANA timezone's current
 * effective UTC offset and DST status.
 * @param {string} ianaString The IANA timezone string.
 * @param {Date} now The current Date object to calculate against.
 * @returns {string} A group key like "-240:true" or an error key.
 */
function getEffectiveTimeGroupKey(ianaString, now = new Date()) {
    if (!ianaString || typeof ianaString !== 'string') {
        console.error(`Invalid IANA input to getEffectiveTimeGroupKey: ${ianaString}`);
        return `error_invalid_iana_${String(ianaString).replace(/[^a-zA-Z0-9_/-]/g, '_')}`; // Sanitize for key usage
    }
    try {
        const cleanIana = ianaString.trim();
        const formatterOffset = new Intl.DateTimeFormat('en-US', {
            timeZone: cleanIana,
            timeZoneName: 'longOffset' // e.g., GMT-07:00
        });
        const partsOffset = formatterOffset.formatToParts(now);
        const offsetStringValue = partsOffset.find(p => p.type === 'timeZoneName')?.value;

        if (!offsetStringValue) {
            console.warn(`Could not determine offset string for ${cleanIana} in getEffectiveTimeGroupKey.`);
            return `error_no_offset_${cleanIana.replace(/[^a-zA-Z0-9_/-]/g, '_')}`;
        }

        let offsetMinutes = 0;
        if (offsetStringValue === "GMT") {
            offsetMinutes = 0;
        } else {
            const offsetMatch = offsetStringValue.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
            if (offsetMatch) {
                const sign = offsetMatch[1] === '+' ? 1 : -1;
                const hours = parseInt(offsetMatch[2], 10);
                const minutesPart = offsetMatch[3] ? parseInt(offsetMatch[3], 10) : 0;
                offsetMinutes = sign * (hours * 60 + minutesPart);
            } else {
                console.warn(`Could not parse offset string: "${offsetStringValue}" for IANA: ${cleanIana} in getEffectiveTimeGroupKey.`);
                return `error_parse_offset_${cleanIana.replace(/[^a-zA-Z0-9_/-]/g, '_')}`;
            }
        }

        const formatterDST = new Intl.DateTimeFormat('en-US', {
            timeZone: cleanIana,
            hour: 'numeric', // Necessary for reliable timeZoneName resolution for DST
            timeZoneName: 'long' // e.g., "Pacific Daylight Time"
        });
        const isDST = formatterDST.format(now).toLowerCase().includes('daylight');

        return `${offsetMinutes}:${isDST}`; // e.g., "-240:true"
    } catch (e) {
        // This catch handles invalid IANA names passed to Intl.DateTimeFormat
        console.error(`Error in getEffectiveTimeGroupKey for IANA '${ianaString}': ${e.message}.`);
        return `error_exception_iana_${ianaString.replace(/[^a-zA-Z0-9_/-]/g, '_')}`;
    }
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

    if (!allLocations || allLocations.length === 0) { // Add this check
        console.error('[Figured] CRITICAL: allLocations is empty or undefined in handleCitySearchInput. Suggestions cannot work.');
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

    console.log(`[Figured] Raw suggestions array for "${searchTerm}":`, JSON.stringify(suggestions));
    console.log(`[Figured] Number of suggestions found: ${suggestions.length}`);
    
    // Detailed check if "Boston" is specifically being missed by the filter:
    if (searchTerm === "boston") {
        const bostonExplicitCheck = allLocations.find(loc => loc.city && loc.city.toLowerCase() === "boston");
        console.log('[Figured] Explicit check for Boston in allLocations:', bostonExplicitCheck);
    }
    
    renderSuggestions(suggestions);
}

function renderSuggestions(suggestions) {
    console.log('[Figured] renderSuggestions called with:', suggestions.length, 'suggestions. Data:', JSON.stringify(suggestions.slice(0,3)));
    citySuggestionsList.innerHTML = '';
    if (suggestions.length === 0) {
        citySuggestionsList.style.display = 'none';
        console.log('[Figured] No suggestions, hiding list.');
        return;
    }

    suggestions.forEach(loc => {
        const li = document.createElement('li');
        li.textContent = `${loc.city}, ${loc.countryName} (${loc.iana})`;
        li.dataset.iana = loc.iana;
        // DEPRECATED: li.dataset.cityName = loc.city; // Not strictly needed if handleAddCity uses input val
        li.addEventListener('mousedown', () => {
            isSuggestionClicked = true; // Set flag on mousedown
            console.log('[Figured] Suggestion mousedown. isSuggestionClicked set to true.');
            citySearchInput.value = `${loc.city}, ${loc.countryName}`; // Set input value before calling handleAddCity
            console.log('[Figured] Suggestion clicked. Input set to:', citySearchInput.value);
            // citySuggestionsList.style.display = 'none'; // Let blur handler take care of this, or handleAddCity
            handleAddCity(); // This will now use the value set above
        });
        citySuggestionsList.appendChild(li);
        console.log('[Figured] Appended suggestion li:', li.textContent);
    });
    citySuggestionsList.style.display = 'block';
    console.log('[Figured] Suggestions list display set to block.');
}

// Handle removing a timezone
async function handleRemoveTimezone(event) {
    const groupKeyToRemove = event.target.dataset.groupKey; // Changed from iana to groupKey
    if (!groupKeyToRemove) return;
    
    const cardToRemove = userTimezones.find(card => card.groupKey === groupKeyToRemove);
    if (cardToRemove?.isHome) {
        alert("Cannot remove your home timezone. Set a different home timezone first.");
        return;
    }
    
    // Remove from array
    userTimezones = userTimezones.filter(card => card.groupKey !== groupKeyToRemove);
    await saveUserTimezones();
    renderTimezones();
    showNotification(`Removed card for group ${groupKeyToRemove}.`, 'info');
}

// Add near other utility functions or within init sequence logic
async function addCurrentSystemTimezone() {
    try {
        const systemDeviceIana = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!systemDeviceIana) {
            console.warn("Could not determine system timezone IANA name.");
            return;
        }
    
        const now = new Date();
        const systemGroupKey = getEffectiveTimeGroupKey(systemDeviceIana, now);
    
        if (systemGroupKey.startsWith('error_')) {
            showNotification(`Could not process your system timezone (${systemDeviceIana}): ${systemGroupKey}.`, 'error');
            return;
        }
    
        const systemLocationData = allLocations.find(loc => loc.iana === systemDeviceIana);
        if (!systemLocationData) {
            console.warn(`System timezone IANA "${systemDeviceIana}" not found in locations.json. Cannot automatically add its specific city details.`);
            // We can still create a card for the group, but it might lack a specific city name if the IANA isn't in our list.
            // For now, let's require it to be in locations.json to get city details.
            // Alternative: Create a generic card if systemLocationData is null.
            showNotification(`Your system timezone (${systemDeviceIana}) city details are not in our list.`, 'info');
            return; 
        }
    
        let systemGroupCard = userTimezones.find(card => card.groupKey === systemGroupKey);
    
        if (systemGroupCard) {
            systemGroupCard.isSystemMarker = true;
            // Add the system city to the card's locations if it's not already there
            const systemCityInLocations = systemGroupCard.locations.some(
                loc => loc.originalIana === systemDeviceIana && loc.city === systemLocationData.city
            );
            if (!systemCityInLocations) {
                systemGroupCard.locations.push({ city: systemLocationData.city, countryName: systemLocationData.countryName, countryCode: systemLocationData.countryCode, originalIana: systemDeviceIana });
                systemGroupCard.locations.sort((a,b) => a.city.localeCompare(b.city));
            }
            console.log(`System timezone group (${systemGroupKey}) already exists. Marked as system.`);
        } else {
            if (userTimezones.length >= 24) return; // Max cards check
    
            systemGroupCard = {
                groupKey: systemGroupKey,
                representativeIana: systemDeviceIana,
                locations: [{ city: systemLocationData.city, countryName: systemLocationData.countryName, countryCode: systemLocationData.countryCode, originalIana: systemDeviceIana }],
                isSystemMarker: true,
                isHome: false, // Could be home if user also sets it
                userAdded: false
            };
            userTimezones.push(systemGroupCard);
            console.log(`System timezone group (${systemGroupKey}) added with Rep. IANA: ${systemDeviceIana}.`);
        }
        // No saveUserTimezones() here intentionally for system timezone, as it's dynamic on load.
        // renderTimezones() will be called by init anyway.
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

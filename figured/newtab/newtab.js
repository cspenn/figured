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

// Initialize the extension
// Debounce utility
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

async function init() {
    await loadLocationsData();
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
        setTimeout(() => {
            citySuggestionsList.style.display = 'none';
        }, 150);
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

    const homeLocationData = allLocations.find(loc => loc.iana === selectedIANATimezone);
    if (!homeLocationData) {
        console.error("Selected home location not found in allLocations data:", selectedIANATimezone);
        alert("Error setting home timezone. Data inconsistency.");
        return;
    }

    const homeTimezone = { ...homeLocationData, isHome: true, userAdded: true };

    // Check if already added, update if so, otherwise add
    const existingIndex = userTimezones.findIndex(tz => tz.iana === homeTimezone.iana);
    if (existingIndex > -1) {
        userTimezones[existingIndex].isHome = true;
    } else {
        userTimezones.unshift(homeTimezone);
    }

    await saveUserTimezones();
    await chrome.storage.local.set({ homeTimezoneSet: true });

    homePrompt.style.display = 'none';
    renderTimezones();
    console.log("Home timezone set to:", homeTimezone);
}

// Render all timezones to the grid
function renderTimezones() {
    timezoneGrid.innerHTML = '';

    if (!userTimezones || userTimezones.length === 0) {
        console.log("No user timezones to render.");
        return;
    }

    userTimezones.forEach(tzData => {
        if (!timezoneCardTemplate) {
            console.error("Timezone card template not found!");
            return;
        }
        const cardClone = timezoneCardTemplate.content.cloneNode(true);
        const cardElement = cardClone.querySelector('.timezone-card');
        
        // Populate basic info
        cardElement.querySelector('.city-name').textContent = tzData.city || 'N/A';
        cardElement.querySelector('.country-name').textContent = tzData.countryName || tzData.countryCode || 'N/A';

        // Add class for system timezone if applicable
        cardElement.classList.toggle('system-timezone-card', tzData.isSystem || tzData.isSystemMarker);

        // Update with current time
        updateTimezoneCard(cardElement, tzData, new Date());

        // Setup remove button
        const removeBtn = cardElement.querySelector('.remove-tz-btn');
        if (removeBtn) {
            removeBtn.dataset.iana = tzData.iana;
            removeBtn.addEventListener('click', handleRemoveTimezone);
        }

        timezoneGrid.appendChild(cardElement);
    });
}

// Update a single timezone card with current time data
function updateTimezoneCard(cardElement, timezoneData, now) {
    try {
        const optionsTime = { timeZone: timezoneData.iana, hour: 'numeric', minute: 'numeric', hour12: true };
        const optionsDate = { timeZone: timezoneData.iana, weekday: 'short', month: 'short', day: 'numeric' };

        // Format time
        const timeFormatter = new Intl.DateTimeFormat(navigator.language, optionsTime);
        const timeString = timeFormatter.format(now);
        const [timeValue, amPmValue = ''] = timeString.split(' ');

        cardElement.querySelector('.current-time').textContent = timeValue;
        cardElement.querySelector('.current-time .am-pm').textContent = amPmValue;

        // Format date
        const dateFormatter = new Intl.DateTimeFormat(navigator.language, optionsDate);
        cardElement.querySelector('.current-date').textContent = dateFormatter.format(now);

        // Timezone abbreviation and UTC offset
        const tzAbbr = new Intl.DateTimeFormat(navigator.language, {timeZone: timezoneData.iana, timeZoneName: 'short'}).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || 'N/A';
        
        let formattedUtcOffset = 'N/A';
        try {
            const offsetParts = new Intl.DateTimeFormat('en-US', {timeZone: timezoneData.iana, timeZoneName: 'longOffset'}).formatToParts(now);
            const offsetString = offsetParts.find(p => p.type === 'timeZoneName')?.value;
            if (offsetString && offsetString.startsWith('GMT')) {
                formattedUtcOffset = 'UTC' + offsetString.substring(3);
            } else if (offsetString) {
                formattedUtcOffset = offsetString; // Use as is if not GMT prefixed but found
            }
        } catch (e) {
            console.error(`Error getting longOffset for ${timezoneData.iana}:`, e);
            // formattedUtcOffset remains 'N/A'
        }

        cardElement.querySelector('.tz-abbr').textContent = tzAbbr;
        cardElement.querySelector('.utc-offset').textContent = formattedUtcOffset; // Use the new variable

        // DST indicator
        const dstCheckFormatter = new Intl.DateTimeFormat('en-US', { timeZone: timezoneData.iana, timeZoneName: 'long' });
        const isDST = dstCheckFormatter.format(now).toLowerCase().includes('daylight');
        const dstIndicator = cardElement.querySelector('.dst-indicator');
        dstIndicator.style.display = isDST ? 'inline' : 'none';

        // Set day/night color
        const hourInZone = new Date(now.toLocaleString('en-US', {timeZone: timezoneData.iana})).getHours();
        cardElement.classList.remove('day', 'evening', 'night');
        if (hourInZone >= 6 && hourInZone < 18) {
            cardElement.classList.add('day');
        } else if (hourInZone >= 18 && hourInZone < 21) {
            cardElement.classList.add('evening');
        } else {
            cardElement.classList.add('night');
        }

    } catch (error) {
        console.error(`Error updating card for ${timezoneData.city} (IANA: ${timezoneData.iana}):`, error);
        cardElement.querySelector('.current-time').textContent = "Error";
        cardElement.querySelector('.current-date').textContent = "N/A";
        cardElement.querySelector('.tz-abbr').textContent = "ERR";
        cardElement.querySelector('.utc-offset').textContent = "ERR";
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
    const selectedCityName = citySearchInput.value.trim();
    if (!selectedCityName) {
        locationNotFoundMsg.style.display = 'none';
        return;
    }

    const foundLocation = allLocations.find(loc => 
        loc.city.toLowerCase() === selectedCityName.toLowerCase() || 
        `${loc.city}, ${loc.countryName}`.toLowerCase() === selectedCityName.toLowerCase() ||
        loc.iana === selectedCityName
    );

    if (!foundLocation) {
        updateLocationNotFoundMessage(selectedCityName);
        locationNotFoundMsg.style.display = 'block';
        return;
    }

    locationNotFoundMsg.style.display = 'none';

    // Check timezone limit (max 24)
    if (userTimezones.length >= 24) {
        showNotification("Maximum of 24 timezones reached.", 'error');
        return;
    }

    // Check if already added
    const alreadyAdded = userTimezones.some(tz => tz.iana === foundLocation.iana);
    if (alreadyAdded) {
        showNotification(`${foundLocation.city} is already in your timezone list.`, 'info');
        citySearchInput.value = '';
        citySuggestionsList.style.display = 'none';
        return;
    }

    // Add to user's timezones
    const newTimezone = { ...foundLocation, userAdded: true };
    userTimezones.push(newTimezone);
    // await saveUserTimezones(); // Save will happen after shared locations or if none are added

    // Clear search before potentially lengthy shared location search
    const addedCityName = foundLocation.city; // Store name before clearing input
    const addedCityIANA = foundLocation.iana;
    citySearchInput.value = '';
    citySuggestionsList.style.display = 'none';
    
    await findAndAddSharedLocations(addedCityIANA); // Call the new function
    
    await saveUserTimezones(); // Save all additions (primary + shared)
    renderTimezones();
    showNotification(`Added ${addedCityName} to your timezones.`, 'success');
}

// Function to get effective offset string (UTC and DST considered)
function getEffectiveOffsetString(iana) {
    try {
        const now = new Date();
        // Using longOffset to capture full offset including minutes, and timeZoneName for DST info.
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: iana,
            timeZoneName: 'longOffset'
        }).formatToParts(now);
        const offsetPart = parts.find(p => p.type === 'timeZoneName');
        return offsetPart ? offsetPart.value : new Date(now.toLocaleString('en-US', {timeZone: iana})).getTimezoneOffset().toString(); // Fallback
    } catch (e) {
        console.error(`Error getting effective offset for ${iana}:`, e);
        return `error_${iana}`; // Ensure non-match on error
    }
}

async function findAndAddSharedLocations(mainAddedIANATimezone) {
    if (!allLocations || allLocations.length === 0) return;

    const mainLocationEffectiveOffset = getEffectiveOffsetString(mainAddedIANATimezone);
    if (mainLocationEffectiveOffset.startsWith('error_')) return;

    let addedCount = 0;
    for (const loc of allLocations) {
        if (userTimezones.length >= 24) {
            showNotification("Reached timezone limit while adding shared locations.", 'info');
            break; // Stop if limit reached
        }

        if (loc.iana === mainAddedIANATimezone || userTimezones.some(tz => tz.iana === loc.iana)) {
            continue; // Skip if it's the main added one or already present
        }

        const currentLocEffectiveOffset = getEffectiveOffsetString(loc.iana);
        if (currentLocEffectiveOffset === mainLocationEffectiveOffset) {
            const newSharedTimezone = { ...loc, userAdded: false, isSharedAddition: true }; // Mark as shared
            userTimezones.push(newSharedTimezone);
            addedCount++;
            console.log(`Auto-added shared location: ${loc.city} (same time as ${mainAddedIANATimezone})`);
        }
    }

    if (addedCount > 0) {
        // await saveUserTimezones(); // Save after adding shared locations - handled by calling function
        // renderTimezones(); // Will be called by the calling function (handleAddCity)
        showNotification(`Added ${addedCount} other location(s) sharing the same current time.`, 'success');
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
    // Clear not found message when typing
    locationNotFoundMsg.style.display = 'none';
    const searchTerm = citySearchInput.value.trim().toLowerCase();

    if (searchTerm.length < 2) {
        citySuggestionsList.innerHTML = '';
        citySuggestionsList.style.display = 'none';
        return;
    }

    const suggestions = allLocations.filter(loc =>
        loc.city.toLowerCase().includes(searchTerm) ||
        loc.countryName.toLowerCase().includes(searchTerm) ||
        loc.iana.toLowerCase().includes(searchTerm)
    ).slice(0, 10);

    renderSuggestions(suggestions);
}

function renderSuggestions(suggestions) {
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
            citySearchInput.value = `${loc.city}, ${loc.countryName}`;
            citySuggestionsList.style.display = 'none';
            handleAddCity();
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

        const alreadyExistingEntry = userTimezones.find(tz => tz.iana === systemIANA);
        if (alreadyExistingEntry) {
            console.log("System timezone already present in user's list:", systemIANA);
            if (!alreadyExistingEntry.isSystemMarker && !alreadyExistingEntry.isSystem) { // Check if not already marked
                alreadyExistingEntry.isSystemMarker = true; 
                // If this change should trigger a re-render immediately:
                // renderTimezones(); 
                // Note: init() calls renderTimezones() after this, so it might be covered.
                // Consider if saveUserTimezones() is needed if isSystemMarker is persisted.
                // For now, isSystemMarker is primarily for styling during the current session.
            }
            return; // Stop further processing to avoid adding a duplicate
        }

        const systemLocationData = allLocations.find(loc => loc.iana === systemIANA);
        if (!systemLocationData) {
            console.warn(`System timezone "${systemIANA}" not found in locations.json. Cannot add as a card.`);
            // Optional: could create a basic entry if truly needed, but better to have it in locations.json
            // showNotification(`Your system timezone (${systemIANA}) is not in our city list.`, 'info');
            return;
        }

        // Limit check before adding system timezone
        if (userTimezones.length >= 24) {
            showNotification("Maximum of 24 timezones reached, cannot add system timezone automatically.", 'info');
            return;
        }

        const systemTimezone = { ...systemLocationData, isSystem: true, userAdded: false, isSystemMarker: true }; // Ensure isSystemMarker is also true
        userTimezones.push(systemTimezone); // Or unshift to put it first/last consistently
        // No need to call saveUserTimezones() here if we don't want to persist it as a *user choice*
        // If it should be persistent until removed, then call save. For now, let's make it non-persistent unless saved by other means.
        // OR, always add it and allow user to remove. If so, then save:
        // await saveUserTimezones(); 
        console.log("System timezone added:", systemTimezone);
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

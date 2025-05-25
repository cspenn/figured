// DOM Elements
const timezoneGrid = document.getElementById('timezone-grid');
const timezoneCardTemplate = document.getElementById('timezone-card-template');
const homePrompt = document.getElementById('home-prompt');
const homeTimezoneSelect = document.getElementById('home-timezone-select');
const setHomeBtn = document.getElementById('set-home-btn');
const addCityBtn = document.getElementById('add-city-btn');
const citySearchInput = document.getElementById('city-search-input');
const locationNotFoundMsg = document.getElementById('location-not-found-msg');

// Data
let allLocations = [];
let userTimezones = [];

// Initialize the extension
async function init() {
    await loadLocationsData();
    await loadUserTimezones();
    checkFirstRun();
    renderTimezones();
    startUpdateInterval();
    
    // Setup event listeners
    setHomeBtn.addEventListener('click', handleSetHomeTimezone);
    addCityBtn.addEventListener('click', handleAddCity);
    citySearchInput.addEventListener('input', handleCitySearchInput);
}

// Load locations data from JSON file
async function loadLocationsData() {
    try {
        const response = await fetch('../common/locations.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allLocations = await response.json();
        console.log(`Successfully loaded ${allLocations.length} locations.`);
    } catch (error) {
        console.error("Error loading locations.json:", error);
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
        const utcOffset = new Intl.DateTimeFormat(navigator.language, {timeZone: timezoneData.iana, timeZoneName: 'longOffset'}).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || 'N/A';

        cardElement.querySelector('.tz-abbr').textContent = tzAbbr;
        cardElement.querySelector('.utc-offset').textContent = utcOffset.startsWith('GMT') ? 'UTC' + utcOffset.substring(3) : utcOffset;

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

// Start the interval to update times every second
function startUpdateInterval() {
    setInterval(() => {
        const now = new Date();
        const cards = timezoneGrid.querySelectorAll('.timezone-card');
        userTimezones.forEach((tzData, index) => {
            const cardElement = cards[index];
            if (cardElement) {
                updateTimezoneCard(cardElement, tzData, now);
            }
        });
    }, 1000);
}

// Handle adding a new city
async function handleAddCity() {
    const searchTerm = citySearchInput.value.trim();
    if (!searchTerm) {
        locationNotFoundMsg.style.display = 'none';
        return;
    }

    // Search for matching location (case-insensitive)
    const foundLocation = allLocations.find(loc => 
        loc.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.countryName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!foundLocation) {
        locationNotFoundMsg.style.display = 'block';
        return;
    }

    locationNotFoundMsg.style.display = 'none';
    
    // Check if already added
    const alreadyAdded = userTimezones.some(tz => tz.iana === foundLocation.iana);
    if (alreadyAdded) {
        alert(`${foundLocation.city} is already in your timezone list`);
        return;
    }

    // Add to user's timezones
    const newTimezone = { ...foundLocation, userAdded: true };
    userTimezones.push(newTimezone);
    await saveUserTimezones();
    
    // Clear search and re-render
    citySearchInput.value = '';
    renderTimezones();
}

// Handle city search input
function handleCitySearchInput() {
    // Clear not found message when typing
    locationNotFoundMsg.style.display = 'none';
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

// Initialize the extension
init();

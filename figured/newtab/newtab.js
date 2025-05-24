// Figured - New Tab Page Logic
// Version 1.0

// Part A: Initialization & Setup

// DOM Elements
let timezoneGrid;
let citySearchInput;
let addCityBtn;
let homePrompt;
let homeTimezoneSelect;
let setHomeBtn;
let locationNotFoundMsg;
let googleSearchLink;
let timezoneCardTemplate;

// Data
let userTimezones = []; // Array of user's selected timezone objects { iana, city, countryCode, countryName, isHome, userAdded }
let allLocations = [];  // Array of all available locations from locations.json

document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM elements
    timezoneGrid = document.getElementById('timezone-grid');
    citySearchInput = document.getElementById('city-search-input');
    addCityBtn = document.getElementById('add-city-btn');
    homePrompt = document.getElementById('home-prompt');
    homeTimezoneSelect = document.getElementById('home-timezone-select');
    setHomeBtn = document.getElementById('set-home-btn');
    locationNotFoundMsg = document.getElementById('location-not-found-msg');
    googleSearchLink = document.getElementById('google-search-link');
    timezoneCardTemplate = document.getElementById('timezone-card-template');

    console.log("DOM Content Loaded and elements assigned.");

    // Initialize the application
    init();
});

async function init() {
    console.log("Initializing Figured...");

    // These functions will be implemented in subsequent steps
    // For now, they can be stubs or log messages.
    await loadLocationsData(); // Part B
    await loadUserTimezones(); // Part B

    checkFirstRun();         // Part C
    renderTimezones();       // Part D
    startUpdateInterval();   // Part E

    // Setup event listeners
    // addCityBtn.addEventListener('click', handleAddCity); // Part F
    // citySearchInput.addEventListener('input', handleCitySearchInput); // Part F (for debouncing/autocomplete)
    // setHomeBtn.addEventListener('click', handleSetHomeTimezone); // Part C

    console.log("Initialization sequence started.");
    // Temporary: Log loaded data if available
    console.log("User Timezones on Init:", userTimezones);
    console.log("All Locations on Init:", allLocations.length > 0 ? `${allLocations.length} locations loaded` : "No locations loaded");
}

// Stub functions for now (to be implemented in later parts)
async function loadLocationsData() {
    console.log("Part B: loadLocationsData() called - Not yet implemented");
    // Implementation will fetch '../common/locations.json'
}

async function loadUserTimezones() {
    console.log("Part B: loadUserTimezones() called - Not yet implemented");
    // Implementation will use chrome.storage.local.get
}

function checkFirstRun() {
    console.log("Part C: checkFirstRun() called - Not yet implemented");
}

function renderTimezones() {
    console.log("Part D: renderTimezones() called - Not yet implemented");
}

function startUpdateInterval() {
    console.log("Part E: startUpdateInterval() called - Not yet implemented");
}

// function handleAddCity() { // Part F
//     console.log("Part F: handleAddCity() called - Not yet implemented");
// }

// function handleCitySearchInput() { // Part F
//     console.log("Part F: handleCitySearchInput() called - Not yet implemented");
// }

// function handleSetHomeTimezone() { // Part C
//     console.log("Part C: handleSetHomeTimezone() called - Not yet implemented");
// }

console.log("newtab.js loaded.");

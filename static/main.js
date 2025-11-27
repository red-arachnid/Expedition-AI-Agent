/**
 * MAIN.JS
 * Handles Map initialization, Location selection, Currency conversion, 
 * and communicating with the Flask backend.
 */

//? --- MAP INITIALIZATION ---
// Using Leaflet.js centered on Paris by default
const map = L.map('map').setView([48.8566, 2.3522], 13);
let currentMarker = L.marker([48.8566, 2.3522]).addTo(map);
let isValidLocation = true;

//? --- CURRENCY LOGIC ---
let exchangeRates = { USD: 1 }; //Default fallback
let currentCurrency = 'USD';

// Fetch live rates on load
async function fetchRates(){
    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        exchangeRates = (data && data.rates) ? data.rates : exchangeRates;
    } catch (e) {
        console.warn("Could not fetch live rates, using approximations.");
        // Fallback approximation if API fails
        exchangeRates = { USD: 1, INR: 83.5, EUR: 0.92, JPY: 150.2, GBP: 0.79, CHF: 0.88 };
    }
}
fetchRates();

// Handle currency dropdown changes
document.getElementById('currency').addEventListener('change', function(e) {
    const newCurrency = e.target.value;
    const budgetInput = document.getElementById('budget');
    const val = parseFloat(budgetInput.value);

    // Convert existing value to new currency
    if (!isNaN(val)){
        const amountInUSD = val / exchangeRates[currentCurrency];
        const convertedAmount = amountInUSD * exchangeRates[newCurrency];

        if (newCurrency === 'JPY') {
            budgetInput.value = Math.round(convertedAmount); // Yen usually has no decimals
        } else {
            budgetInput.value = convertedAmount.toFixed(2);
        }
    }
    currentCurrency = newCurrency;
});

//? --- LOCATION LOGIC ---

/**
 * Handles logic when user clicks on map or searches.
 * 1. Moves marker
 * 2. Fetches location name (Reverse Geocoding)
 * 3. Updates UI with location image and name
 */
async function selectLocation(lat, lng){
    toggleFocusMode(false); // Collapse sidebar

    currentMarker.setLatLng([lat, lng]);
    currentMarker.closePopup();
    currentMarker.unbindPopup();

    // UI Loading state
    document.getElementById('selected-location').innerText = "Locating...";
    document.getElementById('location-box').classList.remove('location-error');

    try{
        // Call backend to get name & image
        const response = await fetch(`/get_location_name?lat=${lat}&lon=${lng}`);
        const data = await response.json();

        if (data && data.display_name){
            // Prevent selecting Oceans/Wilderness
            if (data.is_ocean) {
                isValidLocation = false;
                document.getElementById('location-box').classList.add('location-error');
                document.getElementById('selected-location').innerText = data.display_name || "Ocean / Wilderness";
                xpOcean(); // Trigger Bot Error
                currentMarker.bindPopup(`<b>⚠️ ${data.display_name}</b><br>Not a valid destination.`).openPopup();
                return;
            }

            isValidLocation = true;
            document.getElementById('location-box').classList.remove('location-error');

            // Format address
            const address = data.address;
            let locationName = address.city || address.town || address.village || address.hamlet || data.display_name.split(',')[0];
            let fullName = locationName;
            if (address.country) fullName += `, ${address.country}`;

            document.getElementById('selected-location').innerText = fullName;
            xpSpeak(`Oh, ${locationName}! Nice choice. Let's get planning.`);

            // Create Pop-up with Wikipedia Image
            if (data.image){
                const popupContent = `
                    <div class="font-sans">
                        <div class="relative h-40">
                            <img src="${data.image}" class="w-full h-full object-cover" alt="${locationName}">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                            <div class="absolute bottom-3 left-4 text-white text-left">
                                <h3 class="font-bold text-xl leading-none shadow-black drop-shadow-md">${locationName}</h3>
                                <span class="text-xs opacity-90 uppercase tracking-wider font-medium">${address.country || 'Destination'}</span>
                            </div>
                        </div>
                        <div class="bg-white p-4">
                            <button onclick="const d = document.getElementById('startDate'); currentMarker.closePopup(); d.showPicker ? d.showPicker() : d.focus"
                                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm">
                                <span>📅</span> Plan Trip Here
                            </button>
                        </div>
                    </div>
                `;
                currentMarker.bindPopup(popupContent, {
                    className: 'custom-map-popup',
                    closeButton: false,
                    minWidth: 280,
                    maxWidth: 280
                }).openPopup();
            }

        } else throw new Error("Location not identified");
    } catch (e) {
        isValidLocation = false;
        document.getElementById('selected-location').innerText = "Unknown Location";
        document.getElementById('location-box').classList.add('location-error');
        xpLocationError();
        currentMarker.bindPopup(`<b>Unknown Location</b>`).openPopup();
    }
}

// Map Click Listener
map.on('click', function(e){
    const {lat, lng} = e.latlng;
    selectLocation(lat, lng);
});

// Tile Layer (Map visuals)
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

//? --- SEARCH BAR LOGIC ---
async function searchMap(){
    const query = document.getElementById('map-search').value;
    if (!query) return;

    try{
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data && data.length > 0){
            const {lat , lon} = data[0];
            await selectLocation(lat, lon);
            map.setView([lat, lon], 13);
        }
    } catch (e) {
        console.log("GEOCODING ERROR : ", e);
        alert("Location not found");
    }
}

//? --- GENERATION LOGIC ---
async function generateItinerary(){
    const location = document.getElementById('selected-location').innerText;

    // Validation: Location
    if (!isValidLocation || location === "Unknown Location" || location === "Locating..."){
        xpLocationError();
        document.getElementById('location-box').classList.add('location-error');
        return;
    }

    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const occasionInput = document.getElementById('occasion');
    const budgetInput = document.getElementById('budget');

    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const occasion = occasionInput.value;
    const budget = budgetInput.value;
    const currency = document.getElementById('currency').value;

    // Remove previous error styles
    [startDateInput, endDateInput, budgetInput].forEach(el => el.classList.remove('input-error')); //RESET AFTER ERROR
    let hasError = false;

    // Validation: Missing Fields
    if (!startDate) { startDateInput.classList.add('input-error'); hasError = true; }
    if (!endDate) { endDateInput.classList.add('input-error'); hasError = true; }
    if (!budget) { budgetInput.classList.add('input-error'); hasError = true; }

    if (hasError) {
        if (startDate && endDate && !budget) xpFormError('budget');
        else xpFormError('missing_field');
        return;
    }

    // Validation: Date Logic
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (start < today){
        startDateInput.classList.add('input-error');
        xpFormError('past_date');
        return;
    }
    if (end < start){
        endDateInput.classList.add('input-error');
        xpFormError('invalid_range');
        return;
    }
    if (budget <= 0) {
        budgetInput.classList.add('input-error');
        xpFormError('budget');
        return;
    }

    //? --- START PROCESSING ---
    // Switch UI to loading state
    document.getElementById('form-container').classList.add('hidden');
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('loading-loc').innerText = location;

    startProgress(); // Start fake progress bar
    startLoadingChatter(); // Start Bot dialogue

    try{
        // Send data to Flask
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ location, startDate, endDate, occasion, budget, currency })
        });
        const data = await response.json();

        finishProgress();

        if (data.success){
            stopLoadingChatter(true);

            // Render Results (Hotels & POIs)
            setTimeout(() => {
                document.getElementById('hotels-container').innerHTML = data.hotels.map(hotel => `
                    <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition">
                        <div class="flex justify-between items-start mb-1">
                            <h4 class="font-bold text-blue-700 text-sm">${hotel.name}</h4>
                            <span class="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">${hotel.price}</span>
                        </div>
                        <p class="text-xs text-gray-600 leading-snug">${hotel.description}</p>
                    </div>
                `).join('');

                document.getElementById('pois-container').innerHTML = data.pois.map(pois => `
                    <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex gap-3 items-start">
                        <div class="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 text-orange-600">📍</div>
                        <div>
                            <h4 class="font-bold text-gray-800 text-sm">${pois.name}</h4>
                            <p class="text-xs text-gray-500 leading-snug mt-0.5">${pois.description}</p>
                        </div>
                    </div>
                `).join('');

                // Show Results Screen
                document.getElementById('loading-state').classList.add('hidden');
                document.getElementById('result-state').classList.remove('hidden');
                document.getElementById('download-link').href = data.pdf_url;
            }, 600);
        } else throw new Error(data.error);
    } catch (e) {
        stopLoadingChatter(false);
        alert("Error generating itinerary: " + e.message);
        resetForm();
    }
}

// Helper: Remove error class when user types
document.addEventListener('DOMContentLoaded', () => {
    const inputs = ['startDate', 'endDate', 'budget'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', function() {
            this.classList.remove('input-error');
        });
    });
});

// Helper: Reset Form
function resetForm() {
    document.getElementById('result-state').classList.add('hidden');
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('form-container').classList.remove('hidden');
}

// Helper: Sidebar Expansion/Collapse
function toggleFocusMode(isActive){
    const sidebar = document.getElementById('sidebar');
    const dimmer = document.getElementById('map-dimmer');

    if (isActive){
        sidebar.classList.remove('w-[450px]');
        sidebar.classList.add('w-[600px]');
        dimmer.classList.remove('opacity-0', 'pointer-events-none');
        dimmer.classList.add('opacity-100', 'pointer-events-auto');
        currentMarker.closePopup();
    } else {
        sidebar.classList.remove('w-[600px]');
        sidebar.classList.add('w-[450px]');
        dimmer.classList.remove('opacity-100', 'pointer-events-auto');
        dimmer.classList.add('opacity-0', 'pointer-events-none');
        currentMarker.openPopup();
    }
}

// Helper: Fake Progress Bar Logic
let progressInterval;
function startProgress(){
    let width = 0;
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    progressBar.style.width = '0%';
    progressText.innerText = '0%';

    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (width >= 95){
            // Stall at 95% until backend responds
        } else {
            // Slow down as we get closer to 100
            const increment = (width < 50) ? 2 : (width < 80) ? 1 : 0.5; 
            width += increment;
            progressBar.style.width = width + '%';
            progressText.innerText = Math.floor(width) + '%';
        }
    }, 200);
}

function finishProgress(){
    clearInterval(progressInterval);
    const progressBar = document.getElementById("progress-bar");
    const progressText = document.getElementById("progress-text");
    progressBar.style.width = '100%';
    progressText.innerText = '100%';
}
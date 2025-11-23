// MAP INITIALIZE
const map = L.map('map').setView([48.8566, 2.3522], 13); //Default coords for Paris
let currentMarker = L.marker([48.8566, 2.3522]).addTo(map);

// PIN MOVE ON CLICK LOGIC
map.on('click', async function(e){
    toggleFocusMode(false);
    const {lat, lng} = e.latlng;
    currentMarker.setLatLng([lat, lng]);
    currentMarker.closePopup();
    currentMarker.unbindPopup();
    document.getElementById('selected-location').innerText = "Locating...";

    try{
        const response = await fetch(`/get_location_name?lat=${lat}&lon=${lng}`);
        const data = await response.json();

        if (data && data.display_name){
            const address = data.address;
            let locationName = address.city || address.town || address.village || address.hamlet || data.display_name.split(',')[0];

            let fullName = locationName;
            if (address.country){
                fullName += `, ${address.country}`;
            }
            document.getElementById('selected-location').innerText = fullName;

            xpSpeak(`Oh, ${locationName}! Nice choice. Let's get planning.`);

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

        } else {
            document.getElementById('selected-location').innerText = "Unknown Location";
            currentMarker.bindPopup(`<b>${fullName}</b>`).openPopup();
        }
    } catch (e) {
        console.error("Reverse Geocoding error:", e);
        document.getElementById('selected-location').innerText = "Error locating";
    }
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// MAP SEARCH
async function searchMap(){
    const query = document.getElementById('map-search').value;
    if (!query) return;

    try{
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data && data.length > 0){
            const {lat , lon , display_name} = data[0];
            const name = display_name.split(',')[0];

            map.setView([lat, lon], 13);
            currentMarker.setLatLng([lat, lon]);

            document.getElementById('selected-location').innerText = name;
        }
    } catch (e) {
        console.log("GEOCODING ERROR : ", e);
        alert("Location not found");
    }
}

// Send to backend
async function generateItinerary(){
    const location = document.getElementById('selected-location').innerText;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const occasion = document.getElementById('occasion').value;
    const budget = document.getElementById('budget').value;

    // ---- REPLACE WITH BETTER UI ----
    if(!startDate || !endDate || !budget) {
        alert("Please fill in all fields!");
        return;
    }

    // LOADING UI SWITCH
    document.getElementById('form-container').classList.add('hidden');
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('loading-loc').innerText = location;

    startProgress();
    startLoadingChatter();

    try{
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ location, startDate, endDate, occasion, budget })
        });
        const data = await response.json();

        finishProgress();

        if (data.success){
            //setTimeout for adding delays for the loading bar to show properly
            stopLoadingChatter(true);
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

                document.getElementById('loading-state').classList.add('hidden');
                document.getElementById('result-state').classList.remove('hidden');
                document.getElementById('download-link').href = data.pdf_url;
            }, 600);
        } else {
            throw new Error(data.error);
        }
    } catch (e) {
        stopLoadingChatter(false);
        alert("Error generating itinerary: " + e.message);
        resetForm();
    }
}

function resetForm() {
    document.getElementById('result-state').classList.add('hidden');
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('form-container').classList.remove('hidden');
}

function toggleFocusMode(isActive){
    const sidebar = document.getElementById('sidebar');
    const dimmer = document.getElementById('map-dimmer');

    if (isActive){
        //Expand Sidebar
        sidebar.classList.remove('w-[450px]');
        sidebar.classList.add('w-[600px]');

        // Show Dimmer & Enable Clicks on it
        dimmer.classList.remove('opacity-0', 'pointer-events-none');
        dimmer.classList.add('opacity-100', 'pointer-events-auto');

        currentMarker.closePopup();
    } else {
        // Shrink sidebar
        sidebar.classList.remove('w-[600px]');
        sidebar.classList.add('w-[450px]');

        // Hide Dimmer & Disable Clicks on it
        dimmer.classList.remove('opacity-100', 'pointer-events-auto');
        dimmer.classList.add('opacity-0', 'pointer-events-none');

        currentMarker.openPopup();
    }
}

// Progress bar while searching
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
            //Stall at 95% for fake illusion
        } else {
            const increment = (width < 50) ? 2 : 
                                (width < 80) ? 1 : 0.5; 
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